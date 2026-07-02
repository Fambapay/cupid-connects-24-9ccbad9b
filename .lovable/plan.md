
# Sistema de Ofertas & Conversão do Trial

Adaptado ao Hunie existente: `profiles.membership_tier/status/expires_at`, `has_premium_access`, `useSubscription`, planos `free/select/plus/elite`. Sem tabela `subscriptions` nova — trial já vem de `membership_status='trialing'` no `handle_new_user`.

## Nota sobre o prompt vs. realidade do código

- Não crio `subscriptions`, `payment_history`, `get_access_level`, `confirm_payment`, `mark_referral_onboarding_complete` — todos já existem sob outros nomes (`profiles`, `payment_transactions`+`debito_payments`+`get_my_payment_history`, `has_premium_access`).
- O "Premium" das ofertas mapeia para `tier='plus'` (plano intermédio, com "ver quem te deu like"). Trimestral (`quarterly_499`) mapeia para `plus` com 3 meses.
- Moeda: `MZN` como campo próprio na tabela `offers` (não mexo em `pricing.ts` EUR). O checkout Débito já lida com MZN.
- "Locked" = `membership_status IN ('expired','inactive','cancelled')` OU `membership_tier='free'` (não é premium e não está em trial/grace).

## Fase 1 — Migração SQL (uma migração única)

**Tabelas novas** (com GRANTs + RLS + policies em ordem correta):
- `offers` (catálogo, `slug`, `trigger` enum, `first_period_price_minor`, `regular_price_minor`, `currency='MZN'`, `plan_tier`, `period_months`, `is_discount`, `priority`, `active`)
- `offer_redemptions` (UNIQUE `user_id` — 1 desconto por conta; FK opcional a `debito_payments`/`payment_transactions` via `payment_ref jsonb`)
- `popup_impressions` (`user_id`, `offer_id`, `shown_at`, `action`)
- `winback_pushes` (`user_id`, `slug`, `sent_at`, UNIQUE `(user_id, slug)`)

**Enum** `offer_trigger`: `trial_day_2 | trial_last_24h | post_first_match | likes_received | winback_day_7 | winback_day_14 | always_on`.

**RPCs SECURITY DEFINER**:
- `get_eligible_offer(_trigger)` — deriva `trial_day` de `profiles.created_at`; bloqueia se já resgatou; bloqueia se `has_premium_access(auth.uid())`; frequency cap 2/dia; 2 dismissals silenciam a oferta; devolve 1 linha da `offers` ativa.
- `redeem_offer(_offer_id)` — valida activo + não-resgatado; INSERT em `offer_redemptions` (unique_violation → `already_redeemed`); devolve `{plan_tier, amount_minor, currency, period_months}` para o checkout Débito.
- `release_offer_redemption(_user_id, _slug)` — service_role, chamada quando pagamento falha/expira (para reciclar o desconto).
- `log_popup_impression(_offer_id, _action)` — insere linha.
- `mark_winback_sent(_user_id, _slug)` — service_role, idempotente.

**Alteração RLS em `messages`** (crítica): substituir `messages_select_member` por:
- Membros com premium access → veem `content` normal.
- Membros locked → policy separada + **view `messages_safe`** com `WITH (security_invoker=on)` que devolve `content=NULL, has_content=true` quando o requerente é locked e a mensagem chegou depois de `locked_at` (usar `created_at > profiles.updated_at` quando status virou `expired`). Cliente passa a ler sempre `messages_safe` no chat.
- Alternativa mais segura (a que vou implementar): manter policy única mas fazer o `select` do chat via RPC `get_match_messages(_match_id)` que devolve JSON mascarado. Menos disruptivo do que mexer numa view + policy `USING(false)` na base.

**Analytics view** `offer_funnel` (só admins via `is_admin`).

**Seed** das 7 ofertas em MZN (149/99/499 conforme prompt), mas usando `plan_tier='plus'` e amounts em minor units (14900/9900/49900) — coerente com o resto do sistema.

## Fase 2 — Backend TSS

- Novo `src/lib/offers.functions.ts`: `getEligibleOffer(trigger)`, `redeemOffer(offerId)`, `logImpression(offerId, action)` — todos `createServerFn` + `requireSupabaseAuth`.
- `src/lib/offers/triggers.ts` (client-safe helpers de decisão).
- Extender `debito.functions.ts` para aceitar `{ offer_id }`; ao iniciar o pagamento chama `redeem_offer` para trancar preço e guardar `offer_id` em `debito_payments.metadata`. Ao completar, `winback_pushes`/`offer_redemptions.payment_ref` atualizados. Ao falhar/expirar (cron reconciliação já existente) → `release_offer_redemption`.
- Nova rota cron `src/routes/api/public/winback-cron.ts` (chamada 1x/dia por pg_cron novo): para cada user com `membership_status IN ('expired','cancelled')` calcula dias desde a última mudança de status; envia FCM dia 7 e dia 14 via `push/send.server.ts` já existente; grava `winback_pushes`. Deep link `hunie://offer/<slug>` (o `deepLinks.ts` faz push do path — vou aceitar `/discover?offer=<slug>`).

## Fase 3 — Frontend UI

- `src/hooks/useOfferEngine.ts` — hook central; consome `useSubscription`, `useProfile`; expõe `activeOffer`, `showOfferSheet(trigger)`, `dismissOffer`, `claimOffer`; fila de gatilhos com `enqueueTrigger`; guardas: nunca durante swipe (event flag global `window.__hunieSwipeActive`), teclado aberto (via Capacitor Keyboard existente), rota `/chat/$matchId` (via `useMatch`). Auto-dispara `trial_day_2` no mount do `/discover` e `trial_last_24h` quando faltam <24h.
- `src/components/offers/OfferSheet.tsx` — bottom sheet Liquid Glass; preço destacado + riscado; 3 bullets; CTA `#FF4458` full-width; rodapé legal. Suporta variante `trial_last_24h` com countdown ao vivo interno.
- `src/components/offers/TrialCountdownBanner.tsx` — banner topo overlay no `/discover`; atualiza por minuto; abre `OfferSheet` on tap.
- Integração `/discover`: `<TrialCountdownBanner />` + engine.
- Match: no `MatchOverlay.onClose` chama `engine.enqueueTrigger('post_first_match')`.
- Likes: em `useLikedMe`/`useLikesCount`, quando `count >= 3` dispara `likes_received` (1x/dia por user, guardado em `localStorage`).
- Locked blur:
  - Chat list: mensagens novas com `content=null` → render "A {nome} respondeu-te — subscreve para ler" + tap → `/membership?required=1`.
  - Likes screen: fotos com `blur-xl` já existente para users free; contador real.
  - Chat aberto sem premium → banner fixo com CTA.
- `/membership`: adicionar card `always_on` trimestral em destaque + card da oferta ativa (se houver) no topo. VIP como "Brevemente".

## Fase 4 — Copy pt-MZ

Ficheiro `src/lib/offers/copy.ts` com todos os textos exatos do prompt.

## Fase 5 — Analytics & Verificação

- View `offer_funnel` visível em `/admin` (nova tab pequena).
- Build passa, `bun run build`, smoke test manual dos 3 gatilhos principais.

## Critérios de aceitação (validados no fim)

Todos os 11 pontos do prompt, com foco em:
- Corpo das mensagens não chega ao cliente para users locked (verificar Network).
- Pagamento com desconto: `amount=first_period_price`; `next_renewal_amount=regular_price`.
- Frequency cap testado com impressões manuais.
- Um utilizador que resgatou nunca mais vê pop-up de desconto.

## Fora de âmbito nesta iteração

- Configuração dos SKUs no Google Play Console (só deixo TODO comentado em `google-play.server.ts` e mapeamento offer→`introductory_offer_id`).
- Alterar `pricing.ts` EUR (as ofertas MZN vivem em `offers`; o resto do app EUR continua igual).
- VIP tier real — só card "Brevemente".

## Tamanho estimado

~1 migração grande (300–400 linhas SQL), ~8 ficheiros novos, ~6 edits. Vou pedir a migração primeiro (aprovação tua), e enquanto ela corre escrevo os ficheiros TS/React que não dependem dos tipos regenerados. Depois faço um edit final que usa `Database` types atualizados.
