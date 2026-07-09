import type { Gender, Person, Relationship } from '../../types/domain'
import { getChildren, getParents, getSiblings, getSpouses } from '../../lib/relations'

// «Добавить родственника кто-кем-кому»: роль определяет пол по умолчанию,
// позицию новой ноды относительно ego и автоматически создаваемые связи.
export type RelativeRole =
  | 'father'
  | 'mother'
  | 'son'
  | 'daughter'
  | 'spouse'
  | 'brother'
  | 'sister'

export function roleGender(role: RelativeRole, ego: Person): Gender | null {
  switch (role) {
    case 'father':
    case 'brother':
    case 'son':
      return 'm'
    case 'mother':
    case 'sister':
    case 'daughter':
      return 'f'
    case 'spouse':
      return ego.gender === 'm' ? 'f' : ego.gender === 'f' ? 'm' : null
  }
}

// Родители — выше, дети — ниже, супруг — справа, сиблинги — слева;
// шаг зависит от того, сколько таких родственников уже есть.
export function rolePosition(
  role: RelativeRole,
  ego: Person,
  rels: Record<string, Relationship>,
): { x: number; y: number } {
  switch (role) {
    case 'father':
    case 'mother': {
      const n = getParents(ego.id, rels).length
      return { x: ego.pos_x - 80 + 160 * n, y: ego.pos_y - 180 }
    }
    case 'son':
    case 'daughter': {
      const n = getChildren(ego.id, rels).length
      return { x: ego.pos_x - 70 + 140 * n, y: ego.pos_y + 180 }
    }
    case 'spouse': {
      const n = getSpouses(ego.id, rels).length
      return { x: ego.pos_x + 180 + 40 * n, y: ego.pos_y }
    }
    case 'brother':
    case 'sister': {
      const n = getSiblings(ego.id, rels).length
      return { x: ego.pos_x - 180 - 40 * n, y: ego.pos_y }
    }
  }
}

export async function linkByRole(
  role: RelativeRole,
  egoId: string,
  newId: string,
  rels: Record<string, Relationship>,
  addRelationship: (fromId: string, toId: string, type: 'parent' | 'spouse') => Promise<void>,
): Promise<void> {
  switch (role) {
    case 'father':
    case 'mother':
      await addRelationship(newId, egoId, 'parent')
      return
    case 'son':
    case 'daughter':
      await addRelationship(egoId, newId, 'parent')
      return
    case 'spouse':
      await addRelationship(egoId, newId, 'spouse')
      return
    case 'brother':
    case 'sister':
      // сиблинг = ребёнок всех текущих родителей ego
      for (const parent of getParents(egoId, rels)) {
        await addRelationship(parent.personId, newId, 'parent')
      }
  }
}
