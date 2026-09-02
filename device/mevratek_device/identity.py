"""Remembering who this device is between runs.

A real device registers once in its life and keeps its token afterwards. An
agent that registers on every start would fill the dashboard with duplicates,
lose the task queue (tasks are addressed to a specific device), and throw away
the decision history that the brain uses as memory — which is precisely the
thing worth testing.

So the token is written next to the agent and reused. If the server no longer
recognises it — the device was deleted, the organization's secret rotated — the
agent registers again rather than refusing to start.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

STATE_FILE = ".device-state.json"


@dataclass
class Identity:
    robot_id: str
    token: str
    name: str
    api: str


class IdentityStore:
    """One file, several devices — keyed by name and server.

    Keyed by both because the same laptop is routinely pointed at a local
    backend and at production, and those are different devices with different
    tokens.
    """

    def __init__(self, path: Path) -> None:
        self.path = path

    @staticmethod
    def _key(name: str, api: str) -> str:
        return f"{name}@{api}"

    def _read(self) -> dict[str, Any]:
        if not self.path.is_file():
            return {}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            # A corrupt state file must not stop a device from starting; the
            # worst case is registering again.
            return {}

    def load(self, name: str, api: str) -> Identity | None:
        entry = self._read().get(self._key(name, api))
        if not entry:
            return None
        try:
            return Identity(
                robot_id=entry["robot_id"],
                token=entry["token"],
                name=name,
                api=api,
            )
        except KeyError:
            return None

    def save(self, identity: Identity) -> None:
        data = self._read()
        data[self._key(identity.name, identity.api)] = {
            "robot_id": identity.robot_id,
            "token": identity.token,
        }
        self.path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        # The token is a credential: readable by its owner and nobody else.
        try:
            self.path.chmod(0o600)
        except OSError:  # pragma: no cover - filesystem dependent
            pass

    def forget(self, name: str, api: str) -> None:
        data = self._read()
        if data.pop(self._key(name, api), None) is not None:
            self.path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
