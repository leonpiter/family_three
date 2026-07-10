import type { MilitaryStatus, Person } from '../types/domain'
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

// Возрастная строка для карточки: живой возраст, прожитые годы для ушедших
// и «было бы N» на текущую дату. `now` инъектируется для тестируемости.
export function ageInfo(p: Person, now: Date = new Date()): string | null {
  if (!p.birth_date) return null
  const birth = new Date(p.birth_date)
  if (p.death_date) {
    const death = new Date(p.death_date)
    const lived = fullYearsBetween(birth, death)
    const wouldBe = fullYearsBetween(birth, now)
    return `прожил(а) ${lived} ${yearsWord(lived)} · было бы ${wouldBe}`
  }
  const age = fullYearsBetween(birth, now)
  return `${age} ${yearsWord(age)}`
}

// Ближайший день рождения (только для живых): дней до, дата, исполнится лет.
export function nextBirthday(
  p: Person,
  now: Date = new Date(),
): { inDays: number; turns: number; date: Date } | null {
  if (!p.birth_date || p.death_date) return null
  const birth = new Date(p.birth_date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
  const inDays = Math.round((next.getTime() - today.getTime()) / 86_400_000)
  const turns = next.getFullYear() - birth.getFullYear()
  return { inDays, turns, date: next }
}
