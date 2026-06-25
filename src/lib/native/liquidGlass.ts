import { registerPlugin } from '@capacitor/core'
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

export const isLiquidGlassSupported = (): boolean => getPlatform() === 'ios'

let nativeReady = false
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
      setReady(true)
    } catch (err) {
      console.error('[LiquidGlass] show failed', err)
      setReady(false)
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
    // only fully unready when the default surface is gone
    if (!opts?.id || opts.id === 'default') setReady(false)
  },
}

