"use client";

import { API_BASE } from "@/lib/api";

const SWAGGER = API_BASE.replace(/\/api\/v1$/, "/docs");

const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "architecture", label: "Architecture" },
      { id: "quickstart", label: "Quick start" },
    ],
  },
  {
    group: "Concepts",
    items: [
      { id: "robots", label: "Robots & Registry" },
      { id: "decisions", label: "Decision Engine" },
      { id: "tasks", label: "Task Engine" },
      { id: "telemetry", label: "Telemetry" },
      { id: "memory", label: "Memory" },
      { id: "auth", label: "Authentication" },
      { id: "apikeys", label: "API Keys" },
    ],
  },
  {
    group: "Reference",
    items: [
      { id: "endpoints", label: "API Endpoints" },
      { id: "decision-format", label: "Decision Format" },
      { id: "sdk", label: "SDK" },
      { id: "dashboard", label: "Dashboard" },
      { id: "deployment", label: "Deployment" },
      { id: "faq", label: "FAQ" },
    ],
  },
];

function Code({ children }: { children: string }) {
  return <pre className="mono">{children}</pre>;
}

export default function DocsPage() {
  return (
    <main className="container">
      <div className="docs">
        <nav className="docs-nav">
          {NAV.map((g) => (
            <div key={g.group}>
              <h3>{g.group}</h3>
              {g.items.map((it) => (
                <a key={it.id} href={`#${it.id}`}>
                  {it.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="docs-content">
          <section id="overview">
            <h2>Overview</h2>
            <p>
              <strong>Cloud Brain for Robots</strong> is a cloud service that
              acts as the brain for a fleet of robots. Robots are{" "}
              <strong>thin clients</strong>: they stream camera frames,
              telemetry and their current task, and the cloud returns{" "}
              <strong>structured action commands</strong>. All decision-making
              runs in the cloud via the Claude API.
            </p>
            <p>
              Base API URL: <code>{API_BASE}</code> · Interactive API:{" "}
              <a href={SWAGGER}>Swagger / OpenAPI</a>
            </p>
          </section>

          <section id="architecture">
            <h2>Architecture</h2>
            <p>Clean, layered design. Logical services:</p>
            <ul>
              <li>
                <strong>API Gateway</strong> — robot authentication, routing.
              </li>
              <li>
                <strong>Decision Engine (Brain)</strong> — builds the prompt
                from the robot&apos;s capabilities, calls Claude, returns strict
                JSON.
              </li>
              <li>
                <strong>Robot Registry</strong> — robot id, type, available
                commands, connection status.
              </li>
              <li>
                <strong>Task Engine</strong> — assign / queue / pull / complete
                tasks.
              </li>
              <li>
                <strong>Memory</strong> — decision and task history, results.
              </li>
              <li>
                <strong>Telemetry</strong> — battery, speed, coordinates,
                errors.
              </li>
            </ul>
            <p>
              A robot is described entirely by <strong>data</strong> (its type +
              capabilities), so new robot types need no core changes.
            </p>
          </section>

          <section id="quickstart">
            <h2>Quick start</h2>
            <p>Connect a robot in three calls (no SDK required):</p>
            <Code>{`# 1. Register (once) — returns a bearer token
curl -X POST ${API_BASE}/robots/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"rover-01","robot_type":"rover",
       "capabilities":[{"type":"move_forward"},{"type":"stop"}]}'

# 2. Ask the brain for the next actions
curl -X POST ${API_BASE}/brain/decision \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"task":"approach the bottle","state":{"battery":80}}'`}</Code>
            <p>
              Or use the <a href="/sdk">Python SDK</a>, or try it live in the{" "}
              <a href="/simulator">Simulator</a>.
            </p>
          </section>

          <section id="robots">
            <h2>Robots &amp; Registry</h2>
            <p>
              A robot registers once with a <code>name</code>,{" "}
              <code>robot_type</code> and a list of <code>capabilities</code> —
              the commands it understands, each with optional value constraints:
            </p>
            <Code>{`{
  "name": "scout-01",
  "robot_type": "rover",
  "capabilities": [
    {"type": "move_forward",
     "value": {"type": "number", "min": 0, "max": 1, "unit": "m"}},
    {"type": "turn_left",
     "value": {"type": "number", "min": 0, "max": 180, "unit": "deg"}},
    {"type": "stop"}
  ]
}`}</Code>
            <p>
              Registration returns a <code>token</code> (bearer) and a one-time{" "}
              <code>api_key</code>. The brain only ever returns commands from the
              robot&apos;s own capability list. Presence (online/offline) is
              tracked by heartbeats.
            </p>
          </section>

          <section id="decisions">
            <h2>Decision Engine</h2>
            <p>
              <code>POST /brain/decision</code> takes the task, an optional
              camera frame (<code>image_b64</code> or <code>frame_url</code>)
              and the current <code>state</code>. The brain assembles a prompt
              from the robot&apos;s capabilities and recent decisions, calls
              Claude with a strict JSON schema, validates the output and filters
              out any unsupported command.
            </p>
          </section>

          <section id="tasks">
            <h2>Task Engine</h2>
            <p>
              Tasks can be created <strong>top-down</strong> (operator/API
              assigns them to a robot with a priority) or appear{" "}
              <strong>bottom-up</strong> from a robot&apos;s own decision
              request. Robots pull their next queued task and report the result.
            </p>
            <Code>{`# Assign a task (priority: higher is dequeued first)
POST /tasks            {"robot_id":"...","description":"bring the box","priority":5}

# Robot pulls its next queued task (marks it in_progress)
GET  /tasks/next       (Authorization: Bearer <robot token>)  -> task | 204

# Robot reports the outcome
POST /tasks/{id}/result {"status":"completed","result":"delivered"}`}</Code>
          </section>

          <section id="telemetry">
            <h2>Telemetry</h2>
            <p>
              Robots push readings to <code>POST /telemetry</code>: battery,
              speed, coordinates (x/y/z), error list and any extra sensor
              channels. The latest values surface on the robot&apos;s dashboard
              page.
            </p>
          </section>

          <section id="memory">
            <h2>Memory</h2>
            <p>
              Every decision is persisted (goal, thought, confidence, actions,
              frame, model, latency) along with task history — the full audit
              trail, available via <code>GET /logs</code> and the dashboard.
            </p>
          </section>

          <section id="auth">
            <h2>Authentication</h2>
            <p>
              Robots authenticate with the bearer <strong>token</strong> from
              registration and act as themselves — the <code>robot_id</code> is
              taken from the token, never the request body. Send it on every
              call:
            </p>
            <Code>{`Authorization: Bearer <token>`}</Code>
          </section>

          <section id="apikeys">
            <h2>API Keys</h2>
            <p>
              Each user/application can generate a personal API key from the{" "}
              <a href="/api">API</a> tab. The secret is shown once; only a hash
              and a short prefix are stored. Keys can be revoked at any time and
              are sent as:
            </p>
            <Code>{`X-API-Key: cbk_xxxxxxxx...`}</Code>
          </section>

          <section id="endpoints">
            <h2>API Endpoints</h2>
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Auth</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>POST</td><td className="mono">/robots/register</td><td>—</td><td>Register a robot</td></tr>
                <tr><td>POST</td><td className="mono">/robots/heartbeat</td><td>token</td><td>Report liveness</td></tr>
                <tr><td>GET</td><td className="mono">/robots</td><td>—</td><td>List robots</td></tr>
                <tr><td>GET</td><td className="mono">/robots/&#123;id&#125;</td><td>—</td><td>Robot detail</td></tr>
                <tr><td>POST</td><td className="mono">/brain/decision</td><td>token</td><td>Get a decision</td></tr>
                <tr><td>POST</td><td className="mono">/telemetry</td><td>token</td><td>Ingest telemetry</td></tr>
                <tr><td>GET</td><td className="mono">/telemetry</td><td>—</td><td>Query telemetry</td></tr>
                <tr><td>POST</td><td className="mono">/tasks</td><td>—</td><td>Assign a task</td></tr>
                <tr><td>GET</td><td className="mono">/tasks</td><td>—</td><td>List tasks</td></tr>
                <tr><td>GET</td><td className="mono">/tasks/next</td><td>token</td><td>Pull next queued task</td></tr>
                <tr><td>POST</td><td className="mono">/tasks/&#123;id&#125;/result</td><td>token</td><td>Report task result</td></tr>
                <tr><td>GET</td><td className="mono">/logs</td><td>—</td><td>Decision logs</td></tr>
                <tr><td>POST</td><td className="mono">/api-keys</td><td>—</td><td>Generate API key</td></tr>
                <tr><td>GET</td><td className="mono">/api-keys</td><td>—</td><td>List API keys</td></tr>
                <tr><td>DELETE</td><td className="mono">/api-keys/&#123;id&#125;</td><td>—</td><td>Revoke API key</td></tr>
              </tbody>
            </table>
            <p>
              Full interactive reference: <a href={SWAGGER}>Swagger UI</a>.
            </p>
          </section>

          <section id="decision-format">
            <h2>Decision Format</h2>
            <p>
              The brain always returns strict JSON — no free text:
            </p>
            <Code>{`{
  "goal": "approach the object",
  "thought": "bottle detected on the table",
  "confidence": 0.91,
  "actions": [
    {"type": "move_forward", "value": 0.5},
    {"type": "turn_left", "value": 15}
  ]
}`}</Code>
          </section>

          <section id="sdk">
            <h2>SDK</h2>
            <p>
              The official Python SDK wraps every endpoint. See the{" "}
              <a href="/sdk">SDK tab</a> for install and usage. Any language with
              an HTTP client works too.
            </p>
          </section>

          <section id="dashboard">
            <h2>Dashboard</h2>
            <ul>
              <li><strong>Robots</strong> — fleet overview and live status.</li>
              <li><strong>Decision Logs</strong> — every decision the brain made.</li>
              <li><strong>Tasks</strong> — assign tasks and watch the queue.</li>
              <li><strong>Simulator</strong> — register a robot and request a decision.</li>
              <li><strong>API</strong> — generate and revoke API keys.</li>
              <li><strong>SDK</strong> — install and usage.</li>
              <li>Click a robot to see its own tasks, decisions and telemetry.</li>
            </ul>
          </section>

          <section id="deployment">
            <h2>Deployment</h2>
            <p>
              Deploys from GitHub as a single backend service + PostgreSQL
              (Redis not required; object storage optional). Set{" "}
              <code>SECRET_KEY</code>, <code>DATABASE_URL</code>{" "}
              (<code>postgresql+asyncpg://…</code>) and{" "}
              <code>ANTHROPIC_API_KEY</code> (or <code>ANTHROPIC_BASE_URL</code>
              ). The dashboard is an optional second service with{" "}
              <code>NEXT_PUBLIC_API_BASE_URL</code>.
            </p>
          </section>

          <section id="faq">
            <h2>FAQ</h2>
            <h3>Do I have to add robots manually?</h3>
            <p>
              No. Robots self-register via the API from their own code (the
              Simulator is only for testing).
            </p>
            <h3>What if I don&apos;t set an Anthropic key?</h3>
            <p>
              The brain runs in deterministic mock mode, so the whole platform
              works offline.
            </p>
            <h3>Can different robot types connect?</h3>
            <p>
              Yes — a robot is defined by its capabilities data; the core never
              changes.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
