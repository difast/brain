"""Data access for telemetry readings."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.robot import Robot
from app.models.telemetry import Telemetry


class TelemetryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, telemetry: Telemetry) -> Telemetry:
        self.session.add(telemetry)
        await self.session.flush()
        await self.session.refresh(telemetry)
        return telemetry

    async def list_page(
        self,
        *,
        organization_id: str | None = None,
        robot_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Telemetry], int]:
        stmt = select(Telemetry)
        count_stmt = select(func.count()).select_from(Telemetry)
        # Telemetry inherits its tenant from the owning robot.
        if organization_id is not None:
            robot_ids = select(Robot.id).where(
                Robot.organization_id == organization_id
            )
            stmt = stmt.where(Telemetry.robot_id.in_(robot_ids))
            count_stmt = count_stmt.where(Telemetry.robot_id.in_(robot_ids))
        if robot_id is not None:
            stmt = stmt.where(Telemetry.robot_id == robot_id)
            count_stmt = count_stmt.where(Telemetry.robot_id == robot_id)
        stmt = stmt.order_by(Telemetry.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total

    async def latest(self, robot_id: str) -> Telemetry | None:
        stmt = (
            select(Telemetry)
            .where(Telemetry.robot_id == robot_id)
            .order_by(Telemetry.created_at.desc())
            .limit(1)
        )
        return await self.session.scalar(stmt)
