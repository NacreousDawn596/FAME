/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

// Precache static assets injected by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

// Background push notification handling.
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "FAME", body: event.data?.text() ?? "Your queue status has changed." };
  }
  const title = data.title ?? "FAME";
  const options: NotificationOptions = {
    body: data.body ?? "Your queue status has changed.",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
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

// Let Workbox take over default fetch handling minimally (skip complex caching
// strategies; the SPA is served fresh and the queue state is live over WS).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
