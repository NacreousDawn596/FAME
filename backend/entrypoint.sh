#!/bin/sh
set -e

echo "[fame] Applying database migrations..."
alembic upgrade head

echo "[fame] Starting: $*"
exec "$@"
