"""Device Abstraction Layer (DAL).

Lets the cloud control any device through a single protocol:
- a catalog of *universal* high-level actions the LLM may emit;
- an Action Translator mapping universal actions to a concrete device's
  low-level commands based on its declared capabilities.
"""

from app.dal.actions import (
    DEVICE_COMMANDS,
    UNIVERSAL_ACTIONS,
)
from app.dal.translator import ActionTranslator, TranslatedAction

__all__ = [
    "DEVICE_COMMANDS",
    "UNIVERSAL_ACTIONS",
    "ActionTranslator",
    "TranslatedAction",
]
