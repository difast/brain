"""Device alerts — email an organization when its fleet changes state.

A background watcher compares each device's presence (online / offline /
error) with the state its owners were last told about, and mails the
difference. Alerting on the *change* is what keeps this from becoming noise:
one message when a device drops, one when it comes back, nothing in between.

Paused devices are skipped — being off is the point of pausing them.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.models.robot import Robot, RobotStatus
from app.models.user import User
from app.services import email_templates, mailer

logger = get_logger("alerts")

# Which transitions are worth an email. Anything else (say, first sighting)
# is recorded silently.
_NOTIFY = {"offline", "error", "online"}


def presence_of(robot: Robot) -> str:
    """The device's current state, as the dashboard shows it."""
    if robot.status == RobotStatus.error:
        return "error"
    if robot.last_seen_at is None:
        return "offline"
    last = robot.last_seen_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=UTC)
    cutoff = datetime.now(UTC) - timedelta(seconds=settings.heartbeat_ttl_seconds)
    return "online" if last >= cutoff else "offline"


async def _recipients(session: AsyncSession, organization_id: str) -> list[str]:
    stmt = select(User.email).where(
        User.organization_id == organization_id,
        User.alerts_opt_in.is_(True),
    )
    return list((await session.scalars(stmt)).all())


async def check_once(session: AsyncSession) -> int:
    """One pass over the fleet. Returns how many alerts were sent."""
    robots = list(
        (
            await session.scalars(
                select(Robot).where(Robot.paused.is_(False))
            )
        ).all()
    )
    sent = 0
    for robot in robots:
        current = presence_of(robot)
        if robot.alerted_status == current:
            continue
        first_sighting = robot.alerted_status is None
        robot.alerted_status = current
        if first_sighting or current not in _NOTIFY:
            continue
        subject, html, text = email_templates.device_alert(robot.name, current)
        for email in await _recipients(session, robot.organization_id):
            if await mailer.send_email_quietly(email, subject, html, text):
                sent += 1
        logger.info("device_alert", robot_id=robot.id, state=current)
    await session.commit()
    return sent


async def run_alert_loop(stop: asyncio.Event) -> None:
    """Background task: watch the fleet until ``stop`` is set."""
    interval = max(15, settings.alerts_interval_seconds)
    while not stop.is_set():
        try:
            async with SessionLocal() as session:
                await check_once(session)
        except Exception as exc:  # noqa: BLE001 - a bad pass must not kill it
            logger.warning("alert_pass_failed", error=str(exc))
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except TimeoutError:
            pass
