"""CSV exports of decision logs and telemetry.

Rows are pulled a page at a time and yielded as they are formatted, so an
export of tens of thousands of rows never assembles the whole file in memory.
"""

from __future__ import annotations

import csv
import io
import json
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.memory_service import MemoryService
from app.services.telemetry_service import TelemetryService

# Rows fetched per query, and the ceiling on one export.
PAGE_SIZE = 1_000
MAX_ROWS = 50_000

DECISION_COLUMNS = [
    "created_at",
    "robot_id",
    "task_id",
    "goal",
    "thought",
    "confidence",
    "provider",
    "model",
    "latency_ms",
    "actions",
]

TELEMETRY_COLUMNS = [
    "created_at",
    "robot_id",
    "battery",
    "speed",
    "x",
    "y",
    "z",
    "errors",
    "extra",
]


def _line(values: list[Any]) -> str:
    buffer = io.StringIO()
    csv.writer(buffer, lineterminator="\n").writerow(values)
    return buffer.getvalue()


def _json(value: Any) -> str:
    if value in (None, [], {}):
        return ""
    return json.dumps(value, ensure_ascii=False)


async def decisions_csv(
    session: AsyncSession,
    organization_id: str,
    robot_id: str | None = None,
) -> AsyncIterator[str]:
    service = MemoryService(session)
    yield _line(DECISION_COLUMNS)
    offset = 0
    while offset < MAX_ROWS:
        items, _total = await service.list_decisions(
            organization_id=organization_id,
            robot_id=robot_id,
            limit=PAGE_SIZE,
            offset=offset,
        )
        if not items:
            return
        for d in items:
            yield _line(
                [
                    d.created_at.isoformat(),
                    d.robot_id,
                    d.task_id or "",
                    d.goal,
                    d.thought or "",
                    d.confidence,
                    d.provider or "",
                    d.model or "",
                    d.latency_ms if d.latency_ms is not None else "",
                    _json(d.actions),
                ]
            )
        if len(items) < PAGE_SIZE:
            return
        offset += PAGE_SIZE


async def telemetry_csv(
    session: AsyncSession,
    organization_id: str,
    robot_id: str | None = None,
) -> AsyncIterator[str]:
    service = TelemetryService(session)
    yield _line(TELEMETRY_COLUMNS)
    offset = 0
    while offset < MAX_ROWS:
        items, _total = await service.list(
            organization_id=organization_id,
            robot_id=robot_id,
            limit=PAGE_SIZE,
            offset=offset,
        )
        if not items:
            return
        for t in items:
            yield _line(
                [
                    t.created_at.isoformat(),
                    t.robot_id,
                    t.battery if t.battery is not None else "",
                    t.speed if t.speed is not None else "",
                    t.x if t.x is not None else "",
                    t.y if t.y is not None else "",
                    t.z if t.z is not None else "",
                    _json(t.errors),
                    _json(t.extra),
                ]
            )
        if len(items) < PAGE_SIZE:
            return
        offset += PAGE_SIZE
