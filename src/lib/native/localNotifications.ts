import { isNative } from './platform'

let permissionGranted = false
let appInBackground = false

/**
 * Track app state so we can avoid spamming local notifications
 * when the user is actively inside the app.
 */
export async function initAppStateTracking() {
  if (!isNative()) return
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('appStateChange', ({ isActive }) => {
      appInBackground = !isActive
    })
    const state = await App.getState()
    appInBackground = !state.isActive
  } catch {
    // ignore
  }
}

export function isAppInBackground(): boolean {
  return appInBackground
}

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const result = await LocalNotifications.requestPermissions()
    permissionGranted = result.display === 'granted'
    return permissionGranted
  } catch {
    return false
  }
}

export async function checkLocalNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const result = await LocalNotifications.checkPermissions()
    permissionGranted = result.display === 'granted'
    return permissionGranted
  } catch {
    return false
  }
}

export interface LocalNotifPayload {
  id: number
  title: string
  body: string
  extra?: Record<string, string>
}

export async function scheduleLocalNotification(payload: LocalNotifPayload): Promise<void> {
  if (!isNative()) return
  if (!permissionGranted) {
    const ok = await checkLocalNotificationPermission()
    if (!ok) return
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        {
          id: payload.id,
          title: payload.title,
          body: payload.body,
          extra: payload.extra,
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#FF4FA3',
        },
      ],
    })
  } catch {
    // ignore
  }
}

export async function cancelLocalNotification(id: number): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id }] })
  } catch {
    // ignore
  }
}
