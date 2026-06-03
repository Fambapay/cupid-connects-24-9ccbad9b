// Hunie Web Push service worker — minimal, no caching, no offline shell.
// Only listens for push + notificationclick events.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = { title: 'Hunie', body: event.data ? event.data.text() : '' }
  }

  // iOS Web Push adds a "from <app>" subtitle whenever the notification title
  // differs from the PWA name. To match native-style notifications (bold title
  // + body only), we use the real title as the notification title and put the
  // body underneath. The PWA name ("hunie") already appears as the group header.
  const realTitle = payload.title || 'hunie'
  const body = payload.body || ''
  const options = {
    body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url || '/', ...payload.data },
    requireInteraction: false,
    silent: false,
  }
  event.waitUntil(self.registration.showNotification(realTitle, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(targetUrl)
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
