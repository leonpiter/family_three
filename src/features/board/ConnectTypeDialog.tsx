import { Modal } from '../../components/ui/Modal'
import { fullName } from '../../lib/person'
import { STR, fmt } from '../../lib/strings'
import type { Person, RelType } from '../../types/domain'

// После drag-to-connect уточняем смысл связи: кто родитель, или это супруги.
export function ConnectTypeDialog({
  source,
  target,
  onPick,
  onClose,
}: {
  source: Person
  target: Person
  onPick: (fromId: string, toId: string, type: RelType, isEx?: boolean) => void
  onClose: () => void
}) {
  const options: { label: string; act: () => void }[] = [
    {
      label: fmt.parentOf(fullName(source), fullName(target)),
      act: () => onPick(source.id, target.id, 'parent'),
    },
    {
      label: fmt.parentOf(fullName(target), fullName(source)),
      act: () => onPick(target.id, source.id, 'parent'),
    },
    {
      label: fmt.spousePair(fullName(source), fullName(target)),
      act: () => onPick(source.id, target.id, 'spouse'),
    },
    {
      label: fmt.exSpousePair(fullName(source), fullName(target)),
      act: () => onPick(source.id, target.id, 'spouse', true),
    },
  ]

  return (
    <Modal title={STR.connectTitle} onClose={onClose}>
      <div className="space-y-2">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={o.act}
            className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
          >
            {o.label}
          </button>
        ))}
      </div>
    </Modal>
  )
}
