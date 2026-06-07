"""Telemetry model — time-series sensor/state readings from a robot."""

from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Telemetry(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "telemetry"

    robot_id: Mapped[str] = mapped_column(
        ForeignKey("robots.id", ondelete="CASCADE"), index=True, nullable=False
    )

    battery: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    z: Mapped[float | None] = mapped_column(Float, nullable=True)

    # List of error strings/objects reported by the robot.
    errors: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    # Arbitrary extra sensor channels.
    extra: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
