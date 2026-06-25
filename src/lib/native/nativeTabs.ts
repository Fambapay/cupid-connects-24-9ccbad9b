import { registerPlugin, Capacitor, type PluginListenerHandle } from "@capacitor/core";

export interface NativeTabItem {
  /** Identificador estável (não é usado pelo nativo, só pelo lado JS). */
  id: string;
  /** Título por baixo do ícone. */
  title: string;
  /** Nome SF Symbol (ex: "magnifyingglass", "heart.fill"). */
  symbol: string;
  /** Texto do badge ("3", "99+") ou vazio para ocultar. */
  badge?: string;
  selected?: boolean;
}

export interface NativeTabsPlugin {
  show(options: { items: NativeTabItem[] }): Promise<void>;
  hide(): Promise<void>;
  setSelected(options: { index: number }): Promise<void>;
  setBadge(options: { index: number; value: string }): Promise<void>;
  addListener(
    eventName: "tabSelected",
    cb: (data: { index: number }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "heightChanged",
    cb: (data: { height: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const NativeTabs = registerPlugin<NativeTabsPlugin>("NativeTabs");

/**
 * `true` apenas em iOS nativo (Capacitor). Em web/Android caímos no fallback
 * HTML `BottomNav`.
 */
export function nativeTabsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export default NativeTabs;
