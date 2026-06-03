import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/vapid-key')({
  server: {
    handlers: {
      GET: async () => {
        const publicKey = process.env.VAPID_PUBLIC_KEY || ''
        if (!publicKey) {
          return Response.json({ error: 'VAPID public key not configured' }, { status: 500 })
        }

        return Response.json({ publicKey })
      },
    },
  },
})