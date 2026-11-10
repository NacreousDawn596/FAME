#!/bin/sh
# Watchdog: restart the FAME WhatsApp bridge if it becomes unhealthy
# (e.g. the "detached Frame" error after long uptime).
set -u

if curl -sf --max-time 5 http://localhost:3000/health | grep -q '"ready":true'; then
  exit 0
fi

echo "[watchdog] bridge unhealthy — restarting fame-whatsapp-bridge"
systemctl --user restart fame-whatsapp-bridge.service
exit 0
