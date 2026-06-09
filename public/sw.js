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

  // iOS always renders its own "from <app>" line for PWA Web Push.
  // Keep the notification content clean and avoid duplicating the title in the body.
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url || '/', ...payload.data },
    requireInteraction: false,
  }
  event.waitUntil((async () => {
    // Suppress system push when the app is already open/focused.
    // The in-app toast (useNewMessageNotifier) handles it instead,
    // avoiding the duplicate-notification problem.
    try {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const appInForeground = clientsArr.some((c) => c.visibilityState === 'visible')
      if (appInForeground) return
    } catch (e) {}
    await self.registration.showNotification(payload.title || 'hunie', options)
  })())
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
