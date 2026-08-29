"""Organization (tenant) model.

Every user, device, task and API key belongs to exactly one organization.
Data isolation is enforced by filtering all dashboard queries on the caller's
``organization_id`` — one organization can never see another's data.
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Organization(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
