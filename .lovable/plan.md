## Objectivo

Transformar o Hunie (TanStack Start PWA) numa app Android nativa via Capacitor, mantendo a versão web intacta. No fim ficas com um projeto que abre no Android Studio e gera AAB para a Play Store.

## Limitação importante do ambiente Lovable

O sandbox do Lovable **não tem Android SDK nem Android Studio**. Isso significa:

- Posso instalar Capacitor, criar `capacitor.config.ts`, scripts npm, plugins, código de bridge nativo, e preparar tudo no repo.
- **Não posso correr `npx cap add android` aqui** (precisa de Java + Android SDK). Tu vais correr esse comando **uma vez** localmente no teu Mac/PC depois de clonar o repo do GitHub. A partir daí a pasta `android/` fica versionada e qualquer sync funciona.
- Não posso gerar o AAB nem abrir Android Studio — esses passos são na tua máquina.

Vou deixar um `MOBILE.md` com o passo-a-passo exacto para correres localmente.

## O que vou fazer no repo

### 1. Dependências e config Capacitor
- `bun add @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/haptics @capacitor/push-notifications @capacitor/camera @capacitor/preferences`
- `capacitor.config.ts` na raiz:
  - `appId: "com.hunie.app"`, `appName: "Hunie"`
  - `webDir: "dist"` (output do build TanStack Start client)
  - `server.androidScheme: "https"`, `server.url` apontando para `https://hunie.app` (modo produção a servir o site real — mais simples porque a app é SSR/server functions; descrito abaixo)
  - StatusBar overlay, SplashScreen 1500ms, Keyboard `resize: "native"`

### 2. Estratégia web→nativo
A app usa **TanStack Start com server functions**, que precisa de servidor Node. Há duas abordagens:

**A. Hybrid remoto (recomendado, default):** o APK carrega `https://hunie.app` dentro do WebView Capacitor. Mantém auth, pagamentos, SSR, sem duplicar backend. Os plugins nativos (push FCM, câmera, haptics) funcionam normalmente via bridge.

**B. Fully bundled:** exigia portar tudo para SPA estática + chamar Supabase directamente. Trabalho enorme e regressão funcional. **Não recomendado.**

Vou implementar **A** com fallback: build script para variante "bundled web preview" caso queiras testar offline-ish.

### 3. Scripts npm
```json
"cap:sync": "cap sync android",
"cap:open": "cap open android",
"android": "cap sync android && cap open android",
"android:build": "cd android && ./gradlew bundleRelease"
```

### 4. Camada de bridge (`src/lib/native/`)
- `platform.ts` — `isNative()`, `getPlatform()`
- `haptics.ts` — substitui o stub actual em `src/hooks/useNativePlatform.ts` por chamadas reais ao `@capacitor/haptics` quando nativo, no-op no web
- `statusBar.ts` — edge-to-edge + cor dinâmica do tema escuro
- `keyboard.ts` — listeners para ajustar viewport no chat
- `push.ts` — registo FCM, envio do token para Supabase (`push_subscriptions` com novo campo `fcm_token` + `platform`)
- `camera.ts` — wrap de `Camera.getPhoto` que devolve File compatível com `usePhotoUpload`
- `deepLinks.ts` — listener `App.addListener('appUrlOpen')` → `router.navigate`
- `init.ts` — bootstrap único chamado em `__root.tsx`

### 5. Push notifications nativas
- Migration: adicionar colunas `fcm_token text`, `platform text` em `push_subscriptions` (opcionais, não quebra Web Push existente)
- Server function `registerFcmToken` (protegida) que faz upsert
- No bridge: pedir permissão, registar, enviar token
- O `send.server.ts` actual usa Web Push (VAPID). Para FCM vou adicionar um stub `sendFcmPush()` que precisa de `FCM_SERVER_KEY` — deixo TODO documentado porque exige criar projecto Firebase (passo manual teu).

### 6. UI / safe areas
- `styles.css`: já usas `env(safe-area-inset-*)`. Adicionar variantes para Android navigation bar (`env(safe-area-inset-bottom)` cobre).
- `AppShell.tsx`: confirmar padding bottom respeita gesture nav.
- Status bar transparente com conteúdo por baixo.

### 7. Documentação `MOBILE.md`
Passos locais que precisas correr **uma vez**:
1. Instalar Android Studio + JDK 17
2. `git pull` o repo com os ficheiros novos
3. `bun install`
4. `bun run build`
5. `npx cap add android` (cria a pasta `android/`)
6. `npx cap sync android`
7. Configurar `android/app/src/main/res/` com icon e splash (gerar com `@capacitor/assets`)
8. Em `AndroidManifest.xml`: permissões `INTERNET`, `CAMERA`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS`, `VIBRATE`
9. Firebase: criar projecto, baixar `google-services.json` → `android/app/`
10. Assinar release keystore
11. `./gradlew bundleRelease` → `.aab` em `android/app/build/outputs/bundle/release/`
12. Upload Play Console

### 8. Pagamentos
Mantém arquitectura actual (KambaPay / e-Mola / Multicaixa via webhooks). Nada muda — Play Store permite payment processors externos para apps de dating em mercados específicos, mas vais precisar declarar isso no Play Console. O sistema de entitlement já existe (`profiles.membership_*` + `activate_membership_debito` RPC); a app nativa só consulta o mesmo backend.

### 9. Deep links
- `capacitor.config.ts` + `AndroidManifest` intent filter para `https://hunie.app/*` e `hunie://`
- Bridge `deepLinks.ts` mapeia para rotas TanStack

### 10. Segurança
Nada de secrets no bundle Android. Tudo o que é sensível continua server-side (server functions / webhooks). `VITE_*` mantidas (publishable Supabase key é OK pública).

## O que **tu** tens de fazer depois

1. Clonar repo localmente, correr `npx cap add android` (one-time)
2. Criar projecto Firebase + descarregar `google-services.json`
3. Adicionar secret `FCM_SERVER_KEY` no Lovable Cloud (eu peço quando estiver na hora)
4. Gerar icons/splash com `npx @capacitor/assets generate`
5. Conta Google Play Console ($25)
6. Build + upload AAB

## Migrations DB

Uma migration: adicionar `fcm_token`, `platform` em `push_subscriptions` (nullable, idempotente).

## Ficheiros criados/alterados

**Novos:** `capacitor.config.ts`, `MOBILE.md`, `src/lib/native/{platform,haptics,statusBar,keyboard,push,camera,deepLinks,init}.ts`
**Alterados:** `package.json` (deps + scripts), `src/routes/__root.tsx` (init nativo), `src/hooks/useNativePlatform.ts` (real impl), `src/lib/haptics.ts` (delega para bridge), `src/hooks/usePhotoUpload.ts` (opção câmera nativa), `src/styles.css` (safe areas)

## Confirmas?

Avança e implemento tudo numa só passagem? Ou preferes começar só pelo Capacitor + config + bridge mínimo e fazer push/câmera num segundo turno?
