"""Provider factory — selects the LLM provider from settings."""

from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.services.llm.base import LLMProvider

logger = get_logger("llm.router")


def get_provider() -> LLMProvider | None:
    """Return the configured provider, or ``None`` for mock mode."""
    provider = settings.resolved_provider
    if provider == "mock":
        logger.warning(
            "llm_mock_enabled",
            reason="no LLM provider configured; returning deterministic decisions",
        )
        return None
    if provider == "claude":
        from app.services.llm.claude_provider import ClaudeProvider

        return ClaudeProvider()
    # OpenAI, local and the Russian engines (YandexGPT / GigaChat) all speak
    # the OpenAI-compatible protocol (directly or via a gateway).
    if provider in ("openai", "local", "yandexgpt", "gigachat"):
        from app.services.llm.openai_provider import OpenAIProvider

        return OpenAIProvider(name=provider)
    return None
