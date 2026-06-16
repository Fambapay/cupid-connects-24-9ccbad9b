import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { sendWebPush } from '@/lib/push/send.server'

const SITE_NAME = 'cupid-connects-24'
const SENDER_DOMAIN = 'suporte.hunie.app'
const FROM_DOMAIN = 'hunie.app'

const INACTIVE_WINDOWS = [7, 14, 30] as const

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || ''
  if (!secret) return false
  const header =
    request.headers.get('x-cron-secret') ||
    request.headers.get('apikey') ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  return safeEqual(header, secret)
}

async function ensureUnsubToken(email: string): Promise<string | null> {
  const norm = email.toLowerCase()
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', norm)
    .maybeSingle()
  if (existing && !existing.used_at) return existing.token
  if (existing && existing.used_at) return null
  const token = generateToken()
  await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .upsert({ token, email: norm }, { onConflict: 'email', ignoreDuplicates: true })
  const { data: stored } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', norm)
    .maybeSingle()
  return stored?.token ?? null
}

async function alreadySent(userId: string, daysInactive: number, bucketDate: string): Promise<boolean> {
  const key = `reactivation-${userId}-${daysInactive}-${bucketDate}`
  const { data } = await supabaseAdmin
    .from('email_send_log')
    .select('id')
    .eq('message_id', key)
    .limit(1)
    .maybeSingle()
  return !!data
}

async function sendEmail(opts: {
  userId: string
  email: string
  name: string | null
  daysInactive: number
  bucketDate: string
}) {
  const { userId, email, name, daysInactive, bucketDate } = opts
  if (await alreadySent(userId, daysInactive, bucketDate)) return { skipped: 'duplicate' as const }

  const tpl = TEMPLATES['reactivation']
  if (!tpl) return { skipped: 'no_template' as const }

  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (suppressed) return { skipped: 'suppressed' as const }

  const unsubscribeToken = await ensureUnsubToken(email)
  if (!unsubscribeToken) return { skipped: 'unsub_used' as const }

  const templateData = { name: name ?? undefined, daysInactive }
  const element = React.createElement(tpl.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

  const messageId = `reactivation-${userId}-${daysInactive}-${bucketDate}`

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'reactivation',
    recipient_email: email,
    status: 'pending',
  })

  const { error } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'reactivation',
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'reactivation',
      recipient_email: email,
      status: 'failed',
      error_message: error.message,
    })
    return { skipped: 'enqueue_failed' as const }
  }
  return { sent: true as const }
}

async function sendPush(userId: string, daysInactive: number, name: string | null) {
  // Honor user preferences (push + promo opt-in)
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('push_enabled, notify_promo')
    .eq('user_id', userId)
    .maybeSingle()
  if (prefs && (prefs.push_enabled === false || prefs.notify_promo === false)) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (!subs?.length) return

  const who = name ? `${name}, ` : ''
  const title =
    daysInactive >= 30 ? `${who}voltas? ☕`
    : daysInactive >= 14 ? `${who}sentimos a tua falta 💔`
    : `${who}tens novidades 👀`
  const body =
    daysInactive >= 30 ? 'Há novos perfis na tua zona à tua espera.'
    : daysInactive >= 14 ? 'Os melhores matches são para quem está presente.'
    : 'Provavelmente já tens likes para ver.'

  for (const sub of subs) {
    const res = await sendWebPush(sub, { title, body, url: '/discover' })
    if (res.expired) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
    } else if (res.ok) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)
    }
  }
}

export const Route = createFileRoute('/api/public/reactivation-cron')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response('Unauthorized', { status: 401 })

        const today = new Date().toISOString().slice(0, 10)
        const results: { window: number; processed: number; emailed: number; pushed: number }[] = []

        for (const daysInactive of INACTIVE_WINDOWS) {
          const center = Date.now() - daysInactive * 86400_000
          const from = new Date(center - 12 * 3600_000).toISOString()
          const to = new Date(center + 12 * 3600_000).toISOString()

          const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, name, last_active_at, is_paused, onboarding_completed, is_seed')
            .eq('onboarding_completed', true)
            .eq('is_paused', false)
            .eq('is_seed', false)
            .gte('last_active_at', from)
            .lte('last_active_at', to)

          if (error) {
            console.error('reactivation cron query failed', error)
            continue
          }

          let emailed = 0
          let pushed = 0
          for (const p of profiles ?? []) {
            // Email
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id)
            const email = u?.user?.email
            if (email) {
              const r = await sendEmail({
                userId: p.id,
                email,
                name: p.name,
                daysInactive,
                bucketDate: today,
              })
              if ('sent' in r) emailed++
            }
            // Push (best-effort, independent of email)
            try {
              await sendPush(p.id, daysInactive, p.name)
              pushed++
            } catch (e) {
              console.warn('reactivation push failed', e)
            }
          }
          results.push({ window: daysInactive, processed: profiles?.length ?? 0, emailed, pushed })
        }

        return Response.json({ ok: true, results })
      },
    },
  },
})
