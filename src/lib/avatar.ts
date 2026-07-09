import type { Gender, Person } from '../types/domain'

// Цвета кружков по полу — общие для ноды доски, сайдбара и пикеров.
const genderCircle: Record<string, string> = {
  m: 'bg-sky-100 text-sky-800 border-sky-300',
  f: 'bg-rose-100 text-rose-800 border-rose-300',
  u: 'bg-neutral-100 text-neutral-600 border-neutral-300',
}

export function circleClass(gender: Gender | null | undefined): string {
  return genderCircle[gender ?? 'u']
}

export function initialsOf(p: Person): string {
  return ((p.first_name[0] ?? '') + (p.last_name?.[0] ?? '')) || '?'
}
