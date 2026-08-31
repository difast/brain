"""Contact lead — a request submitted from the public website contact form.

Leads are not tied to any organization (they arrive before a customer exists);
they are visible only in the admin panel.
"""

from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class ContactLead(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "contact_leads"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Best-effort source IP, for abuse tracing only.
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
