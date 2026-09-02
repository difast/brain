"""The shape of the socket every piece of hardware plugs into.

The agent's loop never learns what is on the other side. It asks two things —
"what can you do" and "do this" — and that is the whole contract. Which is why
swapping the simulator for a real rover is a new file, not a rewrite.

A device is described by *data*, not by code: `capabilities()` returns the list
of low-level commands this hardware physically supports, and the platform works
out for itself which high-level actions a model may ask for. Adding a gripper
means adding a line to that list.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Outcome:
    """What happened when a command was executed.

    A failure is not an exception. Hardware fails all the time — a wheel slips,
    an arm hits something — and the brain is supposed to hear about it and
    adapt, so a failed command travels back as data, exactly like a successful
    one.
    """

    ok: bool
    duration_ms: int
    error: str | None = None
    #: Anything worth showing on screen — "проехал 0.3 из 0.5 м".
    detail: str = ""


@dataclass
class Telemetry:
    """A snapshot of the device, as the platform's telemetry endpoint wants it.

    The named fields are the ones the dashboard charts. Anything else goes in
    `extra`, which is free-form — the platform stores whatever is put there and
    the model sees all of it.
    """

    battery: float | None = None
    speed: float | None = None
    x: float | None = None
    y: float | None = None
    z: float | None = None
    errors: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)


class Hardware(ABC):
    """Everything the agent needs from a body.

    Four methods. Two of them are optional in practice — `describe` is for the
    screen and `shutdown` has nothing to do on a simulator.
    """

    #: Goes into the device's `robot_type` at registration. The model is told
    #: this, and it changes how it reasons: a "rover" and a "arm" get different
    #: answers to the same task.
    robot_type: str = "device"

    @abstractmethod
    def capabilities(self) -> list[dict[str, Any]]:
        """The low-level commands this hardware physically supports.

        Each entry is `{"type", "description", "value"}` where `value`
        constrains the argument — a range with units, so the model cannot ask
        for a two-metre step from a device whose limit is half a metre.
        """

    @abstractmethod
    def telemetry(self) -> Telemetry:
        """Read the sensors right now."""

    @abstractmethod
    def execute(self, action_type: str, value: Any) -> Outcome:
        """Carry out one command and say how it went."""

    def describe(self) -> str:
        """One line for the console at startup."""
        return self.robot_type

    def shutdown(self) -> None:  # noqa: B027 - optional hook, not abstract
        """Stop the motors, park the arm, release the camera.

        Deliberately concrete and empty: a simulator has nothing to switch off,
        and making this abstract would force every hardware layer to write an
        empty method to satisfy the compiler.
        """
