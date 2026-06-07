"""Robot Registry service — registration, heartbeat and listing."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import RobotNotFoundError
from app.core.logging import get_logger
from app.core.security import create_robot_token, generate_api_key, hash_api_key
from app.models.robot import Robot, RobotStatus
from app.repositories.robot_repo import RobotRepository
from app.schemas.robot import HeartbeatRequest, RobotRegisterRequest
from app.services.cache import PresenceCache

logger = get_logger("registry")


class RegistryService:
    def __init__(self, session: AsyncSession, presence: PresenceCache) -> None:
        self.repo = RobotRepository(session)
        self.presence = presence

    async def register(
        self, payload: RobotRegisterRequest
    ) -> tuple[Robot, str, str]:
        """Register a new robot; returns (robot, api_key, bearer_token)."""
        api_key = generate_api_key()
        robot = Robot(
            name=payload.name,
            robot_type=payload.robot_type,
            api_key_hash=hash_api_key(api_key),
            status=RobotStatus.offline,
            capabilities=[c.model_dump() for c in payload.capabilities],
            meta=payload.meta,
        )
        robot = await self.repo.create(robot)
        token = create_robot_token(robot.id, extra={"robot_type": robot.robot_type})
        logger.info(
            "robot_registered", robot_id=robot.id, robot_type=robot.robot_type
        )
        return robot, api_key, token

    async def heartbeat(
        self, robot_id: str, payload: HeartbeatRequest
    ) -> tuple[Robot, datetime]:
        robot = await self.repo.get(robot_id)
        if robot is None:
            raise RobotNotFoundError()
        await self.presence.mark_alive(robot_id)
        if robot.status != payload.status:
            await self.repo.update_status(robot, payload.status)
        if payload.meta:
            robot.meta = {**robot.meta, **payload.meta}
        return robot, datetime.now(UTC)

    async def get(self, robot_id: str) -> Robot:
        robot = await self.repo.get(robot_id)
        if robot is None:
            raise RobotNotFoundError()
        return robot

    async def list_with_presence(
        self,
        *,
        status: RobotStatus | None = None,
        robot_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Robot], int]:
        robots, total = await self.repo.list(
            status=status, robot_type=robot_type, limit=limit, offset=offset
        )
        # Reconcile DB status with live presence (heartbeat TTL is the source
        # of truth for online/offline).
        for robot in robots:
            alive = await self.presence.is_alive(robot.id)
            if alive and robot.status == RobotStatus.offline:
                robot.status = RobotStatus.online
            elif not alive and robot.status == RobotStatus.online:
                robot.status = RobotStatus.offline
        return robots, total
