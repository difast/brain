"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type Decision } from "@/lib/api";

const DEFAULT_CAPS = `[
  { "type": "move_forward", "description": "Drive forward", "value": { "type": "number", "min": 0, "max": 1, "unit": "m" } },
  { "type": "turn_left", "description": "Turn left", "value": { "type": "number", "min": 0, "max": 180, "unit": "deg" } },
  { "type": "turn_right", "description": "Turn right", "value": { "type": "number", "min": 0, "max": 180, "unit": "deg" } },
  { "type": "stop", "description": "Stop moving" }
]`;

export default function Simulator() {
  const [name, setName] = useState("sim-rover");
  const [type, setType] = useState("rover");
  const [caps, setCaps] = useState(DEFAULT_CAPS);
  const [token, setToken] = useState<string | null>(null);
  const [robotId, setRobotId] = useState<string | null>(null);

  const [task, setTask] = useState("find and approach the bottle on the table");
  const [stateJson, setStateJson] = useState(
    `{ "battery": 82, "obstacle_distance_m": 1.4 }`,
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setError(null);
    setBusy(true);
    try {
      const capsParsed = JSON.parse(caps);
      const res = await api.register({
        name,
        robot_type: type,
        capabilities: capsParsed,
      });
      setToken(res.token);
      setRobotId(res.robot.id);
      await api.heartbeat(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function requestDecision() {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const state = stateJson.trim() ? JSON.parse(stateJson) : {};
      const d = await api.decision(token, { task, state });
      setDecision(d);
      await api.heartbeat(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Robot Simulator</h1>
      <p className="sub">
        Acts as a thin-client robot: register, then request a decision from the
        cloud brain. (If no Anthropic key is configured, the brain returns a
        deterministic mock decision.)
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="panel">
          <h2>1 · Register robot</h2>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Robot type</label>
          <input value={type} onChange={(e) => setType(e.target.value)} />
          <label>Capabilities (JSON)</label>
          <textarea
            value={caps}
            onChange={(e) => setCaps(e.target.value)}
            rows={9}
            style={{ width: "100%", fontFamily: "var(--mono)" }}
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={register} disabled={busy}>
              Register
            </button>
          </div>
          {robotId && (
            <p className="mono muted" style={{ marginTop: 12 }}>
              ✓ registered:{" "}
              <Link href={`/robots/${robotId}`}>{robotId.slice(0, 16)}…</Link>
            </p>
          )}
        </div>

        <div className="panel">
          <h2>2 · Request decision</h2>
          <label>Task</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={2}
            style={{ width: "100%" }}
          />
          <label>State / sensors (JSON)</label>
          <textarea
            value={stateJson}
            onChange={(e) => setStateJson(e.target.value)}
            rows={4}
            style={{ width: "100%", fontFamily: "var(--mono)" }}
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={requestDecision} disabled={busy || !token}>
              {token ? "Get decision" : "Register first"}
            </button>
          </div>
          {decision && (
            <div style={{ marginTop: 16 }}>
              <h2>Decision</h2>
              <pre className="mono">{JSON.stringify(decision, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
