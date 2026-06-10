"""Provider interface for the Model Router."""

from __future__ import annotations

import abc
from typing import Any


class LLMProvider(abc.ABC):
    """A vendor-agnostic JSON-producing LLM.

    Implementations receive a system prompt, a user message (optionally with a
    single image) and a JSON schema, and must return the model's raw JSON text
    constrained to that schema.
    """

    #: Short provider id, e.g. "claude" / "openai" / "local".
    name: str = "base"

    @property
    @abc.abstractmethod
    def model(self) -> str:
        """The concrete model identifier in use."""

    @abc.abstractmethod
    async def complete_json(
        self,
        *,
        system: str,
        user_text: str,
        schema: dict[str, Any],
        image_b64: str | None = None,
        image_media_type: str = "image/jpeg",
    ) -> str:
        """Return the model's response as a JSON string matching ``schema``."""
