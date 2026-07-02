// Win-back push cron. Runs 1x/dia. Envia push aos users com membership
// expirada/cancelada há exatamente 7 ou 14 dias, no máximo 1 vez por marco
// (idempotente via `winback_pushes.unique(user_id, slug)`).
import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendWebPush } from '@/lib/push/send.server'

const MILESTONES = [
  { days: 7,  slug: 'winback_day_7',  title: 'Voltas? 💔', body: 'A tua Elite espera-te. Reativa em 2 toques.' },
  { days: 14, slug: 'winback_day_14', title: 'Última chance 🎁', body: '30% off no primeiro mês — só nesta semana.' },
] as const

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a); const bb = Buffer.from(b)
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

async function pushToUser(userId: string, title: string, body: string, url: string) {
  // Respeita preferências (push + promo opt-in)
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('push_enabled, notify_promo')
    .eq('user_id', userId)
    .maybeSingle()
  if (prefs && (prefs.push_enabled === false || prefs.notify_promo === false)) return 0

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, client_id, device_key, user_agent')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false })
  if (!subs?.length) return 0

  const seen = new Set<string>()
  let sent = 0
  for (const sub of subs) {
    if (!sub.p256dh || !sub.auth) continue
    const key =
      sub.device_key || sub.client_id ||
      (sub.endpoint.startsWith('https://web.push.apple.com/')
        ? `legacy-apple:${sub.user_agent || 'unknown'}`
        : sub.endpoint)
    if (seen.has(key)) continue
    seen.add(key)
    const res = await sendWebPush(
      { id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { title, body, url, tag: 'winback' },
    )
    if (res.expired) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
    } else if (res.ok) {
      sent++
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id)
    }
  }
  return sent
}

export const Route = createFileRoute('/api/public/winback-cron')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response('Unauthorized', { status: 401 })

        const results: { slug: string; candidates: number; pushed: number }[] = []

        for (const m of MILESTONES) {
          const { data: rows, error } = await supabaseAdmin.rpc('winback_candidates', {
            _slug: m.slug,
            _days: m.days,
          })
          if (error) {
            console.error('[winback-cron] winback_candidates failed', m.slug, error)
            continue
          }
          const list = (rows ?? []) as { user_id: string }[]
          let pushed = 0
          for (const r of list) {
            const url = `/membership?required=1&offer=${encodeURIComponent(m.slug)}`
            const n = await pushToUser(r.user_id, m.title, m.body, url)
            if (n > 0) {
              // Regista como enviado (1x por marco). O RPC devolve false se já existia.
              await supabaseAdmin.rpc('mark_winback_sent', { _user_id: r.user_id, _slug: m.slug })
              pushed++
            }
          }
          results.push({ slug: m.slug, candidates: list.length, pushed })
        }

        return new Response(JSON.stringify({ ok: true, results }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  },
})
