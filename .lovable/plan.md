# Auditoria do Onboarding Atual

## Estado atual

**O que existe:**
- `/auth` — formulário único com 3 modos (signin / signup / forgot) + Google OAuth. Visual genérico shadcn, sem brand.
- Tabela `profiles` com `name, age, city, country, bio, phone, is_verified` — mas após signup **nada** é coletado. Utilizador cai direto no `/` com perfil vazio.
- Não existe nenhum step de fotos, prompts, preferências, localização ou verificação.
- Não há tabela de `photos` nem bucket de storage para avatares.
- `user_settings` (discovery prefs) também fica nos defaults — nunca o user define género/idade que procura.

**Gaps críticos:**
1. Zero onboarding pós-signup → app inutilizável (sem fotos/nome o card de descoberta é vazio).
2. Sem captura de fotos → falta bucket + tabela `profile_photos`.
3. Sem preferências iniciais (orientação, género, distância) → discovery não funciona.
4. Auth screen não usa brand (gradiente flame/rose/grape), sem motion, sem hero.
5. Sem indicador de progresso, sem possibilidade de retomar onde parou.

---

# Plano: Onboarding Smooth & On-Brand

## 1. Redesign do `/auth` (welcome screen)
- Fundo com gradiente animado (`brand-pink → brand-purple → flame`) + blobs em motion suave.
- Logo "Hunie" grande + tagline.
- 2 CTAs principais: **Continuar com Google** (primário) e **Continuar com email**.
- Email expande inline (sem mudar de página) com transição spring.
- Toggle signin/signup discreto em baixo. "Esqueci password" como link minimal.
- Microcopy PT-PT, tom caloroso.

## 2. Fluxo `/onboarding` (multi-step, gated)

Layout único `_authenticated.onboarding.tsx` com:
- Barra de progresso top fina (gradiente brand).
- Header com voltar + skip (onde aplicável).
- Transições horizontais (slide+fade) com Framer Motion.
- Botão "Continuar" sticky no fundo, desabilitado até step válido.
- Estado persistido a cada step (escreve em `profiles` / `user_settings`) → pode sair e voltar.

**Steps:**
1. **Nome** — input grande, autofocus, validação min 2 chars.
2. **Data de nascimento** — date picker custom (rolas de dia/mês/ano), valida ≥18.
3. **Género** — chips selecionáveis (Mulher / Homem / Não-binário / Outro).
4. **Quem procuras** — multi-select chips + slider de idade (min/max).
5. **Localização** — botão "Usar localização" (usa `useGeolocation`) ou input manual cidade.
6. **Fotos** — grid 2x3, mínimo 2 fotos, drag-to-reorder, primeira = principal. Upload para bucket `profile-photos`.
7. **Bio + prompt** — textarea bio (opcional, 300 chars) + 1 prompt destacado da lista.
8. **Pronto** — animação confetti suave, CTA "Começar a explorar" → `/`.

## 3. Gate & redirect
- `_authenticated.tsx` verifica `profile.onboarding_completed`. Se `false` → redirect para `/onboarding` (exceto se já lá).
- Coluna nova `onboarding_completed boolean default false` em `profiles`, set `true` no último step.

## 4. Branding & motion
- Tokens já existentes: `--brand-pink`, `--brand-purple`, `--brand-magenta`, `--flame`, `--rose`, `--grape`.
- Componente `<OnboardingShell>` reutilizável com gradiente subtil de fundo.
- Motion: Framer Motion `AnimatePresence` com `mode="wait"`, transições 250ms spring.
- Haptic feel: scale 0.97 no tap dos chips, ripple no continue.

---

## Backend (uma migração)

```text
- ALTER profiles ADD onboarding_completed bool default false,
                 ADD birthdate date,
                 ADD gender text,
                 ADD interested_in text[];
- CREATE TABLE profile_photos (id, profile_id, url, position, created_at)
  + RLS owner-only + GRANTs.
- CREATE bucket "profile-photos" público + RLS por user folder.
```

## Ficheiros novos
- `src/routes/_authenticated.onboarding.tsx` (shell + state machine)
- `src/components/onboarding/` → `StepName`, `StepBirthdate`, `StepGender`, `StepInterests`, `StepLocation`, `StepPhotos`, `StepBio`, `StepDone`, `ProgressBar`, `OnboardingShell`
- `src/hooks/useOnboarding.ts` (state + persist por step)
- `src/hooks/usePhotoUpload.ts`

## Ficheiros editados
- `src/routes/auth.tsx` (redesign brand)
- `src/routes/_authenticated.tsx` (gate de redirect)
- migração SQL

---

## Confirma antes de implementar
- **OK avançar com os 8 steps** ou queres cortar/juntar algum (ex: juntar género+procura, remover prompt)?
- **Mínimo de fotos**: 2 (atual proposta) ou 1?
- **Skip permitido**: bio e prompt opcionais — concordas?
