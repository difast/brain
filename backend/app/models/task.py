"""Task model — a unit of work assigned to (or reported by) a robot."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"


class Task(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tasks"

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
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
