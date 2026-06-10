"""Memory & Learning service.

Persists the full loop — input state, decision, the device actions taken and
their execution results — and surfaces recent decisions + feedback so the
Decision Engine can learn from what actually happened.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.decision import Decision
from app.models.execution import ActionExecution
from app.models.task import Task, TaskStatus
from app.repositories.decision_repo import DecisionRepository
from app.repositories.execution_repo import ExecutionRepository
from app.repositories.task_repo import TaskRepository
from app.schemas.execution import ExecutionFeedback


class MemoryService:
    def __init__(self, session: AsyncSession) -> None:
        self.decisions = DecisionRepository(session)
        self.tasks = TaskRepository(session)
        self.executions = ExecutionRepository(session)

    async def record_decision(self, decision: Decision) -> Decision:
        return await self.decisions.create(decision)

    # --- Execution feedback ---

    async def record_execution(
        self, robot_id: str, payload: ExecutionFeedback
    ) -> ActionExecution:
        execution = ActionExecution(
            robot_id=robot_id,
            decision_id=payload.decision_id,
            action_id=payload.action_id,
            action_type=payload.action_type,
            status=payload.status,
            duration_ms=payload.duration_ms,
            error=payload.error,
        )
        return await self.executions.create(execution)

    async def list_executions(
        self, *, robot_id: str | None = None, limit: int = 100, offset: int = 0
    ) -> tuple[list[ActionExecution], int]:
        return await self.executions.list(
            robot_id=robot_id, limit=limit, offset=offset
        )

    async def recent_feedback(self, robot_id: str, limit: int = 8) -> list[dict]:
        rows = await self.executions.recent_for_robot(robot_id, limit=limit)
        return [
            {
                "action_id": e.action_id,
                "action_type": e.action_type,
                "status": e.status.value,
                "duration_ms": e.duration_ms,
                "error": e.error,
                "at": e.created_at.isoformat(),
            }
            for e in rows
        ]

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
