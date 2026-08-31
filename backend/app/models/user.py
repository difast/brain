"""User model — a dashboard operator that belongs to an organization.

Users never self-register: accounts are provisioned by an administrator. A
user authenticates with email + password and receives a signed session token
(JWT); every request it makes is scoped to ``organization_id``.
"""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    admin = "admin"
    member = "member"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(320), nullable=False, unique=True, index=True
    )
    # A pbkdf2_sha256 hash (see app.core.security), never the raw password.
    password: Mapped[str] = mapped_column(String(255), nullable=False)

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
