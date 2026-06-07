"""Shared schema primitives."""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CommandSpec(BaseModel):
    """Describes one command a robot type can execute."""

    type: str = Field(..., examples=["move_forward"])
    description: str | None = Field(default=None, examples=["Drive forward"])
    # JSON-schema-ish value constraint (free-form, used to guide the model).
    value: dict | None = Field(
        default=None,
        examples=[{"type": "number", "min": 0, "max": 1, "unit": "m"}],
    )


class Action(BaseModel):
    """A single actuator command returned by the brain."""

    type: str = Field(..., examples=["move_forward"])
    value: float | int | str | bool | None = Field(default=None, examples=[0.5])


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str
    version: str
    time: datetime
