"""Application entrypoint — wires the FastAPI app together.

Acts as the API Gateway: CORS, request-context logging, auth-aware routing to
the Brain, Registry, Telemetry and Memory services, plus centralized error
handling and OpenAPI documentation.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.routes import brain, health, logs, robots, tasks, telemetry
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import BrainError
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.services.claude_client import ClaudeBrain
from app.services.storage import FrameStorage

logger = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info("startup", environment=settings.environment, version=__version__)

    # Initialize shared singletons (cheap to hold for the process lifetime).
    app.state.brain = ClaudeBrain()
    app.state.storage = FrameStorage()

    # Dev convenience: auto-create tables. In production run Alembic migrations.
    if settings.environment != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.storage_enabled:
            await app.state.storage.ensure_bucket()

    yield

    await engine.dispose()
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "Cloud Brain for Robots — robots are thin clients; all "
            "decision-making runs in the cloud via Claude. Register a robot, "
            "stream frames + telemetry, and receive structured action commands."
        ),
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
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
    for module in (health, robots, brain, telemetry, tasks, logs):
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
