"""Robot Registry service — registration, heartbeat and listing.

Presence (online/offline) is derived entirely from Postgres: a robot is
"online" if its ``last_seen_at`` is within ``heartbeat_ttl_seconds``. No Redis
required — the service runs on a single backend + Postgres.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import RobotNotFoundError
from app.core.logging import get_logger
from app.core.security import create_robot_token, generate_api_key, hash_api_key
from app.models.robot import Robot, RobotStatus
from app.repositories.robot_repo import RobotRepository
from app.schemas.robot import HeartbeatRequest, RobotRegisterRequest

logger = get_logger("registry")


def _is_online(robot: Robot) -> bool:
    if robot.paused:
        return False
    if robot.status == RobotStatus.error:
        return False
    if robot.last_seen_at is None:
        return False
    cutoff = datetime.now(UTC) - timedelta(seconds=settings.heartbeat_ttl_seconds)
    last = robot.last_seen_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=UTC)
    return last >= cutoff


class RegistryService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = RobotRepository(session)

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
            firmware_version=payload.firmware_version,
            protocol_version=payload.protocol_version,
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
        now = datetime.now(UTC)
        robot.last_seen_at = now
        robot.status = payload.status
        if payload.meta:
            robot.meta = {**robot.meta, **payload.meta}
        await self.repo.touch(robot)
        return robot, now

    async def get(self, robot_id: str) -> Robot:
        robot = await self.repo.get(robot_id)
        if robot is None:
            raise RobotNotFoundError()
        # Reflect live presence in the returned status.
        if robot.status != RobotStatus.error:
            robot.status = (
                RobotStatus.online if _is_online(robot) else RobotStatus.offline
            )
        return robot

    async def set_paused(self, robot_id: str, paused: bool) -> Robot:
        robot = await self.repo.get(robot_id)
        if robot is None:
            raise RobotNotFoundError()
        robot.paused = paused
        if paused:
            robot.status = RobotStatus.offline
        await self.repo.touch(robot)
        logger.info("robot_paused" if paused else "robot_resumed", robot_id=robot_id)
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
            status=None, robot_type=robot_type, limit=limit, offset=offset
        )
        for robot in robots:
            if robot.status != RobotStatus.error:
                robot.status = (
                    RobotStatus.online if _is_online(robot) else RobotStatus.offline
                )
        if status is not None:
            robots = [r for r in robots if r.status == status]
        return robots, total
