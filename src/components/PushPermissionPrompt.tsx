import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isPushSupported, subscribeToPush } from '@/lib/push/subscribe'

const STORAGE_KEY = 'hunie:push-prompt-dismissed-at'
const COOLDOWN_DAYS = 7

/**
 * Soft banner that appears for authenticated users who haven't enabled push yet.
 * Dismissible — won't reappear for COOLDOWN_DAYS.
 */
export function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    if (Notification.permission !== 'default') return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const ageMs = Date.now() - Number(dismissed)
      if (ageMs < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return
    }
    // Tiny delay so it doesn't pop in mid-render
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setVisible(false)
  }

  const enable = async () => {
    setBusy(true)
    const res = await subscribeToPush()
    setBusy(false)
    if (res.ok || res.reason === 'denied') dismiss()
    else setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border/60 bg-card p-4 shadow-2xl shadow-flame/10 sm:bottom-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-flame/10 p-2 text-flame">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Ativar notificações?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Recebe alertas instantâneos de novos matches e mensagens.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={enable} disabled={busy}>
              {busy ? 'A ativar…' : 'Ativar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Mais tarde
            </Button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
