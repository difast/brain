"""The Prometheus scrape endpoint, the metric primitives, and Sentry wiring.

The registry is process-global by design, so nothing here asserts an absolute
counter value — the assertions are on shape, on labels, and on deltas taken
around the action under test.
"""

from __future__ import annotations

import pytest

from app.core import metrics as m
from app.core.config import settings
from app.core.metrics import Counter, Gauge, Histogram, Registry
from app.core.sentry import _before_send, configure_sentry

from .conftest import API

SCRAPE = "/metrics"


def parse(body: str) -> dict[str, float]:
    """Turn an exposition body into {series: value}, ignoring HELP/TYPE."""
    out: dict[str, float] = {}
    for line in body.splitlines():
        if not line or line.startswith("#"):
            continue
        series, _, value = line.rpartition(" ")
        out[series] = float(value)
    return out


# --- The primitives ---------------------------------------------------------


def test_counter_renders_help_type_and_value() -> None:
    registry = Registry()
    hits = registry.counter("things_total", "How many things.", ["kind"])
    hits.inc(kind="a")
    hits.inc(2, kind="a")
    hits.inc(kind="b")

    body = registry.render()
    assert "# HELP things_total How many things." in body
    assert "# TYPE things_total counter" in body
    assert parse(body)['things_total{kind="a"}'] == 3
    assert parse(body)['things_total{kind="b"}'] == 1
    # The format requires a trailing newline.
    assert body.endswith("\n")


def test_a_counter_without_labels_starts_at_zero() -> None:
    """So a rate() over it works from the first scrape, not the first event."""
    registry = Registry()
    registry.counter("lonely_total", "No labels.")
    assert parse(registry.render())["lonely_total"] == 0


def test_gauge_goes_both_ways_and_clears() -> None:
    registry = Registry()
    devices = registry.gauge("devices", "Devices.", ["status"])
    devices.set(5, status="online")
    devices.set(2, status="error")
    assert parse(registry.render())['devices{status="online"}'] == 5

    # clear() is what stops a status that no longer occurs from reporting its
    # last value forever.
    devices.clear()
    devices.set(4, status="online")
    values = parse(registry.render())
    assert values['devices{status="online"}'] == 4
    assert 'devices{status="error"}' not in values


def test_histogram_buckets_are_cumulative() -> None:
    registry = Registry()
    latency = registry.histogram(
        "latency_seconds", "Latency.", ["route"], buckets=(0.1, 0.5, 1.0)
    )
    for value in (0.05, 0.2, 0.8, 4.0):
        latency.observe(value, route="/x")

    values = parse(registry.render())
    assert values['latency_seconds_bucket{route="/x",le="0.1"}'] == 1
    assert values['latency_seconds_bucket{route="/x",le="0.5"}'] == 2
    assert values['latency_seconds_bucket{route="/x",le="1"}'] == 3
    # +Inf must equal the observation count, including what overflowed.
    assert values['latency_seconds_bucket{route="/x",le="+Inf"}'] == 4
    assert values['latency_seconds_count{route="/x"}'] == 4
    assert values['latency_seconds_sum{route="/x"}'] == pytest.approx(5.05)


def test_label_values_are_escaped() -> None:
    """An unescaped quote or backslash would produce an unparseable scrape."""
    registry = Registry()
    hits = registry.counter("odd_total", "Odd labels.", ["name"])
    hits.inc(name='say "hi"\\ok')
    lines = registry.render().splitlines()
    line = next(x for x in lines if x.startswith("odd_total{"))
    assert line == r'odd_total{name="say \"hi\"\\ok"} 1'


def test_integral_values_lose_the_decimal_point() -> None:
    registry = Registry()
    registry.gauge("count", "A count.").set(7)
    assert "count 7\n" in registry.render()


def test_registering_the_same_name_twice_is_refused() -> None:
    registry = Registry()
    registry.counter("dup_total", "One.")
    with pytest.raises(ValueError, match="already registered"):
        registry.counter("dup_total", "Two.")


def test_a_missing_label_is_a_clear_error() -> None:
    counter = Counter("x_total", "X.", ["a", "b"])
    with pytest.raises(ValueError, match="needs labels"):
        counter.inc(a="1")


def test_a_histogram_needs_buckets() -> None:
    with pytest.raises(ValueError, match="at least one bucket"):
        Histogram("h", "H.", buckets=())


def test_gauge_and_counter_read_back_their_own_values() -> None:
    gauge = Gauge("g", "G.")
    gauge.set(3)
    gauge.dec(1)
    assert gauge.value() == 2

    counter = Counter("c_total", "C.")
    counter.inc(4)
    assert counter.value() == 4


# --- The endpoint -----------------------------------------------------------


@pytest.mark.asyncio
async def test_scrape_is_served_in_plain_prometheus_format(anon_client) -> None:
    response = await anon_client.get(SCRAPE)
    assert response.status_code == 200
    # The version parameter is how a scraper knows this is exposition format.
    assert "version=0.0.4" in response.headers["content-type"]

    body = response.text
    assert "# TYPE mevratek_build_info gauge" in body
    assert "mevratek_build_info{" in body
    assert "# TYPE mevratek_http_requests_total counter" in body
    assert "mevratek_organizations 1" in body


@pytest.mark.asyncio
async def test_the_reference_parser_accepts_the_output(
    client, anon_client, rover_payload
) -> None:
    """The renderer here is hand-written, so prove it against the real thing.

    prometheus-client is a test-only dependency for exactly this: if the
    exposition ever drifts — a bad escape, a non-cumulative bucket, a missing
    +Inf — the reference parser is what notices.
    """
    from prometheus_client.parser import text_string_to_metric_families

    # Give every metric type something to render, histograms included.
    created = await client.post(f"{API}/robots/register", json=rover_payload)
    await client.post(
        f"{API}/brain/decision",
        json={"task": "look around", "state": {}},
        headers={"Authorization": f"Bearer {created.json()['token']}"},
    )

    body = (await anon_client.get(SCRAPE)).text
    families = {f.name: f for f in text_string_to_metric_families(body)}

    # Every family survives the round trip with the type we declared.
    assert families["mevratek_http_requests"].type == "counter"
    assert families["mevratek_decision_duration_seconds"].type == "histogram"
    assert families["mevratek_devices"].type == "gauge"

    # And the histogram's own invariant holds after parsing: the +Inf bucket
    # equals the observation count.
    histogram = families["mevratek_decision_duration_seconds"]
    buckets = {
        s.labels["le"]: s.value
        for s in histogram.samples
        if s.name.endswith("_bucket")
    }
    count = next(
        s.value for s in histogram.samples if s.name.endswith("_count")
    )
    assert buckets["+Inf"] == count


@pytest.mark.asyncio
async def test_the_scrape_is_not_in_the_public_schema(anon_client) -> None:
    """It is an operational surface, not part of the product API."""
    schema = (await anon_client.get("/openapi.json")).json()
    assert "/metrics" not in schema["paths"]
    # The organization-scoped page's endpoints are still documented.
    assert f"{API}/metrics/summary" in schema["paths"]


@pytest.mark.asyncio
async def test_a_token_is_demanded_once_one_is_configured(
    anon_client, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "metrics_token", "scrape-me")

    unauthenticated = await anon_client.get(SCRAPE)
    assert unauthenticated.status_code == 401
    assert unauthenticated.headers["www-authenticate"] == "Bearer"

    wrong = await anon_client.get(
        SCRAPE, headers={"Authorization": "Bearer not-the-token"}
    )
    assert wrong.status_code == 401

    # A token of the right length but the wrong bytes is still refused.
    same_length = await anon_client.get(
        SCRAPE, headers={"Authorization": "Bearer scrape-yo"}
    )
    assert same_length.status_code == 401

    ok = await anon_client.get(SCRAPE, headers={"Authorization": "Bearer scrape-me"})
    assert ok.status_code == 200
    assert "mevratek_build_info{" in ok.text


@pytest.mark.asyncio
async def test_a_non_bearer_authorization_header_is_refused(
    anon_client, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "metrics_token", "scrape-me")
    response = await anon_client.get(SCRAPE, headers={"Authorization": "scrape-me"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_turning_the_endpoint_off_hides_it(anon_client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "metrics_enabled", False)
    assert (await anon_client.get(SCRAPE)).status_code == 404


@pytest.mark.asyncio
async def test_production_without_a_token_refuses_to_serve(
    anon_client, monkeypatch
) -> None:
    """Safe by default: api.mevratek.ru must not hand out fleet counts."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "metrics_token", "")
    assert (await anon_client.get(SCRAPE)).status_code == 404

    monkeypatch.setattr(settings, "metrics_token", "configured")
    assert (await anon_client.get(SCRAPE)).status_code == 401


@pytest.mark.asyncio
async def test_a_broken_database_still_serves_the_in_process_counters(
    anon_client, monkeypatch
) -> None:
    """Monitoring must survive the outage it is supposed to report."""

    async def _explode(_session) -> None:
        raise RuntimeError("database is down")

    from app.api.routes import observability

    monkeypatch.setattr(observability.metrics_collector, "collect", _explode)

    response = await anon_client.get(SCRAPE)
    assert response.status_code == 200
    assert "mevratek_http_requests_total" in response.text


# --- What the numbers say ---------------------------------------------------


@pytest.mark.asyncio
async def test_requests_are_counted_under_the_route_template(
    client, anon_client, rover_payload
) -> None:
    """One series per route, not one per device id."""
    created = await client.post(f"{API}/robots/register", json=rover_payload)
    robot_id = created.json()["robot"]["id"]
    await client.get(f"{API}/robots/{robot_id}")

    body = (await anon_client.get(SCRAPE)).text
    assert 'route="/api/v1/robots/{robot_id}",status="200"' in body
    # The id itself must never become a label value.
    assert robot_id not in body


@pytest.mark.asyncio
async def test_unmatched_paths_collapse_into_one_series(
    anon_client,
) -> None:
    """A scanner walking random URLs must not create a series per URL."""
    for path in ("/wp-admin.php", "/.env", "/phpmyadmin"):
        await anon_client.get(path)

    body = (await anon_client.get(SCRAPE)).text
    assert 'route="<unmatched>",status="404"' in body
    assert "wp-admin" not in body


@pytest.mark.asyncio
async def test_latency_is_observed_per_route(client, anon_client) -> None:
    await client.get(f"{API}/robots")
    body = (await anon_client.get(SCRAPE)).text
    assert (
        "mevratek_http_request_duration_seconds_count"
        '{method="GET",route="/api/v1/robots"}'
    ) in body


@pytest.mark.asyncio
async def test_a_fallback_decision_is_visible_as_a_fallback(
    client, anon_client, rover_payload
) -> None:
    """The number this endpoint exists for.

    The suite runs with no LLM provider configured, so every decision is the
    deterministic placeholder — exactly the condition an operator needs to
    learn about from monitoring rather than from the customer.
    """
    before = m.DECISIONS.value(provider="mock", outcome="fallback")

    created = await client.post(f"{API}/robots/register", json=rover_payload)
    token = created.json()["token"]
    decision = await client.post(
        f"{API}/brain/decision",
        json={"task": "drive to the gate", "state": {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert decision.status_code == 200

    assert m.DECISIONS.value(provider="mock", outcome="fallback") == before + 1
    assert m.DECISIONS.value(provider="mock", outcome="model") == 0

    body = (await anon_client.get(SCRAPE)).text
    assert 'mevratek_decisions_total{provider="mock",outcome="fallback"}' in body
    mock_fallback = '{provider="mock",outcome="fallback"}'
    assert f"mevratek_decision_duration_seconds_count{mock_fallback}" in body
    assert f"mevratek_decision_confidence_count{mock_fallback}" in body

    # And the same conclusion is reachable from the database side.
    values = parse(body)
    assert values['mevratek_decision_logs{outcome="fallback"}'] >= 1
    # Emitted as 0 rather than omitted, so an alerting rule never goes stale.
    assert values['mevratek_decision_logs{outcome="model"}'] == 0


@pytest.mark.asyncio
async def test_fleet_gauges_follow_the_database(
    client, anon_client, rover_payload
) -> None:
    await client.post(f"{API}/robots/register", json=rover_payload)

    values = parse((await anon_client.get(SCRAPE)).text)
    assert values["mevratek_organizations"] == 1
    assert values["mevratek_users"] == 1
    # A freshly registered device has not heartbeated yet.
    assert values['mevratek_devices{status="offline"}'] == 1


@pytest.mark.asyncio
async def test_a_paused_device_is_its_own_status(
    client, anon_client, rover_payload
) -> None:
    """"How many devices are down" has to include the ones an operator paused."""
    created = await client.post(f"{API}/robots/register", json=rover_payload)
    robot_id = created.json()["robot"]["id"]
    await client.post(f"{API}/robots/{robot_id}/pause")

    values = parse((await anon_client.get(SCRAPE)).text)
    assert values['mevratek_devices{status="paused"}'] == 1
    assert 'mevratek_devices{status="offline"}' not in values


@pytest.mark.asyncio
async def test_tasks_are_reported_by_status(client, anon_client, rover_payload) -> None:
    created = await client.post(f"{API}/robots/register", json=rover_payload)
    robot_id = created.json()["robot"]["id"]
    await client.post(
        f"{API}/tasks", json={"robot_id": robot_id, "description": "sweep aisle 4"}
    )

    values = parse((await anon_client.get(SCRAPE)).text)
    assert values['mevratek_tasks{status="pending"}'] == 1


@pytest.mark.asyncio
async def test_the_scrape_reports_its_own_cost(anon_client) -> None:
    values = parse((await anon_client.get(SCRAPE)).text)
    assert values["mevratek_scrape_duration_seconds"] >= 0


# --- Sentry -----------------------------------------------------------------


def test_sentry_stays_off_without_a_dsn(monkeypatch) -> None:
    monkeypatch.setattr(settings, "sentry_dsn", "")
    assert settings.sentry_enabled is False
    assert configure_sentry() is False


def test_sentry_strips_credentials_and_bodies() -> None:
    """Frames, telemetry and device tokens must not leave the installation."""
    event = {
        "request": {
            "url": "https://api.mevratek.ru/api/v1/brain/decision",
            "data": {"image_b64": "…a camera frame…"},
            "cookies": {"session": "secret"},
            "headers": {
                "Authorization": "Bearer robot-token",
                "X-Api-Key": "cbk_live",
                "User-Agent": "mevratek-sdk/1.0",
            },
        }
    }
    cleaned = _before_send(event, {})
    assert cleaned is not None
    request = cleaned["request"]
    assert "data" not in request
    assert "cookies" not in request
    assert request["headers"]["Authorization"] == "[stripped]"
    assert request["headers"]["X-Api-Key"] == "[stripped]"
    # Harmless headers survive — they are what makes an event diagnosable.
    assert request["headers"]["User-Agent"] == "mevratek-sdk/1.0"


def test_sentry_before_send_tolerates_an_event_without_a_request() -> None:
    event: dict = {"level": "error"}
    assert _before_send(event, {}) is event
