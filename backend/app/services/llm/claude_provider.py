"""Anthropic Claude provider."""

from __future__ import annotations

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
from app.services.llm.base import LLMProvider

logger = get_logger("llm.claude")


class ClaudeProvider(LLMProvider):
    name = "claude"

    def __init__(self) -> None:
        kwargs: dict[str, Any] = {"timeout": settings.claude_timeout_seconds}
        kwargs["api_key"] = settings.anthropic_api_key or "tunnel"
        if settings.anthropic_base_url:
            kwargs["base_url"] = settings.anthropic_base_url
        self._client = anthropic.AsyncAnthropic(**kwargs)
        logger.info(
            "claude_provider_ready",
            endpoint=settings.anthropic_base_url or "api.anthropic.com",
            model=self.model,
        )

    @property
    def model(self) -> str:
        return settings.claude_model

    @retry(
        retry=retry_if_exception_type(
            (anthropic.APIStatusError, anthropic.APIConnectionError)
        ),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=8),
        reraise=True,
    )
    async def complete_json(
        self,
        *,
        system: str,
        user_text: str,
        schema: dict[str, Any],
        image_b64: str | None = None,
        image_media_type: str = "image/jpeg",
    ) -> str:
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
        content.append({"type": "text", "text": user_text})

        # thinking + output_config passed via extra_body for SDK-version safety.
        extra_body = {
            "thinking": {"type": settings.claude_thinking},
            "output_config": {
                "format": {"type": "json_schema", "schema": schema}
            },
        }
        try:
            response = await self._client.messages.create(
                model=settings.claude_model,
                max_tokens=settings.claude_max_tokens,
                system=system,
                messages=[{"role": "user", "content": content}],
                extra_body=extra_body,
            )
        except anthropic.BadRequestError as exc:
            logger.error("claude_bad_request", error=str(exc))
            raise BrainDecisionError(str(exc)) from exc

        for block in response.content:
            if block.type == "text":
                return block.text
        raise BrainDecisionError("Empty response from Claude.")
