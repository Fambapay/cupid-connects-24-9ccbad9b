import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'cupid-connects-24'
const SENDER_DOMAIN = 'suporte.hunie.app'
const FROM_DOMAIN = 'hunie.app'

// Phases to remind ~24h before end.
const PHASES = ['trialing', 'grace_period'] as const
type Phase = (typeof PHASES)[number]

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

async function alreadySent(userId: string, phase: Phase, expiresAt: string): Promise<boolean> {
  const key = `trial-ending-${phase}-${userId}-${expiresAt.slice(0, 10)}`
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
  phase: Phase
  expiresAt: string
}) {
  const { userId, email, name, phase, expiresAt } = opts
  if (await alreadySent(userId, phase, expiresAt)) return { skipped: 'duplicate' as const }

  const tpl = TEMPLATES['trial-ending']
  if (!tpl) return { skipped: 'no_template' as const }

  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (suppressed) return { skipped: 'suppressed' as const }

  const unsubscribeToken = await ensureUnsubToken(email)
  if (!unsubscribeToken) return { skipped: 'unsub_used' as const }

  const hoursLeft = Math.max(
    1,
    Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600_000),
  )
  const templateData = { name: name ?? undefined, phase, hoursLeft }
  const element = React.createElement(tpl.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

  const messageId = `trial-ending-${phase}-${userId}-${expiresAt.slice(0, 10)}`

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'trial-ending',
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
      label: `trial-ending-${phase}`,
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'trial-ending',
      recipient_email: email,
      status: 'failed',
      error_message: enqueueError.message,
    })
    return { skipped: 'enqueue_failed' as const }
  }
  return { sent: true as const }
}

export const Route = createFileRoute('/api/public/trial-ending-cron')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response('Unauthorized', { status: 401 })

        const results: { phase: Phase; processed: number; sent: number }[] = []

        for (const phase of PHASES) {
          // Window centered ~24h from now (±6h) so a daily cron catches each user once.
          const center = Date.now() + 24 * 3600_000
          const from = new Date(center - 6 * 3600_000).toISOString()
          const to = new Date(center + 6 * 3600_000).toISOString()

          const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, name, membership_status, membership_expires_at')
            .eq('membership_status', phase)
            .gte('membership_expires_at', from)
            .lte('membership_expires_at', to)

          if (error) {
            console.error(`trial-ending cron: profile query failed (${phase})`, error)
            continue
          }

          let sent = 0
          const profileList = profiles ?? []
          const { getEmailsForUserIds } = await import('@/lib/admin-emails.server')
          const emailMap = await getEmailsForUserIds(
            supabaseAdmin,
            profileList.map((p) => p.id),
          )
          for (const p of profileList) {
            const email = emailMap.get(p.id)
            if (!email || !p.membership_expires_at) continue
            const r = await sendForUser({
              userId: p.id,
              email,
              name: p.name,
              phase,
              expiresAt: p.membership_expires_at,
            })
            if ('sent' in r) sent++
          }
          results.push({ phase, processed: profileList.length, sent })
        }

        return Response.json({ ok: true, results })
      },
    },
  },
})
