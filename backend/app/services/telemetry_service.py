"""Telemetry service — ingest and query robot telemetry."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.telemetry import Telemetry
from app.repositories.telemetry_repo import TelemetryRepository
from app.schemas.telemetry import TelemetryIngest

logger = get_logger("telemetry")


class TelemetryService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = TelemetryRepository(session)

    async def ingest(self, robot_id: str, payload: TelemetryIngest) -> Telemetry:
        telemetry = Telemetry(
            robot_id=robot_id,
            battery=payload.battery,
            speed=payload.speed,
            x=payload.x,
            y=payload.y,
            z=payload.z,
            errors=payload.errors,
            extra=payload.extra,
        )
        telemetry = await self.repo.create(telemetry)
        if payload.errors:
            logger.warning(
                "telemetry_errors_reported",
                robot_id=robot_id,
                errors=payload.errors,
            )
        return telemetry

    async def list(
        self, *, robot_id: str | None = None, limit: int = 100, offset: int = 0
    ) -> tuple[list[Telemetry], int]:
        return await self.repo.list(robot_id=robot_id, limit=limit, offset=offset)
