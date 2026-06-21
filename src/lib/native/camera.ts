import { isNative } from './platform'

export interface NativePhotoResult {
  file: File
  dataUrl?: string
}

/**
 * Tira uma foto com a câmera nativa ou abre a galeria. No web devolve null
 * (use o <input type="file"> existente).
 */
export async function pickPhotoNative(opts: { source?: 'camera' | 'gallery' } = {}): Promise<NativePhotoResult | null> {
  if (!isNative()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: opts.source === 'gallery' ? CameraSource.Photos : CameraSource.Prompt,
      saveToGallery: false,
      correctOrientation: true,
      width: 1600,
    })
    if (!photo.base64String) return null
    const bytes = atob(photo.base64String)
    const buf = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
    const ext = photo.format || 'jpeg'
    const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const file = new File([buf], `photo-${Date.now()}.${ext}`, { type: mime })
    return { file, dataUrl: `data:${mime};base64,${photo.base64String}` }
  } catch (e) {
    console.warn('[camera] pickPhotoNative failed', e)
    return null
  }
}
