export type WsMessage = { type: string; [key: string]: unknown }

function wsBaseUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}`
}

export function connectWebSocket(
  path: string,
  onMessage: (msg: WsMessage) => void,
): () => void {
  let ws: WebSocket | null = null
  let closed = false
  let retry = 0
  const base = wsBaseUrl()

  const open = () => {
    if (closed) return
    ws = new WebSocket(`${base}${path}`)
    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data))
      } catch {
        /* ignore malformed frames */
      }
    }
    ws.onclose = () => {
      if (closed) return
      const delay = Math.min(1000 * 2 ** retry, 15000)
      retry += 1
      setTimeout(open, delay)
    }
    ws.onopen = () => {
      retry = 0
    }
  }

  open()
  return () => {
    closed = true
    ws?.close()
  }
}
