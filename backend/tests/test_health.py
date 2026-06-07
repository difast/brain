import pytest

from tests.conftest import API


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get(f"{API}/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"]


@pytest.mark.asyncio
async def test_ready(client):
    resp = await client.get(f"{API}/ready")
    assert resp.status_code == 200
    assert resp.json()["checks"]["database"] is True


@pytest.mark.asyncio
async def test_root(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json()["api_prefix"] == API
