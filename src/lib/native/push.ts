import { isNative, getPlatform } from './platform'
import { supabase } from '@/integrations/supabase/client'

const NATIVE_PUSH_CLIENT_ID_STORAGE = 'hunie:native-push-client-id'

let setupPromise: Promise<{ ok: boolean; reason?: string }> | null = null

function getNativePushClientId(): string {
  let existing = localStorage.getItem(NATIVE_PUSH_CLIENT_ID_STORAGE)
  if (existing) return existing

  existing = crypto.randomUUID()
  localStorage.setItem(NATIVE_PUSH_CLIENT_ID_STORAGE, existing)
  return existing
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Regista o device para push notifications nativas via FCM (Android) / APNs (iOS).
 * O token FCM é guardado em `push_subscriptions.fcm_token` para o backend usar.
 *
 * Web Push (VAPID) continua a funcionar em paralelo via src/lib/push/subscribe.ts.
 */
export async function setupNativePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isNative()) return { ok: false, reason: 'not_native' }
  if (setupPromise) return setupPromise

  setupPromise = setupNativePushOnce()
  return setupPromise
}

async function setupNativePushOnce(): Promise<{ ok: boolean; reason?: string }> {

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
            const clientId = getNativePushClientId()
            const deviceKey = await sha256Hex(`${getPlatform()}:${clientId}`)

            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', u.user.id)
              .eq('client_id', clientId)
              .neq('endpoint', endpoint)

          const { error } = await supabase.from('push_subscriptions').upsert(
            {
              user_id: u.user.id,
              endpoint,
              fcm_token: token.value,
              platform: getPlatform(),
                client_id: clientId,
                device_key: deviceKey,
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
