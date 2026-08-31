"""Failed-login counters, per account and per source IP.

One row per throttle scope (``user:<id>`` or ``ip:<addr>``). Failures inside a
rolling window add up; past the limit the scope is locked for a while. A
successful login clears its own counters.

Two scopes, because they stop different attacks: the per-account one stops a
password being guessed, the per-IP one stops the same guess being sprayed
across many accounts.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class LoginThrottle(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "login_throttles"

    # "user:<user_id>", "ip:<address>" or "admin_ip:<address>".
    scope: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False
    )
    failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    window_started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
