"""Decision Engine — provider-agnostic, DAL-aware.

Builds the universal-action prompt, calls whichever LLM provider the Model
Router selected (or a deterministic mock), validates the universal decision,
then uses the Action Translator to produce concrete device commands.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any

from app.core import metrics
from app.core.exceptions import BrainDecisionError
from app.core.logging import get_logger
from app.dal.translator import ActionTranslator
from app.schemas.decision import BrainDecision
from app.services.llm import get_provider
from app.services.prompt_builder import (
    DECISION_JSON_SCHEMA,
    SYSTEM_PROMPT,
    build_decision_text,
)

logger = get_logger("engine")


@dataclass
class DecisionResult:
    decision: BrainDecision  # universal actions
    device_actions: list[dict[str, Any]]  # translated, with action_id
    dropped: list[dict[str, Any]] = field(default_factory=list)
    raw_response: str = ""
    model: str = "mock"
    provider: str = "mock"
    latency_ms: int = 0


class DecisionEngine:
    def __init__(self) -> None:
        self._provider = get_provider()
        self.provider_name = self._provider.name if self._provider else "mock"
        self.model_name = self._provider.model if self._provider else "mock"

    async def decide(
        self,
        *,
        task: str,
        robot_type: str,
        capabilities: list[dict[str, Any]],
        state: dict[str, Any],
        recent_actions: list[dict[str, Any]] | None = None,
        recent_feedback: list[dict[str, Any]] | None = None,
        image_b64: str | None = None,
        image_media_type: str = "image/jpeg",
    ) -> DecisionResult:
        available = ActionTranslator.available_universal(capabilities)

        if self._provider is None:
            decision = self._mock_decision(task, available)
            raw = decision.model_dump_json()
            model = provider = "mock"
            latency_ms = 1
        else:
            text = build_decision_text(
                task=task,
                available_actions=available,
                robot_type=robot_type,
                state=state,
                recent_actions=recent_actions,
                recent_feedback=recent_feedback,
                has_image=bool(image_b64),
            )
            start = time.perf_counter()
            try:
                raw = await self._provider.complete_json(
                    system=SYSTEM_PROMPT,
                    user_text=text,
                    schema=DECISION_JSON_SCHEMA,
                    image_b64=image_b64,
                    image_media_type=image_media_type,
                )
                latency_ms = int((time.perf_counter() - start) * 1000)
                decision = self._parse(raw)
                model = self.model_name
                provider = self.provider_name
            except Exception as exc:  # noqa: BLE001
                # Never let a misconfigured/unreachable provider break the
                # device loop — fall back to a safe deterministic decision.
                logger.warning(
                    "provider_failed_fallback_mock",
                    provider=self.provider_name,
                    error=str(exc),
                )
                decision = self._mock_decision(task, available)
                raw = decision.model_dump_json()
                model = provider = f"{self.provider_name}:fallback"
                latency_ms = int((time.perf_counter() - start) * 1000)

        # Publish what happened before translating, so the fallback share and
        # the latency distribution are visible to Prometheus even when the
        # translation step below is the thing that goes wrong.
        self._record(provider, latency_ms, decision.confidence)

        # Translate universal actions -> concrete device commands.
        translation = ActionTranslator.translate(
            [a.model_dump() for a in decision.actions], capabilities
        )
        if translation.dropped:
            logger.warning("dropped_actions", dropped=translation.dropped)
            metrics.DROPPED_ACTIONS.inc(len(translation.dropped))

        return DecisionResult(
            decision=decision,
            device_actions=[a.to_dict() for a in translation.actions],
            dropped=translation.dropped,
            raw_response=raw,
            model=model,
            provider=provider,
            latency_ms=latency_ms,
        )

    @staticmethod
    def _record(provider: str, latency_ms: int, confidence: float) -> None:
        """Feed the scrape endpoint.

        The provider label drops the ``:fallback`` suffix and the outcome
        carries it instead, so one query answers "how is claude doing" and
        another answers "how much of the fleet is running on canned logic".
        A mock decision counts as a fallback: no provider was configured, and
        the device is moving on a placeholder either way.
        """
        outcome = (
            "fallback"
            if provider == "mock" or provider.endswith(":fallback")
            else "model"
        )
        name = provider.removesuffix(":fallback")
        metrics.DECISIONS.inc(provider=name, outcome=outcome)
        metrics.DECISION_DURATION.observe(
            latency_ms / 1000, provider=name, outcome=outcome
        )
        metrics.DECISION_CONFIDENCE.observe(
            confidence, provider=name, outcome=outcome
        )

    @staticmethod
    def _parse(raw: str) -> BrainDecision:
        try:
            return BrainDecision.model_validate(json.loads(raw))
        except Exception as exc:  # noqa: BLE001
            logger.error("decision_parse_failed", error=str(exc), raw=raw[:500])
            raise BrainDecisionError("Model did not return a valid decision.") from exc

    @staticmethod
    def _mock_decision(
        task: str, available: list[dict[str, Any]]
    ) -> BrainDecision:
        actions: list[dict[str, Any]] = []
        if available:
            first = available[0]["type"]
            actions.append({"type": first, "value": None})
        return BrainDecision.model_validate(
            {
                "goal": task[:120],
                "thought": "[mock] no LLM provider configured; returning a "
                "deterministic placeholder decision.",
                "confidence": 0.5,
                "actions": actions,
            }
        )
