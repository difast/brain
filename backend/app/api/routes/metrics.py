"""Fleet metrics for the dashboard — summary plus paginated breakdowns.

Scoped to the caller's organization. The summary answers "is the fleet healthy
and is the brain actually thinking"; the breakdowns say where to look when it
is not.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.schemas.common import Page
from app.services.metrics_service import WINDOWS, MetricsService

router = APIRouter(tags=["metrics"])

# Query parameter shared by every endpoint here.
WindowQuery = Query("24h", description=f"One of: {', '.join(WINDOWS)}")


class SeriesPoint(BaseModel):
    start: datetime
    decisions: int


class MetricsSummary(BaseModel):
    window: str
    since: datetime

    decisions: int
    fallback_decisions: int
    # Share of decisions that came from the safe fallback rather than the
    # model — the number that says whether the brain is really running.
    fallback_rate: float
    latency_p50_ms: int | None
    latency_p95_ms: int | None
    avg_confidence: float | None
    # True when the distribution stats came from a capped sample.
    sampled: bool

    executions: int
    executions_failed: int
    execution_success_rate: float | None

    devices_total: int
    devices_online: int
    devices_error: int
    devices_paused: int

    tasks_queued: int
    tasks_in_progress: int
    tasks_completed: int
    tasks_failed: int

    series: list[SeriesPoint]


class DeviceMetrics(BaseModel):
    robot_id: str
    name: str
    robot_type: str
    paused: bool
    last_seen_at: datetime | None
    decisions: int
    avg_confidence: float | None
    avg_latency_ms: int | None
    failed_executions: int


class ModelMetrics(BaseModel):
    provider: str | None
    model: str | None
    decisions: int
    avg_latency_ms: int | None
    avg_confidence: float | None
    fallback: bool


class FailureRow(BaseModel):
    id: str
    robot_id: str
    robot_name: str
    action_type: str | None
    error: str | None
    duration_ms: int | None
    created_at: datetime


@router.get(
    "/metrics/summary",
    response_model=MetricsSummary,
    summary="Fleet health for a time window",
)
async def metrics_summary(
    current_user: CurrentUser,
    session: SessionDep,
    window: str = WindowQuery,
) -> MetricsSummary:
    result = await MetricsService(session).summary(
        current_user.organization_id, window
    )
    return MetricsSummary(
        window=result.window,
        since=result.since,
        decisions=result.decisions,
        fallback_decisions=result.fallback_decisions,
        fallback_rate=result.fallback_rate,
        latency_p50_ms=result.latency_p50_ms,
        latency_p95_ms=result.latency_p95_ms,
        avg_confidence=result.avg_confidence,
        sampled=result.sampled,
        executions=result.executions,
        executions_failed=result.executions_failed,
        execution_success_rate=result.execution_success_rate,
        devices_total=result.devices_total,
        devices_online=result.devices_online,
        devices_error=result.devices_error,
        devices_paused=result.devices_paused,
        tasks_queued=result.tasks_queued,
        tasks_in_progress=result.tasks_in_progress,
        tasks_completed=result.tasks_completed,
        tasks_failed=result.tasks_failed,
        series=[SeriesPoint(**point) for point in result.series],  # type: ignore[arg-type]
    )


@router.get(
    "/metrics/devices",
    response_model=Page[DeviceMetrics],
    summary="Per-device activity, busiest first",
)
async def metrics_by_device(
    current_user: CurrentUser,
    session: SessionDep,
    window: str = WindowQuery,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[DeviceMetrics]:
    items, total = await MetricsService(session).by_device(
        current_user.organization_id, window, limit, offset
    )
    return Page(
        items=[DeviceMetrics(**row) for row in items],  # type: ignore[arg-type]
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/metrics/models",
    response_model=Page[ModelMetrics],
    summary="Which provider and model served the decisions",
)
async def metrics_by_model(
    current_user: CurrentUser,
    session: SessionDep,
    window: str = WindowQuery,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[ModelMetrics]:
    items, total = await MetricsService(session).by_model(
        current_user.organization_id, window, limit, offset
    )
    return Page(
        items=[ModelMetrics(**row) for row in items],  # type: ignore[arg-type]
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/metrics/failures",
    response_model=Page[FailureRow],
    summary="Commands the devices could not carry out",
)
async def metrics_failures(
    current_user: CurrentUser,
    session: SessionDep,
    window: str = WindowQuery,
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[FailureRow]:
    items, total = await MetricsService(session).failures(
        current_user.organization_id, window, limit, offset
    )
    return Page(
        items=[FailureRow(**row) for row in items],  # type: ignore[arg-type]
        total=total,
        limit=limit,
        offset=offset,
    )
