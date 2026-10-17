#!/usr/bin/env bash
# FAME PostgreSQL backup script.
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${1:-backup-$STAMP.sql.gz}"
CONTAINER="${2:-fame-postgres-1}"
DB="${POSTGRES_DB:-fame}"
USER="${POSTGRES_USER:-fame}"

echo "Backing up '$DB' from container '$CONTAINER' to $OUT"
docker exec "$CONTAINER" pg_dump -U "$USER" -Fc "$DB" | gzip > "$OUT"
echo "Backup complete: $OUT"
