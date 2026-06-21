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

---

# iOS (Xcode)

O sandbox da Lovable **não tem Xcode**, por isso a pasta `ios/` é criada
e gerida na tua máquina (macOS obrigatório).

## Pré-requisitos (uma vez, no Mac)

1. **macOS** + **Xcode 15+** (App Store)
2. **Xcode Command Line Tools**: `xcode-select --install`
3. **CocoaPods**: `sudo gem install cocoapods` (ou `brew install cocoapods`)
4. **Conta Apple Developer** ($99/ano) para publicar na App Store
5. Node 20+ e Bun

## Setup inicial (uma única vez)

```bash
bun install
bun run build          # gera dist/ (não estritamente necessário em modo remoto)
npx cap add ios        # cria a pasta ios/ — versionar no git depois
cd ios/App && pod install && cd ../..
```

A partir daqui a pasta `ios/` deve ficar comitada.

## Ciclo de desenvolvimento

```bash
bun run cap:sync:ios   # sincroniza assets/config para ios/
bun run ios            # abre Xcode
```

Dentro do Xcode: escolhe simulador ou device físico e clica ▶.

### Apontar para dev server local

Por defeito o WebView abre `https://hunie.app`. Para dev local:

```bash
# Simulador iOS:
CAP_DEV_URL=http://localhost:3000 bun run cap:sync:ios

# iPhone físico (mesma rede Wi-Fi, troca pelo IP do Mac):
CAP_DEV_URL=http://192.168.1.50:3000 bun run cap:sync:ios
```

Se usares HTTP (não HTTPS) em dev, ativa `cleartext` temporariamente no
`capacitor.config.ts` ou adiciona ATS exceptions ao `Info.plist`.

## Permissões (Info.plist)

Em `ios/App/App/Info.plist` adiciona as chaves de uso (obrigatório — sem
elas a app crasha quando pede permissão):

```xml
<key>NSCameraUsageDescription</key>
<string>A Hunie usa a câmara para tirares fotos de perfil.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>A Hunie acede às tuas fotos para o teu perfil.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>A Hunie guarda fotos na tua biblioteca.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>A Hunie usa a localização para encontrares matches por perto.</string>
<key>NSUserTrackingUsageDescription</key>
<string>Para personalizar a tua experiência.</string>
```

### Push Notifications

1. No Xcode: target **App** → **Signing & Capabilities** → **+ Capability**
   → adiciona **Push Notifications** e **Background Modes** (marca
   "Remote notifications").
2. Em https://developer.apple.com cria uma **APNs Auth Key** (.p8),
   anota Key ID e Team ID.
3. Cria projeto Firebase (se ainda não tiveres) → adiciona app iOS com
   bundle id `com.hunie.app` → baixa `GoogleService-Info.plist` →
   arrasta para `ios/App/App/` no Xcode (marca "Copy items if needed").
4. Faz upload da chave .p8 no Firebase Console → Cloud Messaging → APNs.

## Deep Links (Universal Links)

1. No Xcode: **Signing & Capabilities** → **+ Capability** →
   **Associated Domains**.
2. Adiciona: `applinks:hunie.app`
3. Serve o ficheiro `apple-app-site-association` em
   `https://hunie.app/.well-known/apple-app-site-association`:
   ```json
   {
     "applinks": {
       "details": [{
         "appIDs": ["TEAMID.com.hunie.app"],
         "components": [{ "/": "/*" }]
       }]
     }
   }
   ```
   (Substitui `TEAMID` pelo teu Apple Team ID.)

## Custom URL Scheme

Já configurado como `Hunie://` no `capacitor.config.ts`. Para o registar:
em `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>hunie</string></array>
  </dict>
</array>
```

## Icon & Splash Screen

```bash
bun add -D @capacitor/assets
# Coloca icon.png 1024×1024 e splash.png 2732×2732 em resources/
npx capacitor-assets generate --ios
```

## Signing & Bundle ID

1. Xcode → target **App** → **Signing & Capabilities**
2. Marca **Automatically manage signing**
3. Escolhe o teu **Team** (Apple Developer account)
4. Bundle Identifier: `com.hunie.app` (igual ao `appId` do Capacitor)

## Build de produção (IPA para App Store)

1. No Xcode: muda o destino para **Any iOS Device (arm64)**
2. **Product → Archive**
3. Quando o Organizer abrir: **Distribute App → App Store Connect → Upload**
4. Aguarda o processamento (5–30 min)

## App Store Connect

1. https://appstoreconnect.apple.com → **Apps → +**
2. Bundle ID `com.hunie.app`, SKU à escolha
3. Preencher: ficha da loja, capturas (6.7", 6.5", 5.5" obrigatórias),
   ícone 1024×1024, privacy policy URL
   (`https://hunie.app/legal/privacidade`), classificação etária,
   informação de **App Privacy** (data collection)
4. Selecionar a build carregada no passo anterior
5. **Submit for Review** (24–48h normalmente)

### Dating apps — notas específicas

- Apple exige proof of moderação de conteúdo e mecanismo de
  bloqueio/report. Documentar nas review notes.
- Idade mínima 17+ obrigatória.
- Pagamentos: **conteúdo digital → IAP obrigatório** (Apple leva 15-30%).
  Subscrições/boosts/super-likes têm de usar StoreKit. M-Pesa/e-Mola só
  é permitido para "real-world goods/services" (ex.: eventos físicos).

## Versionamento

No Xcode → target **App** → **General**:
- **Version** (CFBundleShortVersionString): `1.0.0`
- **Build** (CFBundleVersion): inteiro, incrementar a cada upload (`1`, `2`, ...)

## Troubleshooting

- **`pod install` falha**: `cd ios/App && pod repo update && pod install`
- **Capacitor desync após instalar plugin**: `bun run cap:sync:ios`
- **WebView em branco**: confirma `server.url` em `capacitor.config.ts` e
  que o domínio está em `allowNavigation`.
- **Push não chega**: confirma capability + APNs key no Firebase + permissão
  concedida pelo user no primeiro pedido.
