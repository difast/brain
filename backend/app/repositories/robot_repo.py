"""Data access for robots."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.robot import Robot, RobotStatus


class RobotRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, robot: Robot) -> Robot:
        self.session.add(robot)
        await self.session.flush()
        await self.session.refresh(robot)
        return robot

    async def get(self, robot_id: str) -> Robot | None:
        return await self.session.get(Robot, robot_id)

    async def list(
        self,
        *,
        status: RobotStatus | None = None,
        robot_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Robot], int]:
        stmt = select(Robot)
        count_stmt = select(func.count()).select_from(Robot)
        if status is not None:
            stmt = stmt.where(Robot.status == status)
            count_stmt = count_stmt.where(Robot.status == status)
        if robot_type is not None:
            stmt = stmt.where(Robot.robot_type == robot_type)
            count_stmt = count_stmt.where(Robot.robot_type == robot_type)
        stmt = stmt.order_by(Robot.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total

    async def update_status(
        self, robot: Robot, status: RobotStatus
    ) -> Robot:
        robot.status = status
        robot.updated_at = datetime.now(UTC)
        await self.session.flush()
        return robot

    async def touch(self, robot: Robot) -> Robot:
        """Persist in-place mutations on a tracked robot (e.g. heartbeat)."""
        robot.updated_at = datetime.now(UTC)
        await self.session.flush()
        return robot
