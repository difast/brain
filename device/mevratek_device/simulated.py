"""A virtual rover: the first thing that plugs into the socket.

Deliberately not a physics engine. What is being tested is the conversation
with the brain, not Newtonian mechanics, and a convincing simulation of
friction would only make the failures harder to read. What it does model is the
handful of things that make the conversation *interesting*:

  * the battery goes down, so the model eventually has to care;
  * a wall gets closer, so there is something to avoid;
  * commands sometimes fail, because in the real world they do.

That last one matters most. A device where everything always works never
exercises the feedback loop, and the feedback loop is the part nobody has
tested.
"""

from __future__ import annotations

import math
import random
import time
from typing import Any

from .hardware import Hardware, Outcome, Telemetry

# The rover's own limits, published to the platform so the model cannot ask for
# a step this hardware could not take.
MAX_STEP_M = 0.5
MAX_TURN_DEG = 180.0


class SimulatedRover(Hardware):
    robot_type = "rover"

    def __init__(
        self,
        *,
        failure_rate: float = 0.15,
        battery_drain_per_action: float = 0.4,
        seed: int | None = None,
    ) -> None:
        # Seeded so a test can assert on behaviour; None in real runs, where
        # unpredictability is the point.
        self._random = random.Random(seed)
        self._failure_rate = failure_rate
        self._drain = battery_drain_per_action

        self.battery = 100.0
        self.x = 0.0
        self.y = 0.0
        self.heading_deg = 0.0
        self.speed = 0.0
        #: Distance to whatever is in front. Starts far, closes as we advance.
        self.obstacle_distance_m = 3.0
        self.last_error: str | None = None

    # -- Hardware --------------------------------------------------------

    def capabilities(self) -> list[dict[str, Any]]:
        return [
            {
                "type": "move_forward",
                "description": "Ехать вперёд",
                "value": {"type": "number", "min": 0, "max": MAX_STEP_M, "unit": "m"},
            },
            {
                "type": "move_backward",
                "description": "Ехать назад",
                "value": {"type": "number", "min": 0, "max": MAX_STEP_M, "unit": "m"},
            },
            {
                "type": "turn_left",
                "description": "Повернуть налево",
                "value": {
                    "type": "number", "min": 0, "max": MAX_TURN_DEG, "unit": "deg"
                },
            },
            {
                "type": "turn_right",
                "description": "Повернуть направо",
                "value": {
                    "type": "number", "min": 0, "max": MAX_TURN_DEG, "unit": "deg"
                },
            },
            {"type": "stop", "description": "Остановиться"},
            {"type": "camera_capture", "description": "Сделать снимок"},
        ]

    def telemetry(self) -> Telemetry:
        return Telemetry(
            battery=round(self.battery, 1),
            speed=round(self.speed, 2),
            x=round(self.x, 2),
            y=round(self.y, 2),
            errors=[self.last_error] if self.last_error else [],
            # Distance and heading are not columns the platform charts, so they
            # ride along in `extra` — where the model still sees them, which is
            # what actually matters for the decision.
            extra={
                "obstacle_distance_m": round(self.obstacle_distance_m, 2),
                "heading_deg": round(self.heading_deg, 1),
            },
        )

    def execute(self, action_type: str, value: Any) -> Outcome:
        started = time.perf_counter()
        self.last_error = None

        if self.battery <= 0:
            return self._done(started, False, "battery empty")

        handler = {
            "move_forward": self._move_forward,
            "move_backward": self._move_backward,
            "turn_left": lambda v: self._turn(-_number(v, 15.0)),
            "turn_right": lambda v: self._turn(+_number(v, 15.0)),
            "stop": self._stop,
            "camera_capture": self._capture,
        }.get(action_type)

        if handler is None:
            # Should never happen: the platform drops anything this device did
            # not declare. If it does, that is a bug worth seeing loudly.
            return self._done(started, False, f"unknown command: {action_type}")

        self.battery = max(0.0, self.battery - self._drain)
        return handler(value)  # type: ignore[operator]

    def describe(self) -> str:
        return "виртуальный ровер (колёса, камера)"

    # -- the commands ----------------------------------------------------

    def _move_forward(self, value: Any) -> Outcome:
        started = time.perf_counter()
        wanted = min(_number(value, 0.3), MAX_STEP_M)

        if self._unlucky():
            self.speed = 0.0
            return self._done(started, False, "колесо пробуксовало")

        # The wall is real: you get as far as the gap allows, and if that is
        # much less than asked, the command failed and the brain should hear so.
        travelled = min(wanted, max(0.0, self.obstacle_distance_m - 0.1))
        radians = math.radians(self.heading_deg)
        self.x += travelled * math.cos(radians)
        self.y += travelled * math.sin(radians)
        self.obstacle_distance_m = max(0.0, self.obstacle_distance_m - travelled)
        self.speed = round(travelled / 0.8, 2)

        if travelled < wanted - 0.01:
            return self._done(
                started,
                False,
                "упёрся в препятствие",
                detail=f"проехал {travelled:.2f} из {wanted:.2f} м",
            )
        return self._done(started, True, detail=f"проехал {travelled:.2f} м")

    def _move_backward(self, value: Any) -> Outcome:
        started = time.perf_counter()
        distance = min(_number(value, 0.3), MAX_STEP_M)
        radians = math.radians(self.heading_deg)
        self.x -= distance * math.cos(radians)
        self.y -= distance * math.sin(radians)
        # Backing off buys room in front — which is how the rover recovers.
        self.obstacle_distance_m += distance
        self.speed = round(distance / 0.8, 2)
        return self._done(started, True, detail=f"отъехал {distance:.2f} м")

    def _turn(self, degrees: float) -> Outcome:
        started = time.perf_counter()
        self.heading_deg = (self.heading_deg + degrees) % 360.0
        self.speed = 0.0
        # Turning changes what is in front, so the gap changes too. Rough on
        # purpose — a believable number beats a fake-precise one.
        drift = self._random.uniform(-0.4, 1.6)
        self.obstacle_distance_m = round(
            min(4.0, max(0.3, self.obstacle_distance_m + drift)), 2
        )
        side = "налево" if degrees < 0 else "направо"
        return self._done(
            started, True, detail=f"повернул {side} на {abs(degrees):.0f}°"
        )

    def _stop(self, _value: Any = None) -> Outcome:
        started = time.perf_counter()
        self.speed = 0.0
        return self._done(started, True, detail="остановился")

    def _capture(self, _value: Any = None) -> Outcome:
        started = time.perf_counter()
        return self._done(started, True, detail="снимок сделан")

    # -- helpers ---------------------------------------------------------

    def _unlucky(self) -> bool:
        return self._random.random() < self._failure_rate

    def _done(
        self,
        started: float,
        ok: bool,
        error: str | None = None,
        *,
        detail: str = "",
    ) -> Outcome:
        if not ok:
            self.last_error = error
        return Outcome(
            ok=ok,
            duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
            error=error,
            detail=detail or (error or ""),
        )


def _number(value: Any, fallback: float) -> float:
    """Models answer with numbers, strings, or nothing at all.

    A decision that says `"value": "0.5"` is not wrong enough to throw away, and
    one that omits the value entirely still means "take a step". Both are
    coerced rather than refused.
    """
    if value is None:
        return fallback
    try:
        return abs(float(value))
    except (TypeError, ValueError):
        return fallback
