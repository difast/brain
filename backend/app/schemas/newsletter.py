"""Schemas for admin-panel newsletters."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.newsletter import NewsletterStatus


class NewsletterCreateRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=20_000)


class NewsletterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subject: str
    body: str
    status: NewsletterStatus
    recipients: int
    sent: int
    failed: int
    created_at: datetime
