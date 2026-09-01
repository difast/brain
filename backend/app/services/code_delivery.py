"""Emailing a confirmation code, and masking the address it went to.

Shared by every flow that confirms something by email — sign-in, password and
email changes, account deletion — so the "SMTP is down" behaviour is decided in
one place rather than repeated per route.
"""

from __future__ import annotations

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.models.user import User
from app.models.verification_code import CodePurpose
from app.services import email_templates, mailer


def mask_email(email: str) -> str:
    """i***@mevratek.ru — enough to recognise the inbox, not to harvest it."""
    name, _, domain = email.partition("@")
    if not domain:
        return "***"
    head = name[:1] if name else ""
    return f"{head}***@{domain}"


async def send_code(user: User, purpose: CodePurpose, to: str, code: str) -> None:
    """Email a confirmation code, failing the request if it cannot go out.

    Deliberately *not* best-effort: if the code never arrives, the user is
    locked out of whatever they were confirming, and a silent failure would
    leave them staring at a code field with nothing to type.
    """
    subject, html, text = email_templates.verification_code(
        purpose.value, code, settings.code_ttl_minutes
    )
    try:
        await mailer.send_email(to, subject, html, text)
    except mailer.EmailDeliveryError as exc:
        raise ServiceUnavailableError(
            "Не удалось отправить письмо с кодом — почтовый сервер сейчас "
            "недоступен. Попробуйте ещё раз через несколько минут."
        ) from exc
