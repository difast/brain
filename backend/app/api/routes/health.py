"""Health and readiness probes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.config import settings
from app.core.database import get_session
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    return HealthResponse(
        service=settings.app_name, version=__version__, time=datetime.now(UTC)
    )


@router.get("/ready", summary="Readiness probe (checks the database)")
async def ready(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    checks = {"database": False}
    try:
        await session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:  # noqa: BLE001
        pass

    ok = all(checks.values())
    response.status_code = (
        status.HTTP_200_OK if ok else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return {
        "status": "ok" if ok else "degraded",
        "checks": checks,
        "storage_enabled": settings.storage_enabled,
    }
