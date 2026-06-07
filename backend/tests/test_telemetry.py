import pytest

from tests.conftest import API


async def _register(client, payload):
    return (await client.post(f"{API}/robots/register", json=payload)).json()


@pytest.mark.asyncio
async def test_ingest_and_query_telemetry(client, rover_payload):
    reg = await _register(client, rover_payload)
    headers = {"Authorization": f"Bearer {reg['token']}"}
    robot_id = reg["robot"]["id"]

    resp = await client.post(
        f"{API}/telemetry",
        json={
            "battery": 87.5,
            "speed": 0.4,
            "x": 1.0,
            "y": 2.0,
            "z": 0.0,
            "errors": [],
            "extra": {"temp_c": 35},
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["battery"] == 87.5

    listing = (
        await client.get(f"{API}/telemetry", params={"robot_id": robot_id})
    ).json()
    assert listing["total"] == 1
    assert listing["items"][0]["extra"]["temp_c"] == 35


@pytest.mark.asyncio
async def test_battery_validation(client, rover_payload):
    reg = await _register(client, rover_payload)
    headers = {"Authorization": f"Bearer {reg['token']}"}
    resp = await client.post(
        f"{API}/telemetry", json={"battery": 150}, headers=headers
    )
    assert resp.status_code == 422
