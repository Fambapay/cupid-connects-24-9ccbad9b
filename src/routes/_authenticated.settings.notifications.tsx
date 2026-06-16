import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Bell, BellOff, Mail, Heart, MessageCircle, Sparkles, Megaphone } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useToast } from '@/hooks/use-toast'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  head: () => ({
    meta: [
      { title: 'Notificações — Hunie' },
      { name: 'description', content: 'Escolhe que notificações queres receber.' },
    ],
  }),
  component: NotificationsPage,
})

function NotificationsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    supported,
    permission,
    subscribed,
    prefs,
    loading,
    busy,
    enable,
    disable,
    updatePref,
  } = usePushNotifications()

  const handleEnable = async () => {
    const res = await enable()
    if (!res.ok) {
      toast({
        title: 'Não foi possível ativar',
        description:
          res.reason === 'denied'
            ? 'Tens de permitir notificações nas definições do browser.'
            : res.reason === 'unsupported'
            ? 'O teu browser não suporta notificações push.'
            : res.reason || 'Tenta de novo.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Notificações ativadas 🔔' })
    }
  }

  const handleDisable = async () => {
    await disable()
    toast({ title: 'Notificações desativadas' })
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background px-4 py-3">
        <button
          onClick={() => navigate({ to: '/settings' })}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Notificações</h1>
      </header>

      <main className="mx-auto max-w-xl space-y-8 px-4 py-6">
        {/* Push status */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-flame/10 p-2 text-flame">
              {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Push notifications</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {!supported
                  ? 'O teu browser não suporta push. Em iPhone, instala o Hunie no ecrã inicial primeiro.'
                  : subscribed
                  ? 'Recebes notificações neste dispositivo.'
                  : permission === 'denied'
                  ? 'Bloqueaste as notificações no browser. Ativa nas definições do browser para continuar.'
                  : 'Ativa para receberes alertas instantâneos de matches e mensagens.'}
              </p>
            </div>
          </div>
          {supported && (
            <div className="mt-4">
              {subscribed ? (
                <Button variant="outline" disabled={busy} onClick={handleDisable}>
                  Desativar neste dispositivo
                </Button>
              ) : (
                <Button disabled={busy || permission === 'denied'} onClick={handleEnable}>
                  {busy ? 'A ativar…' : 'Ativar push'}
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Per-event toggles */}
        <section>
          <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Avisa-me sobre
          </h3>
          <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
            <PrefRow
              icon={<Heart className="h-4 w-4" />}
              label="Novos matches"
              desc="Quando alguém dá match contigo"
              checked={prefs.notify_match}
              disabled={loading}
              onChange={(v) => updatePref('notify_match', v)}
            />
            <PrefRow
              icon={<MessageCircle className="h-4 w-4" />}
              label="Novas mensagens"
              desc="Quando recebes uma mensagem"
              checked={prefs.notify_message}
              disabled={loading}
              onChange={(v) => updatePref('notify_message', v)}
            />
            <PrefRow
              icon={<Sparkles className="h-4 w-4" />}
              label="Likes recebidos"
              desc="Quando alguém te dá like"
              checked={prefs.notify_like}
              disabled={loading}
              onChange={(v) => updatePref('notify_like', v)}
            />
            <PrefRow
              icon={<Megaphone className="h-4 w-4" />}
              label="Novidades & promoções"
              desc="Boosts, descontos e novas funcionalidades"
              checked={prefs.notify_promo}
              disabled={loading}
              onChange={(v) => updatePref('notify_promo', v)}
            />
          </div>
        </section>

        {/* Channels */}
        <section>
          <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Canais
          </h3>
          <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
            <PrefRow
              icon={<Bell className="h-4 w-4" />}
              label="Notificações push"
              desc="No telemóvel ou browser"
              checked={prefs.push_enabled}
              disabled={loading}
              onChange={(v) => updatePref('push_enabled', v)}
            />
            <PrefRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              desc="Quando não estás online"
              checked={prefs.email_enabled}
              disabled={loading}
              onChange={(v) => updatePref('email_enabled', v)}
            />
          </div>
          <p className="mt-3 px-1 text-xs text-muted-foreground">
            Se desativares push, enviamos por email. Se desativares ambos, não recebes nada.
          </p>
        </section>
      </main>
    </div>
  )
}

function PrefRow({
  icon,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-3.5">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  )
}
