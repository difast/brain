"""Claude API client wrapper for the brain.

Responsibilities:
- Build the request (system prompt, text content, optional image).
- Constrain the output to strict JSON via ``output_config.format``.
- Parse and validate the response into a :class:`BrainDecision`.
- Retry transient API errors with exponential backoff.
- Provide a deterministic mock when no API key is configured (local/CI).
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

import anthropic
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.exceptions import BrainDecisionError
from app.core.logging import get_logger
from app.schemas.decision import BrainDecision
from app.services.prompt_builder import (
    DECISION_JSON_SCHEMA,
    SYSTEM_PROMPT,
    build_decision_text,
)

logger = get_logger("claude")


@dataclass
class DecisionResult:
    decision: BrainDecision
    raw_response: str
    model: str
    latency_ms: int


class ClaudeBrain:
    """Thin wrapper around the Anthropic Async SDK for robot decisions."""

    def __init__(self) -> None:
        self._mock = settings.use_claude_mock
        self._client: anthropic.AsyncAnthropic | None = None
        if not self._mock:
            kwargs: dict = {"timeout": settings.claude_timeout_seconds}
            # An AI tunnel may not require a real key; the SDK still needs a
            # non-empty value, so use a placeholder when only a base_url is set.
            kwargs["api_key"] = settings.anthropic_api_key or "tunnel"
            if settings.anthropic_base_url:
                kwargs["base_url"] = settings.anthropic_base_url
            self._client = anthropic.AsyncAnthropic(**kwargs)
            logger.info(
                "claude_client_ready",
                endpoint=settings.anthropic_base_url or "api.anthropic.com",
                model=settings.claude_model,
            )
        else:
            logger.warning(
                "claude_mock_enabled",
                reason="no ANTHROPIC_API_KEY or ANTHROPIC_BASE_URL configured; "
                "returning mock decisions",
            )

    async def decide(
        self,
        *,
        task: str,
        robot_type: str,
        capabilities: list[dict[str, Any]],
        state: dict[str, Any],
        recent_actions: list[dict[str, Any]] | None = None,
        image_b64: str | None = None,
        image_media_type: str = "image/jpeg",
    ) -> DecisionResult:
        text = build_decision_text(
            task=task,
            capabilities=capabilities,
            robot_type=robot_type,
            state=state,
            recent_actions=recent_actions,
            has_image=bool(image_b64),
        )

        if self._mock:
            return self._mock_decision(task, capabilities, state)

        start = time.perf_counter()
        raw = await self._call_api(text, image_b64, image_media_type)
        latency_ms = int((time.perf_counter() - start) * 1000)

        try:
            payload = json.loads(raw)
            decision = BrainDecision.model_validate(payload)
        except Exception as exc:  # noqa: BLE001
            logger.error("decision_parse_failed", error=str(exc), raw=raw[:500])
            raise BrainDecisionError(
                "Model did not return a valid decision."
            ) from exc

        decision = self._enforce_command_whitelist(decision, capabilities)
        return DecisionResult(
            decision=decision,
            raw_response=raw,
            model=settings.claude_model,
            latency_ms=latency_ms,
        )

    @retry(
        retry=retry_if_exception_type(
            (anthropic.APIStatusError, anthropic.APIConnectionError)
        ),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=8),
        reraise=True,
    )
    async def _call_api(
        self, text: str, image_b64: str | None, image_media_type: str
    ) -> str:
        assert self._client is not None
        content: list[dict[str, Any]] = []
        if image_b64:
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image_media_type,
                        "data": image_b64,
                    },
                }
            )
        content.append({"type": "text", "text": text})

        # `thinking` and `output_config` are passed via extra_body so the
        # request works regardless of the installed SDK version (older SDKs
        # don't expose them as typed kwargs) — the fields are forwarded to the
        # API verbatim.
        extra_body = {
            "thinking": {"type": settings.claude_thinking},
            "output_config": {
                "format": {
                    "type": "json_schema",
                    "schema": DECISION_JSON_SCHEMA,
                }
            },
        }
        try:
            response = await self._client.messages.create(
                model=settings.claude_model,
                max_tokens=settings.claude_max_tokens,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": content}],
                extra_body=extra_body,
            )
        except anthropic.BadRequestError as exc:
            logger.error("claude_bad_request", error=str(exc))
            raise BrainDecisionError(str(exc)) from exc

        for block in response.content:
            if block.type == "text":
                return block.text
        raise BrainDecisionError("Empty response from model.")

    @staticmethod
    def _enforce_command_whitelist(
        decision: BrainDecision, capabilities: list[dict[str, Any]]
    ) -> BrainDecision:
        """Drop any action whose type the robot doesn't actually support.

        Defence-in-depth: the prompt already constrains the model, but we never
        forward a command the robot can't execute.
        """
        allowed = {c.get("type") for c in capabilities if c.get("type")}
        if not allowed:
            return decision
        filtered = [a for a in decision.actions if a.type in allowed]
        if len(filtered) != len(decision.actions):
            logger.warning(
                "dropped_unsupported_actions",
                dropped=[a.type for a in decision.actions if a.type not in allowed],
            )
        decision.actions = filtered
        return decision

    @staticmethod
    def _mock_decision(
        task: str, capabilities: list[dict[str, Any]], state: dict[str, Any]
    ) -> DecisionResult:
        """Deterministic stand-in used when no API key is configured."""
        actions: list[dict[str, Any]] = []
        types = [c.get("type") for c in capabilities if c.get("type")]
        # Pick a sensible default first command if available.
        if types:
            first = types[0]
            cap = next(c for c in capabilities if c.get("type") == first)
            value = 0.3
            spec = cap.get("value") or {}
            if spec.get("type") == "number":
                lo = spec.get("min", 0)
                hi = spec.get("max", 1)
                value = round(lo + (hi - lo) * 0.3, 3)
            elif spec.get("type") == "boolean":
                value = True
            actions.append({"type": first, "value": value})
        decision = BrainDecision.model_validate(
            {
                "goal": task[:120],
                "thought": "[mock] no ANTHROPIC_API_KEY configured; "
                "returning a deterministic placeholder decision.",
                "confidence": 0.5,
                "actions": actions,
            }
        )
        return DecisionResult(
            decision=decision,
            raw_response=decision.model_dump_json(),
            model="mock",
            latency_ms=1,
        )
