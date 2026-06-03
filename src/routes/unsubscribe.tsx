import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
})

type State =
  | { kind: 'loading' }
  | { kind: 'valid'; email: string }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const token =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('token') ?? ''
      : ''

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid' })
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) return setState({ kind: 'invalid' })
        if (data.used) return setState({ kind: 'already' })
        setState({ kind: 'valid', email: data.email ?? '' })
      })
      .catch(() => setState({ kind: 'invalid' }))
  }, [token])

  const confirm = async () => {
    setState({ kind: 'submitting' })
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!r.ok) throw new Error(await r.text())
      setState({ kind: 'success' })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Erro' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-primary mb-2">hunie</h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Cancelar subscrição
        </h2>

        {state.kind === 'loading' && (
          <p className="text-muted-foreground">A verificar…</p>
        )}
        {state.kind === 'invalid' && (
          <p className="text-muted-foreground">
            Este link é inválido ou já expirou.
          </p>
        )}
        {state.kind === 'already' && (
          <p className="text-muted-foreground">
            Já tinhas cancelado a subscrição. Não vais receber mais emails.
          </p>
        )}
        {state.kind === 'valid' && (
          <>
            <p className="text-muted-foreground mb-6">
              Confirma que queres parar de receber emails {state.email ? `em ${state.email}` : ''}.
            </p>
            <button
              onClick={confirm}
              className="w-full rounded-full bg-primary text-primary-foreground font-medium py-3 hover:bg-primary/90 transition"
            >
              Confirmar cancelamento
            </button>
          </>
        )}
        {state.kind === 'submitting' && (
          <p className="text-muted-foreground">A processar…</p>
        )}
        {state.kind === 'success' && (
          <p className="text-foreground">
            Pronto. Não vamos enviar mais emails para esta morada. 💕
          </p>
        )}
        {state.kind === 'error' && (
          <p className="text-destructive">Erro: {state.message}</p>
        )}
      </div>
    </div>
  )
}
