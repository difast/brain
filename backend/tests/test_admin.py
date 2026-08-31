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


@pytest.mark.asyncio
async def test_delete_empty_organization(client, admin_auth):
    created = await client.post(
        f"{API}/admin/organizations",
        json={"name": "Temp Org"},
        headers=admin_auth,
    )
    org_id = created.json()["id"]

    resp = await client.delete(
        f"{API}/admin/organizations/{org_id}", headers=admin_auth
    )
    assert resp.status_code == 204
    orgs = (await client.get(f"{API}/admin/organizations", headers=admin_auth)).json()
    assert org_id not in {o["id"] for o in orgs}


@pytest.mark.asyncio
async def test_cannot_delete_organization_with_users(client, admin_auth):
    resp = await client.delete(
        f"{API}/admin/organizations/{SEED_ORG_ID}", headers=admin_auth
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_delete_invite(client, admin_auth):
    inv = await client.post(
        f"{API}/admin/invites",
        json={
            "email": "toremove@acme.example",
            "organization_id": SEED_ORG_ID,
            "role": "member",
        },
        headers=admin_auth,
    )
    invite_id = inv.json()["id"]

    resp = await client.delete(
        f"{API}/admin/invites/{invite_id}", headers=admin_auth
    )
    assert resp.status_code == 204
    invites = (await client.get(f"{API}/admin/invites", headers=admin_auth)).json()
    assert invite_id not in {i["id"] for i in invites}


@pytest.mark.asyncio
async def test_delete_user(client, admin_auth):
    inv = await client.post(
        f"{API}/admin/invites",
        json={
            "email": "removable@acme.example",
            "organization_id": SEED_ORG_ID,
            "role": "member",
        },
        headers=admin_auth,
    )
    token = inv.json()["token"]
    accepted = await client.post(
        f"{API}/invites/{token}/accept", json={"password": "hunter2secret"}
    )
    user_id = accepted.json()["user"]["id"]

    resp = await client.delete(f"{API}/admin/users/{user_id}", headers=admin_auth)
    assert resp.status_code == 204
    users = (await client.get(f"{API}/admin/users", headers=admin_auth)).json()
    assert user_id not in {u["id"] for u in users}
