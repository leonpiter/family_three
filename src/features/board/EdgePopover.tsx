import { useEffect, useRef, useState } from 'react'
import { relationshipSentence } from '../../lib/kinship'
import { useBoardStore } from './boardStore'
import { STR } from '../../lib/strings'
import { Button } from '../../components/ui/Button'
import type { Person, Relationship } from '../../types/domain'

// Клик по линии связи: фраза родства + удаление с confirm внутри карточки.
export function EdgePopover({
  x,
  y,
  rel,
  persons,
  onDelete,
  onClose,
}: {
  x: number
  y: number
  rel: Relationship
  persons: Record<string, Person>
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
  const updateRelationship = useBoardStore((s) => s.updateRelationship)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = Math.min(x, window.innerWidth - 280)
  const top = Math.min(y, window.innerHeight - 140)

  return (
    <div
      ref={ref}
      className="fixed z-50 w-64 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg"
      style={{ left, top }}
    >
      <p className="text-sm text-neutral-800">{relationshipSentence(rel, persons)}</p>
      {rel.type === 'spouse' && (
        <button
          className="mt-2 text-sm text-emerald-700 hover:underline"
          onClick={() => void updateRelationship(rel.id, { is_ex: !rel.is_ex })}
        >
          {rel.is_ex ? STR.unmarkAsEx : STR.markAsEx}
        </button>
      )}
      <div className="mt-3 flex gap-2">
        {confirming ? (
          <>
            <Button variant="danger" onClick={onDelete}>
              {STR.confirmDelete}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {STR.cancel}
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            {STR.deleteRelation}
          </Button>
        )}
      </div>
    </div>
  )
}
