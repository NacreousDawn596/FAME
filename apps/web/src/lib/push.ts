import { api } from '../api/client';

function b64ToUint8(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Registers the current device for Web Push (VAPID). No-op if unsupported.
 * Never fails the app when push is unavailable.
 */
export async function subscribeToPush(): Promise<'subscribed' | 'unsupported' | 'denied'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }

  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return 'denied';
  }

  const { publicKey } = await api.get<{ publicKey: string }>('/push/vapid-public-key');
  if (!publicKey) return 'unsupported';

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8(publicKey),
  });

  const json = subscription.toJSON();
  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    expirationTime: json.expirationTime ? Math.floor(json.expirationTime / 1000) : null,
  });

  return 'subscribed';
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
