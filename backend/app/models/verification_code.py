"""Emailed confirmation codes.

One row per issued code. A code is bound to a user and a purpose (login,
password change, email change), carries a bounded number of attempts, and
expires. Exhausting the attempts locks that purpose for the user until
``locked_until`` passes, so a leaked mailbox can't be brute-forced.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class CodePurpose(str, enum.Enum):
    login = "login"
    password_change = "password_change"
    password_reset = "password_reset"
    email_change = "email_change"
    account_delete = "account_delete"


class VerificationCode(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "verification_codes"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    purpose: Mapped[CodePurpose] = mapped_column(
        Enum(CodePurpose, native_enum=False, length=32), index=True, nullable=False
    )
    # The code itself is stored hashed, like any other secret.
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # For an email change: the address the code was sent to and confirms.
    new_email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Set when the attempt budget is spent — blocks new codes until it passes.
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
