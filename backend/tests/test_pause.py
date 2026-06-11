import pytest

from tests.conftest import API


async def _register(client, payload):
    return (await client.post(f"{API}/robots/register", json=payload)).json()


@pytest.mark.asyncio
async def test_pause_and_resume_robot(client, rover_payload):
    reg = await _register(client, rover_payload)
    robot_id = reg["robot"]["id"]
    headers = {"Authorization": f"Bearer {reg['token']}"}

    # Online after heartbeat.
    await client.post(
        f"{API}/robots/heartbeat", json={"status": "online"}, headers=headers
    )

    paused = await client.post(f"{API}/robots/{robot_id}/pause")
    assert paused.status_code == 200
    assert paused.json()["paused"] is True
    assert paused.json()["status"] == "offline"

    # Paused device is reported offline in the list.
    listing = (await client.get(f"{API}/robots")).json()
    me = next(r for r in listing["items"] if r["id"] == robot_id)
    assert me["status"] == "offline"
    assert me["paused"] is True

    resumed = await client.post(f"{API}/robots/{robot_id}/resume")
    assert resumed.status_code == 200
    assert resumed.json()["paused"] is False


@pytest.mark.asyncio
async def test_paused_device_rejects_decisions(client, rover_payload):
    reg = await _register(client, rover_payload)
    robot_id = reg["robot"]["id"]
    headers = {"Authorization": f"Bearer {reg['token']}"}

    await client.post(f"{API}/robots/{robot_id}/pause")
    resp = await client.post(
        f"{API}/brain/decision",
        json={"task": "go", "state": {}},
        headers=headers,
    )
    assert resp.status_code == 409

    await client.post(f"{API}/robots/{robot_id}/resume")
    ok = await client.post(
        f"{API}/brain/decision",
        json={"task": "go", "state": {}},
        headers=headers,
    )
    assert ok.status_code == 200
