import base64

import pytest

from tests.conftest import API

# 1x1 px JPEG-ish bytes; content doesn't matter in mock mode.
TINY_IMAGE = base64.b64encode(b"\xff\xd8\xff\xd9").decode()


async def _register(client, payload):
    return (await client.post(f"{API}/robots/register", json=payload)).json()


@pytest.mark.asyncio
async def test_decision_requires_auth(client):
    resp = await client.post(f"{API}/brain/decision", json={"task": "x"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_decision_returns_structured_actions(client, rover_payload):
    reg = await _register(client, rover_payload)
    token = reg["token"]

    resp = await client.post(
        f"{API}/brain/decision",
        json={
            "task": "find and approach the bottle",
            "image_b64": TINY_IMAGE,
            "state": {"battery": 80, "obstacle_distance_m": 1.2},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["goal"]
    assert 0.0 <= body["confidence"] <= 1.0
    assert isinstance(body["actions"], list)
    # Mock returns the first registered command.
    assert body["actions"][0]["type"] == "move_forward"
    assert body["model"] == "mock"


@pytest.mark.asyncio
async def test_decision_logged_and_creates_task(client, rover_payload):
    reg = await _register(client, rover_payload)
    token = reg["token"]
    robot_id = reg["robot"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.post(
        f"{API}/brain/decision",
        json={"task": "patrol the area", "state": {}},
        headers=headers,
    )

    logs = (await client.get(f"{API}/logs", params={"robot_id": robot_id})).json()
    assert logs["total"] == 1
    assert logs["items"][0]["robot_id"] == robot_id

    tasks = (await client.get(f"{API}/tasks", params={"robot_id": robot_id})).json()
    assert tasks["total"] == 1
    assert tasks["items"][0]["description"] == "patrol the area"


@pytest.mark.asyncio
async def test_unsupported_actions_are_filtered(client):
    """A robot with no capabilities should never receive actions."""
    payload = {"name": "armless", "robot_type": "sensor", "capabilities": []}
    reg = await _register(client, payload)
    resp = await client.post(
        f"{API}/brain/decision",
        json={"task": "observe", "state": {}},
        headers={"Authorization": f"Bearer {reg['token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["actions"] == []
