"""Email bodies, in the platform's visual language.

Every template returns ``(subject, html, text)``. The HTML uses a single
centred card on a light grey ground with the same graphite palette as the
dashboard and the website — table-based and inline-styled, because mail
clients ignore stylesheets.
"""

from __future__ import annotations

from app.core.config import settings

BRAND = "Mevratek"
SITE_URL = "https://mevratek.ru"
DASHBOARD_URL = "https://app.mevratek.ru"

# Palette, mirrored from the dashboard's globals.css.
_BG = "#f3f4f6"
_PANEL = "#ffffff"
_BORDER = "#e0e3e8"
_TEXT = "#2b303a"
_MUTED = "#6b7280"
_ACCENT = "#374151"


def _layout(heading: str, body_html: str) -> str:
    return f"""\
<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:{_BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" \
style="background:{_BG};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" \
style="max-width:520px;background:{_PANEL};border:1px solid {_BORDER};\
border-radius:14px;overflow:hidden;">
      <tr><td style="padding:22px 28px;border-bottom:1px solid {_BORDER};">
        <span style="font:700 16px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;\
color:{_TEXT};letter-spacing:-0.01em;">&#9678; Mevra<span style="color:{_MUTED};">tek</span></span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 14px;font:600 20px/1.3 -apple-system,Segoe UI,Roboto,\
Arial,sans-serif;color:{_TEXT};">{heading}</h1>
        {body_html}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid {_BORDER};\
font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:{_MUTED};">
        {BRAND} — облачная платформа управления автономными устройствами<br>
        <a href="{SITE_URL}" style="color:{_MUTED};">mevratek.ru</a> &middot;
        <a href="mailto:{settings.mail_from}" style="color:{_MUTED};">{settings.mail_from}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


def _p(text: str) -> str:
    return (
        f'<p style="margin:0 0 12px;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,'
        f'Arial,sans-serif;color:{_TEXT};">{text}</p>'
    )


def _muted(text: str) -> str:
    return (
        f'<p style="margin:14px 0 0;font:400 13px/1.6 -apple-system,Segoe UI,Roboto,'
        f'Arial,sans-serif;color:{_MUTED};">{text}</p>'
    )


def _code_block(code: str) -> str:
    return (
        f'<div style="margin:20px 0;padding:16px;background:{_BG};border:1px solid '
        f'{_BORDER};border-radius:10px;text-align:center;font:700 30px/1 '
        f'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:{_TEXT};'
        f'letter-spacing:8px;">{code}</div>'
    )


def _button(label: str, href: str) -> str:
    return (
        f'<p style="margin:20px 0 0;"><a href="{href}" style="display:inline-block;'
        f'background:{_ACCENT};color:#ffffff;text-decoration:none;padding:11px 20px;'
        f'border-radius:8px;font:600 14px/1 -apple-system,Segoe UI,Roboto,Arial,'
        f'sans-serif;">{label}</a></p>'
    )


# --- Confirmation codes ----------------------------------------------------

_PURPOSE_RU: dict[str, tuple[str, str, str]] = {
    # purpose: (subject, heading, what the code confirms)
    "login": (
        "Код для входа в Mevratek",
        "Код для входа",
        "Введите этот код, чтобы завершить вход в личный кабинет.",
    ),
    "password_change": (
        "Код для смены пароля",
        "Подтверждение смены пароля",
        "Введите этот код, чтобы подтвердить смену пароля.",
    ),
    "email_change": (
        "Код для смены email",
        "Подтверждение нового адреса",
        "Введите этот код, чтобы подтвердить этот адрес как новый email аккаунта.",
    ),
}


def verification_code(purpose: str, code: str, ttl_minutes: int) -> tuple[str, str, str]:
    subject, heading, intro = _PURPOSE_RU.get(purpose, _PURPOSE_RU["login"])
    html = _layout(
        heading,
        _p(intro)
        + _code_block(code)
        + _muted(
            f"Код действует {ttl_minutes} минут. Если вы этого не запрашивали — "
            "просто проигнорируйте письмо, ничего не произойдёт."
        ),
    )
    text = (
        f"{heading}\n\n{intro}\n\nКод: {code}\n\n"
        f"Код действует {ttl_minutes} минут. Если вы этого не запрашивали — "
        f"проигнорируйте письмо.\n\n{BRAND} · {SITE_URL}"
    )
    return subject, html, text


# --- Welcome ---------------------------------------------------------------


def welcome(email: str, organization: str) -> tuple[str, str, str]:
    subject = f"Добро пожаловать в {BRAND}"
    html = _layout(
        "Добро пожаловать",
        _p(f"Здравствуйте! Ваш аккаунт <b>{email}</b> в организации "
           f"<b>{organization}</b> активирован.")
        + _p(
            "В личном кабинете вы можете подключать устройства, ставить им задачи, "
            "смотреть телеметрию в реальном времени и журнал решений AI-движка."
        )
        + _button("Открыть кабинет", DASHBOARD_URL)
        + _muted(
            "Вход подтверждается кодом из письма — так аккаунт защищён, даже если "
            "пароль окажется скомпрометирован."
        ),
    )
    text = (
        f"Добро пожаловать в {BRAND}\n\n"
        f"Ваш аккаунт {email} в организации {organization} активирован.\n\n"
        f"Личный кабинет: {DASHBOARD_URL}\n\n{BRAND} · {SITE_URL}"
    )
    return subject, html, text


# --- Contact-form receipt --------------------------------------------------


def lead_received(name: str) -> tuple[str, str, str]:
    subject = f"{BRAND} — заявка получена"
    greeting = f"Здравствуйте, {name}!" if name else "Здравствуйте!"
    html = _layout(
        "Заявка получена",
        _p(greeting)
        + _p(
            "Мы получили вашу заявку и свяжемся с вами по указанному адресу. "
            "Обычно отвечаем в течение рабочего дня."
        )
        + _muted(
            f"Если вопрос срочный, напишите нам напрямую: {settings.mail_from}"
        ),
    )
    text = (
        f"{greeting}\n\nМы получили вашу заявку и свяжемся с вами по указанному "
        f"адресу. Обычно отвечаем в течение рабочего дня.\n\n"
        f"Срочный вопрос: {settings.mail_from}\n\n{BRAND} · {SITE_URL}"
    )
    return subject, html, text


# --- Newsletter ------------------------------------------------------------


def newsletter(subject: str, body: str) -> tuple[str, str, str]:
    """Wrap an admin-written plain-text body in the standard layout."""
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
    html = _layout(
        subject,
        "".join(_p(p.replace("\n", "<br>")) for p in paragraphs),
    )
    text = f"{subject}\n\n{body}\n\n{BRAND} · {SITE_URL}"
    return subject, html, text
