import { registerPlugin, Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

/**
 * NativeTabBar — bridges to the native iOS Capacitor plugin that renders a
 * real UITabBar (with Apple Liquid Glass / system material) on top of the
 * WebView. On web/android this is a no-op so the HTML BottomNav keeps
 * rendering.
 */
export interface NativeTabBarItem {
  id: string
  title: string
  /** SF Symbol name, e.g. "heart.fill" */
  sfSymbol: string
  badge?: number | string
}

export interface NativeTabBarConfig {
  tabs: NativeTabBarItem[]
  activeId?: string
}

interface NativeTabBarPlugin {
  configure(config: NativeTabBarConfig): Promise<void>
  setActiveTab(opts: { id: string }): Promise<void>
  setBadge(opts: { id: string; value: number | string | null }): Promise<void>
  show(): Promise<void>
  hide(): Promise<void>
  addListener(
    event: 'tabSelected',
    cb: (data: { id: string }) => void,
  ): Promise<PluginListenerHandle> | PluginListenerHandle
}

const noop: NativeTabBarPlugin = {
  async configure() {},
  async setActiveTab() {},
  async setBadge() {},
  async show() {},
  async hide() {},
  addListener() {
    return { remove: async () => {} } as PluginListenerHandle
  },
}

const native = registerPlugin<NativeTabBarPlugin>('NativeTabBar', {
  web: () => noop,
  android: () => noop,
})

export const isNativeTabBarSupported = (): boolean => getPlatform() === 'ios'

export const NativeTabBar: NativeTabBarPlugin = {
  async configure(config) {
    if (!isNativeTabBarSupported()) return
    try {
      await native.configure(config)
    } catch (err) {
      console.error('[NativeTabBar] configure failed', err)
    }
  },
  async setActiveTab(opts) {
    if (!isNativeTabBarSupported()) return
    try {
      await native.setActiveTab(opts)
    } catch (err) {
      console.error('[NativeTabBar] setActiveTab failed', err)
    }
  },
  async setBadge(opts) {
    if (!isNativeTabBarSupported()) return
    try {
      await native.setBadge(opts)
    } catch (err) {
      console.error('[NativeTabBar] setBadge failed', err)
    }
  },
  async show() {
    if (!isNativeTabBarSupported()) return
    try {
      await native.show()
    } catch (err) {
      console.error('[NativeTabBar] show failed', err)
    }
  },
  async hide() {
    if (!isNativeTabBarSupported()) return
    try {
      await native.hide()
    } catch (err) {
      console.error('[NativeTabBar] hide failed', err)
    }
  },
  addListener(event, cb) {
    return native.addListener(event, cb)
  },
}

/** Subscribe to native tab-bar taps. Returns an unsubscribe function. */
export function onTabSelected(cb: (id: string) => void): () => void {
  if (!isNativeTabBarSupported()) return () => {}
  let handle: PluginListenerHandle | null = null
  let cancelled = false
  Promise.resolve(
    native.addListener('tabSelected', (data) => {
      if (data && typeof data.id === 'string') cb(data.id)
    }),
  )
    .then((h) => {
      if (cancelled) {
        h.remove().catch(() => {})
      } else {
        handle = h
      }
    })
    .catch((err) => console.error('[NativeTabBar] addListener failed', err))
  return () => {
    cancelled = true
    handle?.remove().catch(() => {})
  }
}
