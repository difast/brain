"""Brain service — orchestrates a single decision end-to-end.

Flow:
  1. Resolve the robot and its capabilities.
  2. Ensure a task record exists (Memory service).
  3. Persist the camera frame to object storage (best-effort).
  4. Pull recent decisions for short-term context.
  5. Call Claude to produce a structured decision.
  6. Persist the decision (Memory service) and return it.
"""

from __future__ import annotations

import base64
import binascii

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import RobotNotFoundError
from app.core.logging import get_logger
from app.models.decision import Decision
from app.repositories.robot_repo import RobotRepository
from app.schemas.decision import DecisionRequest
from app.services.claude_client import ClaudeBrain
from app.services.memory_service import MemoryService
from app.services.storage import FrameStorage

logger = get_logger("brain")


class BrainService:
    def __init__(
        self,
        session: AsyncSession,
        brain: ClaudeBrain,
        storage: FrameStorage,
    ) -> None:
        self.robots = RobotRepository(session)
        self.memory = MemoryService(session)
        self.brain = brain
        self.storage = storage

    async def decide(self, robot_id: str, req: DecisionRequest) -> Decision:
        robot = await self.robots.get(robot_id)
        if robot is None:
            raise RobotNotFoundError()

        task = await self.memory.ensure_task(robot_id, req.task)

        frame_url = req.frame_url
        if req.image_b64 and not frame_url and settings.storage_enabled:
            frame_url = await self._store_frame(
                robot_id, req.image_b64, req.image_media_type
            )

        recent = await self.memory.recent_actions(robot_id, limit=5)

        result = await self.brain.decide(
            task=req.task,
            robot_type=robot.robot_type,
            capabilities=robot.capabilities,
            state=req.state,
            recent_actions=recent,
            image_b64=req.image_b64,
            image_media_type=req.image_media_type,
        )

        decision = Decision(
            robot_id=robot_id,
            task_id=req.task_id or task.id,
            goal=result.decision.goal,
            thought=result.decision.thought,
            confidence=result.decision.confidence,
            actions=[a.model_dump() for a in result.decision.actions],
            frame_url=frame_url,
            model=result.model,
            latency_ms=result.latency_ms,
            raw_response=result.raw_response,
        )
        decision = await self.memory.record_decision(decision)
        logger.info(
            "decision_made",
            robot_id=robot_id,
            model=result.model,
            confidence=result.decision.confidence,
            n_actions=len(result.decision.actions),
            latency_ms=result.latency_ms,
        )
        return decision

    async def _store_frame(
        self, robot_id: str, image_b64: str, media_type: str
    ) -> str | None:
        try:
            data = base64.b64decode(image_b64, validate=True)
        except (binascii.Error, ValueError):
            logger.warning("invalid_base64_frame", robot_id=robot_id)
            return None
        try:
            return await self.storage.upload_frame(robot_id, data, media_type)
        except Exception as exc:  # noqa: BLE001
            # Storage failures must not block a decision.
            logger.warning("frame_upload_failed", robot_id=robot_id, error=str(exc))
            return None
