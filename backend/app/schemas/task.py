"""Task schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.task import TaskSource, TaskStatus
from app.schemas.common import ORMModel


class TaskCreate(BaseModel):
    """Assign a task to a robot (top-down, via the Task Engine)."""

    robot_id: str
    description: str = Field(..., min_length=1)
    priority: int = Field(default=0, ge=0, le=100)


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    result: str | None = None


class TaskResultUpdate(BaseModel):
    """Reported by a robot when it finishes a task."""

    status: TaskStatus = TaskStatus.completed
    result: str | None = None


class TaskResponse(ORMModel):
    id: str
    robot_id: str
    description: str
    status: TaskStatus
    priority: int
    source: TaskSource
    result: str | None
    created_at: datetime
    updated_at: datetime
