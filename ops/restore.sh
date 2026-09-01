#!/usr/bin/env bash
#
# Restore a Mevratek backup into a database.
#
#   ops/restore.sh backups/mevratek-20260901-120000.dump
#   ops/restore.sh --into postgresql://user:pass@host/restore_test dump.file
#
# This REPLACES the contents of the target database. It refuses to run without
# --yes unless the target is obviously a scratch database, so a restore drill
# can be scripted while a production restore stays deliberate.
#
# Stop the backend before restoring into a live database: Alembic's version
# table comes from the dump, and a running app against half-restored schema
# will behave unpredictably.

set -euo pipefail

TARGET="${DATABASE_URL:-}"
ASSUME_YES=0
DUMP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --into) TARGET="$2"; shift 2 ;;
    --yes)  ASSUME_YES=1; shift ;;
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) DUMP="$1"; shift ;;
  esac
done

[[ -n "$DUMP" ]] || { echo "Usage: ops/restore.sh [--into URL] [--yes] <dump-file>" >&2; exit 2; }
[[ -f "$DUMP" ]] || { echo "No such dump: $DUMP" >&2; exit 2; }
[[ -n "$TARGET" ]] || { echo "No target: set DATABASE_URL or pass --into." >&2; exit 2; }

PG_URL="${TARGET/postgresql+asyncpg:/postgresql:}"
PG_URL="${PG_URL/postgres+asyncpg:/postgresql:}"

command -v pg_restore >/dev/null || { echo "pg_restore not found (install postgresql-client)." >&2; exit 3; }

# Verify the dump before touching the target.
pg_restore --list "$DUMP" >/dev/null 2>&1 || {
  echo "That file is not a readable pg_dump custom-format archive." >&2
  exit 4
}

# Drop any query string first: a libpq URL may carry "?host=/var/run/..."
# whose slashes would otherwise be mistaken for the path separator.
DB_NAME="${PG_URL%%\?*}"
DB_NAME="${DB_NAME##*/}"

if [[ "$ASSUME_YES" -ne 1 && ! "$DB_NAME" =~ (test|scratch|restore|staging) ]]; then
  echo "About to REPLACE the contents of database '$DB_NAME'."
  echo "Stop the backend first. Re-run with --yes to proceed."
  exit 5
fi

echo "Restoring $DUMP into '$DB_NAME'..."

# --clean --if-exists drops the existing objects first, so the result is the
# dump's state rather than a merge. Ownership and grants come from the target.
pg_restore --clean --if-exists --no-owner --no-privileges \
           --dbname="$PG_URL" "$DUMP"

echo "Restore finished."
echo "Now run 'alembic upgrade head' in backend/ — the dump carries the schema"
echo "as of its own time, which may predate the code you are running."
