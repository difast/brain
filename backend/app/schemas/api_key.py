"""API key schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["my-robot-app"])


class ApiKeyResponse(ORMModel):
    id: str
    name: str
    prefix: str
    revoked: bool
    last_used_at: datetime | None
    created_at: datetime


class ApiKeyCreated(ApiKeyResponse):
    """Returned once at creation — includes the full secret key."""

    key: str = Field(..., description="Full API key — store it now, shown once.")
