"""Yandex SmartCaptcha server-side validation.

The dashboard login widget produces a one-time token; before authenticating we
validate it against Yandex with the server (secret) key. When no server key is
configured the check is disabled — login proceeds without a captcha (dev/tests).

Yandex guidance: on a transport error to the validation endpoint, let the user
through (fail-open) rather than locking everyone out during a captcha outage. A
token that Yandex explicitly reports as invalid is rejected (fail-closed).
"""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("captcha")


async def verify_captcha(token: str | None, ip: str | None = None) -> bool:
    """Return True if the captcha token is valid (or the check is disabled)."""
    if not settings.captcha_enabled:
        return True
    if not token:
        return False

    data = {"secret": settings.yandex_captcha_server_key, "token": token}
    if ip:
        data["ip"] = ip
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                settings.yandex_captcha_validate_url, data=data
            )
        resp.raise_for_status()
        status = resp.json().get("status")
    except Exception as exc:  # noqa: BLE001 - network/parse errors → fail-open
        logger.warning("captcha_validate_unavailable", error=str(exc))
        return True
    if status != "ok":
        logger.info("captcha_rejected", status=status)
        return False
    return True
