import pytest

from tests.conftest import API


@pytest.mark.asyncio
async def test_generate_list_and_revoke_key(client):
    # Generate
    resp = await client.post(f"{API}/api-keys", json={"name": "alice-app"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["key"].startswith("cbk_")
    assert body["prefix"] == body["key"][:12]
    assert body["revoked"] is False
    key_id = body["id"]

    # List — secret is never returned
    listing = (await client.get(f"{API}/api-keys")).json()
    assert any(k["id"] == key_id for k in listing)
    assert all("key" not in k for k in listing)

    # Revoke
    revoked = await client.delete(f"{API}/api-keys/{key_id}")
    assert revoked.status_code == 200
    assert revoked.json()["revoked"] is True


@pytest.mark.asyncio
async def test_keys_are_unique(client):
    a = (await client.post(f"{API}/api-keys", json={"name": "a"})).json()["key"]
    b = (await client.post(f"{API}/api-keys", json={"name": "b"})).json()["key"]
    assert a != b


@pytest.mark.asyncio
async def test_revoke_missing_key_404(client):
    resp = await client.delete(f"{API}/api-keys/does-not-exist")
    assert resp.status_code == 404
