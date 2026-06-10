"""Model Router — pluggable LLM providers behind one interface.

The Decision Engine depends only on :class:`LLMProvider`, never on a specific
vendor. Swap Claude / OpenAI / a local model via the ``LLM_PROVIDER`` setting
without touching the API or the engine.
"""

from app.services.llm.base import LLMProvider
from app.services.llm.router import get_provider

__all__ = ["LLMProvider", "get_provider"]
