import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useBoardStore } from './boardStore'
import { nextBirthday, fullName } from '../../lib/person'
import { STR } from '../../lib/strings'

dayjs.locale('ru')

const dayWord = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня'
  return 'дней'
}

const whenLabel = (inDays: number) =>
  inDays === 0 ? 'сегодня' : inDays === 1 ? 'завтра' : `через ${inDays} ${dayWord(inDays)}`

// Виджет «ближайшие дни рождения»: сворачиваемая панель на доске.
export function BirthdaysPanel({ onPick }: { onPick: (id: string) => void }) {
  const persons = useBoardStore((s) => s.persons)
  const [open, setOpen] = useState(false)

  const upcoming = useMemo(() => {
    return Object.values(persons)
      .map((p) => ({ p, nb: nextBirthday(p) }))
      .filter((x): x is { p: (typeof x)['p']; nb: NonNullable<(typeof x)['nb']> } => x.nb !== null)
      .sort((a, b) => a.nb.inDays - b.nb.inDays)
      .slice(0, 8)
  }, [persons])

  if (upcoming.length === 0) return null

  return (
    <div className="w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white/95 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-neutral-800"
      >
        <span>🎂 {STR.birthdaysTitle}</span>
        <span className="text-neutral-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="max-h-72 overflow-y-auto border-t border-neutral-100">
          {upcoming.map(({ p, nb }) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-emerald-50"
            >
              <span className="min-w-0 truncate text-neutral-800">{fullName(p)}</span>
              <span className="shrink-0 text-xs text-neutral-400">
                {dayjs(nb.date).format('D MMM')} · {whenLabel(nb.inDays)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
