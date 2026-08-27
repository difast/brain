"""Action Translator — universal actions ⇄ device commands."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from app.dal.actions import DEVICE_COMMANDS, UNIVERSAL_ACTIONS


@dataclass
class TranslatedAction:
    action_id: str
    type: str  # the concrete device command
    value: Any = None
    universal: str | None = None  # the universal action it came from

    def to_dict(self) -> dict[str, Any]:
        return {
            "action_id": self.action_id,
            "type": self.type,
            "value": self.value,
            "universal": self.universal,
        }


@dataclass
class TranslationResult:
    actions: list[TranslatedAction] = field(default_factory=list)
    dropped: list[dict[str, Any]] = field(default_factory=list)


class ActionTranslator:
    """Translates the LLM's universal actions into device commands.

    A device only ever receives commands it declared in its capabilities.
    """

    @staticmethod
    def _device_command_types(capabilities: list[dict[str, Any]]) -> set[str]:
        return {t for c in capabilities if (t := c.get("type"))}

    @classmethod
    def available_universal(
        cls, capabilities: list[dict[str, Any]]
    ) -> list[dict[str, str]]:
        """Universal actions this device can perform (for the LLM prompt)."""
        device_types = cls._device_command_types(capabilities)
        available: list[dict[str, str]] = []
        for name, spec in UNIVERSAL_ACTIONS.items():
            if any(c in device_types for c in spec["candidates"]):
                available.append({"type": name, "description": spec["description"]})
        return available

    @classmethod
    def translate(
        cls,
        universal_actions: list[dict[str, Any]],
        capabilities: list[dict[str, Any]],
    ) -> TranslationResult:
        """Map universal actions to concrete device commands.

        Accepts either universal action names or, for flexibility, direct
        device command types. Anything the device can't perform is dropped.
        """
        device_types = cls._device_command_types(capabilities)
        result = TranslationResult()
        for action in universal_actions:
            atype = action.get("type")
            value = action.get("value")
            if not atype:
                continue
            device_cmd: str | None = None
            # 1. Direct device command pass-through.
            if atype in device_types:
                device_cmd = atype
            # 2. Universal action → first supported candidate.
            elif atype in UNIVERSAL_ACTIONS:
                for candidate in UNIVERSAL_ACTIONS[atype]["candidates"]:
                    if candidate in device_types:
                        device_cmd = candidate
                        break
            if device_cmd is None:
                result.dropped.append(
                    {"type": atype, "reason": "unsupported_by_device"}
                )
                continue
            result.actions.append(
                TranslatedAction(
                    action_id=uuid.uuid4().hex,
                    type=device_cmd,
                    value=value,
                    universal=atype if atype != device_cmd else None,
                )
            )
        return result

    @staticmethod
    def known_device_command(command_type: str) -> bool:
        return command_type in DEVICE_COMMANDS
