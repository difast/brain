"""HTTP middleware: request-id binding, access logging and metrics."""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core import metrics
from app.core.sentry import bind_request

logger = structlog.get_logger("http")


def route_label(request: Request) -> str:
    """The route template a request matched — never the raw path.

    ``/api/v1/robots/{robot_id}`` is one time series; the raw paths would be
    one series per device, which is how a Prometheus falls over. Anything that
    matched no route (404 probes, scanners) collapses into a single bucket.
    """
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) and path else "<unmatched>"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Bind a request id to the structlog contextvars and log each request."""

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        bind_request(request_id, request.url.path)

        start = time.perf_counter()
        metrics.HTTP_IN_FLIGHT.inc()
        try:
            response = await call_next(request)
        except Exception:
            # The route is only in the scope once matching has happened, which
            # it has by the time a handler raises.
            metrics.HTTP_EXCEPTIONS.inc(route=route_label(request))
            metrics.HTTP_IN_FLIGHT.dec()
            logger.exception("request_failed")
            raise
        metrics.HTTP_IN_FLIGHT.dec()

        duration = time.perf_counter() - start
        route = route_label(request)
        metrics.HTTP_REQUESTS.inc(
            method=request.method, route=route, status=str(response.status_code)
        )
        metrics.HTTP_DURATION.observe(duration, method=request.method, route=route)

        duration_ms = round(duration * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response
