# Mevratek MCP Connector

Connect your Mevratek robot fleet to Claude or ChatGPT. Ask about device
state in plain language, read the decision journal, queue tasks, and run
simulations — without opening the dashboard.

**Server URL:** `https://api.mevratek.ru/mcp`
**Transport:** Streamable HTTP
**Authentication:** OAuth 2.0 with PKCE (S256), dynamic client registration
**Privacy policy:** https://mevratek.ru/privacy-policy.md

---

## Connecting in Claude

1. Open **Settings → Connectors → Add custom connector**.
2. Paste the server URL: `https://api.mevratek.ru/mcp`
3. Click **Add**. Claude registers itself and opens a Mevratek page in your
   browser.
4. Sign in to Mevratek if you are not already signed in.
5. Review what the connector will be able to do, then click **Разрешить**
   (Allow).
6. You are returned to Claude, connected.

The connector is available in Claude on the web, desktop and mobile.

## Connecting in ChatGPT

1. Open **Settings → Connectors → Create**.
2. Paste the server URL: `https://api.mevratek.ru/mcp`
3. Choose **OAuth** as the authentication method.
4. Click **Create**. ChatGPT registers itself and opens a Mevratek page.
5. Sign in, review the permissions, and approve.

In ChatGPT the connector is used from **Developer mode** or, once approved by
OpenAI, from the app directory.

## Connecting from your own client

The server implements the standard discovery documents, so any MCP client
that speaks Streamable HTTP and OAuth 2.0 can connect without special-casing:

```
GET https://api.mevratek.ru/.well-known/oauth-protected-resource
GET https://api.mevratek.ru/.well-known/oauth-authorization-server
```

An unauthenticated request to `/mcp` returns `401` with a `WWW-Authenticate`
header pointing at the first of these.

---

## Available tools

| Tool | What it does | Read-only |
|---|---|---|
| `get_devices` | Lists every device in your organization with its status and last-seen time. | Yes |
| `get_device_status` | Current state of one device: status, capabilities, latest battery, position and errors. | Yes |
| `get_telemetry` | Recent telemetry readings for one device, newest first. | Yes |
| `get_decision_logs` | The decision journal: task, model output, confidence, provider and latency. | Yes |
| `send_task` | Queues a task for a device through the Task Engine. | No |
| `run_simulator` | Registers a virtual device and queues a scenario against it. | No |

### Parameters

**`get_devices`** — `limit` (optional, 1–100, default 50)

**`get_device_status`** — `device_id` (required)

**`get_telemetry`** — `device_id` (required), `limit` (optional, 1–100,
default 10)

**`get_decision_logs`** — `device_id` (optional; omit for the whole fleet),
`limit` (optional, 1–100, default 20)

**`send_task`** — `device_id` (required), `task_description` (required),
`priority` (optional, 0–100, default 0)

**`run_simulator`** — `scenario_description` (required), `device_type`
(optional, default `rover`)

### One field worth knowing about

In `get_decision_logs`, each entry carries a `provider`. A value ending in
`:fallback` — or a provider of `mock` — means the deterministic placeholder
answered instead of the configured AI model. The device cannot tell the
difference: it receives a valid decision either way. If you are asking why a
fleet is behaving oddly, this is the first field to look at.

---

## Things to try

- "Which of my devices are offline?"
- "Show me the battery level of every rover."
- "What did scout-01 decide in its last ten rounds, and did the model
  actually answer?"
- "Queue 'inspect the east aisle' for the warehouse cart."
- "Simulate a rover that has to get around an obstacle."

---

## What the connector cannot do

- See any organization but your own
- Read or change account settings, team members, or API keys
- Delete devices or tasks
- Access camera frames
- Call the Mevratek dashboard API — the token is scoped to these tools only

---

## Revoking access

**Mevratek → Account → Sessions.** The connector appears as a session named
after the client, for example "MCP: Claude". End it and the connection stops
working on its next request.

You can also remove the connector in Claude or ChatGPT, or email
info@mevratek.ru.

---

## Reviewer access

A dedicated review account exists — `reviewer@mevratek.ru`, holding the
**member** role in the demo organization. Its password is supplied privately
in the directory submission, not published here; if you are reviewing this
integration and do not have it, write to info@mevratek.ru and we will send it.

The role is the point of the account: it can read the organization's devices,
telemetry and decision journal, and queue a task or a simulation — everything
the connector exposes — and nothing else. It cannot manage the team, issue API
keys, delete anything, or reach an administrator route.

The organization has a demo device with live telemetry, so every read-only
tool returns data immediately. `send_task` and `run_simulator` can be
exercised against it safely — nothing physical is connected.

---

## Limits and behaviour

- Results are capped at 100 records per call.
- Access tokens are valid for 8 hours; clients refresh by re-authorizing.
- Authorization codes are valid for 60 seconds and are single-use. A code
  presented twice is refused and the session it produced is revoked.
- The server is stateless: it assigns no `Mcp-Session-Id`, so there is no
  session to resume after a restart.
- `GET /mcp` opens an SSE stream that carries keepalives only; this server
  never initiates messages. It closes after five minutes and expects the
  client to reconnect.

## Support

info@mevratek.ru — https://mevratek.ru/contacts
