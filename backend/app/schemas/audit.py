"""Schema for a user's own account-activity log."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.audit_log import AuditAction


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: AuditAction
    ip: str | None
    created_at: datetime
