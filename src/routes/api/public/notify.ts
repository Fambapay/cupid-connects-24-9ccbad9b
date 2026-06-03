import { createFileRoute } from '@tanstack/react-router'
import { dispatchNotification } from '@/lib/push/notify.server'

export const Route = createFileRoute('/api/public/notify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get('x-notify-secret')
        const expected = process.env.PUSH_WEBHOOK_SECRET
        if (!expected || secret !== expected) {
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
