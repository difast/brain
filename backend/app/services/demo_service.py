"""Demo device — a simulated "Demo" robot for an out-of-the-box dashboard.

When ``DEMO_MODE`` is on, the platform seeds one online demo device with a few
decision logs and then keeps its telemetry (battery, coordinates, speed)
changing on an interval so the dashboard always has something live to show.
Marked with ``meta.demo = true`` so the UI can label it "Demo".
"""

from __future__ import annotations

import asyncio
import random
from datetime import UTC, datetime

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.core.security import generate_api_key, hash_api_key
from app.dal.translator import ActionTranslator
from app.models.decision import Decision
from app.models.robot import Robot, RobotStatus
from app.models.telemetry import Telemetry

logger = get_logger("demo")

DEMO_NAME = "Demo Rover"
DEMO_CAPS = [
    {"type": "move_forward", "value": {"type": "number", "min": 0, "max": 1}},
    {"type": "turn_left", "value": {"type": "number", "min": 0, "max": 180}},
    {"type": "turn_right", "value": {"type": "number", "min": 0, "max": 180}},
    {"type": "stop"},
    {"type": "camera_capture"},
    {"type": "light_on"},
    {"type": "light_off"},
]

_GOALS = [
    ("patrol the corridor", [{"type": "move_forward", "value": 0.4}]),
    ("inspect the object ahead", [{"type": "camera_capture", "value": None}]),
    ("avoid the obstacle", [{"type": "turn_left", "value": 20}]),
    ("hold position", [{"type": "stop", "value": None}]),
]


def _device_actions(universal: list[dict]) -> list[dict]:
    translated = ActionTranslator.translate(universal, DEMO_CAPS)
    return [a.to_dict() for a in translated.actions]


async def ensure_demo() -> str | None:
    """Create (or revive) the demo device. Returns its id."""
    async with SessionLocal() as s:
        robot = await s.scalar(select(Robot).where(Robot.name == DEMO_NAME))
        now = datetime.now(UTC)
        if robot is None:
            robot = Robot(
                name=DEMO_NAME,
                robot_type="rover",
                api_key_hash=hash_api_key(generate_api_key()),
                status=RobotStatus.online,
                last_seen_at=now,
                capabilities=DEMO_CAPS,
                firmware_version="1.0.0-demo",
                protocol_version="1.0",
                meta={"demo": True},
            )
            s.add(robot)
            await s.flush()
            # Seed a few decisions + an initial telemetry reading.
            for goal, universal in _GOALS:
                s.add(
                    Decision(
                        robot_id=robot.id,
                        goal=goal,
                        thought="[demo] simulated decision",
                        confidence=round(random.uniform(0.6, 0.95), 2),
                        actions=_device_actions(universal),
                        universal_actions=universal,
                        state={"battery": random.randint(60, 95)},
                        model="demo",
                        provider="demo",
                        latency_ms=random.randint(40, 180),
                    )
                )
            s.add(
                Telemetry(
                    robot_id=robot.id,
                    battery=88.0,
                    speed=0.3,
                    x=0.0,
                    y=0.0,
                    z=0.0,
                    extra={"demo": True},
                )
            )
            logger.info("demo_seeded", robot_id=robot.id)
        else:
            robot.status = RobotStatus.online
            robot.last_seen_at = now
            robot.meta = {**(robot.meta or {}), "demo": True}
        await s.commit()
        return robot.id


async def _tick() -> None:
    async with SessionLocal() as s:
        robot = await s.scalar(select(Robot).where(Robot.name == DEMO_NAME))
        if robot is None:
            return
        now = datetime.now(UTC)
        robot.status = RobotStatus.online
        robot.last_seen_at = now  # keep it "online"

        last = await s.scalar(
            select(Telemetry)
            .where(Telemetry.robot_id == robot.id)
            .order_by(Telemetry.created_at.desc())
            .limit(1)
        )
        battery = last.battery if last and last.battery is not None else 90.0
        x = last.x if last and last.x is not None else 0.0
        y = last.y if last and last.y is not None else 0.0
        # Battery slowly drains, occasionally "charges".
        battery = max(15.0, min(100.0, battery + random.uniform(-1.2, 0.4)))
        s.add(
            Telemetry(
                robot_id=robot.id,
                battery=round(battery, 1),
                speed=round(random.uniform(0.0, 0.8), 2),
                x=round(x + random.uniform(-0.5, 0.5), 2),
                y=round(y + random.uniform(-0.5, 0.5), 2),
                z=0.0,
                extra={"demo": True},
            )
        )
        # Occasionally emit a new decision so logs keep moving.
        if random.random() < 0.4:
            goal, universal = random.choice(_GOALS)
            s.add(
                Decision(
                    robot_id=robot.id,
                    goal=goal,
                    thought="[demo] simulated decision",
                    confidence=round(random.uniform(0.6, 0.95), 2),
                    actions=_device_actions(universal),
                    universal_actions=universal,
                    state={"battery": round(battery, 1)},
                    model="demo",
                    provider="demo",
                    latency_ms=random.randint(40, 180),
                )
            )
        await s.commit()


async def run_demo_loop(stop: asyncio.Event) -> None:
    """Background task: keep the demo device live until ``stop`` is set."""
    interval = max(2, settings.demo_interval_seconds)
    while not stop.is_set():
        try:
            await _tick()
        except Exception as exc:  # noqa: BLE001
            logger.warning("demo_tick_failed", error=str(exc))
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except TimeoutError:
            pass
