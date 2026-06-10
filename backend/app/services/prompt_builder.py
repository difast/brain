"""Builds the prompt sent to the LLM for a device decision.

The LLM is shown the device's *universal* action vocabulary (derived from its
capabilities by the DAL) and must return universal actions only. The Action
Translator then converts them into concrete device commands.
"""

from __future__ import annotations

import json
from typing import Any

SYSTEM_PROMPT = """\
You are the decision-making brain for a fleet of heterogeneous devices \
(robots, arms, cameras, etc.). A thin-client device streams you its current \
camera frame, telemetry and the task it is trying to accomplish. Your job is \
to decide the next high-level actions.

Rules:
- Return ONLY UNIVERSAL actions chosen from the device's available actions \
list below. Do NOT invent low-level/hardware commands — the platform's Action \
Translator converts your universal actions into device-specific commands.
- Respect any value constraints. Prefer small, safe, incremental steps.
- If the scene is unsafe (obstacle very close, low battery) or you are unsure, \
return few or no actions and lower your confidence.
- Use the recent execution feedback to learn: if an action recently failed, \
avoid repeating the same approach blindly.
- "goal" is a short statement of the current objective.
- "thought" is a brief observation of what you see / why you chose these actions.
- "confidence" is 0.0 to 1.0.
- Return ONLY the structured decision — no prose, no markdown.
"""


def _format_universal(actions: list[dict[str, Any]]) -> str:
    if not actions:
        return "(no actions available — return an empty actions list)"
    return "\n".join(
        f"- {a['type']}: {a.get('description', '')}".rstrip() for a in actions
    )


def build_decision_text(
    *,
    task: str,
    available_actions: list[dict[str, Any]],
    robot_type: str,
    state: dict[str, Any],
    recent_actions: list[dict[str, Any]] | None = None,
    recent_feedback: list[dict[str, Any]] | None = None,
    has_image: bool = False,
) -> str:
    parts: list[str] = []
    parts.append(f"DEVICE TYPE: {robot_type}")
    parts.append(f"\nCURRENT TASK:\n{task}")
    parts.append(
        "\nAVAILABLE UNIVERSAL ACTIONS (use only these action types):\n"
        + _format_universal(available_actions)
    )
    parts.append(
        "\nCURRENT STATE / SENSORS:\n" + json.dumps(state, ensure_ascii=False, indent=2)
    )
    if recent_actions:
        parts.append(
            "\nRECENT DECISIONS (most recent first):\n"
            + json.dumps(recent_actions, ensure_ascii=False, indent=2)
        )
    if recent_feedback:
        parts.append(
            "\nRECENT EXECUTION FEEDBACK (what actually happened):\n"
            + json.dumps(recent_feedback, ensure_ascii=False, indent=2)
        )
    if has_image:
        parts.append("\nA camera frame is attached. Analyse it before deciding.")
    parts.append("\nReturn the next decision as structured JSON matching the schema.")
    return "\n".join(parts)


# JSON schema constraining the model output (universal actions).
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
