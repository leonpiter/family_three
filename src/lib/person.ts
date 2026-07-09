import type { Person } from '../types/domain'

export function fullName(p: Person): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

export function lifeYears(p: Person): string {
  const b = p.birth_date ? p.birth_date.slice(0, 4) : null
  const d = p.death_date ? p.death_date.slice(0, 4) : null
  if (b && d) return `${b}–${d}`
  if (b) return `р. ${b}`
  if (d) return `ум. ${d}`
  return ''
}
