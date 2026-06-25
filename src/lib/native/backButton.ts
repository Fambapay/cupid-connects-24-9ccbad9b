import { isNative, isAndroid } from './platform'

/**
 * Android hardware back button:
 * - If router history can go back, navigate back.
 * - If on a root tab, minimize the app (don't exit).
 * - On the home root, exit.
 */
export async function setupBackButton() {
  if (!isNative() || !isAndroid()) return
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      const path = window.location.pathname
      const isRoot =
        path === '/' ||
        path === '/discover' ||
        path === '/chat' ||
        path === '/matches' ||
        path === '/profile'

      if (canGoBack && !isRoot) {
        window.history.back()
      } else {
        App.minimizeApp().catch(() => App.exitApp())
      }
    })
  } catch {
    // ignore
  }
}
