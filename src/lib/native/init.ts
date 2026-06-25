import { isNative, getPlatform } from './platform'
import { initAppStateTracking, initLocalNotificationHandlers } from './localNotifications'
import { setupStatusBar } from './statusBar'
import { setupKeyboard } from './keyboard'
import { setupDeepLinks } from './deepLinks'
import { setupSafeArea } from './safeArea'
import { setupBackButton } from './backButton'
import { hideSplash } from './splash'

let initialized = false

/**
 * Bootstraps the native bridge once. Safe to call on web — becomes a no-op.
 * Push registration is intentionally NOT called here; it runs after the user
 * is authenticated (see PushPromptGate).
 */
export async function initNative() {
  if (initialized) return
  initialized = true
  if (!isNative()) return

  const platform = getPlatform()
  document.documentElement.classList.add('native', `native-${platform}`)

  // Safe area must run before status bar so insets are wired before the
  // WebView is told to overlay.
  await setupSafeArea()
  await Promise.all([
    setupStatusBar(),
    setupKeyboard(),
    setupDeepLinks(),
    setupBackButton(),
    initAppStateTracking(),
    initLocalNotificationHandlers(),
  ])

  // Hide splash a tick after the first paint
  setTimeout(() => {
    hideSplash().catch(() => undefined)
  }, 300)
}
