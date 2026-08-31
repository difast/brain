"""Dashboard sessions — issuing, validating and revoking them."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import USER_TOKEN_TTL_HOURS
from app.models.user import User
from app.models.user_session import UserSession

logger = get_logger("sessions")

# How stale ``last_seen_at`` may get before a request refreshes it. Without
# this every authenticated request would write to the row.
_TOUCH_AFTER_SECONDS = 60


def aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; treat those as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=UTC)


class SessionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, user: User, ip: str | None, user_agent: str | None
    ) -> UserSession:
        now = datetime.now(UTC)
        row = UserSession(
            user_id=user.id,
            ip=ip,
            user_agent=(user_agent or "")[:255] or None,
            last_seen_at=now,
            expires_at=now + timedelta(hours=USER_TOKEN_TTL_HOURS),
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def get_live(self, session_id: str) -> UserSession | None:
        """The session behind a token, or None when it can no longer be used."""
        row = await self.session.get(UserSession, session_id)
        if row is None or row.revoked_at is not None:
            return None
        if aware(row.expires_at) <= datetime.now(UTC):
            return None
        return row

    async def touch(self, row: UserSession) -> None:
        """Refresh ``last_seen_at``, at most once a minute per session."""
        now = datetime.now(UTC)
        if (now - aware(row.last_seen_at)).total_seconds() < _TOUCH_AFTER_SECONDS:
            return
        row.last_seen_at = now
        await self.session.flush()

    async def list_for_user(self, user_id: str) -> list[UserSession]:
        """Live sessions only — revoked and expired ones are not shown."""
        stmt = (
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > datetime.now(UTC),
            )
            .order_by(UserSession.last_seen_at.desc())
        )
        return list((await self.session.scalars(stmt)).all())

    async def revoke(self, user_id: str, session_id: str) -> bool:
        """Revoke one of this user's sessions. False when there was nothing to do."""
        row = await self.session.get(UserSession, session_id)
        if row is None or row.user_id != user_id or row.revoked_at is not None:
            return False
        row.revoked_at = datetime.now(UTC)
        await self.session.flush()
        logger.info("session_revoked", user_id=user_id, session_id=session_id)
        return True

    async def revoke_others(self, user_id: str, keep_session_id: str | None) -> int:
        """Sign every other device out. Returns how many sessions were closed."""
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > datetime.now(UTC),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        if keep_session_id:
            stmt = stmt.where(UserSession.id != keep_session_id)
        result = await self.session.execute(stmt)
        closed = int(result.rowcount or 0)
        if closed:
            logger.info("sessions_revoked", user_id=user_id, count=closed)
        return closed
