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
  x: number
  y: number
  width: number
  height: number
  cornerRadius?: number
}

interface LiquidGlassPlugin {
  show(rect: LiquidGlassRect): Promise<void>
  update(rect: LiquidGlassRect): Promise<void>
  hide(): Promise<void>
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

/** Becomes true only after the native plugin successfully responds once.
 *  Use this to decide whether to drop the CSS glass fallback — if the
 *  native pod isn't installed yet, we keep the CSS so the pill stays visible. */
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

let showCallCount = 0
let updateCallCount = 0

export const LiquidGlass: LiquidGlassPlugin = {
  async show(rect) {
    showCallCount += 1
    console.log(`[LiquidGlass] show() call #${showCallCount}`, {
      platform: getPlatform(),
      supported: isLiquidGlassSupported(),
      rect,
    })
    if (!isLiquidGlassSupported()) {
      console.warn('[LiquidGlass] show() SKIPPED — platform is not iOS:', getPlatform())
      return
    }
    try {
      await native.show(rect)
      console.log('[LiquidGlass] native.show() ✅ resolved OK — bridge reachable')
      setReady(true)
    } catch (err) {
      console.error('[LiquidGlass] native.show() ❌ FAILED', err)
      setReady(false)
    }
  },
  async update(rect) {
    updateCallCount += 1
    if (updateCallCount <= 3 || updateCallCount % 60 === 0) {
      console.log(`[LiquidGlass] update() call #${updateCallCount}`, { platform: getPlatform(), rect })
    }
    if (!isLiquidGlassSupported()) return
    try {
      await native.update(rect)
    } catch (err) {
      console.error('[LiquidGlass] native.update() ❌ FAILED', err)
      setReady(false)
    }
  },
  async hide() {
    console.log('[LiquidGlass] hide() called', { platform: getPlatform() })
    if (!isLiquidGlassSupported()) return
    try { await native.hide() } catch (err) { console.error('[LiquidGlass] native.hide() ❌ FAILED', err) }
    setReady(false)
  },
}
