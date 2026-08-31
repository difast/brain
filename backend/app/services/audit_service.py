"""Audit log — recording and listing a user's own account activity."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction, AuditLog


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def record(
        self, user_id: str, action: AuditAction, ip: str | None = None
    ) -> None:
        self.session.add(AuditLog(user_id=user_id, action=action.value, ip=ip))
        await self.session.flush()

    async def record_and_commit(
        self, user_id: str, action: AuditAction, ip: str | None = None
    ) -> None:
        """Record and commit immediately.

        Use this when the caller is about to raise (e.g. a failed-login audit
        entry, right before ``AuthError``) — the request's session otherwise
        rolls back on any exception (see ``get_session``), which would erase
        the entry along with everything else in the transaction.
        """
        await self.record(user_id, action, ip)
        await self.session.commit()

    async def list_for_user(
        self, user_id: str, limit: int = 25, offset: int = 0
    ) -> tuple[list[AuditLog], int]:
        stmt = (
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        count_stmt = (
            select(func.count())
            .select_from(AuditLog)
            .where(AuditLog.user_id == user_id)
        )
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total
