"""Decision logs endpoint (consumed by the dashboard)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, SessionDep
from app.schemas.common import Page
from app.schemas.decision import DecisionResponse
from app.services import csv_export
from app.services.memory_service import MemoryService

router = APIRouter(tags=["logs"])


@router.get(
    "/logs",
    response_model=Page[DecisionResponse],
    summary="List brain decision logs",
)
async def list_logs(
    current_user: CurrentUser,
    session: SessionDep,
    robot_id: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[DecisionResponse]:
    service = MemoryService(session)
    items, total = await service.list_decisions(
        organization_id=current_user.organization_id,
        robot_id=robot_id,
        limit=limit,
        offset=offset,
    )
    return Page(
        items=[DecisionResponse.model_validate(d) for d in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/logs/export.csv",
    summary="Download the decision log as CSV",
)
async def export_logs(
    current_user: CurrentUser,
    session: SessionDep,
    robot_id: str | None = None,
) -> StreamingResponse:
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M")
    return StreamingResponse(
        csv_export.decisions_csv(
            session, current_user.organization_id, robot_id
        ),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="mevratek-decisions-{stamp}.csv"'
            )
        },
    )
