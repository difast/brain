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
        description="Low-level command vocabulary this device understands.",
    )
    firmware_version: str | None = Field(default=None, examples=["1.0.0"])
    protocol_version: str = Field(default="1.0", examples=["1.0"])
    meta: dict[str, Any] = Field(default_factory=dict)


class RobotUpdateRequest(BaseModel):
    """Editable device fields (currently just the display name)."""

    name: str = Field(..., min_length=1, max_length=255, examples=["Склад-1 · тележка"])


class RobotResponse(ORMModel):
    id: str
    name: str
    robot_type: str
    status: RobotStatus
    paused: bool
    capabilities: list[dict[str, Any]]
    firmware_version: str | None
    protocol_version: str
    meta: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class DeviceProfile(BaseModel):
    """Unified description of a device (Device Abstraction Layer)."""

    robot_id: str
    robot_type: str
    protocol_version: str
    firmware_version: str | None
    capabilities: list[dict[str, Any]]
    # Low-level device command types the device declared.
    supported_commands: list[str]
    # High-level universal actions the device can perform (via the translator).
    supported_actions: list[dict[str, str]]


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
