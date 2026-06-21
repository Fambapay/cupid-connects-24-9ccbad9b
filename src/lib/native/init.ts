import { isNative } from './platform'
import { setupStatusBar } from './statusBar'
import { setupKeyboard } from './keyboard'
import { setupDeepLinks } from './deepLinks'
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

  document.documentElement.classList.add('native', 'native-android')

  await Promise.all([setupStatusBar(), setupKeyboard(), setupDeepLinks()])

  // Hide splash a tick after the first paint
  setTimeout(() => {
    hideSplash().catch(() => undefined)
  }, 300)
}
