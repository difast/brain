"""Schemas for the public contact form and the admin leads view."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=320)
    phone: str = Field(min_length=1, max_length=32)
    organization: str | None = Field(default=None, max_length=255)
    topic: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=5000)
    # Honeypot — real users leave this empty; bots tend to fill every field.
    website: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    phone: str | None
    organization: str | None
    topic: str
    message: str
    created_at: datetime
