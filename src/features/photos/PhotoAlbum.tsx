import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { supabase } from '../../lib/supabase'
import { useSignedUrls } from '../../hooks/useSignedUrls'
import { usePersonPhotos } from './usePersonPhotos'
import { usePhotoUpload } from './usePhotoUpload'
import { PhotoUploadZone } from './PhotoUploadZone'
import { useBoardStore } from '../board/boardStore'
import { useAuthStore } from '../auth/authStore'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Spinner'
import { STR } from '../../lib/strings'
import type { Person, Photo } from '../../types/domain'

export function PhotoAlbum({ person }: { person: Person }) {
  const profile = useAuthStore((s) => s.profile)
  const updatePerson = useBoardStore((s) => s.updatePerson)
  const { photos, reload } = usePersonPhotos(person.id)
  const { upload, progress } = usePhotoUpload(person.id, () => void reload())

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [captionEdit, setCaptionEdit] = useState<Photo | null>(null)
  const [captionText, setCaptionText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const urls = useSignedUrls(
    photos ? [...photos.map((p) => p.thumb_path), ...photos.map((p) => p.storage_path)] : [],
  )

  // Если аватар не выбран, а фото есть — первое становится аватаром автоматически
  // (покрывает и старые загрузки, и удаление текущего аватара).
  const autoAvatarTried = useRef<string | null>(null)
  useEffect(() => {
    if (!photos || photos.length === 0 || person.avatar_photo_id) return
    if (autoAvatarTried.current === person.id) return
    autoAvatarTried.current = person.id
    void updatePerson(person.id, { avatar_photo_id: photos[0].id })
  }, [photos, person.id, person.avatar_photo_id, updatePerson])

  const setAvatar = async (photo: Photo) => {
    await updatePerson(person.id, { avatar_photo_id: photo.id })
    toast.success(STR.avatarSet)
  }

  const deletePhoto = async (photo: Photo) => {
    setConfirmDeleteId(null)
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (error) {
      toast.error(STR.saveError)
      return
    }
    // чистим оба файла в storage; строка уже удалена — сироты не критичны
    await supabase.storage.from('photos').remove([photo.storage_path, photo.thumb_path])
    void reload()
  }

  const saveCaption = async () => {
    if (!captionEdit) return
    const { error } = await supabase
      .from('photos')
      .update({ caption: captionText.trim() || null })
      .eq('id', captionEdit.id)
    if (error) toast.error(STR.saveError)
    else {
      toast.success(STR.saved)
      void reload()
    }
    setCaptionEdit(null)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900">{STR.photosTitle}</h3>

      {photos === null ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <>
          {photos.length === 0 && (
            <p className="text-sm text-neutral-400">{STR.noPhotos}</p>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((ph, i) => {
                const canDelete = profile?.role === 'admin' || ph.uploaded_by === profile?.id
                return (
                  <div key={ph.id} className="group relative">
                    <button
                      className="block aspect-square w-full overflow-hidden rounded-lg bg-neutral-100"
                      onClick={() => setLightboxIndex(i)}
                    >
                      {urls.get(ph.thumb_path) && (
                        <img
                          src={urls.get(ph.thumb_path)}
                          alt={ph.caption ?? ''}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                    {person.avatar_photo_id === ph.id && (
                      <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] text-neutral-600">
                        аватар
                      </span>
                    )}
                    <div className="photo-actions absolute inset-x-0 bottom-0 hidden items-center justify-center gap-2 rounded-b-lg bg-black/55 py-1 text-xs text-white group-hover:flex">
                      {confirmDeleteId === ph.id ? (
                        <>
                          <button
                            className="font-medium text-red-300 hover:text-red-200"
                            onClick={() => void deletePhoto(ph)}
                          >
                            {STR.confirmDelete}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}>{STR.cancel}</button>
                        </>
                      ) : (
                        <>
                          <button title={STR.setAvatar} onClick={() => void setAvatar(ph)}>
                            ★
                          </button>
                          <button
                            title={STR.captionLabel}
                            onClick={() => {
                              setCaptionEdit(ph)
                              setCaptionText(ph.caption ?? '')
                            }}
                          >
                            ✎
                          </button>
                          {canDelete && (
                            <button
                              title={STR.deletePhoto}
                              onClick={() => setConfirmDeleteId(ph.id)}
                            >
                              🗑
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <PhotoUploadZone onFiles={(files) => void upload(files)} progress={progress} />
        </>
      )}

      {lightboxIndex !== null && photos && (
        <Lightbox
          open
          index={lightboxIndex}
          close={() => setLightboxIndex(null)}
          plugins={[Captions]}
          slides={photos.map((ph) => ({
            src: urls.get(ph.storage_path) ?? urls.get(ph.thumb_path) ?? '',
            description: ph.caption ?? undefined,
          }))}
        />
      )}

      {captionEdit && (
        <Modal title={STR.captionLabel} onClose={() => setCaptionEdit(null)}>
          <Field
            label={STR.captionLabel}
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            autoFocus
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCaptionEdit(null)}>
              {STR.cancel}
            </Button>
            <Button onClick={() => void saveCaption()}>{STR.save}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
