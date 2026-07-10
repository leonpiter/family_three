import type { DatePrecision, MilitaryStatus, Person } from '../types/domain'
import type { PersonInput } from '../features/board/boardStore'
import { STR } from './strings'

export function militaryLabel(s: MilitaryStatus | null): string | null {
  return s === 'not_served'
    ? STR.militaryNotServed
    : s === 'served'
      ? STR.militaryServed
      : s === 'fought'
        ? STR.militaryFought
        : null
}

export function personToInput(p: Person): PersonInput {
  return {
    first_name: p.first_name,
    middle_name: p.middle_name,
    last_name: p.last_name,
    maiden_name: p.maiden_name,
    gender: p.gender,
    birth_date: p.birth_date,
    death_date: p.death_date,
    birth_date_precision: p.birth_date_precision,
    death_date_precision: p.death_date_precision,
    birth_place: p.birth_place,
    bio: p.bio,
    education: p.education,
    occupation: p.occupation,
    achievements: p.achievements,
    residence: p.residence,
    military_status: p.military_status,
    military_notes: p.military_notes,
  }
}

export function fullName(p: Person): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

// Полное ФИО с отчеством — для шапки сайдбара; на нодах доски остаётся короткое.
export function fullNameLong(p: Person): string {
  return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')
}

export function lifeYears(p: Person): string {
  const b = p.birth_date ? p.birth_date.slice(0, 4) : null
  const d = p.death_date ? p.death_date.slice(0, 4) : null
  if (b && d) return `${b}–${d}`
  if (b) return `р. ${b}`
  if (d) return `ум. ${d}`
  return ''
}

// Полных лет между двумя датами (или до сегодня).
function fullYearsBetween(from: Date, to: Date): number {
  let age = to.getFullYear() - from.getFullYear()
  const m = to.getMonth() - from.getMonth()
  if (m < 0 || (m === 0 && to.getDate() < from.getDate())) age--
  return age
}

// Русское склонение «лет/год/года».
function yearsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'год'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'года'
  return 'лет'
}

// Дата рождения/смерти для отображения: точный формат или только год.
export function formatVital(iso: string | null, precision: DatePrecision): string | null {
  if (!iso) return null
  if (precision === 'year') return iso.slice(0, 4)
  const [y, m, d] = iso.split('-')
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`
}

// Возрастная строка для карточки: живой возраст, прожитые годы для ушедших
// и «было бы N». Если точность = год, счёт по годам с пометкой «≈».
export function ageInfo(p: Person, now: Date = new Date()): string | null {
  if (!p.birth_date) return null
  const approx =
    p.birth_date_precision === 'year' ||
    (!!p.death_date && p.death_date_precision === 'year')
  const birthYear = Number(p.birth_date.slice(0, 4))
  const pre = approx ? '≈' : ''

  if (p.death_date) {
    const lived = approx
      ? Number(p.death_date.slice(0, 4)) - birthYear
      : fullYearsBetween(new Date(p.birth_date), new Date(p.death_date))
    const wouldBe = approx ? now.getFullYear() - birthYear : fullYearsBetween(new Date(p.birth_date), now)
    return `прожил(а) ${pre}${lived} ${yearsWord(lived)} · было бы ${pre}${wouldBe}`
  }
  const age = approx ? now.getFullYear() - birthYear : fullYearsBetween(new Date(p.birth_date), now)
  return `${pre}${age} ${yearsWord(age)}`
}

// Ближайший день рождения (только для живых с известным днём).
export function nextBirthday(
  p: Person,
  now: Date = new Date(),
): { inDays: number; turns: number; date: Date } | null {
  if (!p.birth_date || p.death_date || p.birth_date_precision === 'year') return null
  const birth = new Date(p.birth_date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
  const inDays = Math.round((next.getTime() - today.getTime()) / 86_400_000)
  const turns = next.getFullYear() - birth.getFullYear()
  return { inDays, turns, date: next }
}
