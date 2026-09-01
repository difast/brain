"""Fleet metrics — the numbers the /metrics page reports.

The one that matters most is the fallback rate: it is the difference between
"the model is deciding" and "the model is down and the platform is improvising",
and nothing else in the product surfaces it.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.models.decision import Decision
from app.models.execution import ActionExecution, ExecutionStatus
from app.services.metrics_service import MetricsService, _is_fallback
from tests.conftest import API


async def _register(client, auth, rover_payload, name="metric-bot") -> str:
    resp = await client.post(
        f"{API}/robots/register", json={**rover_payload, "name": name}, headers=auth
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["robot"]["id"]


async def _add_decision(
    session_factory,
    robot_id: str,
    *,
    provider: str | None = "yandexgpt",
    latency: int = 100,
    confidence: float = 0.8,
    age_hours: float = 0.0,
) -> None:
    async with session_factory() as s:
        s.add(
            Decision(
                robot_id=robot_id,
                goal="g",
                confidence=confidence,
                actions=[],
                universal_actions=[],
                state={},
                provider=provider,
                model=provider,
                latency_ms=latency,
                created_at=datetime.now(UTC) - timedelta(hours=age_hours),
            )
        )
        await s.commit()


async def _add_execution(
    session_factory, robot_id: str, *, failed: bool = False, error: str | None = None
) -> None:
    async with session_factory() as s:
        s.add(
            ActionExecution(
                robot_id=robot_id,
                action_id="a1",
                action_type="move_forward",
                status=ExecutionStatus.failed if failed else ExecutionStatus.success,
                duration_ms=50,
                error=error,
            )
        )
        await s.commit()


# --- The fallback classifier ----------------------------------------------


def test_fallback_classification():
    # A real provider decided.
    assert _is_fallback("yandexgpt") is False
    assert _is_fallback("claude") is False
    # These did not.
    assert _is_fallback("mock") is True
    assert _is_fallback("yandexgpt:fallback") is True
    assert _is_fallback("claude:fallback") is True
    assert _is_fallback(None) is True
    assert _is_fallback("") is True


# --- Summary ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_summary_on_an_empty_fleet(client, auth):
    resp = await client.get(f"{API}/metrics/summary", headers=auth)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["decisions"] == 0
    assert body["fallback_rate"] == 0.0
    assert body["latency_p50_ms"] is None
    assert body["execution_success_rate"] is None
    assert body["devices_total"] == 0
    # A 24h window is bucketed hourly.
    assert len(body["series"]) == 24


@pytest.mark.asyncio
async def test_summary_counts_decisions_and_latency(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    for latency in (100, 200, 300, 400, 900):
        await _add_decision(session_factory, robot_id, latency=latency)

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert body["decisions"] == 5
    assert body["latency_p50_ms"] == 300
    assert body["latency_p95_ms"] == 900
    assert 0.79 < body["avg_confidence"] < 0.81
    assert body["sampled"] is False


@pytest.mark.asyncio
async def test_summary_reports_the_fallback_rate(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, provider="yandexgpt")
    await _add_decision(session_factory, robot_id, provider="yandexgpt")
    await _add_decision(session_factory, robot_id, provider="yandexgpt:fallback")
    await _add_decision(session_factory, robot_id, provider="mock")

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert body["decisions"] == 4
    assert body["fallback_decisions"] == 2
    assert body["fallback_rate"] == 0.5


@pytest.mark.asyncio
async def test_the_window_excludes_older_decisions(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, age_hours=1)
    await _add_decision(session_factory, robot_id, age_hours=48)  # outside 24h

    day = (await client.get(f"{API}/metrics/summary?window=24h", headers=auth)).json()
    week = (await client.get(f"{API}/metrics/summary?window=7d", headers=auth)).json()

    assert day["decisions"] == 1
    assert week["decisions"] == 2
    # A 7d window is bucketed daily.
    assert len(week["series"]) == 7


@pytest.mark.asyncio
async def test_an_unknown_window_falls_back_to_the_default(client, auth):
    resp = await client.get(f"{API}/metrics/summary?window=nonsense", headers=auth)
    assert resp.status_code == 200
    assert len(resp.json()["series"]) == 24


@pytest.mark.asyncio
async def test_summary_reports_execution_success(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _add_execution(session_factory, robot_id)
    await _add_execution(session_factory, robot_id)
    await _add_execution(session_factory, robot_id)
    await _add_execution(session_factory, robot_id, failed=True, error="stalled")

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert body["executions"] == 4
    assert body["executions_failed"] == 1
    assert body["execution_success_rate"] == 0.75


@pytest.mark.asyncio
async def test_summary_counts_devices(client, auth, rover_payload):
    first = await _register(client, auth, rover_payload, name="one")
    await _register(client, auth, rover_payload, name="two")
    await client.post(f"{API}/robots/{first}/pause", headers=auth)

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert body["devices_total"] == 2
    assert body["devices_paused"] == 1


@pytest.mark.asyncio
async def test_the_series_places_decisions_in_the_right_bucket(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, age_hours=0.1)
    await _add_decision(session_factory, robot_id, age_hours=0.2)

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert sum(point["decisions"] for point in body["series"]) == 2
    # Both are recent, so they land in the last bucket.
    assert body["series"][-1]["decisions"] == 2


# --- Breakdowns ------------------------------------------------------------


@pytest.mark.asyncio
async def test_devices_breakdown_is_paginated_and_ordered(
    client, auth, rover_payload, session_factory
):
    busy = await _register(client, auth, rover_payload, name="busy")
    await _register(client, auth, rover_payload, name="idle")
    for _ in range(3):
        await _add_decision(session_factory, busy)

    first = (
        await client.get(f"{API}/metrics/devices?limit=1&offset=0", headers=auth)
    ).json()
    assert first["total"] == 2
    assert len(first["items"]) == 1
    assert first["items"][0]["name"] == "busy"
    assert first["items"][0]["decisions"] == 3

    second = (
        await client.get(f"{API}/metrics/devices?limit=1&offset=1", headers=auth)
    ).json()
    assert second["items"][0]["name"] == "idle"
    # A device with no activity reports zero, not null.
    assert second["items"][0]["decisions"] == 0
    assert second["items"][0]["avg_confidence"] is None


@pytest.mark.asyncio
async def test_models_breakdown_flags_the_fallback(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, provider="yandexgpt")
    await _add_decision(session_factory, robot_id, provider="yandexgpt")
    await _add_decision(session_factory, robot_id, provider="yandexgpt:fallback")

    body = (await client.get(f"{API}/metrics/models", headers=auth)).json()
    assert body["total"] == 2

    rows = {row["provider"]: row for row in body["items"]}
    assert rows["yandexgpt"]["decisions"] == 2
    assert rows["yandexgpt"]["fallback"] is False
    assert rows["yandexgpt:fallback"]["fallback"] is True


@pytest.mark.asyncio
async def test_failures_breakdown_lists_only_failures(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload, name="faulty")
    await _add_execution(session_factory, robot_id)
    await _add_execution(session_factory, robot_id, failed=True, error="wheel stalled")

    body = (await client.get(f"{API}/metrics/failures", headers=auth)).json()
    assert body["total"] == 1
    assert body["items"][0]["error"] == "wheel stalled"
    assert body["items"][0]["robot_name"] == "faulty"
    assert body["items"][0]["action_type"] == "move_forward"


@pytest.mark.asyncio
async def test_failures_paginate(client, auth, rover_payload, session_factory):
    robot_id = await _register(client, auth, rover_payload)
    for i in range(5):
        await _add_execution(session_factory, robot_id, failed=True, error=f"e{i}")

    page = (
        await client.get(f"{API}/metrics/failures?limit=2&offset=0", headers=auth)
    ).json()
    assert page["total"] == 5
    assert len(page["items"]) == 2

    tail = (
        await client.get(f"{API}/metrics/failures?limit=2&offset=4", headers=auth)
    ).json()
    assert len(tail["items"]) == 1


# --- Isolation and auth ----------------------------------------------------


@pytest.mark.asyncio
async def test_metrics_require_a_session(anon_client):
    for path in ("summary", "devices", "models", "failures"):
        assert (
            await anon_client.get(f"{API}/metrics/{path}")
        ).status_code == 401


@pytest.mark.asyncio
async def test_metrics_do_not_cross_organizations(
    client, auth, rover_payload, session_factory
):
    from tests.test_auth import _make_second_org

    robot_id = await _register(client, auth, rover_payload)
    for _ in range(4):
        await _add_decision(session_factory, robot_id)
    await _add_execution(session_factory, robot_id, failed=True, error="ours")

    _org_b, auth_b = await _make_second_org(session_factory)

    ours = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    theirs = (await client.get(f"{API}/metrics/summary", headers=auth_b)).json()

    assert ours["decisions"] == 4
    assert theirs["decisions"] == 0
    assert theirs["devices_total"] == 0

    their_devices = (await client.get(f"{API}/metrics/devices", headers=auth_b)).json()
    assert their_devices["total"] == 0

    their_failures = (
        await client.get(f"{API}/metrics/failures", headers=auth_b)
    ).json()
    assert their_failures["total"] == 0


@pytest.mark.asyncio
async def test_percentiles_on_a_single_sample(
    client, auth, rover_payload, session_factory
):
    """A one-row window must not divide by zero."""
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, latency=42)

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert body["latency_p50_ms"] == 42
    assert body["latency_p95_ms"] == 42


@pytest.mark.asyncio
async def test_decisions_without_latency_do_not_break_percentiles(
    client, auth, rover_payload, session_factory
):
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, latency=None)  # type: ignore[arg-type]

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    assert body["decisions"] == 1
    assert body["latency_p50_ms"] is None


@pytest.mark.asyncio
async def test_service_summary_matches_the_endpoint(
    client, auth, rover_payload, session_factory
):
    """Guard against the route and the service drifting apart."""
    robot_id = await _register(client, auth, rover_payload)
    await _add_decision(session_factory, robot_id, provider="mock")

    body = (await client.get(f"{API}/metrics/summary", headers=auth)).json()
    async with session_factory() as s:
        from app.models.robot import Robot

        robot = await s.get(Robot, robot_id)
        direct = await MetricsService(s).summary(robot.organization_id, "24h")

    assert direct.decisions == body["decisions"]
    assert direct.fallback_rate == body["fallback_rate"]
