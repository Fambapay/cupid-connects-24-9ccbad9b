# Push Notifications (Web Push) — Hunie

Vou implementar **Web Push** (browser/PWA, sem app nativa) com fallback por email para os 4 eventos: novo match, nova mensagem, alguém deu like, boost/promoções.

## Como vai funcionar (no fim)

1. Depois do onboarding, app pede permissão de notificações com um prompt suave ("Receber notificações de novos matches?").
2. Se aceita → guardamos a subscrição (endpoint + chaves) na BD.
3. Quando acontece um evento, o servidor envia push para todos os dispositivos do user.
4. Se não tem push ativo (ou falha) → envia email usando os templates já criados.

## O que vou criar

### 1. Base de dados (migration)
- `push_subscriptions` — endpoint, p256dh, auth keys, user_id, user_agent, created_at. RLS por user.
- `notification_preferences` — toggles por user para cada um dos 4 tipos (match/mensagem/like/boost) + master switch.
- Trigger no `matches` e `messages` que chama `pg_net` → endpoint público `/api/public/notify` (HMAC verificado) para disparar push assincronamente.

### 2. Secrets
- `VAPID_PUBLIC_KEY` (também em `VITE_` para o browser)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto:noreply@hunie.app)
- `PUSH_WEBHOOK_SECRET` (HMAC para o trigger PG → server)

Eu gero as chaves VAPID e adiciono via `add_secret` (não precisas fazer nada).

### 3. Service Worker
- `public/sw.js` — minimalista, **apenas** para receber `push` e `notificationclick`. Sem cache, sem offline.
- Registo guardado: **não regista em iframe nem em domínios `id-preview--*`/`lovableproject.com`** — assim não parte o preview do Lovable. Só funciona no published (hunie.app) e quando a PWA está instalada.

### 4. Cliente
- `src/lib/push/subscribe.ts` — pede permissão, subscreve, guarda na BD.
- `src/components/PushPermissionPrompt.tsx` — banner suave que aparece depois do onboarding, com opção "Mais tarde".
- Página `Definições → Notificações` para gerir os 4 toggles + desativar push.

### 5. Servidor
- `src/lib/push/send.server.ts` — envia Web Push usando uma implementação VAPID compatível com Cloudflare Workers (Web Crypto API, sem `web-push` Node).
- Server route `/api/public/notify` — recebe webhook do Postgres (HMAC), enfileira push + email fallback.
- Server fn `notifyUser({userId, kind, data})` para disparos internos (ex: boost/promo manual).

### 6. Templates de email novos
Já temos `new-match` e `notification`. Adiciono:
- `new-message` — "Tens uma nova mensagem"
- `new-like` — "Alguém te deu like 👀" (revela nome só se for premium)

## Limitações importantes

- **iOS**: só funciona se o user instalar a PWA no ecrã inicial (iOS 16.4+). Em Safari "normal" não há push.
- **Preview do Lovable**: não vais ver as notificações no editor — só no `hunie.app` published.
- **Boost/Promoções**: posso enviar mas requer cuidado para não parecer spam. Sugiro arrancar com max 1 push por semana neste canal.

## Detalhes técnicos

- Web Push usa o protocolo VAPID standard (RFC 8292). Não depende de Firebase/FCM, não precisa de conta Google.
- A biblioteca `web-push` (npm) é Node-only — vou usar uma implementação inline com Web Crypto API (compatível com Cloudflare Workers que correm os server fns do TanStack Start).
- O trigger PG usa a extensão `pg_net` (já está disponível em Lovable Cloud) para chamar o webhook sem bloquear a inserção.

## Ordem de execução

1. Migration (tabelas + trigger)
2. Gerar e adicionar VAPID secrets
3. Service worker + cliente subscribe
4. Server: VAPID sender + notify endpoint
5. UI: prompt + página de definições
6. Templates de email novos
7. Teste end-to-end (subscrever no hunie.app published → forçar evento → confirmar push + email)

Posso seguir?
