"""Memory service — decision history and task tracking."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.decision import Decision
from app.models.task import Task, TaskStatus
from app.repositories.decision_repo import DecisionRepository
from app.repositories.task_repo import TaskRepository


class MemoryService:
    def __init__(self, session: AsyncSession) -> None:
        self.decisions = DecisionRepository(session)
        self.tasks = TaskRepository(session)

    async def record_decision(self, decision: Decision) -> Decision:
        return await self.decisions.create(decision)

    async def recent_actions(
        self, robot_id: str, limit: int = 5
    ) -> list[dict]:
        decisions = await self.decisions.recent_for_robot(robot_id, limit=limit)
        return [
            {
                "goal": d.goal,
                "actions": d.actions,
                "confidence": d.confidence,
                "at": d.created_at.isoformat(),
            }
            for d in decisions
        ]

    async def list_decisions(
        self, *, robot_id: str | None = None, limit: int = 50, offset: int = 0
    ) -> tuple[list[Decision], int]:
        return await self.decisions.list(
            robot_id=robot_id, limit=limit, offset=offset
        )

    # --- Tasks ---

    async def ensure_task(self, robot_id: str, description: str) -> Task:
        return await self.tasks.get_or_create_active(robot_id, description)

    async def list_tasks(
        self,
        *,
        robot_id: str | None = None,
        status: TaskStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        return await self.tasks.list(
            robot_id=robot_id, status=status, limit=limit, offset=offset
        )
