"""OpenAI / OpenAI-compatible provider.

Works with the OpenAI API and with any OpenAI-compatible endpoint (Ollama,
vLLM, LM Studio, etc.) via ``OPENAI_BASE_URL`` — this is also the "local model"
path. Uses the Chat Completions API with structured JSON output.
"""

from __future__ import annotations

from typing import Any

import httpx
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

logger = get_logger("llm.openai")


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self) -> None:
        base = (settings.openai_base_url or "https://api.openai.com/v1").rstrip("/")
        self._base_url = base
        self._headers = {"Content-Type": "application/json"}
        if settings.openai_api_key:
            self._headers["Authorization"] = f"Bearer {settings.openai_api_key}"
        logger.info("openai_provider_ready", endpoint=base, model=self.model)

    @property
    def model(self) -> str:
        return settings.openai_model

    @retry(
        retry=retry_if_exception_type(httpx.HTTPError),
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
        user_content: list[dict[str, Any]] = [{"type": "text", "text": user_text}]
        if image_b64:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{image_media_type};base64,{image_b64}"
                    },
                }
            )
        payload = {
            "model": settings.openai_model,
            "max_tokens": settings.claude_max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "robot_decision",
                    "schema": schema,
                    "strict": True,
                },
            },
        }
        async with httpx.AsyncClient(timeout=settings.claude_timeout_seconds) as client:
            resp = await client.post(
                f"{self._base_url}/chat/completions",
                headers=self._headers,
                json=payload,
            )
        if resp.status_code >= 400:
            # Some local/OpenAI-compatible servers reject json_schema; retry
            # once with the simpler json_object mode.
            payload["response_format"] = {"type": "json_object"}
            async with httpx.AsyncClient(
                timeout=settings.claude_timeout_seconds
            ) as client:
                resp = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=self._headers,
                    json=payload,
                )
        if resp.status_code >= 400:
            logger.error("openai_error", status=resp.status_code, body=resp.text[:300])
            raise BrainDecisionError(f"LLM endpoint error {resp.status_code}")
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise BrainDecisionError("Malformed LLM response.") from exc
