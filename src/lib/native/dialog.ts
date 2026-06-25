import { isNative } from './platform'

export interface AlertConfig {
  title: string
  message?: string
  buttonTitle?: string // Android only; iOS always shows "OK"
}

export interface ConfirmConfig {
  title: string
  message?: string
  okButtonTitle?: string
  cancelButtonTitle?: string
}

export interface PromptConfig {
  title: string
  message?: string
  okButtonTitle?: string
  cancelButtonTitle?: string
  inputPlaceholder?: string
}

/**
 * Native alert (single OK button). Falls back to window.alert on web.
 */
export async function nativeAlert(config: AlertConfig): Promise<void> {
  if (!isNative()) {
    window.alert(config.title + (config.message ? `\n${config.message}` : ''))
    return
  }
  const { Dialog } = await import('@capacitor/dialog')
  await Dialog.alert({
    title: config.title,
    message: config.message ?? '',
    buttonTitle: config.buttonTitle,
  })
}

/**
 * Native confirm (OK / Cancel). Returns true if user pressed OK.
 * Falls back to window.confirm on web.
 */
export async function nativeConfirm(config: ConfirmConfig): Promise<boolean> {
  if (!isNative()) {
    return window.confirm(
      config.title + (config.message ? `\n${config.message}` : ''),
    )
  }
  const { Dialog } = await import('@capacitor/dialog')
  const { value } = await Dialog.confirm({
    title: config.title,
    message: config.message ?? '',
    okButtonTitle: config.okButtonTitle,
    cancelButtonTitle: config.cancelButtonTitle,
  })
  return value
}

/**
 * Native prompt (text input + OK / Cancel). Returns the string or null.
 * Falls back to window.prompt on web.
 */
export async function nativePrompt(config: PromptConfig): Promise<string | null> {
  if (!isNative()) {
    return window.prompt(
      config.title + (config.message ? `\n${config.message}` : ''),
      config.inputPlaceholder ?? '',
    )
  }
  const { Dialog } = await import('@capacitor/dialog')
  const { value } = await Dialog.prompt({
    title: config.title,
    message: config.message ?? '',
    okButtonTitle: config.okButtonTitle,
    cancelButtonTitle: config.cancelButtonTitle,
    inputPlaceholder: config.inputPlaceholder,
  })
  return value ?? null
}
