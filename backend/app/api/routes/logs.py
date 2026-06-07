"""Decision logs and task endpoints (consumed by the dashboard)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models.task import TaskStatus
from app.schemas.common import Page
from app.schemas.decision import DecisionResponse
from app.schemas.task import TaskResponse
from app.services.memory_service import MemoryService

router = APIRouter(tags=["logs"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get(
    "/logs",
    response_model=Page[DecisionResponse],
    summary="List brain decision logs",
)
async def list_logs(
    session: SessionDep,
    robot_id: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[DecisionResponse]:
    service = MemoryService(session)
    items, total = await service.list_decisions(
        robot_id=robot_id, limit=limit, offset=offset
    )
    return Page(
        items=[DecisionResponse.model_validate(d) for d in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/tasks",
    response_model=Page[TaskResponse],
    summary="List tasks",
)
async def list_tasks(
    session: SessionDep,
    robot_id: str | None = None,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[TaskResponse]:
    service = MemoryService(session)
    items, total = await service.list_tasks(
        robot_id=robot_id, status=status_filter, limit=limit, offset=offset
    )
    return Page(
        items=[TaskResponse.model_validate(t) for t in items],
        total=total,
        limit=limit,
        offset=offset,
    )
