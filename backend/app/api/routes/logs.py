"""Decision logs endpoint (consumed by the dashboard)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.schemas.common import Page
from app.schemas.decision import DecisionResponse
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
