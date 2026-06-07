"""Robot registry schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.robot import RobotStatus
from app.schemas.common import CommandSpec, ORMModel


class RobotRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["scout-01"])
    robot_type: str = Field(..., min_length=1, max_length=128, examples=["rover"])
    capabilities: list[CommandSpec] = Field(
        default_factory=list,
        description="Command vocabulary this robot understands.",
    )
    meta: dict[str, Any] = Field(default_factory=dict)


class RobotResponse(ORMModel):
    id: str
    name: str
    robot_type: str
    status: RobotStatus
    capabilities: list[dict[str, Any]]
    meta: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class RobotRegisterResponse(BaseModel):
    """Returned once at registration — contains the secret API key + token."""

    robot: RobotResponse
    api_key: str = Field(..., description="Store this securely; shown only once.")
    token: str = Field(..., description="Bearer token for the Authorization header.")


class HeartbeatRequest(BaseModel):
    status: RobotStatus = RobotStatus.online
    meta: dict[str, Any] = Field(default_factory=dict)


class HeartbeatResponse(BaseModel):
    robot_id: str
    status: RobotStatus
    acknowledged_at: datetime
