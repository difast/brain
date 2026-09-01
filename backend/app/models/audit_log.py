"""Audit log — a record of security-relevant events on a user's account.

Covers logins (success and failure), and account changes the user makes
themselves from the account page (password, email, avatar). Shown to the user
as their own activity history — not a cross-account admin log.
"""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class AuditAction(enum.StrEnum):
    login = "login"
    login_failed = "login_failed"
    password_changed = "password_changed"
    password_reset = "password_reset"
    email_changed = "email_changed"
    avatar_changed = "avatar_changed"
    session_revoked = "session_revoked"


class AuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, native_enum=False, length=32), nullable=False
    )
    # Best-effort source IP, for the user's own review.
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
