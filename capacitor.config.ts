import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Hunie — Capacitor config (Android + iOS).
 *
 * Estratégia: hybrid remoto. A app abre `https://hunie.app` no WebView,
 * mantendo SSR / server functions / auth sem duplicar backend.
 * Plugins nativos (push, câmera, haptics, status bar) funcionam normalmente.
 *
 * Para testar localmente contra dev server, exporta CAP_DEV_URL antes do
 * `bun run build` + `npx cap sync`.
 *  - Android emulador: CAP_DEV_URL=http://10.0.2.2:3000
 *  - iOS simulador:    CAP_DEV_URL=http://localhost:3000
 *  - iPhone físico:    CAP_DEV_URL=http://<IP-do-Mac>:3000
 */
const config: CapacitorConfig = {
  appId: 'com.hunie.app',
  appName: 'Hunie',
  webDir: 'dist',
  server: {
    url: process.env.CAP_DEV_URL || 'https://hunie.app',
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
    allowNavigation: ['hunie.app', '*.hunie.app', 'cupid-connects-24.lovable.app'],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#07060a',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#07060a',
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'Hunie',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#07060a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: 'small',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07060a00',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
