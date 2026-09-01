#!/usr/bin/env bash
#
# Take a compressed, verified backup of the Mevratek database.
#
#   ops/backup.sh                       # uses $DATABASE_URL
#   ops/backup.sh --out /srv/backups    # somewhere other than ./backups
#   ops/backup.sh --keep 30             # keep 30 days instead of 14
#
# Everything the platform holds lives in PostgreSQL: organizations, users,
# devices, decisions, telemetry, tasks, audit log — and avatars, which are
# stored inline rather than as files. A database dump is therefore a complete
# backup of the installation's *data*; secrets live in the environment and are
# backed up separately (see ops/README.md).
#
# The dump is written to a temporary name and only moved into place once
# pg_dump exits cleanly, so an interrupted run can never leave a truncated file
# that looks like a good backup.

set -euo pipefail

OUT_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)  OUT_DIR="$2"; shift 2 ;;
    --keep) KEEP_DAYS="$2"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  echo "Example: postgresql://user:pass@host:5432/mevratek" >&2
  exit 2
fi

# The app speaks postgresql+asyncpg://; pg_dump does not know that scheme.
PG_URL="${DATABASE_URL/postgresql+asyncpg:/postgresql:}"
PG_URL="${PG_URL/postgres+asyncpg:/postgresql:}"

command -v pg_dump >/dev/null || { echo "pg_dump not found (install postgresql-client)." >&2; exit 3; }

mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FINAL="$OUT_DIR/mevratek-$STAMP.dump"
TEMP="$FINAL.partial"

echo "Backing up to $FINAL"

# -Fc is the custom format: compressed, and restorable table-by-table.
pg_dump --format=custom --compress=9 --no-owner --no-privileges \
        --file="$TEMP" "$PG_URL"

# A dump that pg_restore cannot list is not a backup. Check before keeping it.
if ! pg_restore --list "$TEMP" >/dev/null 2>&1; then
  echo "The dump failed verification and was discarded." >&2
  rm -f "$TEMP"
  exit 4
fi

mv "$TEMP" "$FINAL"
SIZE="$(du -h "$FINAL" | cut -f1)"
echo "Done: $FINAL ($SIZE)"

# Retention. Only ever touches files this script's own naming produces.
if [[ "$KEEP_DAYS" -gt 0 ]]; then
  DELETED="$(find "$OUT_DIR" -maxdepth 1 -name 'mevratek-*.dump' -mtime "+$KEEP_DAYS" -print -delete | wc -l)"
  [[ "$DELETED" -gt 0 ]] && echo "Removed $DELETED backup(s) older than $KEEP_DAYS days."
fi

exit 0
