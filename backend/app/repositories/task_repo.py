"""Data access for tasks."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus


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

    async def list(
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
        stmt = stmt.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.scalars(stmt)).all())
        total = int((await self.session.scalar(count_stmt)) or 0)
        return items, total

    async def get_or_create_active(self, robot_id: str, description: str) -> Task:
        """Return the latest matching in-progress task or create a new one."""
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
        )
        return await self.create(task)
