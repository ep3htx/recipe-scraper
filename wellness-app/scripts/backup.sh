#!/usr/bin/env bash
# Dumps the Postgres database to a timestamped, gzip-compressed .sql file
# and prunes backups older than BACKUP_RETENTION_DAYS. Safe to run from a
# host cron job:
#   0 3 * * * cd /path/to/wellness-app && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example to .env first." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

timestamp=$(date +%Y%m%d_%H%M%S)
out_file="$BACKUP_DIR/wellness_${timestamp}.sql.gz"

echo "Backing up database '$POSTGRES_DB' to $out_file ..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists | gzip > "$out_file"

echo "Backup complete: $out_file ($(du -h "$out_file" | cut -f1))"

echo "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name 'wellness_*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete

echo "Done."
