"""The loop. One file, and it does not care what hardware is underneath.

    register once
    ├─ read the sensors        → send telemetry
    ├─ take a frame            → ask the brain what to do
    ├─ run what it answered    → report how each command went
    └─ wait, repeat

Everything device-specific lives behind `Hardware`; everything network-specific
lives behind the SDK. What is left here is the part that stays true whether the
body is a simulator on a laptop or a rover in a warehouse — which is why this
file should not need to change when the hardware arrives.

The unglamorous half is failure handling. A device that stops at the first
timeout is useless in a building with patchy wifi, so a failed round is logged,
backed off, and retried; the loop only ends when it is told to.
"""

from __future__ import annotations

import signal
import time
from dataclasses import dataclass, field
from typing import Any

from mevratek import BrainClient, BrainError

from .camera import Camera
from .console import Console
from .hardware import Hardware


@dataclass
class Stats:
    """What the run is worth reporting at the end — and to the case study."""

    rounds: int = 0
    decisions: int = 0
    actions: int = 0
    actions_failed: int = 0
    dropped: int = 0
    network_errors: int = 0
    latencies_ms: list[int] = field(default_factory=list)
    providers: dict[str, int] = field(default_factory=dict)

    @property
    def fallback_share(self) -> float:
        """The number the whole exercise exists to produce.

        A provider that is down does not break anything visible: the platform
        answers with a deterministic placeholder and the device keeps moving.
        The only way to know is to count how often the answer came from a
        fallback rather than a model.
        """
        total = sum(self.providers.values())
        if not total:
            return 0.0
        fallen = sum(
            count
            for name, count in self.providers.items()
            if name == "mock" or name.endswith(":fallback")
        )
        return fallen / total


class Agent:
    def __init__(
        self,
        *,
        client: BrainClient,
        hardware: Hardware,
        camera: Camera,
        console: Console,
        task: str,
        interval: float = 2.0,
        pull_tasks: bool = False,
    ) -> None:
        self.client = client
        self.hardware = hardware
        self.camera = camera
        self.console = console
        self.default_task = task
        self.interval = interval
        self.pull_tasks = pull_tasks

        self.stats = Stats()
        self._running = True
        self._current_task_id: str | None = None

    # -- lifecycle -------------------------------------------------------

    def stop(self, *_signal: object) -> None:
        """Ctrl-C once: finish the round in hand, then leave cleanly."""
        if self._running:
            self.console.note("останавливаюсь после текущего круга…")
        self._running = False

    def install_signal_handlers(self) -> None:
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

    def run(self, *, rounds: int | None = None) -> Stats:
        backoff = self.interval
        while self._running and (rounds is None or self.stats.rounds < rounds):
            try:
                self.round()
                backoff = self.interval
            except BrainError as exc:
                # The server said no. Worth showing verbatim: 401 means the
                # token died, 429 means we are asking too fast, and the two
                # need very different reactions from whoever is watching.
                self.stats.network_errors += 1
                self.console.error(f"сервер: {exc}")
                backoff = self._backoff(backoff)
            except Exception as exc:  # noqa: BLE001 - a device must not die
                self.stats.network_errors += 1
                self.console.error(f"связь: {exc}")
                backoff = self._backoff(backoff)

            if self._running and (rounds is None or self.stats.rounds < rounds):
                time.sleep(backoff)

        self.hardware.shutdown()
        self.camera.close()
        return self.stats

    def _backoff(self, current: float) -> float:
        """Back off, but not so far that a recovered link goes unnoticed."""
        return min(current * 2, 30.0)

    # -- one round -------------------------------------------------------

    def round(self) -> None:
        self.stats.rounds += 1
        telemetry = self.hardware.telemetry()

        self.client.heartbeat("online")
        self.client.send_telemetry(
            battery=telemetry.battery,
            speed=telemetry.speed,
            x=telemetry.x,
            y=telemetry.y,
            z=telemetry.z,
            errors=telemetry.errors,
            extra=telemetry.extra,
        )

        task = self._task()
        frame = self.camera.frame()
        state = self._state(telemetry)
        self.console.round_header(self.stats.rounds, state, frame)

        decision = self.client.decide(
            task=task,
            state=state,
            image_bytes=frame,
            task_id=self._current_task_id,
        )
        self._record(decision)
        self.console.decision(decision)

        for action in decision.get("actions", []):
            self._perform(action, decision_id=decision.get("id"))

    def _task(self) -> str:
        """The task comes from the queue when there is one, else the default.

        This is the difference between a demo and a product: an operator can
        put work in the queue from the dashboard and the device picks it up,
        rather than every device being hard-coded with its purpose.
        """
        if not self.pull_tasks:
            return self.default_task
        try:
            queued = self.client.next_task()
        except BrainError:
            queued = None
        if queued:
            self._current_task_id = queued.get("id")
            self.console.note(f"из очереди: {queued.get('description')}")
            return str(queued.get("description") or self.default_task)
        self._current_task_id = None
        return self.default_task

    @staticmethod
    def _state(telemetry: Any) -> dict[str, Any]:
        """Flatten the sensor snapshot into what the model is shown.

        `state` is a free-form dictionary on purpose. Anything put here reaches
        the model verbatim, so a device with a detector on board can pass
        recognised objects the same way it passes battery level — and a model
        with no vision still gets something to reason about.
        """
        state: dict[str, Any] = {}
        if telemetry.battery is not None:
            state["battery"] = telemetry.battery
        if telemetry.speed is not None:
            state["speed"] = telemetry.speed
        if telemetry.x is not None and telemetry.y is not None:
            state["position"] = {"x": telemetry.x, "y": telemetry.y}
        if telemetry.errors:
            state["errors"] = telemetry.errors
        state.update(telemetry.extra)
        return state

    def _record(self, decision: dict[str, Any]) -> None:
        self.stats.decisions += 1
        provider = decision.get("provider") or "unknown"
        self.stats.providers[provider] = self.stats.providers.get(provider, 0) + 1
        latency = decision.get("latency_ms")
        if isinstance(latency, int):
            self.stats.latencies_ms.append(latency)

        # Actions the platform refused to pass on because this device cannot
        # perform them. A model inventing commands shows up here first.
        universal = len(decision.get("universal_actions") or [])
        concrete = len(decision.get("actions") or [])
        if universal > concrete:
            self.stats.dropped += universal - concrete
            self.console.dropped(universal - concrete)

    def _perform(self, action: dict[str, Any], *, decision_id: str | None) -> None:
        action_type = action.get("type", "")
        outcome = self.hardware.execute(action_type, action.get("value"))

        self.stats.actions += 1
        if not outcome.ok:
            self.stats.actions_failed += 1
        self.console.action(action, outcome)

        action_id = action.get("action_id")
        if not action_id:
            return

        # The report closes the loop: it lands in the brain's memory and is
        # shown to the model next time, which is how a failed approach stops
        # being repeated.
        self.client.report_execution(
            action_id,
            status="success" if outcome.ok else "failed",
            duration_ms=outcome.duration_ms,
            error=outcome.error,
            decision_id=decision_id,
            action_type=action_type,
        )
