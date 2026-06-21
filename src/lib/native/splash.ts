import { isNative } from './platform'

export async function hideSplash() {
  if (!isNative()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 250 })
  } catch {
    // ignore
  }
}
