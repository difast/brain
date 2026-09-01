"""Sentry initialisation.

Opt-in the same way SMTP and object storage are: with no ``SENTRY_DSN`` set,
nothing is imported, nothing is sent, and there is no overhead. With one set,
unhandled exceptions and structlog errors reach Sentry with the request id
already attached, so an alert can be traced back to a specific request in the
application log.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from app import __version__
from app.core.config import settings
from app.core.logging import get_logger

if TYPE_CHECKING:
    # Only for the annotations below — importing sentry_sdk at runtime
    # would defeat the point of making it opt-in.
    from sentry_sdk.types import Event, Hint

logger = get_logger("sentry")

# Endpoints that are noise in an error tracker: the probes a load balancer
# hammers, and the scrape endpoint itself.
_IGNORED_TRANSACTIONS = frozenset({"/health", "/ready", "/metrics"})


def _before_send(event: Event, hint: Hint) -> Event | None:
    """Drop what should not leave the installation.

    Request bodies on this API carry camera frames and telemetry, and the
    Authorization header carries a device token. Sentry is asked not to gather
    them (`send_default_pii=False`), and this strips what still slips through.
    """
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
        request.pop("cookies", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            for name in list(headers):
                if name.lower() in {"authorization", "cookie", "x-api-key"}:
                    headers[name] = "[stripped]"
    return event


def _traces_sampler(context: dict[str, Any]) -> float:
    """Never trace the probes; sample everything else at the configured rate."""
    asgi_scope = context.get("asgi_scope") or {}
    path = asgi_scope.get("path", "")
    if path in _IGNORED_TRANSACTIONS:
        return 0.0
    return settings.sentry_traces_sample_rate


def configure_sentry() -> bool:
    """Initialise Sentry if a DSN is configured. Returns whether it was.

    A missing ``sentry-sdk`` is a warning, not a crash: the package is in
    requirements.txt, but an installation that stripped it should still boot.
    """
    if not settings.sentry_enabled:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.asyncio import AsyncioIntegration
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:  # pragma: no cover - depends on the install
        logger.warning("sentry_sdk_missing", hint="pip install sentry-sdk")
        return False

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment or settings.environment,
        release=f"mevratek@{__version__}",
        send_default_pii=settings.sentry_send_default_pii,
        traces_sampler=_traces_sampler,
        before_send=_before_send,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
            AsyncioIntegration(),
            # Errors logged through stdlib logging (which structlog routes
            # into) become Sentry events; anything below is a breadcrumb.
            LoggingIntegration(level=None, event_level=logging.ERROR),
        ],
    )
    logger.info(
        "sentry_enabled",
        environment=settings.sentry_environment or settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
    )
    return True


def bind_request(request_id: str, path: str) -> None:
    """Tag the current Sentry scope so an event names its request.

    A no-op when Sentry is off, so the middleware can call it unconditionally.
    """
    if not settings.sentry_enabled:
        return
    try:
        import sentry_sdk
    except ImportError:  # pragma: no cover - depends on the install
        return
    scope = sentry_sdk.get_current_scope()
    scope.set_tag("request_id", request_id)
    scope.set_tag("path", path)
