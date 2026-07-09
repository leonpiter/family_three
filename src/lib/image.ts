import imageCompression from 'browser-image-compression'
import { STR } from './strings'

const MAX_SOURCE_MB = 15

// Сжатие на клиенте до загрузки: полноразмер webp ≤0.4 МБ (1600px)
// + превью ≤0.05 МБ (320px). Доска и грид тянут только превью.
export async function compressForUpload(file: File): Promise<{ full: Blob; thumb: Blob }> {
  if (!file.type.startsWith('image/')) throw new Error(STR.notAnImage)
  if (file.size > MAX_SOURCE_MB * 1024 * 1024) throw new Error(STR.fileTooLarge)
  const [full, thumb] = await Promise.all([
    imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 0.4,
      fileType: 'image/webp',
      useWebWorker: true,
      initialQuality: 0.85,
    }),
    imageCompression(file, {
      maxWidthOrHeight: 320,
      maxSizeMB: 0.05,
      fileType: 'image/webp',
      useWebWorker: true,
      initialQuality: 0.8,
    }),
  ])
  return { full, thumb }
}
