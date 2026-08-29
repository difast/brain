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
