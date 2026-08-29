import pytest

from app.core.security import create_admin_token
from tests.conftest import API, SEED_ORG_ID


@pytest.fixture
def admin_auth() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_admin_token()}"}


@pytest.mark.asyncio
async def test_admin_login_wrong_password(client):
    resp = await client.post(f"{API}/admin/login", json={"password": "nope"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_ok(client):
    resp = await client.post(f"{API}/admin/login", json={"password": "mevra2026"})
    assert resp.status_code == 200
    assert resp.json()["token"]


@pytest.mark.asyncio
async def test_admin_endpoints_require_admin_token(anon_client):
    assert (await anon_client.get(f"{API}/admin/organizations")).status_code == 401
    assert (await anon_client.get(f"{API}/admin/invites")).status_code == 401


@pytest.mark.asyncio
async def test_user_token_cannot_reach_admin(client, auth):
    # A normal dashboard user session must not unlock admin endpoints.
    resp = await client.get(f"{API}/admin/organizations", headers=auth)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_and_list_organizations(client, admin_auth):
    created = await client.post(
        f"{API}/admin/organizations",
        json={"name": "Acme Robotics"},
        headers=admin_auth,
    )
    assert created.status_code == 201
    orgs = (await client.get(f"{API}/admin/organizations", headers=admin_auth)).json()
    names = {o["name"] for o in orgs}
    assert {"Mevratek", "Acme Robotics"} <= names


@pytest.mark.asyncio
async def test_invite_flow_end_to_end(client, admin_auth):
    # Issue an invite into the seed organization.
    inv = await client.post(
        f"{API}/admin/invites",
        json={
            "email": "newuser@acme.example",
            "organization_id": SEED_ORG_ID,
            "role": "member",
        },
        headers=admin_auth,
    )
    assert inv.status_code == 201
    token = inv.json()["token"]
    assert token

    # Public lookup shows a valid invite.
    pub = (await client.get(f"{API}/invites/{token}")).json()
    assert pub["valid"] is True
    assert pub["email"] == "newuser@acme.example"
    assert pub["organization_name"] == "Mevratek"

    # Redeem it: set a password, receive a session.
    accepted = await client.post(
        f"{API}/invites/{token}/accept", json={"password": "hunter2secret"}
    )
    assert accepted.status_code == 200
    body = accepted.json()
    assert body["user"]["email"] == "newuser@acme.example"
    assert body["token"]

    # The new account can now log in.
    login = await client.post(
        f"{API}/auth/login",
        json={"email": "newuser@acme.example", "password": "hunter2secret"},
    )
    assert login.status_code == 200

    # The invite is now spent.
    again = await client.post(
        f"{API}/invites/{token}/accept", json={"password": "another-pass"}
    )
    assert again.status_code == 409


@pytest.mark.asyncio
async def test_invite_rejects_existing_email(client, admin_auth):
    resp = await client.post(
        f"{API}/admin/invites",
        json={
            "email": "info@mevratek.ru",  # seeded admin
            "organization_id": SEED_ORG_ID,
            "role": "member",
        },
        headers=admin_auth,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_unknown_invite_token_404(client):
    assert (await client.get(f"{API}/invites/does-not-exist")).status_code == 404
