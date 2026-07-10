import { useMemo, useState } from 'react'
import { useBoardStore } from './boardStore'
import { canonicalSurname, surnameColor } from '../../lib/surname'
import { STR } from '../../lib/strings'

// Легенда фамильных линий: цвет + количество; клик выделяет линию (остальные
// тускнеют). Повторный клик или «показать все» — снять выделение.
export function SurnamePanel({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (surname: string | null) => void
}) {
  const persons = useBoardStore((s) => s.persons)
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    // Ключ — каноническая (мужская) форма: «Мазелев» и «Мазелева» — одна ветка
    const counts = new Map<string, number>()
    for (const p of Object.values(persons)) {
      const s = canonicalSurname(p.last_name)
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([surname, count]) => ({ surname, count, color: surnameColor(surname)! }))
      .sort((a, b) => b.count - a.count || a.surname.localeCompare(b.surname, 'ru'))
  }, [persons])

  if (groups.length === 0) return null

  return (
    <div className="w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white/95 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-neutral-800"
      >
        <span>👪 {STR.surnamesTitle}</span>
        <span className="text-neutral-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="max-h-72 overflow-y-auto border-t border-neutral-100">
          {selected && (
            <button
              onClick={() => onSelect(null)}
              className="w-full px-3 py-1.5 text-left text-xs text-emerald-700 hover:bg-emerald-50"
            >
              {STR.showAllSurnames}
            </button>
          )}
          {groups.map(({ surname, count, color }) => (
            <button
              key={surname}
              onClick={() => onSelect(selected === surname ? null : surname)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-emerald-50 ${
                selected === surname ? 'bg-emerald-50 font-medium' : ''
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full border"
                style={{ backgroundColor: color, borderColor: color }}
              />
              <span className="min-w-0 flex-1 truncate text-neutral-800">{surname}</span>
              <span className="shrink-0 text-xs text-neutral-400">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
