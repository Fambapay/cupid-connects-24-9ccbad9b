import { createFileRoute } from '@tanstack/react-router'
import { dispatchNotification } from '@/lib/push/notify.server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/notify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get('x-notify-secret') || ''
        const envSecret = process.env.PUSH_WEBHOOK_SECRET || ''
        let ok = !!envSecret && secret === envSecret
        if (!ok) {
          // Fallback: compare against app_config (kept in sync by DB triggers)
          const { data } = await supabaseAdmin
            .from('app_config')
            .select('value')
            .eq('key', 'notify_webhook_secret')
            .maybeSingle()
          const cfgSecret = (data?.value as string | null)?.toString().replace(/^"|"$/g, '') || ''
          ok = !!cfgSecret && secret === cfgSecret
        }
        if (!ok) {
          return new Response('Unauthorized', { status: 401 })
        }

        let body: any
        try {
          body = await request.json()
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }

        const kind = body?.kind
        const data = body?.data || {}
        if (!['new_match', 'new_message', 'new_like', 'promo'].includes(kind)) {
          return new Response('Unknown kind', { status: 400 })
        }

        // Fire and forget — but await so logs surface errors
        try {
          await dispatchNotification(kind, data)
        } catch (e) {
          console.error('notify dispatch failed', e)
          return Response.json({ ok: false, error: String(e) }, { status: 500 })
        }

        return Response.json({ ok: true })
      },
    },
  },
})
