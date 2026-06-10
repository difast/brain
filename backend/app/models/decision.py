"""Decision model — a single brain decision (Claude inference) for a robot.

Stores the full audit trail: the goal/thought, confidence, emitted actions,
the frame that was analysed, latency and the model used. This is the
Memory Service's record of "what the brain decided and why".
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Decision(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "decisions"

    robot_id: Mapped[str] = mapped_column(
        ForeignKey("robots.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), index=True, nullable=True
    )

    goal: Mapped[str] = mapped_column(Text, nullable=False)
    thought: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Device commands the robot executes: {"action_id", "type", "value",
    # "universal"} — produced by the Action Translator.
    actions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    # The universal actions the LLM emitted, before translation.
    universal_actions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    # Input state snapshot that produced this decision (Memory & Learning).
    state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    frame_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Raw model output, kept for debugging / replay.
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
