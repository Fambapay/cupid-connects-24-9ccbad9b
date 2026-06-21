# Hunie — Build Mobile (Capacitor: Android + iOS)

Este projeto está preparado para gerar uma app Android nativa via Capacitor,
mantendo a versão web intacta. O sandbox da Lovable **não tem Android SDK**,
por isso os passos finais (criar pasta `android/`, abrir Android Studio,
gerar AAB) são feitos na tua máquina local.

## Pré-requisitos (uma vez)

1. **Android Studio** + **JDK 17**
2. Android SDK Platform 34+, Build-Tools 34+
3. Node 20+ e Bun (ou npm)
4. Clonar o repo do GitHub

## Setup inicial (uma única vez)

```bash
bun install
bun run build          # gera dist/ (não estritamente necessário no modo remoto)
npx cap add android    # cria a pasta android/ — versionar no git depois
```

A partir daqui a pasta `android/` deve ficar comitada.

## Ciclo de desenvolvimento

```bash
bun run cap:sync       # sincroniza assets/config para android/
bun run android        # abre Android Studio
```

Dentro do Android Studio: corre em emulador ou device físico.

### Apontar para dev server local

Por defeito o WebView abre `https://hunie.app` (produção). Para testares
contra dev local:

```bash
CAP_DEV_URL=http://10.0.2.2:3000 bun run cap:sync
```

(10.0.2.2 é o IP do host visto pelo emulador Android.)

## Permissões (AndroidManifest.xml)

Em `android/app/src/main/AndroidManifest.xml` adicionar dentro de `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

E dentro de `<activity>` para deep links:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="hunie.app" />
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="hunie" />
</intent-filter>
```

## Icon & Splash Screen

```bash
bun add -D @capacitor/assets
# Coloca um icon.png 1024×1024 e splash.png 2732×2732 em resources/
npx capacitor-assets generate --android
```

## Firebase Cloud Messaging (push)

1. Cria projeto em https://console.firebase.google.com
2. Adiciona app Android com package `com.hunie.app`
3. Baixa `google-services.json` → coloca em `android/app/`
4. No `android/build.gradle`:
   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```
5. No `android/app/build.gradle` no fim:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
6. Server-side: adiciona o secret `FCM_SERVER_KEY` no Lovable Cloud (ainda
   não implementado o envio FCM no backend — Web Push VAPID continua activo).

## Build de produção (AAB para Play Store)

1. Gera keystore (uma vez):
   ```bash
   keytool -genkey -v -keystore hunie-release.keystore -alias hunie -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Em `android/key.properties`:
   ```
   storePassword=...
   keyPassword=...
   keyAlias=hunie
   storeFile=../hunie-release.keystore
   ```
3. Em `android/app/build.gradle` configurar `signingConfigs.release` (ver
   docs Capacitor).
4. Build:
   ```bash
   bun run android:build
   ```
5. AAB em `android/app/build/outputs/bundle/release/app-release.aab`

## Google Play Console

- Conta de developer ($25 one-time)
- Criar app → upload do AAB
- Preencher: ficha da loja, capturas (pelo menos 2), ícone 512×512, privacy
  policy URL (`https://hunie.app/legal/privacidade`), classificação de
  conteúdo, target audience
- Pagamentos: declarar uso de payment processor externo (M-Pesa/e-Mola) na
  secção apropriada — apps de dating têm essa permissão em mercados
  específicos. Verifica políticas actuais.
- Submeter para revisão (24–72h normalmente)

## Versionamento

Em `android/app/build.gradle`:
```gradle
versionCode 1     // inteiro, incrementar a cada release
versionName "1.0.0"
```

## Modo offline / hybrid

Por defeito a app é hybrid remoto — precisa de internet. Para suportar
totalmente offline seria necessário portar para SPA estática + Supabase
directo (trabalho significativo, fora de escopo desta config).
