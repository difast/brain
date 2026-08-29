"""Data access for brain decisions (action/decision history)."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.decision import Decision
from app.models.robot import Robot


class DecisionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, decision: Decision) -> Decision:
        self.session.add(decision)
        await self.session.flush()
        await self.session.refresh(decision)
        return decision

    async def list_page(
        self,
        *,
        organization_id: str | None = None,
        robot_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Decision], int]:
        stmt = select(Decision)
        count_stmt = select(func.count()).select_from(Decision)
        # Decisions inherit their tenant from the owning robot.
        if organization_id is not None:
            robot_ids = select(Robot.id).where(
                Robot.organization_id == organization_id
            )
            stmt = stmt.where(Decision.robot_id.in_(robot_ids))
            count_stmt = count_stmt.where(Decision.robot_id.in_(robot_ids))
        if robot_id is not None:
            stmt = stmt.where(Decision.robot_id == robot_id)
            count_stmt = count_stmt.where(Decision.robot_id == robot_id)
        stmt = stmt.order_by(Decision.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total

    async def recent_for_robot(self, robot_id: str, limit: int = 5) -> list[Decision]:
        stmt = (
            select(Decision)
            .where(Decision.robot_id == robot_id)
            .order_by(Decision.created_at.desc())
            .limit(limit)
        )
        return list((await self.session.scalars(stmt)).all())
