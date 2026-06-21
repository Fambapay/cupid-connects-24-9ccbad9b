import { isNative } from './platform'

export async function setupStatusBar() {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setOverlaysWebView({ overlay: true })
    // Transparent so the page background bleeds under the status bar
    try {
      await StatusBar.setBackgroundColor({ color: '#00000000' })
    } catch {
      // not supported on iOS — ignore
    }
  } catch {
    // ignore
  }
}
