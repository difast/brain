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
        "phone": "+7 999 123-45-67",
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
    assert leads[0]["phone"] == "+7 999 123-45-67"
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
async def test_missing_phone_rejected(client):
    resp = await client.post(f"{API}/leads", json=_payload(phone=""))
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


# --- Qualifying the lead ---------------------------------------------------


@pytest.mark.asyncio
async def test_a_lead_carries_its_segment_and_fleet_size(anon_client, admin_auth):
    resp = await anon_client.post(
        f"{API}/leads",
        json={
            "name": "Пётр",
            "email": "petr@zavod.ru",
            "phone": "+7 900 000-00-00",
            "topic": "pilot",
            "segment": "industry",
            "fleet_size": "21-100",
            "message": "Хотим пилот на складе.",
        },
    )
    assert resp.status_code == 201, resp.text

    listed = await anon_client.get(f"{API}/admin/leads", headers=admin_auth)
    assert listed.status_code == 200
    lead = listed.json()[0]
    assert lead["segment"] == "industry"
    assert lead["fleet_size"] == "21-100"


@pytest.mark.asyncio
async def test_the_new_fields_stay_optional(anon_client, admin_auth):
    """The form may omit them, and older leads have neither."""
    resp = await anon_client.post(
        f"{API}/leads",
        json={
            "name": "Аня",
            "email": "anya@example.com",
            "phone": "+7 900 111-11-11",
            "topic": "press",
            "message": "Комментарий для статьи.",
        },
    )
    assert resp.status_code == 201, resp.text

    listed = await anon_client.get(f"{API}/admin/leads", headers=admin_auth)
    lead = listed.json()[0]
    assert lead["segment"] is None
    assert lead["fleet_size"] is None


@pytest.mark.asyncio
async def test_blank_qualifiers_are_stored_as_absent(anon_client, admin_auth):
    resp = await anon_client.post(
        f"{API}/leads",
        json={
            "name": "Иван",
            "email": "ivan@example.com",
            "phone": "+7 900 222-22-22",
            "topic": "other",
            "segment": "   ",
            "fleet_size": "",
            "message": "Вопрос.",
        },
    )
    assert resp.status_code == 201

    lead = (await anon_client.get(f"{API}/admin/leads", headers=admin_auth)).json()[0]
    assert lead["segment"] is None
    assert lead["fleet_size"] is None
