"use client";

import { API_BASE } from "@/lib/api";

export default function SdkPage() {
  return (
    <main className="container">
      <h1>SDK</h1>
      <p className="sub">
        Official Python SDK — connect a robot in a few lines instead of
        hand-building HTTP requests.
      </p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Install</h2>
        <pre className="mono">
{`pip install "polisos-sdk @ git+https://github.com/difast/brain#subdirectory=sdk/python"`}
        </pre>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Quick start</h2>
        <pre className="mono">
{`from polisos import BrainClient

# 1. Register once (save bot.token to reuse next time)
bot = BrainClient.register(
    "${API_BASE}",
    name="rover-01",
    robot_type="rover",
    capabilities=[
        {"type": "move_forward", "value": {"type": "number", "min": 0, "max": 1}},
        {"type": "turn_left", "value": {"type": "number", "min": 0, "max": 180}},
        {"type": "stop"},
    ],
)
print("token:", bot.token)

# 2. Liveness + telemetry
bot.heartbeat()
bot.send_telemetry(battery=82, speed=0.0, x=0, y=0)

# 3. Ask the brain what to do
decision = bot.decide(
    task="find and approach the bottle",
    state={"battery": 82, "obstacle_distance_m": 1.4},
    image_bytes=open("frame.jpg", "rb").read(),  # optional
)
for action in decision["actions"]:
    print("execute", action["type"], action["value"])`}
        </pre>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Reuse an existing token</h2>
        <pre className="mono">
{`bot = BrainClient("${API_BASE}", token="eyJ...")`}
        </pre>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Task Engine</h2>
        <pre className="mono">
{`task = bot.next_task()                 # pull next queued task (or None)
if task:
    decision = bot.decide(task=task["description"], state={...})
    # ... execute actions ...
    bot.report_task_result(task["id"], status="completed", result="done")`}
        </pre>
      </div>

      <div className="panel">
        <h2>Methods</h2>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="mono">BrainClient.register(url, name, robot_type, capabilities, meta)</td><td>Register and return a client</td></tr>
            <tr><td className="mono">BrainClient(url, token=...)</td><td>Construct from an existing token</td></tr>
            <tr><td className="mono">.heartbeat(status)</td><td>Report liveness</td></tr>
            <tr><td className="mono">.decide(task, state, image_bytes/image_b64, frame_url, task_id)</td><td>Get a decision</td></tr>
            <tr><td className="mono">.send_telemetry(battery, speed, x, y, z, errors, extra)</td><td>Send telemetry</td></tr>
            <tr><td className="mono">.next_task()</td><td>Pull next queued task (or None)</td></tr>
            <tr><td className="mono">.report_task_result(task_id, status, result)</td><td>Report task outcome</td></tr>
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ marginTop: 16 }}>
        Other languages: any HTTP client works — see the{" "}
        <a href="/docs">Documentation</a> and the interactive{" "}
        <a href={API_BASE.replace(/\/api\/v1$/, "/docs")}>OpenAPI / Swagger</a>{" "}
        page.
      </p>
    </main>
  );
}
