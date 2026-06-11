# PolisOS SDK (Python)

Official Python SDK for the **PolisOS for Robots** API. Connect any device
to PolisOS in a few lines instead of hand-building HTTP requests.

## Install

```bash
pip install "polisos-sdk @ git+https://github.com/difast/brain#subdirectory=sdk/python"
```

(or, from a local checkout: `pip install ./sdk/python`)

## Quick start

```python
from polisos import BrainClient

# 1. Register once — returns an authenticated client (save bot.token to reuse).
bot = BrainClient.register(
    "https://your-api/api/v1",
    name="rover-01",
    robot_type="rover",
    capabilities=[
        {"type": "move_forward", "value": {"type": "number", "min": 0, "max": 1}},
        {"type": "turn_left", "value": {"type": "number", "min": 0, "max": 180}},
        {"type": "stop"},
    ],
)
print("token:", bot.token)  # persist this; reuse with BrainClient(url, token=...)

# 2. Report liveness + telemetry.
bot.heartbeat()
bot.send_telemetry(battery=82, speed=0.0, x=0, y=0)

# 3. Ask the brain what to do.
decision = bot.decide(
    task="find and approach the bottle",
    state={"battery": 82, "obstacle_distance_m": 1.4},
    image_bytes=open("frame.jpg", "rb").read(),  # optional camera frame
)
for action in decision["actions"]:
    print("execute", action["type"], action["value"])
```

## Reusing an existing token

```python
bot = BrainClient("https://your-api/api/v1", token="eyJ...")
```

## Task Engine

```python
task = bot.next_task()           # pull the next queued task (or None)
if task:
    # ... do the work, calling bot.decide(task=task["description"], ...) ...
    bot.report_task_result(task["id"], status="completed", result="done")
```

## API reference

| Method | Description |
|---|---|
| `BrainClient.register(url, name, robot_type, capabilities, meta)` | Register and return a client |
| `BrainClient(url, token=...)` | Construct from an existing token |
| `.heartbeat(status="online")` | Report liveness |
| `.decide(task, state, image_bytes/image_b64, frame_url, task_id)` | Get a decision |
| `.send_telemetry(battery, speed, x, y, z, errors, extra)` | Send telemetry |
| `.next_task()` | Pull next queued task (or `None`) |
| `.report_task_result(task_id, status, result)` | Report task outcome |

Errors raise `polisos.BrainError` with `.status_code`.
