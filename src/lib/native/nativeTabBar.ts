import { registerPlugin, Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface NativeTabBarItem { id: string; title: string; sfSymbol: string; badge?: number | string }
export interface NativeTabBarConfig { tabs: NativeTabBarItem[]; activeId?: string }

interface NativeTabBarPlugin {
  configure(config: NativeTabBarConfig): Promise<void>
  setActiveTab(opts: { id: string }): Promise<void>
  setBadge(opts: { id: string; value: number | string | null }): Promise<void>
  show(): Promise<void>
  hide(): Promise<void>
  addListener(event: 'tabSelected', cb: (data: { id: string }) => void): Promise<PluginListenerHandle> | PluginListenerHandle
}

const noop: NativeTabBarPlugin = {
  async configure() {}, async setActiveTab() {}, async setBadge() {}, async show() {}, async hide() {},
  addListener() { return { remove: async () => {} } as PluginListenerHandle },
}

const native = registerPlugin<NativeTabBarPlugin>('NativeTabBar', { web: () => noop, android: () => noop })

export const isNativeTabBarSupported = (): boolean => {
  if (!Capacitor.isNativePlatform()) return false
  if (Capacitor.getPlatform() !== 'ios') return false
  return Capacitor.isPluginAvailable('NativeTabBar')
}

export const NativeTabBar: NativeTabBarPlugin = {
  async configure(config) { if (!isNativeTabBarSupported()) return; try { await native.configure(config) } catch(e){} },
  async setActiveTab(opts) { if (!isNativeTabBarSupported()) return; try { await native.setActiveTab(opts) } catch(e){} },
  async setBadge(opts) { if (!isNativeTabBarSupported()) return; try { await native.setBadge(opts) } catch(e){} },
  async show() { if (!isNativeTabBarSupported()) return; try { await native.show() } catch(e){} },
  async hide() { if (!isNativeTabBarSupported()) return; try { await native.hide() } catch(e){} },
  addListener(event, cb) { return native.addListener(event, cb) },
}

export function onTabSelected(cb: (id: string) => void): () => void {
  if (!isNativeTabBarSupported()) return () => {}
  let handle: PluginListenerHandle | null = null
  let cancelled = false
  Promise.resolve(native.addListener('tabSelected', (data) => { if (data?.id) cb(data.id) }))
    .then((h) => { if (cancelled) h.remove().catch(()=>{}); else handle = h })
    .catch(()=>{})
  return () => { cancelled = true; handle?.remove().catch(()=>{}) }
}
