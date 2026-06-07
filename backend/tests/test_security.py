import pytest

from app.core.security import (
    create_robot_token,
    decode_robot_token,
    generate_api_key,
    hash_api_key,
    verify_api_key,
)


def test_api_key_hash_roundtrip():
    key = generate_api_key()
    hashed = hash_api_key(key)
    assert key != hashed
    assert verify_api_key(key, hashed)
    assert not verify_api_key("wrong", hashed)


def test_robot_token_roundtrip():
    token = create_robot_token("robot-123", extra={"robot_type": "rover"})
    payload = decode_robot_token(token)
    assert payload["sub"] == "robot-123"
    assert payload["robot_type"] == "rover"
    assert payload["type"] == "robot"


@pytest.mark.asyncio
async def test_invalid_token_rejected(client):
    from tests.conftest import API

    resp = await client.post(
        f"{API}/robots/heartbeat",
        json={"status": "online"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
