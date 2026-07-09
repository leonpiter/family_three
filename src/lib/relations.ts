import type { Relationship } from '../types/domain'

// Супружеская пара хранится в нормализованном виде: меньший uuid — в from.
// Вместе с уникальным индексом в БД это исключает дубли «A+B» и «B+A».
export function normalizeSpousePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export interface RelLink {
  personId: string
  relationshipId: string
}

export function getParents(id: string, rels: Record<string, Relationship>): RelLink[] {
  return Object.values(rels)
    .filter((r) => r.type === 'parent' && r.to_person_id === id)
    .map((r) => ({ personId: r.from_person_id, relationshipId: r.id }))
}

export function getChildren(id: string, rels: Record<string, Relationship>): RelLink[] {
  return Object.values(rels)
    .filter((r) => r.type === 'parent' && r.from_person_id === id)
    .map((r) => ({ personId: r.to_person_id, relationshipId: r.id }))
}

export function getSpouses(id: string, rels: Record<string, Relationship>): RelLink[] {
  return Object.values(rels)
    .filter((r) => r.type === 'spouse' && (r.from_person_id === id || r.to_person_id === id))
    .map((r) => ({
      personId: r.from_person_id === id ? r.to_person_id : r.from_person_id,
      relationshipId: r.id,
    }))
}

// Сиблинги вычисляются (дети родителей), прямой связи в БД нет —
// поэтому relationshipId отсутствует и крестика удаления у них не бывает.
export function getSiblings(id: string, rels: Record<string, Relationship>): string[] {
  const out = new Set<string>()
  for (const parent of getParents(id, rels)) {
    for (const child of getChildren(parent.personId, rels)) {
      if (child.personId !== id) out.add(child.personId)
    }
  }
  return [...out]
}
