"""Container entrypoint — migrations + server, no shell required.

Platforms like Timeweb Cloud App Platform run the start command directly (not
through a shell), so shell constructs (``&&``, ``${PORT:-8000}``) don't expand.
This module does the same work in pure Python: optionally apply Alembic
migrations, then bind uvicorn to ``0.0.0.0`` on the platform-provided ``PORT``
(default ``8000``).

Start command:  ``python -m app.entry``
"""

from __future__ import annotations

import os
import subprocess
import sys

import uvicorn

from app.core.logging import get_logger

logger = get_logger("entry")


def _run_migrations() -> None:
    if os.environ.get("RUN_MIGRATIONS", "1") != "1":
        logger.info("migrations_skipped")
        return
    logger.info("migrations_running")
    # alembic.ini lives in the project root (the working directory).
    result = subprocess.run(["alembic", "upgrade", "head"], check=False)
    if result.returncode != 0:
        logger.error("migrations_failed", returncode=result.returncode)
        sys.exit(result.returncode)
    logger.info("migrations_done")


def main() -> None:
    _run_migrations()
    port = int(os.environ.get("PORT", "8000"))
    workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
    logger.info("server_starting", host="0.0.0.0", port=port, workers=workers)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
    )


if __name__ == "__main__":
    main()
