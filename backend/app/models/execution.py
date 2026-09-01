"""Execution feedback — the outcome a device reports after running an action.

Closes the loop for the Memory & Learning layer: the brain can see whether its
previous device commands actually succeeded and adapt.
"""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class ExecutionStatus(enum.StrEnum):
    success = "success"
    failed = "failed"


class ActionExecution(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "action_executions"

    robot_id: Mapped[str] = mapped_column(
        ForeignKey("robots.id", ondelete="CASCADE"), index=True, nullable=False
    )
    decision_id: Mapped[str | None] = mapped_column(
        ForeignKey("decisions.id", ondelete="SET NULL"), index=True, nullable=True
    )
    # The action_id the device received in the decision's device actions.
    action_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[ExecutionStatus] = mapped_column(
        Enum(ExecutionStatus, native_enum=False, length=16), nullable=False
    )
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
