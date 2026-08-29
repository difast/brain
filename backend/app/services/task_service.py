"""Task Engine — top-down task assignment, queueing and lifecycle.

Operators (dashboard / API) create tasks and assign them to robots with a
priority. Robots pull their next queued task, work on it, and report the
result. Decisions made by the brain are also linked to the active task.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, RobotNotFoundError
from app.core.logging import get_logger
from app.models.task import Task, TaskSource, TaskStatus
from app.repositories.robot_repo import RobotRepository
from app.repositories.task_repo import TaskRepository
from app.schemas.task import TaskCreate, TaskResultUpdate, TaskUpdate

logger = get_logger("tasks")

_TERMINAL = {TaskStatus.completed, TaskStatus.failed}


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = TaskRepository(session)
        self.robots = RobotRepository(session)

    async def create(
        self, payload: TaskCreate, organization_id: str
    ) -> Task:
        robot = await self.robots.get(payload.robot_id)
        # A task can only target a device inside the caller's organization.
        if robot is None or robot.organization_id != organization_id:
            raise RobotNotFoundError()
        task = Task(
            organization_id=organization_id,
            robot_id=payload.robot_id,
            description=payload.description,
            priority=payload.priority,
            status=TaskStatus.pending,
            source=TaskSource.assigned,
        )
        task = await self.repo.create(task)
        logger.info(
            "task_assigned",
            task_id=task.id,
            robot_id=task.robot_id,
            priority=task.priority,
        )
        return task

    async def get(
        self, task_id: str, organization_id: str | None = None
    ) -> Task:
        task = await self.repo.get(task_id)
        if task is None:
            raise NotFoundError("Task not found.")
        # Cross-tenant id is reported as not found, never as another org's task.
        if organization_id is not None and task.organization_id != organization_id:
            raise NotFoundError("Task not found.")
        return task

    async def list(
        self,
        *,
        organization_id: str | None = None,
        robot_id: str | None = None,
        status: TaskStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        return await self.repo.list_page(
            organization_id=organization_id,
            robot_id=robot_id,
            status=status,
            limit=limit,
            offset=offset,
        )

    async def update(
        self, task_id: str, payload: TaskUpdate, organization_id: str | None = None
    ) -> Task:
        task = await self.get(task_id, organization_id=organization_id)
        if payload.status is not None:
            task.status = payload.status
        if payload.result is not None:
            task.result = payload.result
        await self.repo.flush()
        return task

    async def next_for_robot(self, robot_id: str) -> Task | None:
        """Pop the next queued task for a robot and mark it in-progress."""
        task = await self.repo.next_pending_for_robot(robot_id)
        if task is None:
            return None
        task.status = TaskStatus.in_progress
        await self.repo.flush()
        logger.info("task_started", task_id=task.id, robot_id=robot_id)
        return task

    async def report_result(
        self, task_id: str, robot_id: str, payload: TaskResultUpdate
    ) -> Task:
        """A robot reports the outcome of a task it owns."""
        task = await self.get(task_id)
        if task.robot_id != robot_id:
            raise ConflictError("This task does not belong to the caller.")
        if payload.status not in _TERMINAL:
            raise ConflictError("Result status must be 'completed' or 'failed'.")
        task.status = payload.status
        task.result = payload.result
        await self.repo.flush()
        logger.info(
            "task_finished",
            task_id=task.id,
            robot_id=robot_id,
            status=payload.status.value,
        )
        return task
