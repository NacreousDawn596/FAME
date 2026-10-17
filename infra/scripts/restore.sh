#!/usr/bin/env bash
# FAME PostgreSQL restore script (restores into an isolated/empty database).
set -euo pipefail

BACKUP="${1:?usage: restore.sh <backup.sql.gz>}"
CONTAINER="${2:-fame-postgres-1}"
DB="${POSTGRES_DB:-fame}"
USER="${POSTGRES_USER:-fame}"

if [ ! -f "$BACKUP" ]; then
  echo "Backup file not found: $BACKUP" >&2
  exit 1
fi

echo "Restoring '$BACKUP' into '$DB' (container '$CONTAINER')"
gunzip -c "$BACKUP" | docker exec -i "$CONTAINER" pg_restore -U "$USER" -d "$DB" --clean --if-exists --no-owner
echo "Restore complete."
