"""Emailed confirmation codes — issuing, verifying, rate limiting.

Used for login (every login is confirmed by a code) and for the sensitive
account changes: password and email. The code is emailed by the caller; this
service only owns the lifecycle — cooldown, expiry, attempt budget, lockout.

Note the explicit commits before raising: a failed attempt must be *counted*
even though the request that made it is about to roll back (see
``get_session``), otherwise the attempt budget would never decrease.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthError, TooManyRequestsError
from app.core.logging import get_logger
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.verification_code import CodePurpose, VerificationCode

logger = get_logger("verification")


def _aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; treat those as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=UTC)


class VerificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _latest(
        self, user_id: str, purpose: CodePurpose
    ) -> VerificationCode | None:
        stmt = (
            select(VerificationCode)
            .where(
                VerificationCode.user_id == user_id,
                VerificationCode.purpose == purpose,
            )
            .order_by(VerificationCode.created_at.desc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def issue(
        self,
        user: User,
        purpose: CodePurpose,
        *,
        new_email: str | None = None,
    ) -> str:
        """Create a code and return it in the clear, for the caller to email."""
        now = datetime.now(UTC)
        latest = await self._latest(user.id, purpose)

        if latest is not None:
            if latest.locked_until and _aware(latest.locked_until) > now:
                minutes = max(
                    1,
                    int((_aware(latest.locked_until) - now).total_seconds() // 60) + 1,
                )
                raise TooManyRequestsError(
                    f"Слишком много неверных попыток. Попробуйте через {minutes} мин."
                )
            fresh_until = _aware(latest.created_at) + timedelta(
                seconds=settings.code_resend_cooldown_seconds
            )
            if (
                latest.consumed_at is None
                and _aware(latest.expires_at) > now
                and fresh_until > now
            ):
                seconds = max(1, int((fresh_until - now).total_seconds()))
                raise TooManyRequestsError(
                    f"Код уже отправлен. Запросить новый можно через {seconds} с."
                )

        code = "".join(str(secrets.randbelow(10)) for _ in range(settings.code_length))
        self.session.add(
            VerificationCode(
                user_id=user.id,
                purpose=purpose,
                code_hash=hash_password(code),
                new_email=new_email,
                expires_at=now + timedelta(minutes=settings.code_ttl_minutes),
            )
        )
        await self.session.flush()
        logger.info("code_issued", user_id=user.id, purpose=purpose.value)
        return code

    async def verify(
        self, user: User, purpose: CodePurpose, code: str
    ) -> VerificationCode:
        """Consume a code, or raise. Returns the row (carries ``new_email``)."""
        now = datetime.now(UTC)
        row = await self._latest(user.id, purpose)
        if row is None or row.consumed_at is not None:
            raise AuthError("Код не найден. Запросите новый.")
        if row.locked_until and _aware(row.locked_until) > now:
            minutes = max(
                1, int((_aware(row.locked_until) - now).total_seconds() // 60) + 1
            )
            raise TooManyRequestsError(
                f"Слишком много неверных попыток. Попробуйте через {minutes} мин."
            )
        if _aware(row.expires_at) <= now:
            raise AuthError("Срок действия кода истёк. Запросите новый.")

        if not verify_password(code.strip(), row.code_hash):
            row.attempts += 1
            left = settings.code_max_attempts - row.attempts
            if left <= 0:
                row.locked_until = now + timedelta(
                    minutes=settings.code_lockout_minutes
                )
            # Persist the spent attempt before the error rolls the request back.
            await self.session.commit()
            logger.info(
                "code_attempt_failed",
                user_id=user.id,
                purpose=purpose.value,
                attempts=row.attempts,
            )
            if left <= 0:
                raise TooManyRequestsError(
                    "Слишком много неверных попыток. Попробуйте через "
                    f"{settings.code_lockout_minutes} мин."
                )
            raise AuthError(f"Неверный код. Осталось попыток: {left}.")

        row.consumed_at = now
        await self.session.flush()
        logger.info("code_verified", user_id=user.id, purpose=purpose.value)
        return row
