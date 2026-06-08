import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'cupid-connects-24'
const SENDER_DOMAIN = 'suporte.hunie.app'
const FROM_DOMAIN = 'hunie.app'

// Days before expiry to send a reminder. We send at T-3 and T-1.
const REMINDER_WINDOWS = [3, 1] as const

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function authorized(request: Request): boolean {
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY || ''
  const header = request.headers.get('apikey') || request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || ''
  return !!anon && header === anon
}

async function ensureUnsubToken(email: string): Promise<string | null> {
  const norm = email.toLowerCase()
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', norm)
    .maybeSingle()
  if (existing && !existing.used_at) return existing.token
  if (existing && existing.used_at) return null // already unsubscribed
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

async function alreadySent(userId: string, daysLeft: number, expiresAt: string): Promise<boolean> {
  // Idempotency: one membership-expiring email per (user, daysLeft, expiry date)
  const key = `membership-expiring-${userId}-${daysLeft}-${expiresAt.slice(0, 10)}`
  const { data } = await supabaseAdmin
    .from('email_send_log')
    .select('id')
    .eq('message_id', key)
    .limit(1)
    .maybeSingle()
  return !!data
}

async function sendForUser(opts: {
  userId: string
  email: string
  name: string | null
  tier: string | null
  expiresAt: string
  daysLeft: number
}) {
  const { userId, email, name, tier, expiresAt, daysLeft } = opts
  if (await alreadySent(userId, daysLeft, expiresAt)) return { skipped: 'duplicate' as const }

  const tpl = TEMPLATES['membership-expiring']
  if (!tpl) return { skipped: 'no_template' as const }

  // Suppression
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (suppressed) return { skipped: 'suppressed' as const }

  const unsubscribeToken = await ensureUnsubToken(email)
  if (!unsubscribeToken) return { skipped: 'unsub_used' as const }

  const expiresOn = new Date(expiresAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  const templateData = { name: name ?? undefined, tier: tier ?? 'select', daysLeft, expiresOn }
  const element = React.createElement(tpl.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

  // Stable message_id used as idempotency key in email_send_log
  const messageId = `membership-expiring-${userId}-${daysLeft}-${expiresAt.slice(0, 10)}`

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'membership-expiring',
    recipient_email: email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
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
      label: 'membership-expiring',
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'membership-expiring',
      recipient_email: email,
      status: 'failed',
      error_message: enqueueError.message,
    })
    return { skipped: 'enqueue_failed' as const }
  }
  return { sent: true as const }
}

export const Route = createFileRoute('/api/public/membership-expiry-cron')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response('Unauthorized', { status: 401 })

        const results: { window: number; processed: number; sent: number }[] = []

        for (const daysLeft of REMINDER_WINDOWS) {
          // window = [now + daysLeft - 0.5d, now + daysLeft + 0.5d]
          const center = Date.now() + daysLeft * 86400_000
          const from = new Date(center - 12 * 3600_000).toISOString()
          const to = new Date(center + 12 * 3600_000).toISOString()

          const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, name, membership_tier, membership_status, membership_expires_at')
            .eq('membership_status', 'active')
            .in('membership_tier', ['select', 'plus', 'elite'])
            .gte('membership_expires_at', from)
            .lte('membership_expires_at', to)

          if (error) {
            console.error('expiry cron: profile query failed', error)
            continue
          }

          let sent = 0
          for (const p of profiles ?? []) {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id)
            const email = u?.user?.email
            if (!email) continue
            const r = await sendForUser({
              userId: p.id,
              email,
              name: p.name,
              tier: p.membership_tier,
              expiresAt: p.membership_expires_at!,
              daysLeft,
            })
            if ('sent' in r) sent++
          }
          results.push({ window: daysLeft, processed: profiles?.length ?? 0, sent })
        }

        return Response.json({ ok: true, results })
      },
    },
  },
})
