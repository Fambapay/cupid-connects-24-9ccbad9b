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

  // iOS Web Push always adds a "from <app>" subtitle when the notification
  // title differs from the PWA name. To get the clean native look (bold title
  // + body), we set the notification title to the PWA name so iOS suppresses
  // the "from hunie" line, and put the real title as the first line of the
  // body — iOS renders the first body line slightly emphasised.
  const headline = payload.title || ''
  const body = payload.body || ''
  const combinedBody = headline && body ? `${headline}\n${body}` : (headline || body)
  const options = {
    body: combinedBody,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url || '/', ...payload.data },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification('hunie', options))
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
