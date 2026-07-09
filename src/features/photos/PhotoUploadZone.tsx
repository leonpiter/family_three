import { useRef, useState } from 'react'
import { STR, fmt } from '../../lib/strings'
import type { UploadProgress } from './usePhotoUpload'

export function PhotoUploadZone({
  onFiles,
  progress,
}: {
  onFiles: (files: File[]) => void
  progress: UploadProgress | null
}) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles([...e.dataTransfer.files])
      }}
      className={`rounded-xl border-2 border-dashed p-4 text-center text-sm transition-colors ${
        over ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-300 text-neutral-500'
      }`}
    >
      {progress ? (
        <span>{fmt.uploading(progress.done, progress.total)}</span>
      ) : (
        <span>
          {STR.uploadHintDrop}
          <button
            type="button"
            className="font-medium text-emerald-700 hover:underline"
            onClick={() => inputRef.current?.click()}
          >
            {STR.chooseFiles}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onFiles([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </span>
      )}
    </div>
  )
}
