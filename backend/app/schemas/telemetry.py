"""Telemetry schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class TelemetryIngest(BaseModel):
    battery: float | None = Field(default=None, ge=0, le=100, examples=[87.5])
    speed: float | None = Field(default=None, examples=[0.4])
    x: float | None = None
    y: float | None = None
    z: float | None = None
    errors: list[Any] = Field(default_factory=list)
    extra: dict[str, Any] = Field(default_factory=dict)


class TelemetryResponse(ORMModel):
    id: str
    robot_id: str
    battery: float | None
    speed: float | None
    x: float | None
    y: float | None
    z: float | None
    errors: list[Any]
    extra: dict[str, Any]
    created_at: datetime
