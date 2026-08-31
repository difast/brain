import pytest

from app.core.security import create_user_token
from app.models.organization import Organization
from app.models.user import User, UserRole
from tests.conftest import (
    API,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
)


@pytest.mark.asyncio
async def test_login_success(client):
    resp = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["user"]["email"] == SEED_ADMIN_EMAIL
    assert body["user"]["role"] == "admin"
    assert body["organization"]["name"] == "Mevratek"


@pytest.mark.asyncio
async def test_login_is_case_insensitive_on_email(client):
    resp = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL.upper(), "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_login_wrong_password_401(client):
    resp = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": "nope"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_401(client):
    resp = await client.post(
        f"{API}/auth/login",
        json={"email": "ghost@example.com", "password": "whatever"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client, auth):
    resp = await client.get(f"{API}/auth/me", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == SEED_ADMIN_EMAIL


@pytest.mark.asyncio
async def test_change_password_success_and_relogin(client, auth):
    resp = await client.patch(
        f"{API}/auth/password",
        json={"current_password": SEED_ADMIN_PASSWORD, "new_password": "new-secret-1"},
        headers=auth,
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # The old password no longer works...
    old = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert old.status_code == 401

    # ...and the new one does.
    new = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": "new-secret-1"},
    )
    assert new.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current_rejected(client, auth):
    resp = await client.patch(
        f"{API}/auth/password",
        json={"current_password": "not-it", "new_password": "new-secret-1"},
        headers=auth,
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password_too_short_rejected(client, auth):
    resp = await client.patch(
        f"{API}/auth/password",
        json={"current_password": SEED_ADMIN_PASSWORD, "new_password": "abc"},
        headers=auth,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_change_password_requires_auth(anon_client):
    resp = await anon_client.patch(
        f"{API}/auth/password",
        json={"current_password": "x", "new_password": "new-secret-1"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_requires_auth(anon_client):
    # No Authorization header → 401 on protected endpoints.
    assert (await anon_client.get(f"{API}/robots")).status_code == 401
    assert (await anon_client.get(f"{API}/logs")).status_code == 401
    assert (await anon_client.get(f"{API}/tasks")).status_code == 401
    assert (await anon_client.get(f"{API}/telemetry")).status_code == 401
    assert (await anon_client.get(f"{API}/executions")).status_code == 401
    assert (await anon_client.get(f"{API}/api-keys")).status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_401(client, rover_payload):
    resp = await client.get(
        f"{API}/robots", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert resp.status_code == 401


async def _make_second_org(session_factory) -> str:
    """Create a second organization + user; return a bearer header value."""
    org_id = "0000000000000000000000000000000b"
    user_id = "0000000000000000000000000000000c"
    async with session_factory() as s:
        s.add(Organization(id=org_id, name="Acme Robotics"))
        await s.flush()
        s.add(
            User(
                id=user_id,
                email="ops@acme.example",
                password="secret",
                organization_id=org_id,
                role=UserRole.admin,
            )
        )
        await s.commit()
    token = create_user_token(user_id, org_id, "admin")
    return org_id, {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_data_is_isolated_between_organizations(
    client, session_factory, auth, rover_payload
):
    # Org A (seeded admin) registers a device.
    reg_a = await client.post(
        f"{API}/robots/register", json=rover_payload, headers=auth
    )
    robot_a = reg_a.json()["robot"]["id"]

    # Org B registers its own device.
    _org_b, auth_b = await _make_second_org(session_factory)
    payload_b = {**rover_payload, "name": "acme-bot"}
    reg_b = await client.post(
        f"{API}/robots/register", json=payload_b, headers=auth_b
    )
    robot_b = reg_b.json()["robot"]["id"]

    # A sees only its own device; B sees only its own.
    list_a = (await client.get(f"{API}/robots", headers=auth)).json()
    list_b = (await client.get(f"{API}/robots", headers=auth_b)).json()
    ids_a = {r["id"] for r in list_a["items"]}
    ids_b = {r["id"] for r in list_b["items"]}
    assert robot_a in ids_a and robot_b not in ids_a
    assert robot_b in ids_b and robot_a not in ids_b

    # A cannot fetch B's device by id (reported as 404, not 403).
    assert (
        await client.get(f"{API}/robots/{robot_b}", headers=auth)
    ).status_code == 404
    # A cannot pause B's device.
    assert (
        await client.post(f"{API}/robots/{robot_b}/pause", headers=auth)
    ).status_code == 404
    # A cannot rename B's device.
    assert (
        await client.patch(
            f"{API}/robots/{robot_b}", json={"name": "hijack"}, headers=auth
        )
    ).status_code == 404
    # A cannot assign a task to B's device.
    assert (
        await client.post(
            f"{API}/tasks",
            json={"robot_id": robot_b, "description": "x", "priority": 1},
            headers=auth,
        )
    ).status_code == 404


@pytest.mark.asyncio
async def test_api_keys_are_isolated(client, session_factory, auth):
    # Org A creates a key.
    await client.post(f"{API}/api-keys", json={"name": "a-key"}, headers=auth)
    _org_b, auth_b = await _make_second_org(session_factory)
    await client.post(f"{API}/api-keys", json={"name": "b-key"}, headers=auth_b)

    a_keys = (await client.get(f"{API}/api-keys", headers=auth)).json()
    b_keys = (await client.get(f"{API}/api-keys", headers=auth_b)).json()
    assert {k["name"] for k in a_keys} == {"a-key"}
    assert {k["name"] for k in b_keys} == {"b-key"}


TINY_PNG = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0l"
    "EQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.mark.asyncio
async def test_change_email_success_and_relogin(client, auth):
    resp = await client.patch(
        f"{API}/auth/email",
        json={"current_password": SEED_ADMIN_PASSWORD, "new_email": "new@acme.example"},
        headers=auth,
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "new@acme.example"

    old = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert old.status_code == 401

    new = await client.post(
        f"{API}/auth/login",
        json={"email": "new@acme.example", "password": SEED_ADMIN_PASSWORD},
    )
    assert new.status_code == 200


@pytest.mark.asyncio
async def test_change_email_wrong_password_rejected(client, auth):
    resp = await client.patch(
        f"{API}/auth/email",
        json={"current_password": "not-it", "new_email": "new@acme.example"},
        headers=auth,
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_change_email_duplicate_rejected(client, session_factory, auth):
    await _make_second_org(session_factory)
    resp = await client.patch(
        f"{API}/auth/email",
        json={"current_password": SEED_ADMIN_PASSWORD, "new_email": "ops@acme.example"},
        headers=auth,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_change_email_invalid_rejected(client, auth):
    resp = await client.patch(
        f"{API}/auth/email",
        json={"current_password": SEED_ADMIN_PASSWORD, "new_email": "nope"},
        headers=auth,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_avatar_set_and_clear(client, auth):
    set_resp = await client.patch(
        f"{API}/auth/avatar", json={"avatar": TINY_PNG}, headers=auth
    )
    assert set_resp.status_code == 200
    assert set_resp.json()["avatar"] == TINY_PNG

    me = (await client.get(f"{API}/auth/me", headers=auth)).json()
    assert me["user"]["avatar"] == TINY_PNG

    clear_resp = await client.patch(
        f"{API}/auth/avatar", json={"avatar": None}, headers=auth
    )
    assert clear_resp.status_code == 200
    assert clear_resp.json()["avatar"] is None


@pytest.mark.asyncio
async def test_avatar_rejects_non_data_url(client, auth):
    resp = await client.patch(
        f"{API}/auth/avatar",
        json={"avatar": "https://evil.example/x.png"},
        headers=auth,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_activity_log_records_events_and_paginates(client, auth):
    # Beyond the seeded login used by the `client`/`auth` fixtures, generate a
    # few more events: a failed login, a successful login, a password change.
    await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": "wrong"},
    )
    await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    await client.patch(
        f"{API}/auth/password",
        json={"current_password": SEED_ADMIN_PASSWORD, "new_password": "new-secret-1"},
        headers=auth,
    )

    page1 = (
        await client.get(f"{API}/auth/activity?limit=2&offset=0", headers=auth)
    ).json()
    assert page1["limit"] == 2
    assert page1["offset"] == 0
    assert len(page1["items"]) == 2
    assert page1["total"] >= 3
    # Most recent first.
    assert page1["items"][0]["action"] == "password_changed"

    actions = {x["action"] for x in page1["items"]}
    assert actions <= {
        "login",
        "login_failed",
        "password_changed",
        "email_changed",
        "avatar_changed",
    }

    page2 = (
        await client.get(f"{API}/auth/activity?limit=2&offset=2", headers=auth)
    ).json()
    assert len(page2["items"]) >= 1
    assert {i["id"] for i in page1["items"]}.isdisjoint(
        {i["id"] for i in page2["items"]}
    )


@pytest.mark.asyncio
async def test_activity_requires_auth(anon_client):
    resp = await anon_client.get(f"{API}/auth/activity")
    assert resp.status_code == 401
