import pytest

from app.core.security import create_admin_token
from tests.conftest import API


@pytest.fixture
def admin_auth() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_admin_token()}"}


def _payload(**over):
    base = {
        "name": "Иван Петров",
        "email": "ivan@acme.example",
        "organization": "ООО Акме",
        "topic": "pilot",
        "message": "Хотим подключить складскую тележку.",
    }
    base.update(over)
    return base


@pytest.mark.asyncio
async def test_public_can_submit_lead(client, admin_auth):
    resp = await client.post(f"{API}/leads", json=_payload())
    assert resp.status_code == 201
    assert resp.json()["ok"] is True

    leads = (await client.get(f"{API}/admin/leads", headers=admin_auth)).json()
    assert len(leads) == 1
    assert leads[0]["email"] == "ivan@acme.example"
    assert leads[0]["organization"] == "ООО Акме"


@pytest.mark.asyncio
async def test_leads_require_admin(anon_client):
    assert (await anon_client.get(f"{API}/admin/leads")).status_code == 401


@pytest.mark.asyncio
async def test_user_session_cannot_read_leads(client, auth):
    resp = await client.get(f"{API}/admin/leads", headers=auth)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_honeypot_is_dropped_silently(client, admin_auth):
    resp = await client.post(
        f"{API}/leads", json=_payload(website="http://spam.example")
    )
    assert resp.status_code == 201  # opaque success
    leads = (await client.get(f"{API}/admin/leads", headers=admin_auth)).json()
    assert leads == []


@pytest.mark.asyncio
async def test_invalid_email_rejected(client):
    resp = await client.post(f"{API}/leads", json=_payload(email="nope"))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_delete_lead(client, admin_auth):
    await client.post(f"{API}/leads", json=_payload())
    lead_id = (await client.get(f"{API}/admin/leads", headers=admin_auth)).json()[0][
        "id"
    ]
    resp = await client.delete(f"{API}/admin/leads/{lead_id}", headers=admin_auth)
    assert resp.status_code == 204
    assert (await client.get(f"{API}/admin/leads", headers=admin_auth)).json() == []
