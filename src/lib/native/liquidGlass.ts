import { Capacitor, registerPlugin } from '@capacitor/core'
import { getPlatform } from './platform'

/**
 * LiquidGlass — bridges to the native iOS Capacitor plugin that renders
 * Apple's Liquid Glass (iOS 26+) / system material (iOS 17–25) beneath the
 * WebView. On web/android this is a no-op so the CSS pill keeps rendering.
 *
 * Coordinates are CSS pixels in WebView-local space (i.e. getBoundingClientRect).
 */
export interface LiquidGlassRect {
  id?: string
  x: number
  y: number
  width: number
  height: number
  cornerRadius?: number
  /** 0-1 alpha multiplier on the native glass surface (default 1). */
  intensity?: number
  /** Native layer placement. `above` lets real iOS glass sit over web pixels. */
  placement?: 'behind' | 'above'
  /** Transparent holes in the native glass so pill text/icons stay crisp. */
  exclusionRects?: Array<{
    x: number
    y: number
    width: number
    height: number
    cornerRadius?: number
  }>
}

interface LiquidGlassPlugin {
  show(rect: LiquidGlassRect): Promise<void>
  update(rect: LiquidGlassRect): Promise<void>
  hide(opts?: { id?: string }): Promise<void>
}

const noop: LiquidGlassPlugin = {
  async show() {},
  async update() {},
  async hide() {},
}

const native = registerPlugin<LiquidGlassPlugin>('LiquidGlass', {
  web: () => noop,
  android: () => noop,
})

export const isLiquidGlassSupported = (): boolean => {
  try {
    // `isPluginAvailable` can be false during the first WebView paint on a
    // freshly booted native app even though the plugin is registered a few
    // milliseconds later. Treat native iOS as eligible and let the bridge call
    // decide readiness, otherwise the BottomNav switches to a transparent CSS
    // shell and the outer pill appears to vanish in the simulator.
    return Capacitor.isNativePlatform() && getPlatform() === 'ios'
  } catch {
    return false
  }
}

let nativeReady = false
const activeSurfaces = new Set<string>()
export const isLiquidGlassReady = (): boolean => nativeReady

type Listener = (ready: boolean) => void
const listeners = new Set<Listener>()
export const onLiquidGlassReady = (cb: Listener): (() => void) => {
  listeners.add(cb)
  cb(nativeReady)
  return () => { listeners.delete(cb) }
}
const setReady = (v: boolean) => {
  if (nativeReady === v) return
  nativeReady = v
  listeners.forEach((l) => l(v))
}

export const LiquidGlass: LiquidGlassPlugin = {
  async show(rect) {
    if (!isLiquidGlassSupported()) return
    try {
      await native.show(rect)
      activeSurfaces.add(rect.id ?? 'default')
      setReady(activeSurfaces.size > 0)
    } catch (err) {
      console.error('[LiquidGlass] show failed', err)
      setReady(false)
      throw err
    }
  },
  async update(rect) {
    if (!isLiquidGlassSupported()) return
    try { await native.update(rect) } catch (err) {
      console.error('[LiquidGlass] update failed', err)
    }
  },
  async hide(opts) {
    if (!isLiquidGlassSupported()) return
    try { await native.hide(opts) } catch (err) {
      console.error('[LiquidGlass] hide failed', err)
    }
    activeSurfaces.delete(opts?.id ?? 'default')
    setReady(activeSurfaces.size > 0)
  },
}

