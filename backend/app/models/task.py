"""Task model — a unit of work assigned to (or reported by) a robot."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"


class TaskSource(str, enum.Enum):
    # Created top-down via the Task Engine (operator/dashboard/API).
    assigned = "assigned"
    # Created bottom-up from a robot's own decision request.
    robot = "robot"


class Task(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tasks"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    robot_id: Mapped[str] = mapped_column(
        ForeignKey("robots.id", ondelete="CASCADE"), index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, native_enum=False, length=16),
        default=TaskStatus.pending,
        nullable=False,
        index=True,
    )
    # Higher priority is dequeued first.
    priority: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )
    source: Mapped[TaskSource] = mapped_column(
        Enum(TaskSource, native_enum=False, length=16),
        default=TaskSource.assigned,
        nullable=False,
    )
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
