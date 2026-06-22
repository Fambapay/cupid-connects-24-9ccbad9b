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

export const LiquidGlass: LiquidGlassPlugin = {
  async show(rect) {
    if (!isLiquidGlassSupported()) return
    try { await native.show(rect) } catch { /* plugin not installed yet */ }
  },
  async update(rect) {
    if (!isLiquidGlassSupported()) return
    try { await native.update(rect) } catch { /* plugin not installed yet */ }
  },
  async hide() {
    if (!isLiquidGlassSupported()) return
    try { await native.hide() } catch { /* plugin not installed yet */ }
  },
}
