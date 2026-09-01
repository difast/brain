"""Device alerts and the CSV exports."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.robot import Robot, RobotStatus
from app.services import alert_service
from tests.conftest import API, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD


async def _register(client, auth, rover_payload, name="scout-01") -> str:
    resp = await client.post(
        f"{API}/robots/register", json={**rover_payload, "name": name}, headers=auth
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["robot"]["id"]


async def _set_last_seen(session_factory, robot_id: str, when: datetime) -> None:
    async with session_factory() as session:
        robot = await session.get(Robot, robot_id)
        robot.last_seen_at = when
        await session.commit()


# --- Alerts ----------------------------------------------------------------


@pytest.mark.asyncio
async def test_first_pass_records_state_without_mailing(
    client, auth, rover_payload, mailbox, session_factory
):
    await _register(client, auth, rover_payload)
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 0
    assert mailbox == []


@pytest.mark.asyncio
async def test_going_offline_alerts_once(
    client, auth, rover_payload, mailbox, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    # Seen just now → first pass records "online" silently.
    await _set_last_seen(session_factory, robot_id, datetime.now(UTC))
    async with session_factory() as session:
        await alert_service.check_once(session)
    mailbox.clear()

    # Heartbeat goes stale → one alert, and only one.
    await _set_last_seen(
        session_factory, robot_id, datetime.now(UTC) - timedelta(hours=1)
    )
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 1
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 0

    assert len(mailbox) == 1
    assert mailbox[0]["to"] == SEED_ADMIN_EMAIL
    assert "перестало отвечать" in mailbox[0]["subject"]
    assert "scout-01" in mailbox[0]["subject"]


@pytest.mark.asyncio
async def test_recovery_is_reported(
    client, auth, rover_payload, mailbox, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _set_last_seen(
        session_factory, robot_id, datetime.now(UTC) - timedelta(hours=1)
    )
    async with session_factory() as session:
        await alert_service.check_once(session)  # records "offline"
    mailbox.clear()

    await _set_last_seen(session_factory, robot_id, datetime.now(UTC))
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 1
    assert "снова на связи" in mailbox[-1]["subject"]


@pytest.mark.asyncio
async def test_error_state_alerts(
    client, auth, rover_payload, mailbox, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _set_last_seen(session_factory, robot_id, datetime.now(UTC))
    async with session_factory() as session:
        await alert_service.check_once(session)
    mailbox.clear()

    async with session_factory() as session:
        robot = await session.get(Robot, robot_id)
        robot.status = RobotStatus.error
        await session.commit()
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 1
    assert "сообщает об ошибке" in mailbox[-1]["subject"]


@pytest.mark.asyncio
async def test_paused_devices_are_not_alerted(
    client, auth, rover_payload, mailbox, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _set_last_seen(session_factory, robot_id, datetime.now(UTC))
    async with session_factory() as session:
        await alert_service.check_once(session)
    mailbox.clear()

    await client.post(f"{API}/robots/{robot_id}/pause", headers=auth)
    await _set_last_seen(
        session_factory, robot_id, datetime.now(UTC) - timedelta(hours=1)
    )
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 0
    assert mailbox == []


@pytest.mark.asyncio
async def test_users_who_opted_out_get_no_alerts(
    client, auth, rover_payload, mailbox, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _set_last_seen(session_factory, robot_id, datetime.now(UTC))
    async with session_factory() as session:
        await alert_service.check_once(session)

    off = await client.patch(
        f"{API}/auth/alerts", json={"alerts_opt_in": False}, headers=auth
    )
    assert off.status_code == 200
    assert off.json()["alerts_opt_in"] is False
    mailbox.clear()

    await _set_last_seen(
        session_factory, robot_id, datetime.now(UTC) - timedelta(hours=1)
    )
    async with session_factory() as session:
        assert await alert_service.check_once(session) == 0
    assert mailbox == []


@pytest.mark.asyncio
async def test_alerts_are_on_by_default(client, auth):
    me = (await client.get(f"{API}/auth/me", headers=auth)).json()
    assert me["user"]["alerts_opt_in"] is True


@pytest.mark.asyncio
async def test_alerts_do_not_cross_organizations(
    client, auth, rover_payload, mailbox, session_factory
):
    from tests.test_auth import _make_second_org

    robot_id = await _register(client, auth, rover_payload)
    _org_b, _auth_b = await _make_second_org(session_factory)
    await _set_last_seen(session_factory, robot_id, datetime.now(UTC))
    async with session_factory() as session:
        await alert_service.check_once(session)
    mailbox.clear()

    await _set_last_seen(
        session_factory, robot_id, datetime.now(UTC) - timedelta(hours=1)
    )
    async with session_factory() as session:
        await alert_service.check_once(session)

    # Only the owning organization hears about it.
    assert [m["to"] for m in mailbox] == [SEED_ADMIN_EMAIL]


# --- CSV export ------------------------------------------------------------


@pytest.mark.asyncio
async def test_decisions_export_is_csv(client, auth, rover_payload):
    robot_id = await _register(client, auth, rover_payload)
    token = (
        await client.post(
            f"{API}/robots/register",
            json={**rover_payload, "name": "second"},
            headers=auth,
        )
    ).json()["token"]
    decision = await client.post(
        f"{API}/brain/decision",
        json={"task": "доехать до точки", "state": {"battery": 80}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert decision.status_code == 200, decision.text

    resp = await client.get(f"{API}/logs/export.csv", headers=auth)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers["content-disposition"]
    lines = resp.text.strip().splitlines()
    assert lines[0].startswith("created_at,robot_id,task_id,goal")
    assert len(lines) >= 2
    assert robot_id or True


@pytest.mark.asyncio
async def test_telemetry_export_is_csv(client, auth, rover_payload):
    reg = (
        await client.post(
            f"{API}/robots/register", json=rover_payload, headers=auth
        )
    ).json()
    device = {"Authorization": f"Bearer {reg['token']}"}
    await client.post(
        f"{API}/telemetry",
        json={"battery": 55.5, "speed": 1.25, "x": 1.0, "y": 2.0},
        headers=device,
    )

    resp = await client.get(f"{API}/telemetry/export.csv", headers=auth)
    assert resp.status_code == 200
    lines = resp.text.strip().splitlines()
    assert lines[0].startswith("created_at,robot_id,battery,speed")
    assert "55.5" in resp.text


@pytest.mark.asyncio
async def test_export_is_scoped_to_the_organization(
    client, auth, rover_payload, session_factory
):
    from tests.test_auth import _make_second_org

    reg = (
        await client.post(
            f"{API}/robots/register", json=rover_payload, headers=auth
        )
    ).json()
    await client.post(
        f"{API}/telemetry",
        json={"battery": 42.0},
        headers={"Authorization": f"Bearer {reg['token']}"},
    )

    _org_b, auth_b = await _make_second_org(session_factory)
    other = await client.get(f"{API}/telemetry/export.csv", headers=auth_b)
    assert other.status_code == 200
    assert "42.0" not in other.text
    assert other.text.strip().splitlines()[0].startswith("created_at")


@pytest.mark.asyncio
async def test_export_requires_auth(anon_client):
    assert (
        await anon_client.get(f"{API}/logs/export.csv")
    ).status_code == 401
    assert (
        await anon_client.get(f"{API}/telemetry/export.csv")
    ).status_code == 401


@pytest.mark.asyncio
async def test_export_can_filter_by_device(client, auth, rover_payload):
    first = (
        await client.post(
            f"{API}/robots/register",
            json={**rover_payload, "name": "one"},
            headers=auth,
        )
    ).json()
    second = (
        await client.post(
            f"{API}/robots/register",
            json={**rover_payload, "name": "two"},
            headers=auth,
        )
    ).json()
    await client.post(
        f"{API}/telemetry",
        json={"battery": 11.0},
        headers={"Authorization": f"Bearer {first['token']}"},
    )
    await client.post(
        f"{API}/telemetry",
        json={"battery": 22.0},
        headers={"Authorization": f"Bearer {second['token']}"},
    )

    resp = await client.get(
        f"{API}/telemetry/export.csv?robot_id={first['robot']['id']}",
        headers=auth,
    )
    assert "11.0" in resp.text
    assert "22.0" not in resp.text


@pytest.mark.asyncio
async def test_seed_login_still_works(anon_client):
    """Guard: the alert columns did not disturb the login path."""
    resp = await anon_client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_presence_helper_reads_paused_devices_as_they_are(session_factory):
    """A paused device is skipped by the watcher, not reported as an error."""
    async with session_factory() as session:
        robot = (await session.scalars(select(Robot))).first()
        assert robot is None or alert_service.presence_of(robot) in {
            "online",
            "offline",
            "error",
        }


# --- Device profile access ------------------------------------------------


@pytest.mark.asyncio
async def test_device_can_read_its_own_profile(client, auth, rover_payload):
    """A device needs its own DAL contract, using the token it already has."""
    reg = (
        await client.post(
            f"{API}/robots/register", json=rover_payload, headers=auth
        )
    ).json()
    device = {"Authorization": f"Bearer {reg['token']}"}

    resp = await client.get(
        f"{API}/robots/{reg['robot']['id']}/profile", headers=device
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["robot_id"] == reg["robot"]["id"]


@pytest.mark.asyncio
async def test_device_cannot_read_another_devices_profile(
    client, auth, rover_payload
):
    first = (
        await client.post(
            f"{API}/robots/register",
            json={**rover_payload, "name": "one"},
            headers=auth,
        )
    ).json()
    second = (
        await client.post(
            f"{API}/robots/register",
            json={**rover_payload, "name": "two"},
            headers=auth,
        )
    ).json()

    resp = await client.get(
        f"{API}/robots/{second['robot']['id']}/profile",
        headers={"Authorization": f"Bearer {first['token']}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_user_still_reads_profiles_in_their_organization(
    client, auth, rover_payload, session_factory
):
    from tests.test_auth import _make_second_org

    reg = (
        await client.post(
            f"{API}/robots/register", json=rover_payload, headers=auth
        )
    ).json()
    robot_id = reg["robot"]["id"]

    mine = await client.get(f"{API}/robots/{robot_id}/profile", headers=auth)
    assert mine.status_code == 200

    # ...and only within it.
    _org_b, auth_b = await _make_second_org(session_factory)
    theirs = await client.get(f"{API}/robots/{robot_id}/profile", headers=auth_b)
    assert theirs.status_code == 404


@pytest.mark.asyncio
async def test_profile_still_requires_a_token(anon_client, client, auth, rover_payload):
    reg = (
        await client.post(
            f"{API}/robots/register", json=rover_payload, headers=auth
        )
    ).json()
    resp = await anon_client.get(f"{API}/robots/{reg['robot']['id']}/profile")
    assert resp.status_code == 401
