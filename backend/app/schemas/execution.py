"""Execution feedback schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.execution import ExecutionStatus
from app.schemas.common import ORMModel


class ExecutionFeedback(BaseModel):
    """Reported by a device after executing an action."""

    action_id: str = Field(..., examples=["123"])
    status: ExecutionStatus = Field(..., examples=["success", "failed"])
    duration_ms: int | None = Field(default=None, examples=[450])
    error: str | None = Field(default=None, examples=["object_not_found"])
    decision_id: str | None = None
    action_type: str | None = None


class ExecutionResponse(ORMModel):
    id: str
    robot_id: str
    decision_id: str | None
    action_id: str
    action_type: str | None
    status: ExecutionStatus
    duration_ms: int | None
    error: str | None
    created_at: datetime
