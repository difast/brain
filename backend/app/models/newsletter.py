"""Newsletters sent from the admin panel to every dashboard user."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class NewsletterStatus(enum.StrEnum):
    sending = "sending"
    sent = "sent"
    failed = "failed"


class Newsletter(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "newsletters"

    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NewsletterStatus] = mapped_column(
        Enum(NewsletterStatus, native_enum=False, length=16),
        default=NewsletterStatus.sending,
        nullable=False,
    )
    # Delivery counters, updated as the background send progresses.
    recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
