import pytest

from tests.conftest import API


@pytest.mark.asyncio
async def test_register_returns_token_and_key(client, rover_payload):
    resp = await client.post(f"{API}/robots/register", json=rover_payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["api_key"].startswith("rbt_")
    assert body["token"]
    assert body["robot"]["robot_type"] == "rover"
    assert len(body["robot"]["capabilities"]) == 2


@pytest.mark.asyncio
async def test_rename_device(client, rover_payload):
    reg = (await client.post(f"{API}/robots/register", json=rover_payload)).json()
    robot_id = reg["robot"]["id"]

    resp = await client.patch(
        f"{API}/robots/{robot_id}", json={"name": "Склад-1 · тележка"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Склад-1 · тележка"

    fetched = (await client.get(f"{API}/robots/{robot_id}")).json()
    assert fetched["name"] == "Склад-1 · тележка"


@pytest.mark.asyncio
async def test_rename_rejects_empty(client, rover_payload):
    reg = (await client.post(f"{API}/robots/register", json=rover_payload)).json()
    robot_id = reg["robot"]["id"]
    resp = await client.patch(f"{API}/robots/{robot_id}", json={"name": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_heartbeat_requires_auth(client):
    resp = await client.post(f"{API}/robots/heartbeat", json={"status": "online"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_heartbeat_marks_online(client, rover_payload):
    reg = (await client.post(f"{API}/robots/register", json=rover_payload)).json()
    token = reg["token"]
    robot_id = reg["robot"]["id"]

    resp = await client.post(
        f"{API}/robots/heartbeat",
        json={"status": "online"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["robot_id"] == robot_id

    listing = (await client.get(f"{API}/robots")).json()
    statuses = {r["id"]: r["status"] for r in listing["items"]}
    assert statuses[robot_id] == "online"


@pytest.mark.asyncio
async def test_get_robot_and_404(client, rover_payload):
    reg = (await client.post(f"{API}/robots/register", json=rover_payload)).json()
    robot_id = reg["robot"]["id"]

    ok = await client.get(f"{API}/robots/{robot_id}")
    assert ok.status_code == 200

    missing = await client.get(f"{API}/robots/does-not-exist")
    assert missing.status_code == 404
    assert missing.json()["code"] == "robot_not_found"
