"""Execution feedback endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentRobotId, CurrentUser
from app.core.database import get_session
from app.schemas.common import Page
from app.schemas.execution import ExecutionFeedback, ExecutionResponse
from app.services.memory_service import MemoryService

router = APIRouter(tags=["executions"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post(
    "/executions",
    response_model=ExecutionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report the result of executing an action (device → cloud)",
)
async def report_execution(
    payload: ExecutionFeedback,
    robot_id: CurrentRobotId,
    session: SessionDep,
) -> ExecutionResponse:
    memory = MemoryService(session)
    execution = await memory.record_execution(robot_id, payload)
    return ExecutionResponse.model_validate(execution)


@router.get(
    "/executions",
    response_model=Page[ExecutionResponse],
    summary="Query execution feedback",
)
async def list_executions(
    current_user: CurrentUser,
    session: SessionDep,
    robot_id: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> Page[ExecutionResponse]:
    memory = MemoryService(session)
    items, total = await memory.list_executions(
        organization_id=current_user.organization_id,
        robot_id=robot_id,
        limit=limit,
        offset=offset,
    )
    return Page(
        items=[ExecutionResponse.model_validate(e) for e in items],
        total=total,
        limit=limit,
        offset=offset,
    )
