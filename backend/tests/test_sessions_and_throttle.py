"""Revocable sessions, password reset and login throttling."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.login_throttle import LoginThrottle
from tests.conftest import API, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD


def _code_of(message: dict) -> str:
    match = re.search(r"\b(\d{5})\b", message["text"])
    assert match, f"no code in {message['text']!r}"
    return match.group(1)


async def _login(anon_client) -> str:
    """Log in without email confirmation configured; returns the token."""
    resp = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["code_required"] is False
    return body["token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- Sessions --------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_creates_a_listed_session(anon_client):
    token = await _login(anon_client)
    rows = (
        await anon_client.get(f"{API}/auth/sessions", headers=_auth(token))
    ).json()
    assert len(rows) == 1
    assert rows[0]["current"] is True
    assert rows[0]["ip"]


@pytest.mark.asyncio
async def test_each_login_adds_a_session(anon_client):
    first = await _login(anon_client)
    await _login(anon_client)
    rows = (
        await anon_client.get(f"{API}/auth/sessions", headers=_auth(first))
    ).json()
    assert len(rows) == 2
    assert [r["current"] for r in rows].count(True) == 1


@pytest.mark.asyncio
async def test_revoking_a_session_kills_its_token(anon_client):
    victim = await _login(anon_client)
    keeper = await _login(anon_client)

    victim_id = [
        r["id"]
        for r in (
            await anon_client.get(f"{API}/auth/sessions", headers=_auth(victim))
        ).json()
        if r["current"]
    ][0]

    revoke = await anon_client.delete(
        f"{API}/auth/sessions/{victim_id}", headers=_auth(keeper)
    )
    assert revoke.status_code == 200

    # The revoked token is dead...
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(victim))
    ).status_code == 401
    # ...while the one that did the revoking still works.
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(keeper))
    ).status_code == 200


@pytest.mark.asyncio
async def test_revoke_others_keeps_only_the_caller(anon_client):
    a = await _login(anon_client)
    b = await _login(anon_client)
    c = await _login(anon_client)

    resp = await anon_client.post(
        f"{API}/auth/sessions/revoke-others", headers=_auth(c)
    )
    assert resp.status_code == 200
    assert resp.json()["sessions_closed"] == 2

    for dead in (a, b):
        assert (
            await anon_client.get(f"{API}/auth/me", headers=_auth(dead))
        ).status_code == 401
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(c))
    ).status_code == 200


@pytest.mark.asyncio
async def test_cannot_revoke_another_users_session(
    anon_client, client, session_factory
):
    from tests.test_auth import _make_second_org

    mine = await _login(anon_client)
    mine_id = [
        r["id"]
        for r in (
            await anon_client.get(f"{API}/auth/sessions", headers=_auth(mine))
        ).json()
    ][0]

    _org_b, auth_b = await _make_second_org(session_factory)
    resp = await anon_client.delete(
        f"{API}/auth/sessions/{mine_id}", headers=auth_b
    )
    assert resp.status_code == 404
    # Still alive.
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(mine))
    ).status_code == 200


@pytest.mark.asyncio
async def test_logout_revokes_the_current_session(anon_client):
    token = await _login(anon_client)
    assert (
        await anon_client.post(f"{API}/auth/logout", headers=_auth(token))
    ).status_code == 200
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(token))
    ).status_code == 401


@pytest.mark.asyncio
async def test_password_change_signs_other_devices_out(anon_client):
    other = await _login(anon_client)
    mine = await _login(anon_client)

    resp = await anon_client.patch(
        f"{API}/auth/password",
        json={
            "current_password": SEED_ADMIN_PASSWORD,
            "new_password": "new-secret-1",
        },
        headers=_auth(mine),
    )
    assert resp.status_code == 200
    assert resp.json()["sessions_closed"] == 1

    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(other))
    ).status_code == 401
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(mine))
    ).status_code == 200


# --- Password reset --------------------------------------------------------


async def _login_with_code(anon_client, mailbox) -> str:
    """Two-step login, for tests where email confirmation is configured."""
    start = (
        await anon_client.post(
            f"{API}/auth/login",
            json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
        )
    ).json()
    verify = await anon_client.post(
        f"{API}/auth/login/verify",
        json={"challenge": start["challenge"], "code": _code_of(mailbox[-1])},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()["token"]


@pytest.mark.asyncio
async def test_password_reset_end_to_end(anon_client, mailbox):
    old_session = await _login_with_code(anon_client, mailbox)

    req = await anon_client.post(
        f"{API}/auth/password/reset/request", json={"email": SEED_ADMIN_EMAIL}
    )
    assert req.status_code == 200
    assert req.json()["sent"] is True
    letter = mailbox[-1]
    assert letter["to"] == SEED_ADMIN_EMAIL
    assert "Восстановление пароля" in letter["subject"]

    confirm = await anon_client.post(
        f"{API}/auth/password/reset/confirm",
        json={
            "email": SEED_ADMIN_EMAIL,
            "code": _code_of(letter),
            "new_password": "brand-new-pass",
        },
    )
    assert confirm.status_code == 200

    # Every session from before the reset is gone.
    assert (
        await anon_client.get(f"{API}/auth/me", headers=_auth(old_session))
    ).status_code == 401

    # The new password works, the old one does not.
    assert (
        await anon_client.post(
            f"{API}/auth/login",
            json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
        )
    ).status_code == 401
    ok = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": "brand-new-pass"},
    )
    assert ok.status_code == 200


@pytest.mark.asyncio
async def test_reset_request_does_not_reveal_unknown_accounts(
    anon_client, mailbox
):
    resp = await anon_client.post(
        f"{API}/auth/password/reset/request", json={"email": "ghost@nowhere.example"}
    )
    assert resp.status_code == 200
    assert resp.json()["sent"] is True
    assert resp.json()["masked_email"] is None
    assert mailbox == []


@pytest.mark.asyncio
async def test_reset_confirm_rejects_a_wrong_code(anon_client, mailbox):
    await anon_client.post(
        f"{API}/auth/password/reset/request", json={"email": SEED_ADMIN_EMAIL}
    )
    resp = await anon_client.post(
        f"{API}/auth/password/reset/confirm",
        json={
            "email": SEED_ADMIN_EMAIL,
            "code": "00000",
            "new_password": "brand-new-pass",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reset_unavailable_without_smtp(anon_client):
    resp = await anon_client.post(
        f"{API}/auth/password/reset/request", json={"email": SEED_ADMIN_EMAIL}
    )
    assert resp.status_code == 503


# --- Login throttling ------------------------------------------------------


@pytest.mark.asyncio
async def test_account_locks_out_after_repeated_failures(anon_client):
    for _ in range(settings.login_max_attempts):
        resp = await anon_client.post(
            f"{API}/auth/login",
            json={"email": SEED_ADMIN_EMAIL, "password": "wrong"},
        )
        assert resp.status_code == 401

    # The budget is spent: even the right password is refused now.
    locked = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert locked.status_code == 429
    assert "попыток входа" in locked.text


@pytest.mark.asyncio
async def test_lockout_expires(anon_client, session_factory):
    for _ in range(settings.login_max_attempts):
        await anon_client.post(
            f"{API}/auth/login",
            json={"email": SEED_ADMIN_EMAIL, "password": "wrong"},
        )
    async with session_factory() as session:
        for row in (await session.scalars(select(LoginThrottle))).all():
            row.locked_until = datetime.now(UTC) - timedelta(minutes=1)
        await session.commit()

    ok = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert ok.status_code == 200


@pytest.mark.asyncio
async def test_successful_login_clears_the_counter(anon_client, session_factory):
    for _ in range(settings.login_max_attempts - 1):
        await anon_client.post(
            f"{API}/auth/login",
            json={"email": SEED_ADMIN_EMAIL, "password": "wrong"},
        )
    assert (await _login(anon_client))

    async with session_factory() as session:
        rows = (await session.scalars(select(LoginThrottle))).all()
        assert all(row.failures == 0 for row in rows)
        assert all(row.locked_until is None for row in rows)


@pytest.mark.asyncio
async def test_unknown_emails_still_charge_the_ip_budget(anon_client):
    for _ in range(settings.login_ip_max_attempts):
        resp = await anon_client.post(
            f"{API}/auth/login",
            json={"email": f"ghost{_}@nowhere.example", "password": "wrong"},
        )
        assert resp.status_code == 401

    # Spraying across accounts is what the IP budget exists for.
    sprayed = await anon_client.post(
        f"{API}/auth/login",
        json={"email": "another@nowhere.example", "password": "wrong"},
    )
    assert sprayed.status_code == 429


@pytest.mark.asyncio
async def test_admin_panel_login_is_throttled(anon_client):
    for _ in range(settings.admin_login_max_attempts):
        resp = await anon_client.post(
            f"{API}/admin/login", json={"password": "wrong"}
        )
        assert resp.status_code == 401

    locked = await anon_client.post(
        f"{API}/admin/login", json={"password": "mevra2026"}
    )
    assert locked.status_code == 429
