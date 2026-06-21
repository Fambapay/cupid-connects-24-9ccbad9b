import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Hunie — Capacitor Android config.
 *
 * Estratégia: hybrid remoto. O APK abre `https://hunie.app` no WebView,
 * mantendo SSR / server functions / auth sem duplicar backend.
 * Plugins nativos (push, câmera, haptics, status bar) funcionam normalmente.
 *
 * Para testar localmente contra dev server, exporta CAP_DEV_URL antes do
 * `bun run build` + `npx cap sync` (ex.: CAP_DEV_URL=http://10.0.2.2:3000).
 */
const config: CapacitorConfig = {
  appId: 'com.hunie.app',
  appName: 'Hunie',
  webDir: 'dist',
  server: {
    url: process.env.CAP_DEV_URL || 'https://hunie.app',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: ['hunie.app', '*.hunie.app', 'cupid-connects-24.lovable.app'],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#07060a',
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
