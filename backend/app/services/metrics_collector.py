"""Fills the Prometheus gauges from the database, once per scrape.

The counters in ``app.core.metrics`` are incremented as requests and decisions
happen. The gauges here answer "what does the installation look like right
now", which only the database knows: how many devices exist and in what state,
how deep the task queue is, and — the number this whole exercise exists for —
what share of the last day's decisions came from the model rather than the
fallback.

Unlike ``metrics_service``, nothing here is scoped to an organization. This is
the operator's view of the whole installation.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core import metrics
from app.core.config import settings
from app.models.decision import Decision
from app.models.execution import ActionExecution
from app.models.organization import Organization
from app.models.robot import Robot
from app.models.task import Task
from app.models.user import User
from app.services.metrics_service import SAMPLE_CAP, is_fallback, percentile

# The window the decision gauges describe. Fixed rather than configurable: a
# Prometheus rule reasons about a series, and a series whose meaning depends on
# a server-side setting is a trap.
DECISION_WINDOW_HOURS = 24


def _status_name(status: object) -> str:
    """Enum, plain string or None — always render something scrapeable."""
    if status is None:
        return "unknown"
    return getattr(status, "value", None) or str(status)


async def collect(session: AsyncSession) -> None:
    """Refresh every database-backed gauge. Called on each scrape."""
    with metrics.Stopwatch() as watch:
        metrics.BUILD_INFO.clear()
        metrics.BUILD_INFO.set(
            1,
            version=__version__,
            environment=settings.environment,
            provider=settings.resolved_provider,
            model=settings.claude_model
            if settings.resolved_provider == "claude"
            else settings.openai_model,
        )

        metrics.ORGANIZATIONS.set(
            await session.scalar(select(func.count()).select_from(Organization)) or 0
        )
        metrics.USERS.set(
            await session.scalar(select(func.count()).select_from(User)) or 0
        )

        # Devices. `paused` is a separate flag from `status`, and an operator
        # asking "how many devices are down" needs to see it, so it becomes its
        # own status value rather than hiding inside offline.
        metrics.DEVICES.clear()
        rows = await session.execute(
            select(Robot.status, Robot.paused, func.count()).group_by(
                Robot.status, Robot.paused
            )
        )
        for status, paused, count in rows.all():
            label = "paused" if paused else _status_name(status)
            metrics.DEVICES.inc(count, status=label)

        metrics.TASKS.clear()
        rows = await session.execute(
            select(Task.status, func.count()).group_by(Task.status)
        )
        for status, count in rows.all():
            metrics.TASKS.set(count, status=_status_name(status))

        metrics.EXECUTIONS.clear()
        rows = await session.execute(
            select(ActionExecution.status, func.count()).group_by(
                ActionExecution.status
            )
        )
        for status, count in rows.all():
            metrics.EXECUTIONS.set(count, status=_status_name(status))

        await _collect_decisions(session)

    metrics.SCRAPE_DURATION.set(watch.seconds)


async def _collect_decisions(session: AsyncSession) -> None:
    """Decision volume, fallback share and latency over the last day."""
    since = datetime.now(UTC) - timedelta(hours=DECISION_WINDOW_HOURS)

    metrics.DECISION_LOGS.clear()
    rows = await session.execute(
        select(Decision.provider, func.count())
        .where(Decision.created_at >= since)
        .group_by(Decision.provider)
    )
    model_count = 0
    fallback_count = 0
    for provider, count in rows.all():
        if is_fallback(provider):
            fallback_count += count
        else:
            model_count += count
    # Both series are always emitted, including as 0: a rule that alerts on a
    # rising fallback share must not go stale simply because nothing fell back
    # in the last day.
    metrics.DECISION_LOGS.set(model_count, outcome="model")
    metrics.DECISION_LOGS.set(fallback_count, outcome="fallback")

    latencies = (
        await session.scalars(
            select(Decision.latency_ms)
            .where(Decision.created_at >= since, Decision.latency_ms.is_not(None))
            .order_by(Decision.created_at.desc())
            .limit(SAMPLE_CAP)
        )
    ).all()

    metrics.DECISION_LATENCY_MS.clear()
    if latencies:
        ordered = sorted(int(value) for value in latencies)
        for quantile, fraction in (("0.5", 0.5), ("0.95", 0.95), ("0.99", 0.99)):
            value = percentile(ordered, fraction)
            if value is not None:
                metrics.DECISION_LATENCY_MS.set(value, quantile=quantile)
