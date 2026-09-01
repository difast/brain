"""Fleet metrics for the dashboard's /metrics page.

Everything here is scoped to one organization and to a time window, and answers
the questions an operator actually has: is the brain deciding, is it deciding
*itself* or falling back, how fast, and what is failing on the devices.

Portability note: percentiles are computed in Python over a bounded sample
rather than with ``percentile_cont``, which is PostgreSQL-only — the test suite
and small on-premise installs run on SQLite, and a metrics page that only works
on one engine is worse than one that is approximate under extreme load. Counts
are always exact; only the distribution statistics use the sample.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.decision import Decision
from app.models.execution import ActionExecution, ExecutionStatus
from app.models.robot import Robot, RobotStatus
from app.models.task import Task, TaskStatus

# Windows the page offers, in hours.
WINDOWS: dict[str, int] = {"24h": 24, "7d": 24 * 7, "30d": 24 * 30}
DEFAULT_WINDOW = "24h"

# Cap on rows pulled for distribution statistics. Well above what a pilot fleet
# produces in a month; beyond it the numbers are computed from the most recent
# slice and the response says so.
SAMPLE_CAP = 20_000


def window_start(window: str) -> datetime:
    hours = WINDOWS.get(window, WINDOWS[DEFAULT_WINDOW])
    return datetime.now(UTC) - timedelta(hours=hours)


def percentile(sorted_values: list[int], fraction: float) -> int | None:
    """Nearest-rank percentile. Returns None for an empty input."""
    if not sorted_values:
        return None
    last = len(sorted_values) - 1
    index = max(0, min(last, round(fraction * last)))
    return sorted_values[index]


def is_fallback(provider: str | None) -> bool:
    """Did this decision come from the model, or from the safe fallback?

    The engine answers with a deterministic decision when no provider is
    configured ("mock") or when the configured one failed
    ("yandexgpt:fallback"). Both mean the fleet is moving on canned logic, and
    that is the single most important thing this page can tell an operator.
    """
    if not provider:
        return True
    return provider == "mock" or provider.endswith(":fallback")


@dataclass
class Summary:
    window: str
    since: datetime

    decisions: int = 0
    fallback_decisions: int = 0
    latency_p50_ms: int | None = None
    latency_p95_ms: int | None = None
    avg_confidence: float | None = None
    sampled: bool = False

    executions: int = 0
    executions_failed: int = 0

    devices_total: int = 0
    devices_online: int = 0
    devices_error: int = 0
    devices_paused: int = 0

    tasks_queued: int = 0
    tasks_in_progress: int = 0
    tasks_completed: int = 0
    tasks_failed: int = 0

    # Decisions per bucket across the window, oldest first.
    series: list[dict[str, object]] = field(default_factory=list)

    @property
    def fallback_rate(self) -> float:
        return self.fallback_decisions / self.decisions if self.decisions else 0.0

    @property
    def execution_success_rate(self) -> float | None:
        if not self.executions:
            return None
        return (self.executions - self.executions_failed) / self.executions


class MetricsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # Every query joins Robot so the organization scope is enforced in SQL,
    # never assembled in Python.
    def _org_decisions(self, organization_id: str, since: datetime) -> Select:
        return (
            select(Decision)
            .join(Robot, Decision.robot_id == Robot.id)
            .where(
                Robot.organization_id == organization_id,
                Decision.created_at >= since,
            )
        )

    def _org_executions(self, organization_id: str, since: datetime) -> Select:
        return (
            select(ActionExecution)
            .join(Robot, ActionExecution.robot_id == Robot.id)
            .where(
                Robot.organization_id == organization_id,
                ActionExecution.created_at >= since,
            )
        )

    async def _count(self, stmt: Select) -> int:
        return int(
            await self.session.scalar(
                select(func.count()).select_from(stmt.subquery())
            )
            or 0
        )

    async def summary(self, organization_id: str, window: str) -> Summary:
        since = window_start(window)
        result = Summary(window=window, since=since)

        # --- decisions: exact count, sampled distribution ---
        result.decisions = await self._count(
            self._org_decisions(organization_id, since)
        )

        rows = (
            await self.session.execute(
                select(
                    Decision.created_at,
                    Decision.latency_ms,
                    Decision.confidence,
                    Decision.provider,
                )
                .join(Robot, Decision.robot_id == Robot.id)
                .where(
                    Robot.organization_id == organization_id,
                    Decision.created_at >= since,
                )
                .order_by(Decision.created_at.desc())
                .limit(SAMPLE_CAP)
            )
        ).all()
        result.sampled = len(rows) >= SAMPLE_CAP

        latencies: list[int] = []
        confidences: list[float] = []
        for _created_at, latency, confidence, provider in rows:
            if latency is not None:
                latencies.append(int(latency))
            if confidence is not None:
                confidences.append(float(confidence))
            if is_fallback(provider):
                result.fallback_decisions += 1

        latencies.sort()
        result.latency_p50_ms = percentile(latencies, 0.50)
        result.latency_p95_ms = percentile(latencies, 0.95)
        if confidences:
            result.avg_confidence = sum(confidences) / len(confidences)

        result.series = self._bucket([r[0] for r in rows], since, window)

        # --- executions ---
        result.executions = await self._count(
            self._org_executions(organization_id, since)
        )
        result.executions_failed = await self._count(
            self._org_executions(organization_id, since).where(
                ActionExecution.status == ExecutionStatus.failed
            )
        )

        # --- devices (current state, not windowed) ---
        result.devices_total = await self._count(
            select(Robot).where(Robot.organization_id == organization_id)
        )
        result.devices_error = await self._count(
            select(Robot).where(
                Robot.organization_id == organization_id,
                Robot.status == RobotStatus.error,
            )
        )
        result.devices_paused = await self._count(
            select(Robot).where(
                Robot.organization_id == organization_id, Robot.paused.is_(True)
            )
        )
        result.devices_online = await self._online_count(organization_id)

        # --- tasks ---
        for status, attribute in (
            (TaskStatus.pending, "tasks_queued"),
            (TaskStatus.in_progress, "tasks_in_progress"),
            (TaskStatus.completed, "tasks_completed"),
            (TaskStatus.failed, "tasks_failed"),
        ):
            count = await self._count(
                select(Task)
                .join(Robot, Task.robot_id == Robot.id)
                .where(
                    Robot.organization_id == organization_id, Task.status == status
                )
            )
            setattr(result, attribute, count)

        return result

    async def _online_count(self, organization_id: str) -> int:
        """Devices whose heartbeat is still fresh."""
        from app.core.config import settings

        cutoff = datetime.now(UTC) - timedelta(seconds=settings.heartbeat_ttl_seconds)
        return await self._count(
            select(Robot).where(
                Robot.organization_id == organization_id,
                Robot.paused.is_(False),
                Robot.last_seen_at.is_not(None),
                Robot.last_seen_at >= cutoff,
            )
        )

    @staticmethod
    def _bucket(
        timestamps: list[datetime], since: datetime, window: str
    ) -> list[dict[str, object]]:
        """Count decisions per bucket — hourly for a day, daily for longer.

        Bucketed here rather than in SQL because date truncation is spelled
        differently in every engine, and the sample is already in memory.
        """
        hours = WINDOWS.get(window, WINDOWS[DEFAULT_WINDOW])
        bucket_hours = 1 if hours <= 24 else 24
        count = hours // bucket_hours

        edges = [since + timedelta(hours=bucket_hours * i) for i in range(count + 1)]
        counts = [0] * count

        for raw in timestamps:
            moment = raw if raw.tzinfo else raw.replace(tzinfo=UTC)
            index = int((moment - since).total_seconds() // (bucket_hours * 3600))
            if 0 <= index < count:
                counts[index] += 1

        return [
            {"start": edges[i].isoformat(), "decisions": counts[i]}
            for i in range(count)
        ]

    # --- paginated breakdowns ------------------------------------------

    async def by_device(
        self, organization_id: str, window: str, limit: int, offset: int
    ) -> tuple[list[dict[str, object]], int]:
        """Per-device activity, busiest first."""
        since = window_start(window)

        total = await self._count(
            select(Robot).where(Robot.organization_id == organization_id)
        )

        # Aggregate decisions per robot, then attach each robot's own row.
        decisions = (
            select(
                Decision.robot_id.label("robot_id"),
                func.count().label("decisions"),
                func.avg(Decision.confidence).label("avg_confidence"),
                func.avg(Decision.latency_ms).label("avg_latency"),
            )
            .join(Robot, Decision.robot_id == Robot.id)
            .where(
                Robot.organization_id == organization_id, Decision.created_at >= since
            )
            .group_by(Decision.robot_id)
            .subquery()
        )
        failures = (
            select(
                ActionExecution.robot_id.label("robot_id"),
                func.count().label("failed"),
            )
            .join(Robot, ActionExecution.robot_id == Robot.id)
            .where(
                Robot.organization_id == organization_id,
                ActionExecution.created_at >= since,
                ActionExecution.status == ExecutionStatus.failed,
            )
            .group_by(ActionExecution.robot_id)
            .subquery()
        )

        stmt = (
            select(
                Robot,
                func.coalesce(decisions.c.decisions, 0),
                decisions.c.avg_confidence,
                decisions.c.avg_latency,
                func.coalesce(failures.c.failed, 0),
            )
            .outerjoin(decisions, decisions.c.robot_id == Robot.id)
            .outerjoin(failures, failures.c.robot_id == Robot.id)
            .where(Robot.organization_id == organization_id)
            .order_by(
                func.coalesce(decisions.c.decisions, 0).desc(), Robot.created_at.desc()
            )
            .limit(limit)
            .offset(offset)
        )

        rows = (await self.session.execute(stmt)).all()
        items = [
            {
                "robot_id": robot.id,
                "name": robot.name,
                "robot_type": robot.robot_type,
                "paused": robot.paused,
                "last_seen_at": robot.last_seen_at,
                "decisions": int(count or 0),
                "avg_confidence": float(confidence) if confidence is not None else None,
                "avg_latency_ms": int(latency) if latency is not None else None,
                "failed_executions": int(failed or 0),
            }
            for robot, count, confidence, latency, failed in rows
        ]
        return items, total

    async def by_model(
        self, organization_id: str, window: str, limit: int, offset: int
    ) -> tuple[list[dict[str, object]], int]:
        """Which provider and model actually served the decisions."""
        since = window_start(window)

        grouped = (
            select(
                Decision.provider.label("provider"),
                Decision.model.label("model"),
                func.count().label("decisions"),
                func.avg(Decision.latency_ms).label("avg_latency"),
                func.avg(Decision.confidence).label("avg_confidence"),
            )
            .join(Robot, Decision.robot_id == Robot.id)
            .where(
                Robot.organization_id == organization_id, Decision.created_at >= since
            )
            .group_by(Decision.provider, Decision.model)
        )

        total = await self._count(grouped.subquery().select())
        rows = (
            await self.session.execute(
                grouped.order_by(func.count().desc()).limit(limit).offset(offset)
            )
        ).all()

        return [
            {
                "provider": provider,
                "model": model,
                "decisions": int(count or 0),
                "avg_latency_ms": int(latency) if latency is not None else None,
                "avg_confidence": float(confidence) if confidence is not None else None,
                "fallback": is_fallback(provider),
            }
            for provider, model, count, latency, confidence in rows
        ], total

    async def failures(
        self, organization_id: str, window: str, limit: int, offset: int
    ) -> tuple[list[dict[str, object]], int]:
        """Recent failed executions — what the devices could not carry out."""
        since = window_start(window)

        base = (
            select(ActionExecution, Robot.name)
            .join(Robot, ActionExecution.robot_id == Robot.id)
            .where(
                Robot.organization_id == organization_id,
                ActionExecution.created_at >= since,
                ActionExecution.status == ExecutionStatus.failed,
            )
        )
        total = await self._count(
            self._org_executions(organization_id, since).where(
                ActionExecution.status == ExecutionStatus.failed
            )
        )
        rows = (
            await self.session.execute(
                base.order_by(ActionExecution.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()

        return [
            {
                "id": execution.id,
                "robot_id": execution.robot_id,
                "robot_name": robot_name,
                "action_type": execution.action_type,
                "error": execution.error,
                "duration_ms": execution.duration_ms,
                "created_at": execution.created_at,
            }
            for execution, robot_name in rows
        ], total
