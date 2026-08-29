"""Invite model — an admin-issued invitation to create a user account.

Users never self-register. An administrator issues an invite (email + target
organization + role) from the hidden admin panel; the invite carries a random
token embedded in a link. The recipient opens the link, sets their own
password, and the account is created. The invite is single-use and expires.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.user import UserRole


class Invite(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "invites"

    # Random opaque token carried in the invite link (looked up directly).
    token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=16),
        default=UserRole.member,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Set when the invite is redeemed — a non-null value means it is spent.
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
