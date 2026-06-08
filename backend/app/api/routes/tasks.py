"""Task Engine endpoints — assign, queue, pull and complete tasks."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentRobotId
from app.core.database import get_session
from app.models.task import TaskStatus
from app.schemas.common import Page
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskResultUpdate,
    TaskUpdate,
)
from app.services.task_service import TaskService

router = APIRouter(tags=["tasks"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a task to a robot (Task Engine)",
)
async def create_task(payload: TaskCreate, session: SessionDep) -> TaskResponse:
    service = TaskService(session)
    task = await service.create(payload)
    return TaskResponse.model_validate(task)


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
    service = TaskService(session)
    items, total = await service.list(
        robot_id=robot_id, status=status_filter, limit=limit, offset=offset
    )
    return Page(
        items=[TaskResponse.model_validate(t) for t in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/tasks/next",
    response_model=TaskResponse | None,
    summary="Robot pulls its next queued task (marks it in-progress)",
)
async def next_task(
    robot_id: CurrentRobotId,
    session: SessionDep,
    response: Response,
) -> TaskResponse | None:
    service = TaskService(session)
    task = await service.next_for_robot(robot_id)
    if task is None:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
    return TaskResponse.model_validate(task)


@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Get a task by id",
)
async def get_task(task_id: str, session: SessionDep) -> TaskResponse:
    service = TaskService(session)
    task = await service.get(task_id)
    return TaskResponse.model_validate(task)


@router.patch(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Update a task (status / result)",
)
async def update_task(
    task_id: str, payload: TaskUpdate, session: SessionDep
) -> TaskResponse:
    service = TaskService(session)
    task = await service.update(task_id, payload)
    return TaskResponse.model_validate(task)


@router.post(
    "/tasks/{task_id}/result",
    response_model=TaskResponse,
    summary="Robot reports a task result (completed / failed)",
)
async def report_task_result(
    task_id: str,
    payload: TaskResultUpdate,
    robot_id: CurrentRobotId,
    session: SessionDep,
) -> TaskResponse:
    service = TaskService(session)
    task = await service.report_result(task_id, robot_id, payload)
    return TaskResponse.model_validate(task)
