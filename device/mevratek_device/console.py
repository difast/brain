"""Terminal output.

Kept apart from the loop for a plain reason: this is the half a person watches
at a stand, and the half nobody wants tangled into the logic. Colour is used
only to mark success and failure, and switches itself off when the output is
not a terminal, so a log file stays readable.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from .hardware import Outcome


class Console:
    def __init__(self, *, colour: bool | None = None, verbose: bool = False) -> None:
        if colour is None:
            colour = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None
        self._colour = colour
        self.verbose = verbose

    # -- palette ---------------------------------------------------------

    def _paint(self, text: str, code: str) -> str:
        return f"\033[{code}m{text}\033[0m" if self._colour else text

    def _dim(self, text: str) -> str:
        return self._paint(text, "2")

    def _green(self, text: str) -> str:
        return self._paint(text, "32")

    def _red(self, text: str) -> str:
        return self._paint(text, "31")

    def _bold(self, text: str) -> str:
        return self._paint(text, "1")

    # -- events ----------------------------------------------------------

    def banner(self, *, robot: str, hardware: str, camera: str, api: str) -> None:
        print()
        print(self._bold(f"  {robot}"))
        print(self._dim(f"  железо : {hardware}"))
        print(self._dim(f"  камера : {camera}"))
        print(self._dim(f"  сервер : {api}"))
        print()

    def registered(self, robot: dict[str, Any], capabilities: list[str]) -> None:
        print(self._green("✓") + f" зарегистрирован: {robot.get('name')}")
        print(self._dim(f"  id     : {robot.get('id')}"))
        print(self._dim(f"  умею   : {', '.join(capabilities)}"))
        print()

    def reconnected(self, robot_id: str) -> None:
        print(self._green("✓") + " подключился под сохранённым токеном")
        print(self._dim(f"  id     : {robot_id}"))
        print()

    def profile(self, universal: list[str]) -> None:
        """What the platform decided the model may ask this device to do.

        Worth printing: it is the Device Abstraction Layer's answer, computed
        from the capabilities above, and seeing the two side by side is the
        clearest explanation of the idea there is.
        """
        print(self._dim(f"  платформа разрешила модели: {', '.join(universal)}"))
        print()

    def round_header(
        self, number: int, state: dict[str, Any], frame: bytes | None
    ) -> None:
        bits = []
        if "battery" in state:
            bits.append(f"батарея {state['battery']}%")
        if "obstacle_distance_m" in state:
            bits.append(f"до препятствия {state['obstacle_distance_m']} м")
        if frame:
            bits.append(f"кадр {len(frame) // 1024} КБ")
        else:
            bits.append("без кадра")
        print(self._bold(f"[{number}] ") + self._dim(" · ".join(bits)))
        if self.verbose:
            print(self._dim("      " + json.dumps(state, ensure_ascii=False)))

    def decision(self, decision: dict[str, Any]) -> None:
        provider = decision.get("provider") or "?"
        latency = decision.get("latency_ms")
        confidence = decision.get("confidence")
        thought = decision.get("thought") or decision.get("goal") or ""

        # A fallback is the one thing that must never look like a normal
        # answer, because from every other angle it does.
        fallen = provider == "mock" or provider.endswith(":fallback")
        tag = self._red(f"⚠ {provider}") if fallen else self._dim(provider)

        meta = f"{tag}"
        if isinstance(confidence, (int, float)):
            meta += self._dim(f" · уверенность {confidence:.2f}")
        if isinstance(latency, int):
            meta += self._dim(f" · {latency / 1000:.1f} с")

        print(f"    → {thought}")
        print(f"      {meta}")

    def action(self, action: dict[str, Any], outcome: Outcome) -> None:
        mark = self._green("✓") if outcome.ok else self._red("✗")
        name = action.get("type", "?")
        value = action.get("value")
        label = f"{name} {value}" if value is not None else name
        detail = self._dim(f"  {outcome.detail}") if outcome.detail else ""
        print(f"    {mark} {label}{detail}")

    def dropped(self, count: int) -> None:
        print(
            self._red(f"    ! {count} действ. отброшено")
            + self._dim(" — устройство их не умеет")
        )

    def note(self, text: str) -> None:
        print(self._dim(f"    · {text}"))

    def error(self, text: str) -> None:
        print(self._red(f"    ✗ {text}"))

    # -- the end ---------------------------------------------------------

    def summary(self, stats: Any) -> None:
        print()
        print(self._bold("  Итог"))
        print(f"  кругов            : {stats.rounds}")
        print(f"  решений           : {stats.decisions}")

        if stats.actions:
            failed = stats.actions_failed
            print(
                f"  команд исполнено  : {stats.actions - failed} из {stats.actions}"
                + (self._dim(f"  ({failed} не удалось)") if failed else "")
            )
        if stats.dropped:
            print(self._red(f"  отброшено         : {stats.dropped}"))
        if stats.network_errors:
            print(self._red(f"  ошибок связи      : {stats.network_errors}"))

        if stats.latencies_ms:
            ordered = sorted(stats.latencies_ms)
            middle = ordered[len(ordered) // 2]
            worst = ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]
            print(f"  задержка p50/p95  : {middle} / {worst} мс")

        if stats.providers:
            share = stats.fallback_share
            line = f"  доля заглушки     : {share * 100:.0f}%"
            print(self._red(line) if share > 0.01 else self._green(line))
            for name, count in sorted(stats.providers.items()):
                print(self._dim(f"    {name}: {count}"))

            if share > 0.99:
                print()
                print(
                    self._red("  Все решения — заглушка.")
                    + " Модель не подключена или отвечает с ошибкой."
                )
                print(
                    self._dim(
                        "  Смотрите LLM_PROVIDER и ключ на сервере: устройство "
                        "работает, но думает не модель."
                    )
                )
        print()
