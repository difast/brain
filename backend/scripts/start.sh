#!/usr/bin/env sh
# Production entrypoint: optionally run DB migrations, then launch the API.
# Set RUN_MIGRATIONS=1 (default in production) to apply Alembic migrations
# before the server accepts traffic.
set -e

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}"
