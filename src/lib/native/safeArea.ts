import { isNative } from './platform'

/**
 * Enables edge-to-edge on Android and exposes safe-area insets as CSS vars
 * (--sat, --sar, --sab, --sal) so layouts can pad correctly under the
 * transparent status/nav bars. iOS already provides env(safe-area-inset-*).
 */
export async function setupSafeArea() {
  if (!isNative()) return
  try {
    const mod = await import('@capacitor-community/safe-area')
    const SafeArea = (mod as any).SafeArea ?? (mod as any).default
    if (!SafeArea) return

    await SafeArea.enable?.({
      config: {
        customColorsForSystemBars: true,
        statusBarColor: '#00000000',
        statusBarContent: 'light',
        navigationBarColor: '#00000000',
        navigationBarContent: 'light',
        offset: 0,
      },
    })
  } catch {
    // ignore — plugin not present or web
  }
}
