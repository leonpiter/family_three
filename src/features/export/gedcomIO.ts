import { supabase } from '../../lib/supabase'
import { exportGedcom, parseGedcom } from '../../lib/gedcom'
import { normalizeSpousePair } from '../../lib/relations'
import type { Person, Relationship } from '../../types/domain'

export function downloadGedcom(
  persons: Record<string, Person>,
  relationships: Record<string, Relationship>,
): void {
  const text = exportGedcom(persons, relationships)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'семейное-древо.ged'
  a.click()
  URL.revokeObjectURL(a.href)
}

// Импорт: создаёт персон и связи из GEDCOM. Возвращает количество добавленного.
// created_by/user_id форсируются серверным гардом (guard_person_insert).
export async function importGedcom(text: string): Promise<{ persons: number; relations: number }> {
  const { individuals, families } = parseGedcom(text)
  if (individuals.length === 0) return { persons: 0, relations: 0 }

  // Раскладываем импортируемых по простой сетке, чтобы не легли в одну точку
  const cols = Math.ceil(Math.sqrt(individuals.length))
  const rows = individuals.map((ind, i) => ({
    first_name: ind.first_name || 'Без имени',
    last_name: ind.last_name,
    gender: ind.gender,
    birth_date: ind.birth_date,
    birth_place: ind.birth_place,
    death_date: ind.death_date,
    pos_x: (i % cols) * 200,
    pos_y: Math.floor(i / cols) * 200,
  }))

  const { data, error } = await supabase.from('persons').insert(rows).select('id')
  if (error || !data) throw error ?? new Error('insert failed')

  // xref из GEDCOM → новый uuid в БД (порядок insert сохраняется)
  const idByXref = new Map(individuals.map((ind, i) => [ind.xref, (data[i] as { id: string }).id]))
  const rel: Omit<Relationship, 'id' | 'created_at'>[] = []

  for (const fam of families) {
    const parents = [fam.husb, fam.wife].filter((x): x is string => !!x).map((x) => idByXref.get(x))
    for (const c of fam.children) {
      const childId = idByXref.get(c)
      if (!childId) continue
      for (const parentId of parents) {
        if (parentId) rel.push({ from_person_id: parentId, to_person_id: childId, type: 'parent', is_ex: false })
      }
    }
    if (parents.length === 2 && parents[0] && parents[1]) {
      const [a, b] = normalizeSpousePair(parents[0], parents[1])
      rel.push({ from_person_id: a, to_person_id: b, type: 'spouse', is_ex: false })
    }
  }

  if (rel.length > 0) {
    const { error: relErr } = await supabase.from('relationships').insert(rel)
    if (relErr) throw relErr
  }
  return { persons: rows.length, relations: rel.length }
}
