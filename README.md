# Cloud Brain for Robots

A cloud service that acts as the **brain** for a fleet of robots. Robots are
**thin clients** — they stream camera frames, telemetry and their current task,
and the cloud returns **structured action commands**. All decision-making runs
in the cloud via the **Claude API**.

```
┌──────────┐   frame + telemetry + task    ┌──────────────────────────┐
│  Robot   │ ───────────────────────────▶  │      Cloud Brain         │
│ (thin    │                               │  API Gateway → Brain     │
│  client) │ ◀─────────────────────────── │  → Claude → JSON commands│
└──────────┘    { goal, confidence,        └──────────────────────────┘
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
| Dashboard | http://localhost:3000                | Fleet console + simulator      |
| MinIO     | http://localhost:9001                | Object storage console         |
| Postgres  | localhost:5432                       | `brain` / `brain`              |
| Redis     | localhost:6379                       | heartbeat presence             |

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
│   ├── storage.py          # S3/MinIO frame storage
│   └── cache.py            # Redis heartbeat presence
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
| GET    | `/robots`             | —           | List robots (+ live status)          |
| GET    | `/robots/{id}`        | —           | Robot detail                         |
| GET    | `/telemetry`          | —           | Query telemetry                      |
| GET    | `/logs`               | —           | Decision logs (audit trail)          |
| GET    | `/tasks`              | —           | Tasks                                |
| GET    | `/health` `/ready`    | —           | Liveness / readiness probes          |

### Authentication

`POST /robots/register` returns a **bearer token** (JWT) and a one-time
**API key**. Robots send `Authorization: Bearer <token>` on every call and act
**as themselves** — the `robot_id` is taken from the token, never the request
body, so one robot can't impersonate another.

---

## Decision flow

1. Robot sends `task`, optional camera frame (`image_b64` / `frame_url`) and
   `state` to `POST /brain/decision`.
2. Brain ensures a task record, stores the frame in S3/MinIO, and pulls the
   robot's recent decisions for short-term context.
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
| `CLAUDE_MODEL`       | `claude-opus-4-8`    | Most capable; switch to `claude-sonnet-4-6` / `claude-haiku-4-5` for higher throughput |
| `CLAUDE_THINKING`    | `disabled`           | `adaptive` for harder reasoning (higher latency) |
| `SECRET_KEY`         | —                    | **Set in production** (signs robot tokens) |
| `DATABASE_URL`       | postgres             | Async SQLAlchemy URL                     |
| `REDIS_URL`          | redis                | Heartbeat presence                       |
| `HEARTBEAT_TTL_SECONDS` | `30`              | Offline threshold                        |
| `S3_*`               | minio defaults       | Frame storage                            |

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

# Run the API (needs Postgres + Redis; or use docker compose)
uvicorn app.main:app --reload
```

Tests run with **no external services and no API key** — SQLite replaces
Postgres, in-memory fakes replace Redis/S3, and the brain runs in mock mode.

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

## Deployment (Railway)

The repo is deploy-ready for [Railway](https://railway.app) straight from
GitHub:

1. **Provision** managed **PostgreSQL** and **Redis** plugins.
2. **Backend service** — root `backend/`, builds the `Dockerfile`. Set:
   - `ENVIRONMENT=production`, `SECRET_KEY=<random>`, `RUN_MIGRATIONS=1`
   - `ANTHROPIC_API_KEY=<your key>`
   - `DATABASE_URL` / `REDIS_URL` from the Railway plugins (use the
     `postgresql+asyncpg://` scheme for the DB URL)
   - S3 credentials for any S3-compatible bucket (AWS S3, Cloudflare R2, …)
   - Railway provides `$PORT` automatically.
3. **Frontend service** — root `frontend/`, builds the `Dockerfile`. Set the
   build arg / env `NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>/api/v1`.

`scripts/start.sh` runs migrations then launches the server, so deploys are
zero-touch.

---

## Scaling notes

- **Stateless backend** → scale horizontally (`WEB_CONCURRENCY`, more replicas).
- **Heartbeat presence in Redis** keeps the hot path off Postgres.
- **Frames in object storage** (not the DB) keep rows small and reads cheap.
- **Repository layer** isolates data access — swap stores or add read replicas
  without touching business logic.
- **Modular services** can be extracted into independent deployables when a
  single component needs to scale separately.
- **Model is configurable** — trade intelligence vs latency/cost per fleet.
- **Structured logging** (JSON + request IDs) is ready for log aggregation.

---

## Tech stack

Python · FastAPI · SQLAlchemy 2 (async) · PostgreSQL · Redis · S3/MinIO ·
Anthropic Claude · Docker / Docker Compose · Next.js · TypeScript.

---

## Security note

Never commit secrets. `SECRET_KEY`, `ANTHROPIC_API_KEY` and S3 credentials are
supplied via environment variables only; `.env` is git-ignored.
