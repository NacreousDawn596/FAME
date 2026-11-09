const CACHE_NAME = 'fame-shell-v3'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/fame-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (event.request.destination === 'document' || event.request.destination === 'script' || event.request.destination === 'style')) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => (await caches.match(event.request)) || (await caches.match('/index.html'))),
  )
})

// Background Web Push delivery — runs even when the app is closed.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'FAME', body: event.data ? event.data.text() : 'Votre statut a changé.' }
  }
  const eventType = data.data && data.data.eventType
  const important = eventType === 'ATTRIBUTED' || eventType === 'IMMEDIATE'
  const options = {
    body: data.body || 'Votre statut a changé.',
    icon: '/icons/fame-192.png',
    badge: '/icons/fame-192.png',
    tag: eventType ? `fame-${eventType}` : undefined,
    requireInteraction: important,
    data: { url: data.url || '/#/student' },
  }
  event.waitUntil(self.registration.showNotification(data.title || 'FAME', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/#/student'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

