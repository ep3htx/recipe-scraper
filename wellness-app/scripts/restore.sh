#!/usr/bin/env bash
# Restores the database from a backup produced by backup.sh.
# Usage: ./scripts/restore.sh backups/wellness_20250101_030000.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-backup.sql.gz>" >&2
  exit 1
fi
backup_file="$1"
if [ ! -f "$backup_file" ]; then
  echo "Backup file not found: $backup_file" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example to .env first." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "This will REPLACE the contents of database '$POSTGRES_DB' with $backup_file."
read -r -p "Type 'yes' to continue: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 1
fi

echo "Restoring..."
gunzip -c "$backup_file" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restore complete. Restart the backend so it reconnects cleanly:"
echo "  docker compose restart backend"
