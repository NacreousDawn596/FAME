const WS_URL = __WS_URL__;

function resolveBaseUrl(): string {
  // In development, connect directly to the API's WebSocket endpoint.
  if (import.meta.env.DEV) return WS_URL;
  // In production, derive the WebSocket URL from the page origin (the reverse
  // proxy forwards /api/v1/ws with Upgrade headers).
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

export type WsMessage = { type: string; [key: string]: unknown };

export function connectWebSocket(
  path: string,
  onMessage: (msg: WsMessage) => void,
  onOpen?: () => void
): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  const base = resolveBaseUrl();

  const open = () => {
    if (closed) return;
    ws = new WebSocket(`${base}${path}`);
    ws.onopen = () => {
      retry = 0;
      onOpen?.();
    };
    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      if (closed) return;
      const delay = Math.min(1000 * 2 ** retry, 15000);
      retry += 1;
      setTimeout(open, delay);
    };
  };

  open();
  return () => {
    closed = true;
    ws?.close();
  };
}
