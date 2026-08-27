"""Data access for telemetry readings."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
        robot_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Telemetry], int]:
        stmt = select(Telemetry)
        count_stmt = select(func.count()).select_from(Telemetry)
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
