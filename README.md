# Mevratek

A cloud platform that acts as the **brain** for any fleet of devices. Devices
are **thin clients** — they stream camera frames, telemetry and their current
task, and the cloud returns **structured action commands**. All decision-making
runs in the cloud via the **AI Decision Engine** (supports **YandexGPT,
GigaChat, Claude and local models**).

The dashboard ships with a **RU/EN switch (Russian by default)** and a live
**Demo device** so it's never empty.

```
┌──────────┐   frame + telemetry + task    ┌──────────────────────────────┐
│  Device  │ ───────────────────────────▶  │            Mevratek           │
│ (thin    │                               │  API Gateway → Decision Eng. │
│  client) │ ◀─────────────────────────── │  → AI engine → JSON commands │
└──────────┘    { goal, confidence,        └──────────────────────────────┘
                  actions: [...] }
```

A decision always comes back as strict JSON:

```json
{
  "goal": "approach the object",
  "thought": "bottle detected on the table",
  "confidence": 0.91,
  "actions": [
    { "type": "move_forward", "value": 0.5 },
    { "type": "turn_left", "value": 15 }
  ]
}
```

---

## Quick start (one command)

```bash
cp .env.example .env        # optional: set ANTHROPIC_API_KEY for real decisions
docker compose up --build
```

That starts everything:

| Service   | URL                                  | Notes                          |
| --------- | ------------------------------------ | ------------------------------ |
| Backend   | http://localhost:8000                | API gateway + brain            |
| API docs  | http://localhost:8000/docs           | Swagger UI (OpenAPI)           |
| Dashboard | http://localhost:3000                | Fleet console (optional)       |
| Postgres  | localhost:5432                       | `brain` / `brain`              |

**Postgres is the only required backing service.** Presence is tracked in the
database (no Redis), and object storage (S3) is optional — without it, camera
frames simply aren't persisted and decisions still work.

> **No Anthropic key?** Leave `ANTHROPIC_API_KEY` empty — the brain runs in a
> deterministic **mock mode** so the whole platform is fully usable offline
> (great for local dev and CI). Set the key to get real Claude decisions.

### Try it

1. Open the **Dashboard** → **Simulator** (http://localhost:3000/simulator).
2. Click **Register**, then **Get decision** — watch the structured response.
3. The robot, its task, and the decision appear on the **Robots**, **Tasks**
   and **Decision Logs** pages.

Or drive it as a real robot would, from code:

```bash
pip install httpx
python examples/robot_client.py
```

---

## Architecture

Clean, layered architecture. Logical services map to modules inside a single
deployable backend (a modular monolith — simple to run now, easy to split into
independent services as the fleet grows).

```
backend/app/
├── api/            # API Gateway: routing, auth, request handling
│   ├── deps.py     #   robot JWT auth + shared singletons
│   └── routes/     #   robots, brain, telemetry, logs, tasks, health
├── services/       # Application layer (the "services")
│   ├── claude_client.py    # Brain Service — Claude calls, strict JSON
│   ├── prompt_builder.py   #   capability-driven prompts
│   ├── brain_service.py    #   decision orchestration
│   ├── registry_service.py # Robot Registry
│   ├── telemetry_service.py# Telemetry Service
│   ├── memory_service.py   # Memory Service (decisions + tasks)
│   └── storage.py          # optional S3/MinIO frame storage
├── repositories/   # Data-access layer (SQLAlchemy)
├── models/         # ORM models (Robot, Task, Decision, Telemetry)
├── schemas/        # Pydantic request/response contracts
└── core/           # config, logging, db, security, middleware, errors
```

| Service          | Responsibility                                             |
| ---------------- | ---------------------------------------------------------- |
| **API Gateway**  | Robot authentication, request handling, routing            |
| **Brain**        | Receives frames, builds the prompt, calls Claude, returns JSON |
| **Robot Registry** | robot_id, type, available commands, connection status     |
| **Memory**       | Action history, task history, execution results            |
| **Telemetry**    | Battery, speed, coordinates, errors                        |
| **Dashboard**    | Robots, tasks, logs, decisions/actions                     |

### Pluggable robot types — no core changes

A robot is described entirely by **data**: its `robot_type` and a list of
`capabilities` (the commands it understands, with value constraints). The brain
builds the prompt from those capabilities and validates Claude's output against
them. **To support a brand-new robot, you just register it with a different
command vocabulary — the brain core never changes.** Unsupported commands are
filtered out as defence-in-depth before any command reaches a robot.

---

## API

All endpoints are under `/api/v1`. Full interactive docs at `/docs`,
machine-readable spec at `/openapi.json`.

| Method | Path                  | Auth        | Description                          |
| ------ | --------------------- | ----------- | ------------------------------------ |
| POST   | `/robots/register`    | none        | Register a robot → token + API key   |
| POST   | `/robots/heartbeat`   | robot token | Report liveness                      |
| POST   | `/brain/decision`     | robot token | Get the next decision (core endpoint)|
| POST   | `/telemetry`          | robot token | Ingest a telemetry reading           |
| POST   | `/executions`         | robot token | Report execution feedback (DAL)      |
| POST   | `/tasks`              | —           | Assign a task (Task Engine)          |
| GET    | `/tasks/next`         | robot token | Robot pulls its next queued task     |
| POST   | `/tasks/{id}/result`  | robot token | Robot reports a task result          |
| GET    | `/robots`             | —           | List robots (+ live status)          |
| GET    | `/robots/{id}`        | —           | Robot detail                         |
| GET    | `/robots/{id}/profile`| —           | Device profile (DAL)                 |
| GET    | `/telemetry` `/executions` | —      | Query telemetry / execution feedback |
| GET    | `/logs` `/tasks`      | —           | Decision logs / tasks                |
| POST/GET/DELETE | `/api-keys`  | —           | Per-user API key management          |
| GET    | `/health` `/ready`    | —           | Liveness / readiness probes          |

### Device Abstraction Layer (DAL) & Model Router

The platform is an independent device-control layer, not a Claude proxy:

- **Universal actions + Action Translator** — the LLM emits universal actions
  (`grasp`, `inspect`, `release`, …); the translator maps each to the concrete
  device command the device supports (from its `capabilities`), attaching an
  `action_id`. New device types need no core changes.
- **Device Profile** — `firmware_version`, `protocol_version`, capabilities and
  supported universal actions (`GET /robots/{id}/profile`).
- **Execution Feedback** — devices report `{action_id, status, duration_ms,
  error}`; recent feedback is fed back into the next decision (learning).
- **Memory & Learning** — each decision stores input state, universal + device
  actions, and links to execution results.
- **Model Router** — swap the LLM via `LLM_PROVIDER` (`claude` | `openai` |
  `local` | `auto`) with no API change. `local`/`openai` use any
  OpenAI-compatible endpoint (Ollama, vLLM, LM Studio) via `OPENAI_BASE_URL`.

### Authentication

`POST /robots/register` returns a **bearer token** (JWT) and a one-time
**API key**. Robots send `Authorization: Bearer <token>` on every call and act
**as themselves** — the `robot_id` is taken from the token, never the request
body, so one robot can't impersonate another.

---

## Decision flow

1. Robot sends `task`, optional camera frame (`image_b64` / `frame_url`) and
   `state` to `POST /brain/decision`.
2. Brain ensures a task record, stores the frame in S3/MinIO (if storage is
   configured), and pulls the robot's recent decisions for short-term context.
3. The prompt is assembled from the robot's **capabilities** and sent to Claude
   with `output_config.format` constraining the response to a strict JSON
   schema (no free text).
4. The decision is validated, unsupported actions are filtered, the result is
   persisted (Memory) and returned to the robot.

---

## Configuration

All config is via environment variables (12-factor) — see
[`.env.example`](.env.example). Key settings:

| Variable             | Default              | Purpose                                  |
| -------------------- | -------------------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`  | *(empty → mock)*     | Enables real Claude decisions            |
| `ANTHROPIC_BASE_URL` | *(empty → direct)*   | Set to route via an AI tunnel / Anthropic-compatible proxy |
| `CLAUDE_MODEL`       | `claude-opus-4-8`    | Most capable; switch to `claude-sonnet-4-6` / `claude-haiku-4-5` for higher throughput |
| `CLAUDE_THINKING`    | `disabled`           | `adaptive` for harder reasoning (higher latency) |
| `SECRET_KEY`         | —                    | **Set in production** (signs robot tokens) |
| `DATABASE_URL`       | postgres             | Async SQLAlchemy URL (`postgresql+asyncpg://…`) |
| `HEARTBEAT_TTL_SECONDS` | `30`              | Offline threshold (DB-based presence)    |
| `S3_*`               | *(empty → disabled)* | Optional frame storage                   |

---

## Development

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt

# Run the test suite (fully offline: sqlite + mock brain + fakes)
pytest

# Lint
ruff check app tests

# Run the API (needs only Postgres; or use docker compose)
uvicorn app.main:app --reload
```

Tests run with **no external services and no API key** — SQLite replaces
Postgres, S3 is disabled, presence is DB-based, and the brain runs in mock mode.

### Database migrations (Alembic)

```bash
cd backend
alembic upgrade head                     # apply
alembic revision --autogenerate -m "..." # create a new migration
```

In `development` the app auto-creates tables on startup for convenience; in
`production` migrations are the source of truth (`scripts/start.sh` runs
`alembic upgrade head` before serving).

---

## Deployment (Timeweb Cloud Apps)

The repo is deploy-ready for [Timeweb Cloud Apps](https://timeweb.cloud/services/apps)
as **one backend app + one managed PostgreSQL + (optionally) one frontend app**.
Each app builds straight from this GitHub repo and **auto-deploys on every push
to `main`** (Timeweb's native GitHub integration; a GitHub Actions workflow that
mirrors CI + triggers a redeploy via the Timeweb API is in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

### 1. Managed PostgreSQL

Create a **PostgreSQL** database in Timeweb Cloud → **Базы данных**. Note the
host, port, user, password and database name — you'll assemble `DATABASE_URL`
from them (async driver scheme, see below).

### 2. Backend app

Create an **App** of type **Docker** (or **Backend**) from this GitHub repo:

- **Build context / root directory = `backend`** (builds `backend/Dockerfile`).
- **Port = `8000`** (the container listens on `$PORT`, default `8000`).
- **Auto-deploy branch = `main`**.
- Health check path = `/api/v1/health`.
- Environment variables:
  - `ENVIRONMENT=production`, `SECRET_KEY=<random>`, `RUN_MIGRATIONS=1`
  - `ANTHROPIC_API_KEY=<your key>` *(or `ANTHROPIC_BASE_URL=<tunnel>`; leave
    both empty for mock mode)*
  - `DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:<port>/<db>`
    — **note the `+asyncpg` scheme** (SQLAlchemy async driver)
  - *(optional)* `S3_*` for frame storage on any S3-compatible bucket.

`scripts/start.sh` runs `alembic upgrade head` (because `RUN_MIGRATIONS=1`) and
then launches the server, so deploys are zero-touch.

### 3. Frontend app (optional dashboard)

The `frontend/` app is a separate Next.js console — deploy it only if you want
the web UI (the API works without it). Create a second **App** of type
**Docker** from this repo:

- **Build context / root directory = `frontend`** (builds `frontend/Dockerfile`).
- **Port = `3000`**, **Auto-deploy branch = `main`**.
- Build argument / env var:
  `NEXT_PUBLIC_API_BASE_URL=https://<backend-app-domain>/api/v1` — the public
  URL of the backend app above. **All API URLs come from this variable — no
  host is hardcoded.**

---

## Scaling notes

- **Stateless backend** → scale horizontally (`WEB_CONCURRENCY`, more replicas).
- **DB-based presence** (`last_seen_at`) keeps the deployment to one service +
  Postgres; a Redis cache can be reintroduced later if the hot path needs it.
- **Frames in object storage** (optional, not the DB) keep rows small.
- **Repository layer** isolates data access — swap stores or add read replicas
  without touching business logic.
- **Modular services** can be extracted into independent deployables when a
  single component needs to scale separately.
- **Model is configurable** — trade intelligence vs latency/cost per fleet.
- **Structured logging** (JSON + request IDs) is ready for log aggregation.

---

## Tech stack

Python · FastAPI · SQLAlchemy 2 (async) · PostgreSQL · optional S3/MinIO ·
Anthropic Claude · Docker / Docker Compose · Next.js · TypeScript.

---

## Security note

Never commit secrets. `SECRET_KEY`, `ANTHROPIC_API_KEY` and S3 credentials are
supplied via environment variables only; `.env` is git-ignored.
