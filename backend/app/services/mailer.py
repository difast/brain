"""SMTP mailer.

One place that actually puts a message on the wire. Everything else builds
messages (see ``email_templates``) and calls :func:`send_email`.

Transport is chosen by ``SMTP_ENCRYPTION``:
  * ``ssl``      — implicit TLS from the first byte (port 465, SMTPS)
  * ``starttls`` — plain connect, upgraded with STARTTLS (port 587)
  * ``none``     — plain (local relays only)

When SMTP is not configured (``settings.email_enabled`` is false) messages are
logged instead of sent, so dev and tests run without a mail server.
"""

from __future__ import annotations

from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("mailer")


class EmailDeliveryError(Exception):
    """Raised when a message could not be handed to the SMTP server."""


def _build(to: str, subject: str, html: str, text: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = f"{settings.smtp_from_name} <{settings.mail_from}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    return message


async def send_email(to: str, subject: str, html: str, text: str) -> None:
    """Deliver one message. Raises :class:`EmailDeliveryError` on failure."""
    if not settings.email_enabled:
        logger.info("email_skipped_not_configured", to=to, subject=subject)
        return

    message = _build(to, subject, html, text)
    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            use_tls=settings.smtp_encryption == "ssl",
            start_tls=settings.smtp_encryption == "starttls",
            timeout=settings.smtp_timeout_seconds,
        )
    except Exception as exc:  # noqa: BLE001 - any SMTP/network failure
        logger.warning("email_send_failed", to=to, subject=subject, error=str(exc))
        raise EmailDeliveryError(str(exc)) from exc
    logger.info("email_sent", to=to, subject=subject)


async def send_email_quietly(to: str, subject: str, html: str, text: str) -> bool:
    """Best-effort send for non-blocking mail (welcome, lead receipt, newsletter).

    Returns whether it went out; never raises, so a mail problem can't break
    the request or task that triggered it.
    """
    try:
        await send_email(to, subject, html, text)
        return True
    except EmailDeliveryError:
        return False
