import { buildPushPayload } from '@block65/webcrypto-web-push'

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
  data?: Record<string, unknown>
}

export interface StoredSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Sends a Web Push to a single subscription.
 * Returns { ok, statusCode, expired } — `expired: true` means the endpoint
 * is gone (404/410) and the caller should delete it.
 */
export async function sendWebPush(
  sub: StoredSubscription,
  payload: PushPayload
): Promise<{ ok: boolean; status: number; expired: boolean; error?: string }> {
  // Apple Web Push is strict about the `sub` JWT claim format.
  // Strip whitespace and angle brackets (e.g. "mailto: <a@b.com>" -> "mailto:a@b.com").
  const rawSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@hunie.app'
  const cleanSubject = rawSubject.replace(/[<>\s]/g, '')
  const subject = /^(mailto:|https:\/\/)/i.test(cleanSubject)
    ? cleanSubject
    : `mailto:${cleanSubject}`

  const vapid = {
    subject,
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  }

  if (!vapid.publicKey || !vapid.privateKey) {
    return { ok: false, status: 0, expired: false, error: 'VAPID keys not configured' }
  }

  const subscription = {
    endpoint: sub.endpoint,
    expirationTime: null,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }

  try {
    const message = {
      data: payload as any,
      options: { ttl: 60 * 60 * 24, urgency: 'normal' as const },
    }
    const built = await buildPushPayload(message, subscription, vapid)
    const res = await fetch(sub.endpoint, {
      method: built.method,
      headers: built.headers as Record<string, string>,
      body: built.body as unknown as BodyInit,
    })
    const error = res.ok ? undefined : await res.text().catch(() => res.statusText)
    const vapidKeyMismatch = !!error && error.includes('VapidPkHashMismatch')
    return {
      ok: res.ok,
      status: res.status,
      expired: res.status === 404 || res.status === 410 || vapidKeyMismatch,
      error,
    }
  } catch (e: any) {
    return { ok: false, status: 0, expired: false, error: e?.message || String(e) }
  }
}
