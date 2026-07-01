import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendWebPush, type PushPayload } from './send.server'

type NotifyKind = 'new_match' | 'new_message' | 'new_like' | 'promo'

interface NotifyContext {
  // For new_match
  match_id?: string
  user_a?: string
  user_b?: string
  // For new_message
  message_id?: string
  sender_id?: string
  preview?: string
  // For new_like
  swipe_id?: string
  swiper_id?: string
  swiped_id?: string
  is_super?: boolean
  // For promo
  title?: string
  body?: string
  url?: string
}

/**
 * Resolves which user(s) should be notified for a given event and sends push +
 * (when push fails or is disabled) an email fallback.
 */
export async function dispatchNotification(kind: NotifyKind, ctx: NotifyContext) {
  const recipients = await resolveRecipients(kind, ctx)
  for (const r of recipients) {
    await notifyOne(kind, r, ctx)
  }
}

interface Recipient {
  user_id: string
  email: string
  name: string | null
  prefs: {
    push_enabled: boolean
    email_enabled: boolean
    notify_match: boolean
    notify_message: boolean
    notify_like: boolean
    notify_promo: boolean
  }
  other?: { id: string; name: string | null; membership_tier: string }
}

async function resolveRecipients(kind: NotifyKind, ctx: NotifyContext): Promise<Recipient[]> {
  const ids: string[] = []
  if (kind === 'new_match' && ctx.user_a && ctx.user_b) ids.push(ctx.user_a, ctx.user_b)
  if (kind === 'new_message' && ctx.match_id && ctx.sender_id) {
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('user_a, user_b')
      .eq('id', ctx.match_id)
      .maybeSingle()
    if (match) {
      const other = match.user_a === ctx.sender_id ? match.user_b : match.user_a
      ids.push(other)
    }
  }
  if (kind === 'new_like' && ctx.swiped_id) ids.push(ctx.swiped_id)
  if (kind === 'promo' && ctx.user_a) ids.push(ctx.user_a)

  if (ids.length === 0) return []

  // Fetch profiles + prefs + auth emails
  const [{ data: profiles }, { data: prefs }, { data: authUsers }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, name, membership_tier').in('id', ids),
    supabaseAdmin.from('notification_preferences').select('*').in('user_id', ids),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap = new Map<string, string>()
  for (const u of authUsers?.users || []) if (u.email) emailMap.set(u.id, u.email)

  const prefMap = new Map((prefs || []).map((p) => [p.user_id, p]))
  const profMap = new Map((profiles || []).map((p) => [p.id, p]))

  const out: Recipient[] = []
  for (const id of ids) {
    const email = emailMap.get(id)
    if (!email) continue
    const prof = profMap.get(id)
    const pref = prefMap.get(id) || {
      push_enabled: true,
      email_enabled: true,
      notify_match: true,
      notify_message: true,
      notify_like: true,
      notify_promo: true,
    }

    // For match/message, look up the "other" user for personalization
    let other: Recipient['other']
    if (kind === 'new_match') {
      const otherId = id === ctx.user_a ? ctx.user_b : ctx.user_a
      const op = profMap.get(otherId!)
      if (op) other = { id: op.id, name: op.name, membership_tier: op.membership_tier }
    } else if (kind === 'new_message' && ctx.sender_id) {
      const op = profMap.get(ctx.sender_id) || (await fetchProfile(ctx.sender_id))
      if (op) other = { id: op.id, name: op.name, membership_tier: op.membership_tier }
    } else if (kind === 'new_like' && ctx.swiper_id) {
      const op = profMap.get(ctx.swiper_id) || (await fetchProfile(ctx.swiper_id))
      if (op) other = { id: op.id, name: op.name, membership_tier: op.membership_tier }
    }

    out.push({ user_id: id, email, name: prof?.name || null, prefs: pref as Recipient['prefs'], other })
  }
  return out
}

async function fetchProfile(id: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, name, membership_tier')
    .eq('id', id)
    .maybeSingle()
  return data
}

function kindEnabled(kind: NotifyKind, prefs: Recipient['prefs']): boolean {
  if (kind === 'new_match') return prefs.notify_match
  if (kind === 'new_message') return prefs.notify_message
  if (kind === 'new_like') return prefs.notify_like
  if (kind === 'promo') return prefs.notify_promo
  return true
}

function buildPushContent(kind: NotifyKind, r: Recipient, ctx: NotifyContext): PushPayload | null {
  const otherName = r.other?.name || 'alguém'
  if (kind === 'new_match') {
    return {
      title: 'Novo match no Hunie 💘',
      body: `Tu e ${otherName} deram like um no outro. Manda já uma mensagem!`,
      url: '/matches',
      tag: `match-${ctx.match_id || ''}`,
    }
  }
  if (kind === 'new_message') {
    return {
      title: `Mensagem de ${otherName}`,
      body: ctx.preview || 'Tens uma nova mensagem',
      url: `/chat/${ctx.match_id || ''}`,
      tag: `message-${ctx.match_id || ''}`,
    }
  }
  if (kind === 'new_like') {
    const isPremium = r.other?.membership_tier && r.other.membership_tier !== 'free'
    const reveal = isPremium ? otherName : 'alguém'
    return {
      title: ctx.is_super ? 'Recebeste um Super Like ⭐' : 'Alguém te deu like 👀',
      body: `${reveal} mostrou interesse no teu perfil.`,
      url: '/discover',
      tag: `like-${ctx.swipe_id || ''}`,
    }
  }
  if (kind === 'promo') {
    return {
      title: ctx.title || 'Hunie',
      body: ctx.body || '',
      url: ctx.url || '/shop',
    }
  }
  return null
}

async function notifyOne(kind: NotifyKind, r: Recipient, ctx: NotifyContext) {
  if (!kindEnabled(kind, r.prefs)) return

  const payload = buildPushContent(kind, r, ctx)
  if (!payload) return

  const eventKey = deliveryEventKey(kind, r.user_id, ctx)
  const reserved = await reserveDelivery(eventKey, kind, r.user_id, ctx, payload)
  if (!reserved) return

  let pushSucceeded = false

  if (r.prefs.push_enabled) {
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, client_id, device_key, user_agent, last_used_at')
      .eq('user_id', r.user_id)
      .order('last_used_at', { ascending: false })

    for (const sub of uniqueWebSubscriptions(subs || [])) {
      if (!sub.p256dh || !sub.auth) continue // native FCM subs handled elsewhere
      const webSub = { id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }
      const res = await sendWebPush(webSub, payload)
      if (res.ok) pushSucceeded = true
      if (res.expired) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      } else if (res.ok) {
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
      } else {
        console.warn('push failed', { user: r.user_id, status: res.status, err: res.error })
      }
    }
  }

  // Email fallback when push didn't reach the user
  if (!pushSucceeded && r.prefs.email_enabled) {
    await enqueueFallbackEmail(kind, r, ctx)
    await markDelivery(eventKey, 'emailed')
    return
  }

  await markDelivery(eventKey, pushSucceeded ? 'sent' : 'skipped')
}

function deliveryEventKey(kind: NotifyKind, userId: string, ctx: NotifyContext): string {
  const eventId =
    kind === 'new_message' ? ctx.message_id
    : kind === 'new_match' ? ctx.match_id
    : kind === 'new_like' ? ctx.swipe_id
    : ctx.url || `${ctx.title || 'promo'}:${ctx.body || ''}`

  return `${kind}:${userId}:${eventId || crypto.randomUUID()}`
}

async function reserveDelivery(
  eventKey: string,
  kind: NotifyKind,
  userId: string,
  ctx: NotifyContext,
  payload: PushPayload,
): Promise<boolean> {
  const eventId =
    kind === 'new_message' ? ctx.message_id
    : kind === 'new_match' ? ctx.match_id
    : kind === 'new_like' ? ctx.swipe_id
    : ctx.url || null

  const { error } = await supabaseAdmin.from('notification_deliveries').insert({
    event_key: eventKey,
    user_id: userId,
    kind,
    event_id: eventId,
    status: 'reserved',
    payload: { ctx, push: payload },
  })

  // 23505 = unique violation. It means this exact notification event was
  // already accepted, so do not send another push/email for it.
  if (!error) return true
  if (error.code === '23505') return false
  console.warn('notification delivery reservation failed', { eventKey, err: error.message })
  return true
}

async function markDelivery(eventKey: string, status: 'sent' | 'emailed' | 'skipped' | 'failed') {
  await supabaseAdmin
    .from('notification_deliveries')
    .update({ status, delivered_at: status === 'skipped' ? null : new Date().toISOString() })
    .eq('event_key', eventKey)
}

type PushSubRow = {
  id: string
  endpoint: string
  p256dh: string | null
  auth: string | null
  client_id?: string | null
  device_key?: string | null
  user_agent?: string | null
  last_used_at?: string | null
}

function uniqueWebSubscriptions(subs: PushSubRow[]): PushSubRow[] {
  const seen = new Set<string>()
  const out: PushSubRow[] = []

  for (const sub of subs) {
    if (!sub.p256dh || !sub.auth) continue
    const key =
      sub.device_key
      || sub.client_id
      || (sub.endpoint.startsWith('https://web.push.apple.com/')
        ? `legacy-apple:${sub.user_agent || 'unknown'}`
        : sub.endpoint)

    if (seen.has(key)) continue
    seen.add(key)
    out.push(sub)
  }

  return out
}

async function enqueueFallbackEmail(kind: NotifyKind, r: Recipient, ctx: NotifyContext) {
  const tplMap: Record<NotifyKind, { template: string; data: Record<string, any> } | null> = {
    new_match: {
      template: 'new-match',
      data: { name: r.name || '', matchName: r.other?.name || '' },
    },
    new_message: {
      template: 'new-message',
      data: { name: r.name || '', senderName: r.other?.name || '', preview: ctx.preview || '', matchId: ctx.match_id },
    },
    new_like: {
      template: 'new-like',
      data: {
        name: r.name || '',
        isPremium: r.other?.membership_tier && r.other.membership_tier !== 'free',
        likerName: r.other?.name || '',
        isSuper: !!ctx.is_super,
      },
    },
    promo: {
      template: 'notification',
      data: { name: r.name || '', subject: ctx.title, body: ctx.body, ctaUrl: ctx.url, ctaLabel: 'Ver' },
    },
  }
  const tpl = tplMap[kind]
  if (!tpl) return

  try {
    await callTransactionalSend(tpl.template, r.email, tpl.data, `notify-${kind}-${r.user_id}-${Date.now()}`)
  } catch (e) {
    console.warn('email fallback failed', e)
  }
}

async function callTransactionalSend(
  templateName: string,
  recipientEmail: string,
  templateData: Record<string, any>,
  idempotencyKey: string
) {
  // Render and enqueue directly using the same logic the transactional route uses,
  // bypassing the auth check (we're trusted server-side here).
  const React = await import('react')
  const { render } = await import('@react-email/components')
  const { TEMPLATES } = await import('@/lib/email-templates/registry')

  const tpl = TEMPLATES[templateName]
  if (!tpl) throw new Error(`Unknown template ${templateName}`)

  const element = React.createElement(tpl.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', recipientEmail.toLowerCase())
    .maybeSingle()
  if (suppressed) return

  // Unsubscribe token
  const { data: tokenRow } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', recipientEmail.toLowerCase())
    .maybeSingle()
  let unsubscribeToken = tokenRow?.token
  if (!unsubscribeToken) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    unsubscribeToken = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert({ token: unsubscribeToken, email: recipientEmail.toLowerCase() }, { onConflict: 'email', ignoreDuplicates: true })
  }

  const messageId = crypto.randomUUID()
  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientEmail,
    status: 'pending',
  })

  await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: 'Hunie <noreply@hunie.app>',
      sender_domain: 'hunie.app',
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
}
