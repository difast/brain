"""Login throttling — counts failed attempts and locks a scope when it runs out.

Two independent budgets guard a login: one for the account being targeted and
one for the IP doing the trying. Both are checked *before* the password is
verified, and a failure charges both. A success clears the account's counter
(and its own IP's), so ordinary typos never accumulate into a lockout.

Counters live in Postgres rather than in memory so they survive a restart and
hold across replicas. Rows are tiny and reused per scope, so the table stays
small on its own.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import TooManyRequestsError
from app.core.logging import get_logger
from app.models.login_throttle import LoginThrottle

logger = get_logger("throttle")


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def user_scope(user_id: str) -> str:
    return f"user:{user_id}"


def ip_scope(ip: str) -> str:
    return f"ip:{ip}"


def admin_ip_scope(ip: str) -> str:
    return f"admin_ip:{ip}"


class ThrottleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _row(self, scope: str) -> LoginThrottle | None:
        return await self.session.scalar(
            select(LoginThrottle).where(LoginThrottle.scope == scope)
        )

    async def check(self, scopes: list[str]) -> None:
        """Raise if any scope is currently locked out."""
        now = datetime.now(UTC)
        for scope in scopes:
            row = await self._row(scope)
            if row is None or row.locked_until is None:
                continue
            if _aware(row.locked_until) > now:
                minutes = max(
                    1, int((_aware(row.locked_until) - now).total_seconds() // 60) + 1
                )
                raise TooManyRequestsError(
                    "Слишком много неудачных попыток входа. "
                    f"Повторите через {minutes} мин."
                )

    async def register_failure(self, scope: str, max_attempts: int) -> None:
        """Charge one failure against a scope, locking it when the budget runs out."""
        now = datetime.now(UTC)
        window = timedelta(minutes=settings.login_window_minutes)
        row = await self._row(scope)

        if row is None:
            row = LoginThrottle(scope=scope, failures=1, window_started_at=now)
            self.session.add(row)
        else:
            # A stale window (or a lockout that has passed) starts over.
            expired_window = _aware(row.window_started_at) + window <= now
            lock_passed = row.locked_until is not None and (
                _aware(row.locked_until) <= now
            )
            if expired_window or lock_passed:
                row.failures = 1
                row.window_started_at = now
                row.locked_until = None
            else:
                row.failures += 1

        if row.failures >= max_attempts:
            row.locked_until = now + timedelta(minutes=settings.login_lockout_minutes)
            logger.info("throttle_locked", scope=scope, failures=row.failures)

        # The caller is about to raise an auth error, which rolls the request
        # back — commit so the attempt is actually counted.
        await self.session.commit()

    async def reset(self, scopes: list[str]) -> None:
        """Clear counters after a successful login."""
        for scope in scopes:
            row = await self._row(scope)
            if row is not None:
                row.failures = 0
                row.window_started_at = datetime.now(UTC)
                row.locked_until = None
        await self.session.flush()
