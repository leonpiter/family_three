import { circleClass, initialsOf } from '../../lib/avatar'
import { ageInfo, fullNameLong, lifeYears, militaryLabel } from '../../lib/person'
import { VeteranStar } from '../../components/ui/VeteranStar'
import { STR } from '../../lib/strings'
import type { Person } from '../../types/domain'

const CARD_W = 320

// Быстрый «типс» сбоку от кружочка: крупное фото + ключевые факты о жизни.
// Некликабельный (pointer-events-none) — действия остаются в сайдбаре по клику.
export function NodePreview({
  person,
  avatarUrl,
  rect,
}: {
  person: Person
  avatarUrl?: string
  rect: DOMRect
}) {
  // справа от ноды, если не помещается — слева
  const spaceRight = window.innerWidth - rect.right
  const left = spaceRight > CARD_W + 24 ? rect.right + 12 : rect.left - CARD_W - 12
  const top = Math.min(Math.max(rect.top - 40, 8), window.innerHeight - 440)

  const years = lifeYears(person)
  const age = ageInfo(person)
  const facts: [string, string | null][] = [
    [STR.birthPlace, person.birth_place],
    [STR.residence, person.residence],
    [STR.occupation, person.occupation],
    [STR.education, person.education],
    [STR.militaryStatus, militaryLabel(person.military_status)],
  ]

  return (
    <div
      className="pointer-events-none fixed z-40 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl"
      style={{ left, top, width: CARD_W }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative w-full">
          <div
            className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 text-6xl font-semibold ${circleClass(person.gender)}`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullNameLong(person)}
                className="h-full w-full object-cover"
              />
            ) : (
              initialsOf(person)
            )}
          </div>
          {person.military_status === 'fought' && <VeteranStar size={32} />}
        </div>
        <div className="mt-2 text-sm font-semibold text-neutral-900">{fullNameLong(person)}</div>
        {(years || age) && (
          <div className="text-xs text-neutral-400">
            {[years, age].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      {facts.some(([, v]) => v) && (
        <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
          {facts
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <div key={label} className="text-xs">
                <dt className="text-neutral-400">{label}</dt>
                <dd className="text-neutral-800">{v}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  )
}
