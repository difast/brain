"""API key model — a per-user credential for accessing the platform API.

Each user generates one or more keys from the dashboard. The full secret is
shown once at creation; only a hash and a short display prefix are stored.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class ApiKey(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "api_keys"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Short, non-secret prefix shown in the UI, e.g. "cbk_a1b2c3…".
    prefix: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
