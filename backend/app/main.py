"""Application entrypoint — wires the FastAPI app together.

Acts as the API Gateway: CORS, request-context logging, auth-aware routing to
the Brain, Registry, Telemetry and Memory services, plus centralized error
handling and OpenAPI documentation.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.routes import (
    admin,
    api_keys,
    auth,
    brain,
    executions,
    health,
    invites,
    leads,
    logs,
    robots,
    tasks,
    telemetry,
)
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import BrainError
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.services import demo_service
from app.services.decision_engine import DecisionEngine
from app.services.seed_service import seed_identity
from app.services.storage import FrameStorage

logger = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info("startup", environment=settings.environment, version=__version__)

    # Initialize shared singletons (cheap to hold for the process lifetime).
    app.state.brain = DecisionEngine()
    app.state.storage = FrameStorage()

    # Dev convenience: auto-create tables. In production run Alembic migrations.
    if settings.environment != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.storage_enabled:
            await app.state.storage.ensure_bucket()

    # Provision the seed organization + admin user (idempotent) and backfill
    # any pre-tenancy data onto it. Runs in every environment so the admin can
    # always log in; the Alembic migration performs the same seed in prod.
    try:
        await seed_identity()
    except Exception as exc:  # noqa: BLE001
        logger.warning("seed_identity_failed", error=str(exc))

    # Demo device: seed it and keep it live in the background.
    demo_stop = asyncio.Event()
    demo_task: asyncio.Task | None = None
    if settings.demo_mode:
        try:
            await demo_service.ensure_demo()
            demo_task = asyncio.create_task(demo_service.run_demo_loop(demo_stop))
        except Exception as exc:  # noqa: BLE001
            logger.warning("demo_setup_failed", error=str(exc))

    yield

    if demo_task is not None:
        demo_stop.set()
        demo_task.cancel()
    await engine.dispose()
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "Mevratek — cloud platform for controlling any device through a "
            "single protocol. Devices are thin clients; all decision-making "
            "runs in the cloud via the AI Decision Engine (supports YandexGPT, "
            "GigaChat, Claude and local models). Register a device, stream "
            "frames + telemetry, and receive structured action commands."
        ),
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(RequestContextMiddleware)
    # The API authenticates with bearer tokens (no cookies), so credentials
    # are not needed. Disabling them lets a wildcard origin work cleanly —
    # "*" + allow_credentials is rejected by browsers and breaks fetch().
    allow_all = "*" in settings.cors_origins
    # The public contact form on the marketing site posts to /leads from a
    # different origin than the admin dashboard. Operators following the
    # deployment docs set CORS_ORIGINS to just the dashboard's origin, which
    # would silently block the form — so the marketing site is always allowed
    # here regardless of that setting.
    public_site_origins = ["https://mevratek.ru", "https://www.mevratek.ru"]
    origins = (
        settings.cors_origins
        if allow_all
        else list(dict.fromkeys([*settings.cors_origins, *public_site_origins]))
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=not allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(BrainError)
    async def _brain_error_handler(
        request: Request, exc: BrainError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "request_id": request.headers.get("X-Request-ID"),
            },
        )

    api = settings.api_v1_prefix
    for module in (
        health,
        auth,
        admin,
        invites,
        leads,
        robots,
        brain,
        telemetry,
        tasks,
        executions,
        logs,
        api_keys,
    ):
        app.include_router(module.router, prefix=api)

    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        return {
            "service": settings.app_name,
            "version": __version__,
            "docs": "/docs",
            "api_prefix": api,
        }

    return app


app = create_app()
