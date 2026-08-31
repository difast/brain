"""Email-confirmed login, password/email changes, lead receipts, newsletters."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.security import create_admin_token
from app.models.verification_code import CodePurpose, VerificationCode
from tests.conftest import API, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD


def _code_of(message: dict) -> str:
    match = re.search(r"\b(\d{5})\b", message["text"])
    assert match, f"no code in {message['text']!r}"
    return match.group(1)


async def _start_login(client) -> dict:
    resp = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_login_requires_emailed_code(anon_client, mailbox):
    body = await _start_login(anon_client)
    assert body["code_required"] is True
    assert body["token"] is None
    assert body["challenge"]
    assert body["masked_email"] == "i***@mevratek.ru"

    assert len(mailbox) == 1
    assert mailbox[0]["to"] == SEED_ADMIN_EMAIL
    assert "Код для входа" in mailbox[0]["subject"]

    verify = await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": body["challenge"], "code": _code_of(mailbox[0])},
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["token"]
    assert verify.json()["user"]["email"] == SEED_ADMIN_EMAIL


@pytest.mark.asyncio
async def test_first_login_sends_welcome_email_once(anon_client, mailbox):
    body = await _start_login(anon_client)
    await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": body["challenge"], "code": _code_of(mailbox[0])},
    )
    subjects = [m["subject"] for m in mailbox]
    assert any("Добро пожаловать" in s for s in subjects)

    # A second login does not repeat the welcome.
    mailbox.clear()
    body2 = await _start_login(anon_client)
    await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": body2["challenge"], "code": _code_of(mailbox[0])},
    )
    assert not any("Добро пожаловать" in m["subject"] for m in mailbox)


@pytest.mark.asyncio
async def test_wrong_code_counts_down_then_locks_out(anon_client, mailbox):
    body = await _start_login(anon_client)

    for expected_left in (2, 1):
        resp = await anon_client.post(
            f"{API}/auth/login/verify",
            json={"challenge": body["challenge"], "code": "00000"},
        )
        assert resp.status_code == 401
        assert f"Осталось попыток: {expected_left}" in resp.text

    # Third failure spends the budget and locks the purpose.
    resp = await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": body["challenge"], "code": "00000"},
    )
    assert resp.status_code == 429

    # Even the right code no longer works while locked out...
    resp = await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": body["challenge"], "code": _code_of(mailbox[0])},
    )
    assert resp.status_code == 429

    # ...and a fresh code cannot be requested either.
    again = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert again.status_code == 429


@pytest.mark.asyncio
async def test_expired_code_rejected(anon_client, mailbox, session_factory):
    body = await _start_login(anon_client)
    async with session_factory() as session:
        row = await session.scalar(select(VerificationCode))
        row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        await session.commit()

    resp = await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": body["challenge"], "code": _code_of(mailbox[0])},
    )
    assert resp.status_code == 401
    assert "истёк" in resp.text


@pytest.mark.asyncio
async def test_resend_is_rate_limited(anon_client, mailbox):
    await _start_login(anon_client)
    resp = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 429
    assert len(mailbox) == 1


@pytest.mark.asyncio
async def test_login_blocked_when_smtp_is_down(anon_client, broken_mailbox):
    resp = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 503
    assert "недоступен" in resp.text


@pytest.mark.asyncio
async def test_bad_challenge_rejected(anon_client, mailbox):
    resp = await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": "not-a-token", "code": "12345"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_password_change_requires_code(client, auth, mailbox):
    # Without a code the change is refused.
    no_code = await client.patch(
        f"{API}/auth/password",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_password": "new-secret-1",
        },
        headers=auth,
    )
    assert no_code.status_code == 401

    req = await client.post(
        f"{API}/auth/password/request",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert req.status_code == 200
    assert req.json()["sent"] is True
    code = _code_of(mailbox[-1])

    ok = await client.patch(
        f"{API}/auth/password",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_password": "new-secret-1",
            "code": code,
        },
        headers=auth,
    )
    assert ok.status_code == 200

    # The new password is what logs in now.
    started = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": "new-secret-1"},
    )
    assert started.status_code == 200
    assert started.json()["code_required"] is True


@pytest.mark.asyncio
async def test_email_change_code_goes_to_the_new_address(client, auth, mailbox):
    req = await client.post(
        f"{API}/auth/email/request",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_email": "new@acme.example",
        },
        headers=auth,
    )
    assert req.status_code == 200
    assert mailbox[-1]["to"] == "new@acme.example"
    code = _code_of(mailbox[-1])

    # A code issued for one address can't move the account to another.
    wrong_target = await client.patch(
        f"{API}/auth/email",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_email": "other@acme.example",
            "code": code,
        },
        headers=auth,
    )
    assert wrong_target.status_code == 401

    ok = await client.patch(
        f"{API}/auth/email",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_email": "new@acme.example",
            "code": code,
        },
        headers=auth,
    )
    assert ok.status_code == 200
    assert ok.json()["email"] == "new@acme.example"


@pytest.mark.asyncio
async def test_email_change_requires_code(client, auth, mailbox):
    resp = await client.patch(
        f"{API}/auth/email",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_email": "new@acme.example",
        },
        headers=auth,
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_codes_are_scoped_to_their_purpose(
    client, auth, mailbox, session_factory
):
    await client.post(
        f"{API}/auth/password/request",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    async with session_factory() as session:
        row = await session.scalar(select(VerificationCode))
        assert row.purpose == CodePurpose.password_change


@pytest.mark.asyncio
async def test_lead_submission_emails_a_receipt(client, mailbox):
    resp = await client.post(
        f"{API}/leads",
        json={
            "name": "Иван Петров",
            "email": "ivan@acme.example",
            "phone": "+7 999 123-45-67",
            "topic": "pilot",
            "message": "Хотим пилот.",
        },
    )
    assert resp.status_code == 201
    receipts = [m for m in mailbox if m["to"] == "ivan@acme.example"]
    assert len(receipts) == 1
    assert "заявка получена" in receipts[0]["subject"].lower()


@pytest.mark.asyncio
async def test_honeypot_lead_gets_no_receipt(client, mailbox):
    await client.post(
        f"{API}/leads",
        json={
            "name": "Spam",
            "email": "spam@acme.example",
            "phone": "+70000000000",
            "topic": "other",
            "message": "spam",
            "website": "http://spam.example",
        },
    )
    assert not [m for m in mailbox if m["to"] == "spam@acme.example"]


@pytest.mark.asyncio
async def test_newsletter_is_created_and_delivered(client, mailbox, session_factory):
    from app.services import newsletter_service

    admin_auth = {"Authorization": f"Bearer {create_admin_token()}"}
    resp = await client.post(
        f"{API}/admin/newsletters",
        json={"subject": "Обновление платформы", "body": "Первый абзац.\n\nВторой."},
        headers=admin_auth,
    )
    assert resp.status_code == 201
    newsletter_id = resp.json()["id"]

    await newsletter_service.deliver(
        newsletter_id, session_factory=session_factory, gap_seconds=0
    )

    delivered = [m for m in mailbox if m["subject"] == "Обновление платформы"]
    assert [m["to"] for m in delivered] == [SEED_ADMIN_EMAIL]

    listed = (
        await client.get(f"{API}/admin/newsletters", headers=admin_auth)
    ).json()
    assert listed[0]["status"] == "sent"
    assert listed[0]["sent"] == 1
    assert listed[0]["recipients"] == 1


@pytest.mark.asyncio
async def test_newsletter_requires_admin(client, auth):
    resp = await client.post(
        f"{API}/admin/newsletters",
        json={"subject": "x", "body": "y"},
        headers=auth,
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_config_reports_email_confirmation(anon_client, mailbox):
    body = (await anon_client.get(f"{API}/auth/config")).json()
    assert body["email_confirmation"] is True


@pytest.mark.asyncio
async def test_newsletter_consent_is_on_by_default(client, auth):
    me = (await client.get(f"{API}/auth/me", headers=auth)).json()
    assert me["user"]["newsletter_opt_in"] is True


@pytest.mark.asyncio
async def test_newsletter_consent_can_be_turned_off_and_on(client, auth):
    off = await client.patch(
        f"{API}/auth/newsletter", json={"newsletter_opt_in": False}, headers=auth
    )
    assert off.status_code == 200
    assert off.json()["newsletter_opt_in"] is False

    me = (await client.get(f"{API}/auth/me", headers=auth)).json()
    assert me["user"]["newsletter_opt_in"] is False

    on = await client.patch(
        f"{API}/auth/newsletter", json={"newsletter_opt_in": True}, headers=auth
    )
    assert on.json()["newsletter_opt_in"] is True


@pytest.mark.asyncio
async def test_newsletter_skips_users_who_opted_out(
    client, auth, mailbox, session_factory
):
    from app.services import newsletter_service

    await client.patch(
        f"{API}/auth/newsletter", json={"newsletter_opt_in": False}, headers=auth
    )

    admin_auth = {"Authorization": f"Bearer {create_admin_token()}"}
    created = await client.post(
        f"{API}/admin/newsletters",
        json={"subject": "Только подписчикам", "body": "Текст."},
        headers=admin_auth,
    )
    await newsletter_service.deliver(
        created.json()["id"], session_factory=session_factory, gap_seconds=0
    )

    assert not [m for m in mailbox if m["subject"] == "Только подписчикам"]
    listed = (await client.get(f"{API}/admin/newsletters", headers=admin_auth)).json()
    assert listed[0]["recipients"] == 0
    assert listed[0]["sent"] == 0


@pytest.mark.asyncio
async def test_opting_out_does_not_stop_transactional_mail(client, auth, mailbox):
    await client.patch(
        f"{API}/auth/newsletter", json={"newsletter_opt_in": False}, headers=auth
    )
    mailbox.clear()
    resp = await client.post(
        f"{API}/auth/password/request",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert resp.status_code == 200
    assert len(mailbox) == 1


@pytest.mark.asyncio
async def test_newsletter_carries_an_unsubscribe_note(client, mailbox, session_factory):
    from app.services import newsletter_service

    admin_auth = {"Authorization": f"Bearer {create_admin_token()}"}
    created = await client.post(
        f"{API}/admin/newsletters",
        json={"subject": "Новости", "body": "Текст."},
        headers=admin_auth,
    )
    await newsletter_service.deliver(
        created.json()["id"], session_factory=session_factory, gap_seconds=0
    )
    letter = [m for m in mailbox if m["subject"] == "Новости"][0]
    assert "Отказаться от рассылки" in letter["text"]
    assert "Отказаться от рассылки" in letter["html"]
