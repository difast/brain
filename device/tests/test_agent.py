"""The loop, driven against a stand-in for the server.

The agent's real proof is running it against a live backend — which is what it
is for. These tests cover the parts that are awkward to reproduce on demand:
what happens when the network drops mid-round, when the platform refuses an
action the device cannot perform, and whether the fallback share is counted
correctly, since that number is the reason the agent exists.
"""

from __future__ import annotations

from typing import Any

import pytest
from mevratek import BrainError

from mevratek_device.agent import Agent
from mevratek_device.camera import NoCamera
from mevratek_device.console import Console
from mevratek_device.simulated import SimulatedRover


class FakeClient:
    """A server that answers however a test needs it to."""

    def __init__(self, decisions: list[dict[str, Any]] | None = None) -> None:
        self.decisions = decisions or []
        self.telemetry: list[dict] = []
        self.executions: list[dict] = []
        self.heartbeats = 0
        self.queued_task: dict | None = None
        self._index = 0

    def heartbeat(self, status: str = "online") -> dict:
        self.heartbeats += 1
        return {}

    def send_telemetry(self, **kwargs: Any) -> dict:
        self.telemetry.append(kwargs)
        return {}

    def decide(self, **kwargs: Any) -> dict:
        self.last_decide = kwargs
        if not self.decisions:
            return {"id": "d0", "actions": [], "provider": "mock"}
        decision = self.decisions[min(self._index, len(self.decisions) - 1)]
        self._index += 1
        return decision

    def report_execution(self, action_id: str, **kwargs: Any) -> dict:
        self.executions.append({"action_id": action_id, **kwargs})
        return {}

    def next_task(self) -> dict | None:
        return self.queued_task


def build(client: FakeClient, **kwargs: Any) -> Agent:
    return Agent(
        client=client,
        hardware=SimulatedRover(failure_rate=0.0, seed=7),
        camera=NoCamera(),
        console=Console(colour=False),
        task=kwargs.pop("task", "ехать вперёд"),
        interval=0,
        **kwargs,
    )


def decision(actions: list[dict], **extra: Any) -> dict:
    return {
        "id": "d1",
        "goal": "цель",
        "thought": "мысль",
        "confidence": 0.9,
        "provider": "yandexgpt",
        "latency_ms": 900,
        "actions": actions,
        "universal_actions": extra.pop("universal_actions", actions),
        **extra,
    }


def test_one_round_walks_the_whole_loop(capsys):
    client = FakeClient([
        decision([{"action_id": "a1", "type": "move_forward", "value": 0.3}])
    ])
    agent = build(client)

    agent.round()

    assert client.heartbeats == 1
    assert len(client.telemetry) == 1
    assert client.executions[0]["action_id"] == "a1"
    assert client.executions[0]["status"] == "success"
    # The report names the decision it came from, which is what lets the brain
    # tie feedback back to its own reasoning.
    assert client.executions[0]["decision_id"] == "d1"


def test_a_failed_command_is_reported_as_failed_with_its_reason():
    client = FakeClient([
        decision([{"action_id": "a1", "type": "move_forward", "value": 0.5}])
    ])
    agent = build(client)
    agent.hardware.obstacle_distance_m = 0.15   # a wall right in front

    agent.round()

    report = client.executions[0]
    assert report["status"] == "failed"
    assert "препятствие" in report["error"]
    assert agent.stats.actions_failed == 1


def test_the_sensors_reach_the_model_including_the_unusual_ones():
    """`state` is free-form, and everything in it is shown to the model."""
    client = FakeClient()
    agent = build(client)

    agent.round()

    state = client.last_decide["state"]
    assert state["battery"] == 100.0
    assert "obstacle_distance_m" in state    # from Telemetry.extra
    assert "heading_deg" in state


def test_actions_the_device_cannot_perform_are_counted_as_dropped():
    """The platform drops them; the agent's job is to make that visible.

    A model inventing commands is otherwise silent: the device simply gets a
    shorter list and does less than was intended.
    """
    client = FakeClient([
        decision(
            [{"action_id": "a1", "type": "move_forward", "value": 0.2}],
            universal_actions=[{"type": "move_forward"}, {"type": "grasp"}],
        )
    ])
    agent = build(client)

    agent.round()

    assert agent.stats.dropped == 1
    assert agent.stats.actions == 1


def test_the_fallback_share_is_what_the_run_is_judged_on():
    agent = build(FakeClient())
    agent.stats.providers = {"yandexgpt": 3, "yandexgpt:fallback": 1}
    assert agent.stats.fallback_share == 0.25

    agent.stats.providers = {"mock": 5}
    assert agent.stats.fallback_share == 1.0

    agent.stats.providers = {"claude": 4}
    assert agent.stats.fallback_share == 0.0


def test_a_dead_network_does_not_kill_the_device():
    """Patchy wifi in a warehouse is normal. Stopping on it is not acceptable."""

    class Broken(FakeClient):
        def heartbeat(self, status: str = "online") -> dict:
            raise BrainError(503, "service unavailable")

    agent = build(Broken())
    stats = agent.run(rounds=3)

    assert stats.network_errors == 3
    assert stats.decisions == 0     # nothing was decided
    # and the loop is still standing, having simply reported the trouble


def test_backoff_grows_but_stays_bounded():
    agent = build(FakeClient())
    delay = 2.0
    for _ in range(10):
        delay = agent._backoff(delay)
    assert delay == 30.0            # never grows past half a minute


def test_a_queued_task_wins_over_the_default():
    client = FakeClient()
    client.queued_task = {"id": "t1", "description": "доставить коробку в цех 3"}
    agent = build(client, pull_tasks=True)

    agent.round()

    assert client.last_decide["task"] == "доставить коробку в цех 3"
    assert client.last_decide["task_id"] == "t1"


def test_without_a_queued_task_the_default_is_used():
    client = FakeClient()
    agent = build(client, pull_tasks=True, task="патрулировать")

    agent.round()

    assert client.last_decide["task"] == "патрулировать"
    assert client.last_decide["task_id"] is None


def test_stopping_finishes_the_round_in_hand():
    client = FakeClient([
        decision([{"action_id": "a1", "type": "stop", "value": None}])
    ])
    agent = build(client)
    agent.stop()

    stats = agent.run()

    assert stats.rounds == 0        # asked to stop before the first round
    assert client.heartbeats == 0


@pytest.mark.parametrize("provider", ["mock", "gigachat:fallback"])
def test_a_fallback_is_still_a_decision_the_device_acts_on(provider):
    """The device cannot tell, and that is exactly the danger."""
    client = FakeClient([
        decision(
            [{"action_id": "a1", "type": "move_forward", "value": 0.2}],
            provider=provider,
        )
    ])
    agent = build(client)

    agent.round()

    assert agent.stats.actions == 1
    assert agent.stats.fallback_share == 1.0
