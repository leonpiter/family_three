import type { Person } from '../types/domain'
import type { PersonInput } from '../features/board/boardStore'

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
