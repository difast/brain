"""Reference thin-client robot for the Cloud Brain.

Demonstrates the full lifecycle any robot follows:
  1. Register (once) — receive a bearer token + API key.
  2. Heartbeat — periodically report liveness.
  3. Decision loop — send a frame + telemetry + task, execute returned actions.

Run (with the stack up via docker compose):

    pip install httpx
    python examples/robot_client.py

No external hardware required — frames and telemetry are synthetic.
"""

from __future__ import annotations

import base64
import time

import httpx

API = "http://localhost:8000/api/v1"

# A minimal valid 1x1 JPEG (enough for the API; real robots send camera frames).
TINY_JPEG = base64.b64encode(bytes.fromhex("ffd8ffd9")).decode()

CAPABILITIES = [
    {
        "type": "move_forward",
        "description": "Drive forward",
        "value": {"type": "number", "min": 0, "max": 1, "unit": "m"},
    },
    {
        "type": "turn_left",
        "description": "Turn left in degrees",
        "value": {"type": "number", "min": 0, "max": 180, "unit": "deg"},
    },
    {"type": "stop", "description": "Stop all motion"},
]


def main() -> None:
    with httpx.Client(base_url=API, timeout=30) as client:
        # 1. Register
        reg = client.post(
            "/robots/register",
            json={
                "name": "demo-rover",
                "robot_type": "rover",
                "capabilities": CAPABILITIES,
                "meta": {"firmware": "1.0.0"},
            },
        )
        reg.raise_for_status()
        data = reg.json()
        robot_id = data["robot"]["id"]
        token = data["token"]
        auth = {"Authorization": f"Bearer {token}"}
        print(f"registered robot {robot_id}")

        # 2. Heartbeat
        client.post("/robots/heartbeat", json={"status": "online"}, headers=auth)

        # 3. Report some telemetry
        client.post(
            "/telemetry",
            json={"battery": 82.0, "speed": 0.0, "x": 0.0, "y": 0.0, "z": 0.0},
            headers=auth,
        )

        # 4. Decision loop
        for step in range(3):
            resp = client.post(
                "/brain/decision",
                json={
                    "task": "find and approach the bottle on the table",
                    "image_b64": TINY_JPEG,
                    "state": {"battery": 82 - step, "obstacle_distance_m": 1.4},
                },
                headers=auth,
            )
            resp.raise_for_status()
            decision = resp.json()
            print(f"\nstep {step}: goal={decision['goal']!r} "
                  f"confidence={decision['confidence']}")
            for action in decision["actions"]:
                print(f"  -> execute {action['type']} = {action['value']}")
                # Here a real robot would actuate motors / servos.
            client.post("/robots/heartbeat", json={"status": "online"}, headers=auth)
            time.sleep(1)


if __name__ == "__main__":
    main()
