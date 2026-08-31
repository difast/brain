"""Telemetry ingest + query endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentRobotId, CurrentUser
from app.core.database import get_session
from app.schemas.common import Page
from app.schemas.telemetry import TelemetryIngest, TelemetryResponse
from app.services import csv_export
from app.services.telemetry_service import TelemetryService

router = APIRouter(tags=["telemetry"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post(
    "/telemetry",
    response_model=TelemetryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a telemetry reading (authenticated as the robot)",
)
async def ingest_telemetry(
    payload: TelemetryIngest,
    robot_id: CurrentRobotId,
    session: SessionDep,
) -> TelemetryResponse:
    service = TelemetryService(session)
    telemetry = await service.ingest(robot_id, payload)
    return TelemetryResponse.model_validate(telemetry)


@router.get(
    "/telemetry",
    response_model=Page[TelemetryResponse],
    summary="Query telemetry",
)
async def list_telemetry(
    current_user: CurrentUser,
    session: SessionDep,
    robot_id: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> Page[TelemetryResponse]:
    service = TelemetryService(session)
    items, total = await service.list(
        organization_id=current_user.organization_id,
        robot_id=robot_id,
        limit=limit,
        offset=offset,
    )
    return Page(
        items=[TelemetryResponse.model_validate(t) for t in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/telemetry/export.csv",
    summary="Download telemetry as CSV",
)
async def export_telemetry(
    current_user: CurrentUser,
    session: SessionDep,
    robot_id: str | None = None,
) -> StreamingResponse:
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M")
    return StreamingResponse(
        csv_export.telemetry_csv(
            session, current_user.organization_id, robot_id
        ),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="mevratek-telemetry-{stamp}.csv"'
            )
        },
    )
