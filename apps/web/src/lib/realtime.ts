import { useEffect, useRef } from 'react';
import type { RealtimeEvent } from '../api/types';

/**
 * SSE-based realtime subscription. Uses EventSource (same-origin via the
 * reverse proxy / Vite dev proxy) so the session cookie is sent automatically.
 * Falls back to manual reconnect on error/offline.
 */
export function useRealtime(
  url: string | null,
  onEvent: (event: RealtimeEvent) => void,
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!url) return;

    let source: EventSource | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      source = new EventSource(url);

      source.onopen = () => {
        // connected
      };

      source.addEventListener('event', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as RealtimeEvent;
          handlerRef.current(parsed);
        } catch {
          // ignore malformed events
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (!closed && navigator.onLine) {
          retry = setTimeout(connect, 2000);
        }
      };
    };

    const onOnline = () => connect();
    window.addEventListener('online', onOnline);
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      source?.close();
      window.removeEventListener('online', onOnline);
    };
  }, [url]);
}
