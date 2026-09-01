"""The Prometheus scrape endpoint.

Deliberately outside the ``/api/v1`` prefix and outside the OpenAPI schema:
``GET /metrics`` is where every Prometheus configuration looks by default, and
this is an operational surface, not part of the product API.

Not to be confused with ``/api/v1/metrics/*``, which serves the dashboard's
metrics page for one organization. This one describes the whole installation
and is read by the operator's monitoring, not by a customer.
"""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import metrics
from app.core.config import settings
from app.core.database import get_session
from app.core.logging import get_logger
from app.services import metrics_collector

logger = get_logger("metrics")

router = APIRouter(tags=["observability"], include_in_schema=False)

# The exposition format's content type. Prometheus accepts text/plain without
# it, but the version parameter is what tells a scraper it is talking to a
# 0.0.4-format endpoint rather than reading an arbitrary text file.
CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


def require_scrape_token(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Authorise a scrape.

    Prometheus sends `authorization: Bearer <token>` when `bearer_token` is set
    on the job, so that is the shape we accept.
    """
    if not settings.metrics_available:
        # A 404 rather than a 403: an endpoint that is switched off should look
        # switched off, and in production an unset METRICS_TOKEN switches it
        # off precisely so operational data is never served unauthenticated.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if not settings.metrics_token_required:
        return

    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    # compare_digest, not ==: a token check that returns early leaks the token
    # one character at a time.
    if not token or not secrets.compare_digest(token, settings.metrics_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid scrape token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get(
    "/metrics",
    response_class=PlainTextResponse,
    dependencies=[Depends(require_scrape_token)],
    summary="Prometheus metrics for the whole installation",
)
async def prometheus_metrics(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlainTextResponse:
    try:
        await metrics_collector.collect(session)
    except Exception as exc:  # noqa: BLE001
        # A database that is down must not take monitoring down with it: the
        # in-process counters (request rate, decision fallbacks) are still
        # worth serving, and they are what an alert would fire on.
        logger.warning("metrics_collect_failed", error=str(exc))

    return PlainTextResponse(metrics.render(), media_type=CONTENT_TYPE)
