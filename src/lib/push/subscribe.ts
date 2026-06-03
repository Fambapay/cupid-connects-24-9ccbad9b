import { supabase } from '@/integrations/supabase/client'
import { VAPID_PUBLIC_KEY } from './config'

const VAPID_KEY_STORAGE = 'hunie:vapid-public-key'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i)
  return out
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getCurrentVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch('/api/public/vapid-key', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load VAPID key')
    const data = await res.json()
    if (typeof data.publicKey === 'string' && data.publicKey.length > 0) {
      return data.publicKey
    }
  } catch {
    // Fall back to the bundled key so old deployments still behave gracefully.
  }
  return localStorage.getItem(VAPID_KEY_STORAGE) || VAPID_PUBLIC_KEY
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false
  if (!('PushManager' in window)) return false
  if (!('Notification' in window)) return false
  // Don't enable in preview iframes (would pollute Lovable preview)
  try {
    if (window.self !== window.top) return false
  } catch {
    return false
  }
  const host = window.location.hostname
  if (host.includes('id-preview--') || host.includes('lovableproject.com')) return false
  return true
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  return Notification.permission
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }

  // IMPORTANT: Notification.requestPermission() must be called synchronously
  // inside the user gesture on iOS Safari / PWA. Any awaited call before it
  // breaks the gesture chain and the prompt silently never appears.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, reason: 'unauthenticated' }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready

  const previousKey = localStorage.getItem(VAPID_KEY_STORAGE)
  const vapidPublicKey = await getCurrentVapidPublicKey()

  let sub = await registration.pushManager.getSubscription()
  if (sub && (!previousKey || previousKey !== vapidPublicKey)) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
    sub = null
  }

  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    })
  }

  localStorage.setItem(VAPID_KEY_STORAGE, vapidPublicKey)

  const p256dh = arrayBufferToBase64Url(sub.getKey('p256dh'))
  const auth = arrayBufferToBase64Url(sub.getKey('auth'))

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userData.user.id,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return
  const sub = await registration.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}
