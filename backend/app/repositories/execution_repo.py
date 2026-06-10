"""Data access for action execution feedback."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.execution import ActionExecution


class ExecutionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, execution: ActionExecution) -> ActionExecution:
        self.session.add(execution)
        await self.session.flush()
        await self.session.refresh(execution)
        return execution

    async def list(
        self,
        *,
        robot_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ActionExecution], int]:
        stmt = select(ActionExecution)
        count_stmt = select(func.count()).select_from(ActionExecution)
        if robot_id is not None:
            stmt = stmt.where(ActionExecution.robot_id == robot_id)
            count_stmt = count_stmt.where(ActionExecution.robot_id == robot_id)
        stmt = (
            stmt.order_by(ActionExecution.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total

    async def recent_for_robot(
        self, robot_id: str, limit: int = 8
    ) -> list[ActionExecution]:
        stmt = (
            select(ActionExecution)
            .where(ActionExecution.robot_id == robot_id)
            .order_by(ActionExecution.created_at.desc())
            .limit(limit)
        )
        return list((await self.session.scalars(stmt)).all())
