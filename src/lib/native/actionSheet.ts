import { isNative } from './platform'

export type ActionSheetStyle = 'default' | 'destructive' | 'cancel'

export interface ActionSheetOption {
  title: string
  style?: ActionSheetStyle
}

export interface ActionSheetConfig {
  title?: string
  message?: string
  options: ActionSheetOption[]
}

/**
 * Shows a native iOS/Android action sheet. Returns the selected index,
 * or null if dismissed / unsupported (caller should fall back to web UI).
 */
export async function showActionSheet(
  config: ActionSheetConfig,
): Promise<number | null> {
  if (!isNative()) return null
  try {
    const { ActionSheet, ActionSheetButtonStyle } = await import(
      '@capacitor/action-sheet'
    )
    const result = await ActionSheet.showActions({
      title: config.title,
      message: config.message,
      options: config.options.map((o) => ({
        title: o.title,
        style:
          o.style === 'destructive'
            ? ActionSheetButtonStyle.Destructive
            : o.style === 'cancel'
              ? ActionSheetButtonStyle.Cancel
              : ActionSheetButtonStyle.Default,
      })),
    })
    return typeof result.index === 'number' ? result.index : null
  } catch {
    return null
  }
}
