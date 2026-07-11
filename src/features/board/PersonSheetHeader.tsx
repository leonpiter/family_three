import { circleClass, initialsOf } from '../../lib/avatar'
import { ageInfo, fullNameLong, lifeYears, militaryLabel } from '../../lib/person'
import { canonicalSurname, surnameColor } from '../../lib/surname'
import { VeteranStar } from '../../components/ui/VeteranStar'
import { STR, fmt } from '../../lib/strings'
import type { Person } from '../../types/domain'

// Быстрый просмотр в шапке мобильной шторки: крупное фото + ключевые факты,
// без открытия полной карточки.
export function PersonSheetHeader({
  person,
  avatarUrl,
}: {
  person: Person
  avatarUrl?: string
}) {
  const years = lifeYears(person)
  const age = ageInfo(person)
  const branch = canonicalSurname(person.last_name)
  const facts: [string, string | null][] = [
    [STR.birthPlace, person.birth_place],
    [STR.residence, person.residence],
    [STR.occupation, person.occupation],
    [STR.militaryStatus, militaryLabel(person.military_status)],
  ]
  const shown = facts.filter(([, v]) => v)

  return (
    <div className="border-b border-neutral-200 px-5 pb-4 pt-1">
      <div className="flex gap-4">
        <div className="relative shrink-0">
          <div
            className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border-2 text-3xl font-semibold ${circleClass(person.gender)}`}
            style={surnameColor(person.last_name) ? { borderColor: surnameColor(person.last_name)! } : undefined}
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
          {person.military_status === 'fought' && <VeteranStar size={26} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold leading-tight text-neutral-900">
            {fullNameLong(person)}
          </div>
          {(years || age) && (
            <div className="mt-0.5 text-xs text-neutral-400">
              {[years, age].filter(Boolean).join(' · ')}
            </div>
          )}
          {branch && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: surnameColor(person.last_name)! }}
              />
              {fmt.surnameBranch(branch)}
            </div>
          )}
          {shown.length > 0 && (
            <dl className="mt-2 space-y-1">
              {shown.map(([label, v]) => (
                <div key={label} className="text-xs">
                  <dt className="inline text-neutral-400">{label}: </dt>
                  <dd className="inline text-neutral-800">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
