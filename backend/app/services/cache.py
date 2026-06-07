"""Redis-backed presence/heartbeat cache.

Used to track which robots are currently "online" without writing to Postgres
on every heartbeat. A key is set with a TTL on each heartbeat; if it expires
the robot is considered offline. This keeps the hot path cheap and lets the
system scale to thousands of robots.
"""

from __future__ import annotations

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("cache")

_HEARTBEAT_PREFIX = "robot:hb:"


class PresenceCache:
    def __init__(self, client: aioredis.Redis) -> None:
        self._redis = client

    @classmethod
    def from_url(cls, url: str | None = None) -> PresenceCache:
        client = aioredis.from_url(
            url or settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        return cls(client)

    async def mark_alive(self, robot_id: str, ttl: int | None = None) -> None:
        await self._redis.set(
            f"{_HEARTBEAT_PREFIX}{robot_id}",
            "1",
            ex=ttl or settings.heartbeat_ttl_seconds,
        )

    async def is_alive(self, robot_id: str) -> bool:
        return bool(await self._redis.exists(f"{_HEARTBEAT_PREFIX}{robot_id}"))

    async def ping(self) -> bool:
        try:
            return bool(await self._redis.ping())
        except Exception as exc:  # noqa: BLE001
            logger.warning("redis_ping_failed", error=str(exc))
            return False

    async def close(self) -> None:
        await self._redis.aclose()
