import pytest

from tests.conftest import API

ARM_ROBOT = {
    "name": "arm-01",
    "robot_type": "arm",
    "capabilities": [
        {"type": "arm_grasp"},
        {"type": "arm_release"},
        {"type": "camera_capture"},
    ],
    "firmware_version": "2.1.0",
    "protocol_version": "1.0",
}


async def _register(client, payload):
    return (await client.post(f"{API}/robots/register", json=payload)).json()


@pytest.mark.asyncio
async def test_device_profile_lists_supported_actions(client):
    reg = await _register(client, ARM_ROBOT)
    profile = (
        await client.get(f"{API}/robots/{reg['robot']['id']}/profile")
    ).json()
    assert profile["firmware_version"] == "2.1.0"
    assert profile["protocol_version"] == "1.0"
    assert "arm_grasp" in profile["supported_commands"]
    actions = {a["type"] for a in profile["supported_actions"]}
    assert {"grasp", "release", "inspect"} <= actions


@pytest.mark.asyncio
async def test_decision_translates_to_device_commands(client):
    reg = await _register(client, ARM_ROBOT)
    headers = {"Authorization": f"Bearer {reg['token']}"}
    resp = await client.post(
        f"{API}/brain/decision",
        json={"task": "inspect the object", "state": {}},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    # Mock picks the first available universal action; it is translated to a
    # concrete device command and carries an action_id.
    assert body["actions"]
    assert body["actions"][0]["action_id"]
    assert body["actions"][0]["type"] in {"arm_grasp", "arm_release", "camera_capture"}
    assert "universal_actions" in body
    assert body["provider"] == "mock"


@pytest.mark.asyncio
async def test_execution_feedback_success_and_failure(client):
    reg = await _register(client, ARM_ROBOT)
    headers = {"Authorization": f"Bearer {reg['token']}"}
    robot_id = reg["robot"]["id"]

    ok = await client.post(
        f"{API}/executions",
        json={"action_id": "a1", "status": "success", "duration_ms": 450},
        headers=headers,
    )
    assert ok.status_code == 201
    assert ok.json()["status"] == "success"

    fail = await client.post(
        f"{API}/executions",
        json={"action_id": "a2", "status": "failed", "error": "object_not_found"},
        headers=headers,
    )
    assert fail.status_code == 201
    assert fail.json()["error"] == "object_not_found"

    listing = (
        await client.get(f"{API}/executions", params={"robot_id": robot_id})
    ).json()
    assert listing["total"] == 2


@pytest.mark.asyncio
async def test_execution_requires_auth(client):
    resp = await client.post(
        f"{API}/executions", json={"action_id": "x", "status": "success"}
    )
    assert resp.status_code == 401
