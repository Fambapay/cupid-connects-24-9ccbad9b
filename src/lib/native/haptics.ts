import { isNative } from './platform'

type Style = 'light' | 'medium' | 'heavy'

async function impact(style: Style) {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const
    await Haptics.impact({ style: map[style] })
  } catch {
    // ignore
  }
}

export const nativeHapticLight = () => impact('light')
export const nativeHapticMedium = () => impact('medium')
export const nativeHapticHeavy = () => impact('heavy')

export async function nativeHapticSelection() {
  if (!isNative()) return
  try {
    const { Haptics } = await import('@capacitor/haptics')
    await Haptics.selectionChanged()
  } catch {
    // ignore
  }
}

export async function nativeHapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    } as const
    await Haptics.notification({ type: map[type] })
  } catch {
    // ignore
  }
}
