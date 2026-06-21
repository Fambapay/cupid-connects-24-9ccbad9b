import { isNative } from './platform'

export async function setupKeyboard() {
  if (!isNative()) return
  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--kb-height', `${info.keyboardHeight}px`)
      document.documentElement.classList.add('kb-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--kb-height', '0px')
      document.documentElement.classList.remove('kb-open')
    })
  } catch {
    // ignore
  }
}
