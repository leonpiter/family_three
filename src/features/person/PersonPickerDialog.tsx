import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useBoardStore } from '../board/boardStore'
import { circleClass, initialsOf } from '../../lib/avatar'
import { fullName, lifeYears } from '../../lib/person'
import { STR } from '../../lib/strings'
import type { Person } from '../../types/domain'

// Поиск и выбор персоны из списка (для «Добавить связь» из сайдбара и меню).
export function PersonPickerDialog({
  exclude,
  onPick,
  onClose,
}: {
  exclude: string[]
  onPick: (p: Person) => void
  onClose: () => void
}) {
  const persons = useBoardStore((s) => s.persons)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const list = Object.values(persons)
    .filter((p) => !exclude.includes(p.id))
    .filter((p) => (fullName(p) + ' ' + (p.maiden_name ?? '')).toLowerCase().includes(q))
    .sort((a, b) => fullName(a).localeCompare(fullName(b), 'ru'))

  return (
    <Modal title={STR.pickPersonTitle} onClose={onClose}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={STR.searchPlaceholder}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-emerald-50"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${circleClass(p.gender)}`}
            >
              {initialsOf(p)}
            </span>
            <span className="text-sm text-neutral-800">{fullName(p)}</span>
            <span className="ml-auto text-xs text-neutral-400">{lifeYears(p)}</span>
          </button>
        ))}
        {list.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-400">{STR.nothingFound}</p>
        )}
      </div>
    </Modal>
  )
}
