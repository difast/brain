"""Run the agent's tests straight from a checkout, with no install step."""

from __future__ import annotations

import sys
from pathlib import Path

DEVICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(DEVICE))
sys.path.insert(0, str(DEVICE.parent / "sdk" / "python"))
