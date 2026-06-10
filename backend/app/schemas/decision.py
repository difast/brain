"""Brain decision schemas — the core contract robots rely on."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import Action, ORMModel


class DecisionRequest(BaseModel):
    """Payload a robot sends to ``POST /brain/decision``.

    Either ``image_b64`` (inline base64 frame) or ``frame_url`` may be set.
    The robot may omit the image for purely state-based decisions.
    """

    task: str = Field(..., min_length=1, examples=["find and approach the bottle"])
    task_id: str | None = None
    image_b64: str | None = Field(
        default=None, description="Base64-encoded JPEG/PNG frame."
    )
    image_media_type: str = Field(default="image/jpeg")
    frame_url: str | None = Field(
        default=None, description="URL of an already-uploaded frame."
    )
    state: dict[str, Any] = Field(
        default_factory=dict,
        description="Current robot state / sensor snapshot.",
        examples=[{"battery": 80, "obstacle_distance_m": 1.2}],
    )


class BrainDecision(BaseModel):
    """The strict JSON contract Claude must produce and robots execute."""

    goal: str = Field(..., examples=["approach the object"])
    thought: str | None = Field(default=None, examples=["bottle detected on table"])
    confidence: float = Field(..., ge=0.0, le=1.0, examples=[0.91])
    actions: list[Action] = Field(default_factory=list)


class DecisionResponse(ORMModel):
    id: str
    robot_id: str
    task_id: str | None
    goal: str
    thought: str | None
    confidence: float
    # Device commands to execute (each has an action_id for execution feedback).
    actions: list[dict[str, Any]]
    # The universal actions the LLM produced, before translation.
    universal_actions: list[dict[str, Any]]
    state: dict[str, Any]
    frame_url: str | None
    model: str | None
    provider: str | None
    latency_ms: int | None
    created_at: datetime
