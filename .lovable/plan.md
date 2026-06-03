# Seed Profiles — 80 perfis fantasma no Discover

Objetivo: encher o feed de Discover com 80 perfis moçambicanos credíveis. Aparecem como reais, mas nunca dão match nem mensagens. Painel admin para gerir.

## 1. Schema (migration)

Adicionar à tabela `profiles`:
- `is_seed boolean NOT NULL DEFAULT false`
- `seed_active boolean NOT NULL DEFAULT true`

Adicionar tabela `app_config` (key/value, admin-only) para guardar:
- `seeds_auto_disable_threshold` = `500`
- `seeds_auto_disabled_at` (timestamp quando dispara)

**RLS profiles** (atualizar `profiles_select_others`): só mostra seeds se `seed_active = true`. Seeds nunca aparecem para outros seeds (irrelevante — não fazem queries).

**Bloquear matches com seeds** — atualizar `create_match_on_reciprocal_like`: se `swiped_id` ou `swiper_id` for seed, `RETURN NEW` sem criar match. Garante que mesmo que o swipe seja gravado, nunca há match.

**Auto-desativação** — função `check_seeds_auto_disable()`:
- Conta `profiles WHERE is_seed = false AND onboarding_completed = true`.
- Se ≥ threshold e `seeds_auto_disabled_at` é null → `UPDATE profiles SET seed_active = false WHERE is_seed = true` + marca timestamp + insere audit_log.
- Trigger `AFTER INSERT ON profiles` (quando real user completa onboarding) chama a função.

## 2. Discover query (`src/hooks/useDiscovery.ts`)

A RLS já filtra seeds inativos. Adicionar:
- Reais primeiro: `.order('is_seed', { ascending: true })`. Seeds preenchem o fundo.
- Seeds não aparecem em `useMatches`, `useLikedMe`, `useMessages` — já são filtrados pela ausência de matches/messages (não conseguem criar nenhum).

## 3. Swipe logic

- `swipe()` continua a inserir na tabela `swipes` (telemetria mantida, rewind funciona).
- O trigger SQL atualizado já garante que match nunca é criado.
- No frontend (`discover.tsx`) — nada muda. `result.matched` virá sempre `false` para seeds, MatchOverlay não abre.
- Mensagens: impossível porque não há match. Sem trabalho extra.

## 4. Reports em seeds

Atualizar `reports_insert_own` flow: quando um report é inserido contra um seed, trigger `auto_resolve_seed_reports`:
- Marca report `status = 'auto_resolved'`.
- `UPDATE profiles SET seed_active = false WHERE id = reported_id AND is_seed = true`.

## 5. Seed data — geração

**Onde:** `scripts/seed-profiles.ts` (Node script standalone, usa service role key via env).

**Idempotência:** chave natural = `(name, city, is_seed=true)`. Antes de inserir, query `.select('id').eq('name', n).eq('city', c).eq('is_seed', true)` — skip se existe.

**Distribuição:**
- 40 mulheres (18–32), 30 homens (20–35), 10 não-binário (19–30)
- Cidades: 30 Maputo, 20 Beira, 15 Nampula, 8 Quelimane, 7 Tete

**Para cada perfil:**
- `name`: lista moçambicana fornecida (sem repetir dentro da mesma cidade quando possível)
- `birthdate` calculado a partir da idade
- `bio`: pool de 30+ templates naturais com pequenas variações (atividades, comida local — matapa, xima, Polana, Costa do Sol, Inhambane, etc.)
- `interests`: 2–4 da pool
- `is_verified: true` (como pediste — perfis verificados)
- `last_active_at`: random entre 1h e 3 dias atrás
- `latitude/longitude`: coords da cidade ±0.05° de jitter
- `onboarding_completed: true`, `is_paused: false`, `membership_tier: 'free'`
- `is_seed: true`, `seed_active: true`

**Fotos (3 por perfil):**
Estratégia mix para naturalidade:
- Foto 1 (rosto): `https://randomuser.me/api/portraits/{women|men}/{N}.jpg` — IDs reservados por género para não duplicar
- Para não-binário: alterna entre `women` e `men`
- Fotos 2–3: Unsplash curated collections por interesse/cidade (ex: `https://images.unsplash.com/photo-...`) — usar um pool fixo de ~60 URLs categorizadas (lifestyle, praia, cidade, comida) escolhidas à mão para parecerem aut. africanas/lusófonas quando possível

As fotos NÃO vão para storage — guardadas como URLs externas. Adaptar `signPhotos`/loader para passar URLs http(s) directas sem tentar assinar via Supabase Storage. Detectar por prefixo `http`.

## 6. Painel admin — `src/routes/admin.seeds.tsx`

Nova tab no admin (`admin.tsx` nav). Conteúdo:

**Header stats:**
- "X / 80 seeds ativos"
- "Y likes recebidos esta semana (descartados)" — `COUNT(swipes WHERE swiped_id IN (seeds) AND direction IN ('like','super') AND created_at > now()-7d)`
- "Threshold auto-desativação: 500 utilizadores reais (atual: Z)"

**Controles:**
- Botão "Desativar todos" / "Ativar todos"
- Input numérico para alterar threshold

**Tabela:**
- Colunas: foto, nome, idade, cidade, género, último ativo, `seed_active` (switch)
- Filtros: cidade (select), género (select), search por nome
- Paginação 20/página

**Server fns** em `src/lib/seeds.functions.ts` (todas com `requireSupabaseAuth` + check `is_admin`):
- `listSeeds({ city, gender, search, page })`
- `toggleSeed({ id, active })`
- `toggleAllSeeds({ active })`
- `getSeedStats()`
- `setAutoDisableThreshold({ value })`

## 7. Ficheiros tocados

```
supabase/migrations/<ts>_seed_profiles.sql      (schema + triggers + app_config)
scripts/seed-profiles.ts                        (gerador idempotente)
scripts/seed-data/names.ts                      (listas de nomes)
scripts/seed-data/bios.ts                       (pool de bios)
scripts/seed-data/photos.ts                     (pool URLs)
src/hooks/useDiscovery.ts                       (order is_seed asc)
src/lib/photos.ts                               (passthrough URLs externas)
src/lib/seeds.functions.ts                      (admin server fns)
src/routes/admin.seeds.tsx                      (UI painel)
src/routes/admin.tsx                            (adicionar tab "Seeds")
```

## 8. Ordem de execução

1. Migration (schema + triggers + app_config) — espera aprovação
2. Após approval: gerar dados (`scripts/seed-data/*`) + script + correr inserção
3. Ajustar `useDiscovery` + `photos.ts` (passthrough URL externo)
4. Server fns + página admin + tab
5. Verificar: abrir `/discover` (deve aparecer mix), `/admin/seeds` (tabela + stats)

## Notas técnicas

- Service role key necessária para o script — já existe (`SUPABASE_SERVICE_ROLE_KEY`). Script lê de `process.env` directamente, corre via `bun run scripts/seed-profiles.ts`.
- Seeds não têm `auth.users` correspondente. IDs são uuids gerados; FK não existe na tabela `profiles` (id é PK sem FK para auth). Confirmado pelo schema atual.
- `is_verified: true` faz seeds passarem o filtro "Apenas verificados" — alinhado com pedido.
- Likes em seeds: o swipe **é** gravado (telemetria/rewind) mas o trigger atualizado nunca cria match. Frontend não precisa de mudança.
