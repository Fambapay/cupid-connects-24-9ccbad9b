import { isNative, getPlatform } from './platform'
import { supabase } from '@/integrations/supabase/client'

/**
 * Regista o device para push notifications nativas via FCM (Android) / APNs (iOS).
 * O token FCM é guardado em `push_subscriptions.fcm_token` para o backend usar.
 *
 * Web Push (VAPID) continua a funcionar em paralelo via src/lib/push/subscribe.ts.
 */
export async function setupNativePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isNative()) return { ok: false, reason: 'not_native' }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const perm = await PushNotifications.checkPermissions()
    let state = perm.receive
    if (state === 'prompt' || state === 'prompt-with-rationale') {
      const req = await PushNotifications.requestPermissions()
      state = req.receive
    }
    if (state !== 'granted') return { ok: false, reason: 'denied' }

    return await new Promise((resolve) => {
      const finishOnce = (result: { ok: boolean; reason?: string }) => {
        resolve(result)
      }

      PushNotifications.addListener('registration', async (token) => {
        try {
          const { data: u } = await supabase.auth.getUser()
          if (!u.user) return finishOnce({ ok: false, reason: 'unauthenticated' })

          const endpoint = `fcm:${token.value}`
          const { error } = await supabase.from('push_subscriptions').upsert(
            {
              user_id: u.user.id,
              endpoint,
              fcm_token: token.value,
              platform: getPlatform(),
              p256dh: '',
              auth: '',
              user_agent: navigator.userAgent,
              last_used_at: new Date().toISOString(),
            } as never,
            { onConflict: 'endpoint' },
          )
          if (error) return finishOnce({ ok: false, reason: error.message })
          finishOnce({ ok: true })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          finishOnce({ ok: false, reason: msg })
        }
      })

      PushNotifications.addListener('registrationError', (err) => {
        finishOnce({ ok: false, reason: err.error })
      })

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Foreground: trigger an in-app toast if you want — for now we just log
        console.log('[push] foreground', notification)
      })

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = (action.notification.data?.url as string | undefined) ?? '/'
        try {
          window.location.assign(url)
        } catch {
          // ignore
        }
      })

      PushNotifications.register().catch((e) => {
        finishOnce({ ok: false, reason: String(e) })
      })
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: msg }
  }
}
