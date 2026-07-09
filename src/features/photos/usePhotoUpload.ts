import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { compressForUpload } from '../../lib/image'
import { useBoardStore } from '../board/boardStore'
import { STR } from '../../lib/strings'
import type { Photo } from '../../types/domain'

export interface UploadProgress {
  done: number
  total: number
}

// Очередь загрузки: сжатие -> два upload'а (полноразмер + превью) -> строка в БД.
export function usePhotoUpload(personId: string, onUploaded: () => void) {
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  const upload = async (files: File[]) => {
    if (files.length === 0) return
    setProgress({ done: 0, total: files.length })
    let firstUploadedId: string | null = null
    for (let i = 0; i < files.length; i++) {
      try {
        const { full, thumb } = await compressForUpload(files[i])
        const id = crypto.randomUUID()
        const storage_path = `${personId}/${id}.webp`
        const thumb_path = `${personId}/thumb_${id}.webp`
        const bucket = supabase.storage.from('photos')
        const up1 = await bucket.upload(storage_path, full, { contentType: 'image/webp' })
        if (up1.error) throw up1.error
        const up2 = await bucket.upload(thumb_path, thumb, { contentType: 'image/webp' })
        if (up2.error) throw up2.error
        const { data, error } = await supabase
          .from('photos')
          .insert({ person_id: personId, storage_path, thumb_path })
          .select()
          .single()
        if (error) throw error
        if (!firstUploadedId) firstUploadedId = (data as Photo).id
      } catch (e) {
        const msg =
          e instanceof Error && (e.message === STR.notAnImage || e.message === STR.fileTooLarge)
            ? e.message
            : STR.uploadError
        toast.error(`${files[i].name}: ${msg}`)
      }
      setProgress({ done: i + 1, total: files.length })
    }
    // Первое загруженное фото становится аватаром, если аватара ещё нет
    const { persons, updatePerson } = useBoardStore.getState()
    if (firstUploadedId && persons[personId] && !persons[personId].avatar_photo_id) {
      await updatePerson(personId, { avatar_photo_id: firstUploadedId })
    }
    setProgress(null)
    onUploaded()
  }

  return { upload, progress }
}
