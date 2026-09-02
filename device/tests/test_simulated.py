"""The virtual rover.

Worth testing because the rover is what makes the loop interesting: if it never
fails and its battery never moves, the feedback path is never exercised and the
whole point of running the agent is lost.
"""

from __future__ import annotations

from mevratek_device.simulated import SimulatedRover


def rover(**kwargs) -> SimulatedRover:
    # Seeded and failure-free unless a test says otherwise: the dice are the
    # subject of exactly one test and noise everywhere else.
    kwargs.setdefault("failure_rate", 0.0)
    kwargs.setdefault("seed", 42)
    return SimulatedRover(**kwargs)


def test_capabilities_are_what_the_platform_expects():
    caps = rover().capabilities()
    types = {c["type"] for c in caps}
    assert {"move_forward", "turn_left", "camera_capture"} <= types

    # Every movement command declares its limits, which is what stops a model
    # asking a half-metre rover for a two-metre step.
    step = next(c for c in caps if c["type"] == "move_forward")
    assert step["value"]["max"] == 0.5
    assert step["value"]["unit"] == "m"


def test_driving_forward_moves_and_closes_the_gap():
    r = rover()
    before = r.obstacle_distance_m
    outcome = r.execute("move_forward", 0.4)

    assert outcome.ok
    assert r.x == 0.4
    assert r.obstacle_distance_m == before - 0.4


def test_the_step_is_capped_at_the_declared_maximum():
    """A model that ignores the limit must not get more than the hardware has."""
    r = rover()
    r.execute("move_forward", 5.0)
    assert r.x == 0.5


def test_the_wall_stops_the_rover_and_that_counts_as_a_failure():
    r = rover()
    r.obstacle_distance_m = 0.2

    outcome = r.execute("move_forward", 0.5)

    assert outcome.ok is False
    assert "препятствие" in (outcome.error or "")
    # It still moved as far as it could — a blocked command is not a no-op.
    assert 0 < r.x < 0.5
    assert "проехал" in outcome.detail


def test_backing_off_buys_room_again():
    r = rover()
    r.obstacle_distance_m = 0.2
    r.execute("move_backward", 0.5)
    assert r.obstacle_distance_m > 0.2


def test_the_battery_drains_and_then_refuses():
    r = rover(battery_drain_per_action=40.0)
    for _ in range(3):
        r.execute("stop", None)
    assert r.battery == 0

    outcome = r.execute("move_forward", 0.1)
    assert outcome.ok is False
    assert "battery" in (outcome.error or "")


def test_commands_sometimes_fail_on_their_own():
    """Without this the execution-feedback path is never exercised."""
    r = SimulatedRover(failure_rate=1.0, seed=1)
    outcome = r.execute("move_forward", 0.3)
    assert outcome.ok is False
    assert r.x == 0.0


def test_an_unknown_command_is_reported_not_raised():
    """The platform should never send one. If it does, we want to see it."""
    outcome = rover().execute("fly", 10)
    assert outcome.ok is False
    assert "fly" in (outcome.error or "")


def test_a_failure_surfaces_in_the_telemetry():
    r = SimulatedRover(failure_rate=1.0, seed=1)
    r.execute("move_forward", 0.3)
    assert r.telemetry().errors


def test_odd_values_from_a_model_are_coerced_not_refused():
    """Models answer with strings, negatives and nulls. None of it is fatal."""
    r = rover()
    assert r.execute("move_forward", "0.2").ok
    assert round(r.x, 2) == 0.2

    r.execute("turn_right", None)      # no value at all
    assert r.heading_deg != 0

    r.execute("move_forward", -0.1)    # negative distance
    assert r.x > 0.2


def test_turning_changes_what_is_in_front():
    r = rover()
    before = r.obstacle_distance_m
    for _ in range(6):
        r.execute("turn_left", 30)
    assert r.heading_deg % 360 == 180
    assert r.obstacle_distance_m != before


def test_telemetry_carries_the_sensors_the_dashboard_does_not_chart():
    extra = rover().telemetry().extra
    assert "obstacle_distance_m" in extra
    assert "heading_deg" in extra
