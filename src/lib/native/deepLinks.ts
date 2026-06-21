import { isNative } from './platform'

/**
 * Listens to deep links (https://hunie.app/... or hunie://...) and navigates
 * the SPA without a full reload.
 */
export async function setupDeepLinks() {
  if (!isNative()) return
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url)
        const path = `${url.pathname}${url.search}${url.hash}` || '/'
        if (path && path !== window.location.pathname + window.location.search + window.location.hash) {
          window.history.pushState({}, '', path)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      } catch {
        // ignore malformed URLs
      }
    })
  } catch {
    // ignore
  }
}
