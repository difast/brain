"""Task schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.task import TaskStatus
from app.schemas.common import ORMModel


class TaskCreate(BaseModel):
    robot_id: str
    description: str = Field(..., min_length=1)


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    result: str | None = None


class TaskResponse(ORMModel):
    id: str
    robot_id: str
    description: str
    status: TaskStatus
    result: str | None
    created_at: datetime
    updated_at: datetime
