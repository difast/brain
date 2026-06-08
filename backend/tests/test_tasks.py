import pytest

from tests.conftest import API


async def _register(client, payload):
    return (await client.post(f"{API}/robots/register", json=payload)).json()


@pytest.mark.asyncio
async def test_assign_and_list_task(client, rover_payload):
    reg = await _register(client, rover_payload)
    robot_id = reg["robot"]["id"]

    resp = await client.post(
        f"{API}/tasks",
        json={"robot_id": robot_id, "description": "bring the box", "priority": 5},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["priority"] == 5
    assert body["source"] == "assigned"

    listing = (await client.get(f"{API}/tasks", params={"robot_id": robot_id})).json()
    assert listing["total"] == 1


@pytest.mark.asyncio
async def test_assign_to_missing_robot_404(client):
    resp = await client.post(
        f"{API}/tasks", json={"robot_id": "nope", "description": "x"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_queue_order_and_pull_next(client, rover_payload):
    reg = await _register(client, rover_payload)
    robot_id = reg["robot"]["id"]
    headers = {"Authorization": f"Bearer {reg['token']}"}

    await client.post(
        f"{API}/tasks",
        json={"robot_id": robot_id, "description": "low", "priority": 1},
    )
    await client.post(
        f"{API}/tasks",
        json={"robot_id": robot_id, "description": "high", "priority": 9},
    )

    # Robot pulls the highest-priority task first; it becomes in_progress.
    pulled = await client.get(f"{API}/tasks/next", headers=headers)
    assert pulled.status_code == 200
    task = pulled.json()
    assert task["description"] == "high"
    assert task["status"] == "in_progress"

    # Robot reports completion.
    done = await client.post(
        f"{API}/tasks/{task['id']}/result",
        json={"status": "completed", "result": "delivered"},
        headers=headers,
    )
    assert done.status_code == 200
    assert done.json()["status"] == "completed"
    assert done.json()["result"] == "delivered"


@pytest.mark.asyncio
async def test_next_requires_auth_and_returns_204_when_empty(client, rover_payload):
    # No auth.
    assert (await client.get(f"{API}/tasks/next")).status_code == 401
    # Authed but no queued tasks → 204.
    reg = await _register(client, rover_payload)
    headers = {"Authorization": f"Bearer {reg['token']}"}
    resp = await client.get(f"{API}/tasks/next", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_report_result_rejects_foreign_task(client, rover_payload):
    reg_a = await _register(client, rover_payload)
    reg_b = await _register(
        client, {"name": "b", "robot_type": "rover", "capabilities": []}
    )
    task = (
        await client.post(
            f"{API}/tasks",
            json={"robot_id": reg_a["robot"]["id"], "description": "x"},
        )
    ).json()
    # Robot B tries to complete robot A's task.
    resp = await client.post(
        f"{API}/tasks/{task['id']}/result",
        json={"status": "completed"},
        headers={"Authorization": f"Bearer {reg_b['token']}"},
    )
    assert resp.status_code == 409
