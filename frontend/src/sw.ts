/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

// Precache static assets injected by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  data?: { eventType?: string; position?: number | null; filiere?: string | null };
}

// Background push notification handling. This runs even when the app/browser
// window is closed, as long as the browser itself is still running.
self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "FAME", body: event.data?.text() ?? "Your queue status has changed." };
  }

  const title = data.title ?? "FAME";
  const eventType = data.data?.eventType;
  const important = eventType === "ATTRIBUTED" || eventType === "IMMEDIATE";

  const options: NotificationOptions = {
    body: data.body ?? "Your queue status has changed.",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    // Same event type replaces the previous notification instead of stacking.
    tag: eventType ? `fame-${eventType}` : undefined,
    // Keep "you have been called" / "you are next" on screen until dismissed.
    requireInteraction: important,
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
