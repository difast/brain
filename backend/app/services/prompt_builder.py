"""Builds the prompt sent to Claude for a robot decision.

The prompt is fully driven by the robot's *registered capabilities*, so new
robot types are supported without any change to the brain core — you only
register a robot with a different command vocabulary.
"""

from __future__ import annotations

import json
from typing import Any

SYSTEM_PROMPT = """\
You are the decision-making brain for a fleet of robots. A thin-client robot \
streams you its current camera frame, telemetry and the task it is trying to \
accomplish. Your job is to analyse the situation and return the next concrete \
actions for the robot to execute.

Rules:
- You MUST only use action types from the robot's list of available commands.
- Respect each command's value constraints (type, min, max, unit).
- Prefer small, safe, incremental actions. If unsure or if the scene is \
unsafe (obstacle very close, low battery), return few or no actions and lower \
your confidence.
- "goal" is a short restatement of what you are trying to achieve right now.
- "thought" is a brief observation of what you see / why you chose these actions.
- "confidence" is your confidence in this decision from 0.0 to 1.0.
- Return ONLY the structured decision. No prose, no markdown, no explanation \
outside the schema.
"""


def _format_capabilities(capabilities: list[dict[str, Any]]) -> str:
    if not capabilities:
        return "(no commands registered — return an empty actions list)"
    lines = []
    for cap in capabilities:
        ctype = cap.get("type", "?")
        desc = cap.get("description") or ""
        value = cap.get("value")
        constraint = f" value={json.dumps(value)}" if value else ""
        lines.append(f"- {ctype}: {desc}{constraint}".rstrip())
    return "\n".join(lines)


def build_decision_text(
    *,
    task: str,
    capabilities: list[dict[str, Any]],
    robot_type: str,
    state: dict[str, Any],
    recent_actions: list[dict[str, Any]] | None = None,
    has_image: bool = False,
) -> str:
    """Assemble the textual user-content portion of the prompt."""
    parts: list[str] = []
    parts.append(f"ROBOT TYPE: {robot_type}")
    parts.append(f"\nCURRENT TASK:\n{task}")
    parts.append(
        "\nAVAILABLE COMMANDS (use only these action types):\n"
        + _format_capabilities(capabilities)
    )
    parts.append(
        "\nCURRENT STATE / SENSORS:\n" + json.dumps(state, ensure_ascii=False, indent=2)
    )
    if recent_actions:
        parts.append(
            "\nRECENT DECISIONS (most recent first):\n"
            + json.dumps(recent_actions, ensure_ascii=False, indent=2)
        )
    if has_image:
        parts.append("\nA camera frame is attached. Analyse it before deciding.")
    parts.append(
        "\nReturn the next decision as structured JSON matching the schema."
    )
    return "\n".join(parts)


# JSON schema used to constrain the model output (output_config.format).
DECISION_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "goal": {"type": "string"},
        "thought": {"type": "string"},
        "confidence": {"type": "number"},
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "value": {
                        "anyOf": [
                            {"type": "number"},
                            {"type": "string"},
                            {"type": "boolean"},
                            {"type": "null"},
                        ]
                    },
                },
                "required": ["type", "value"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["goal", "thought", "confidence", "actions"],
    "additionalProperties": False,
}
