"""Data access for tasks."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskSource, TaskStatus


class TaskRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, task: Task) -> Task:
        self.session.add(task)
        await self.session.flush()
        await self.session.refresh(task)
        return task

    async def get(self, task_id: str) -> Task | None:
        return await self.session.get(Task, task_id)

    async def list_page(
        self,
        *,
        robot_id: str | None = None,
        status: TaskStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        stmt = select(Task)
        count_stmt = select(func.count()).select_from(Task)
        if robot_id is not None:
            stmt = stmt.where(Task.robot_id == robot_id)
            count_stmt = count_stmt.where(Task.robot_id == robot_id)
        if status is not None:
            stmt = stmt.where(Task.status == status)
            count_stmt = count_stmt.where(Task.status == status)
        # Queue order: highest priority first, then oldest first.
        stmt = (
            stmt.order_by(Task.priority.desc(), Task.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total

    async def next_pending_for_robot(self, robot_id: str) -> Task | None:
        """The next queued task for a robot (highest priority, oldest first)."""
        stmt = (
            select(Task)
            .where(Task.robot_id == robot_id, Task.status == TaskStatus.pending)
            .order_by(Task.priority.desc(), Task.created_at.asc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def flush(self) -> None:
        await self.session.flush()

    async def get_or_create_active(self, robot_id: str, description: str) -> Task:
        """Return the latest matching active task or create one (robot-driven)."""
        stmt = (
            select(Task)
            .where(
                Task.robot_id == robot_id,
                Task.description == description,
                Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
            )
            .order_by(Task.created_at.desc())
            .limit(1)
        )
        existing = await self.session.scalar(stmt)
        if existing:
            return existing
        task = Task(
            robot_id=robot_id,
            description=description,
            status=TaskStatus.in_progress,
            source=TaskSource.robot,
        )
        return await self.create(task)
