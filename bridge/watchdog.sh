#!/bin/sh
# Watchdog: restart a FAME WhatsApp bridge if it becomes unhealthy.
#
# "alive" is true whenever the WhatsApp client responds to a getState() probe
# (including the "waiting for QR / not yet scanned" phase). We only restart when
# the client is genuinely wedged (e.g. the "detached Frame" error after long
# uptime), where getState() throws. This avoids restart-loops while a QR is
# waiting to be scanned.
#
# Usage: watchdog.sh PORT SERVICE_NAME
set -u
PORT="$1"
SERVICE="$2"

if curl -sf --max-time 5 "http://localhost:${PORT}/health" | grep -q '"alive":true'; then
  exit 0
fi

echo "[watchdog:${SERVICE}] bridge unhealthy (client wedged) — restarting ${SERVICE}"
systemctl --user restart "${SERVICE}.service"
exit 0
