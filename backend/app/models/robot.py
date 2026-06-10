"""Robot registry model.

A robot is described entirely by *data*: its type and the list of commands it
supports. The brain core never hard-codes robot types — to support a new kind
of robot you simply register it with its own ``capabilities`` command schema.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class RobotStatus(str, enum.Enum):
    online = "online"
    offline = "offline"
    error = "error"


class Robot(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "robots"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    robot_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    # Opaque API key hash used to authenticate this robot.
    api_key_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    status: Mapped[RobotStatus] = mapped_column(
        Enum(RobotStatus, native_enum=False, length=16),
        default=RobotStatus.offline,
        nullable=False,
        index=True,
    )

    # Last heartbeat time — the source of truth for online/offline presence
    # (a robot is "online" if it heartbeated within heartbeat_ttl_seconds).
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # The command vocabulary this robot understands. List of:
    #   {"type": "move_forward", "description": "...",
    #    "value": {"type": "number", "min": 0, "max": 1, "unit": "m"}}
    # This drives the brain prompt and validates Claude's output.
    capabilities: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )

    # --- Device Profile ---
    firmware_version: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    protocol_version: Mapped[str] = mapped_column(
        String(32), default="1.0", nullable=False
    )

    # Free-form descriptive metadata (hardware, geometry, etc.).
    meta: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    def command_types(self) -> set[str]:
        return {c.get("type") for c in self.capabilities if c.get("type")}
