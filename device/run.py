#!/usr/bin/env python3
"""Start the device agent.

    python run.py --task "найди бутылку"
    python run.py --task "объезжай препятствия" --camera webcam
    python run.py --rounds 5 --camera none

Settings come from the command line, then the environment, then config.yaml —
in that order, so a quick experiment never requires editing a file.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Run straight from a checkout without installing anything: the agent and the
# SDK are both in this repository.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sdk" / "python"))

from mevratek import BrainClient, BrainError  # noqa: E402

from mevratek_device import camera as camera_module  # noqa: E402
from mevratek_device.agent import Agent  # noqa: E402
from mevratek_device.console import Console  # noqa: E402
from mevratek_device.identity import Identity, IdentityStore  # noqa: E402
from mevratek_device.simulated import SimulatedRover  # noqa: E402

DEFAULT_API = "http://localhost:8000/api/v1"


def load_config(path: Path) -> dict:
    """config.yaml, if it exists. Optional, and PyYAML is optional with it."""
    if not path.is_file():
        return {}
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError:
        print(f"! {path.name} найден, но PyYAML не установлен — файл пропущен")
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def build_hardware(name: str):
    if name == "simulated":
        return SimulatedRover()
    if name == "raspberry":
        raise SystemExit(
            "Слой raspberry ещё не написан — он появится вместе с железом.\n"
            "Интерфейс для него готов: mevratek_device/hardware.py"
        )
    raise SystemExit(f"неизвестное железо: {name} (simulated|raspberry)")


def parse_args(config: dict) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="Агент устройства Mevratek: тело, которое разговаривает с мозгом.",
    )
    parser.add_argument(
        "--api",
        default=os.environ.get("MEVRATEK_API", config.get("api", DEFAULT_API)),
        help="базовый URL API, включая /api/v1",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("MEVRATEK_API_KEY", config.get("api_key", "")),
        help="ключ организации cbk_… из панели, вкладка «Разработчику»",
    )
    parser.add_argument(
        "--name",
        default=config.get("name", "laptop-rover"),
        help="имя устройства в панели",
    )
    parser.add_argument(
        "--task",
        default=config.get("task", "осмотрись и двигайся, не задевая препятствия"),
        help="что устройство пытается сделать",
    )
    parser.add_argument(
        "--hardware", default=config.get("hardware", "simulated"),
        choices=["simulated", "raspberry"],
    )
    parser.add_argument(
        "--camera", default=config.get("camera", "none"),
        choices=["none", "file", "webcam"],
    )
    parser.add_argument(
        "--frame", default=config.get("frame"),
        help="картинка для --camera file",
    )
    parser.add_argument(
        "--camera-index", type=int, default=config.get("camera_index", 0)
    )
    parser.add_argument(
        "--interval", type=float, default=config.get("interval", 2.0),
        help="пауза между кругами, секунд",
    )
    parser.add_argument(
        "--rounds", type=int, default=config.get("rounds"),
        help="сколько кругов сделать и выйти (по умолчанию — бесконечно)",
    )
    parser.add_argument(
        "--pull-tasks", action="store_true", default=config.get("pull_tasks", False),
        help="брать задачи из очереди платформы, а не из --task",
    )
    parser.add_argument(
        "--fresh", action="store_true",
        help="забыть сохранённый токен и зарегистрироваться заново",
    )
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


def connect(args, hardware, console: Console) -> BrainClient:
    """Reuse this device's token if we have one, otherwise register.

    Registering every run would create a new device in the dashboard each time
    and orphan the previous one's task queue and history.
    """
    store = IdentityStore(HERE / ".device-state.json")
    if args.fresh:
        store.forget(args.name, args.api)

    known = store.load(args.name, args.api)
    if known:
        client = BrainClient(args.api, token=known.token)
        try:
            client.heartbeat("online")
            client.robot = {"id": known.robot_id, "name": known.name}
            console.reconnected(known.robot_id)
            return client
        except BrainError:
            # The server no longer knows this token. Start over rather than
            # leaving the device unable to work.
            console.note(
                "сохранённый токен больше не принимается — регистрируюсь заново"
            )
            store.forget(args.name, args.api)
            client.close()

    client = BrainClient.register(
        args.api,
        api_key=args.api_key,
        name=args.name,
        robot_type=hardware.robot_type,
        capabilities=hardware.capabilities(),
        meta={"agent": "mevratek-device", "hardware": args.hardware},
    )
    store.save(
        Identity(
            robot_id=client.robot["id"],
            token=client.token or "",
            name=args.name,
            api=args.api,
        )
    )
    console.registered(client.robot, [c["type"] for c in hardware.capabilities()])
    return client


def main() -> int:
    config = load_config(HERE / "config.yaml")
    args = parse_args(config)
    console = Console(verbose=args.verbose)

    if not args.api_key:
        print(
            "Нужен ключ организации.\n"
            "  Панель → Аккаунт → Разработчику → создать ключ (cbk_…)\n"
            "  затем:  MEVRATEK_API_KEY=cbk_… python run.py\n"
            "  или положите его в config.yaml"
        )
        return 2

    hardware = build_hardware(args.hardware)
    eyes = camera_module.build(
        args.camera, path=args.frame, index=args.camera_index
    )

    console.banner(
        robot=args.name,
        hardware=hardware.describe(),
        camera=eyes.describe(),
        api=args.api,
    )

    try:
        client = connect(args, hardware, console)
    except BrainError as exc:
        print(f"Регистрация не удалась: {exc}")
        if exc.status_code in (401, 403):
            print("Похоже на неверный ключ организации.")
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Сервер недоступен: {exc}\nПроверьте --api {args.api}")
        return 1

    # Ask the platform what it decided this device may be asked to do. This is
    # the Device Abstraction Layer answering, and it is worth seeing.
    try:
        profile = client.profile()
        universal = [a["type"] for a in profile.get("universal_actions", [])]
        if universal:
            console.profile(universal)
    except BrainError:
        pass

    agent = Agent(
        client=client,
        hardware=hardware,
        camera=eyes,
        console=console,
        task=args.task,
        interval=args.interval,
        pull_tasks=args.pull_tasks,
    )
    agent.install_signal_handlers()

    stats = agent.run(rounds=args.rounds)
    console.summary(stats)
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
