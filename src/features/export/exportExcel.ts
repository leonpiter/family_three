import dayjs from 'dayjs'
import { getChildren, getParents, getSiblings, getSpouses } from '../../lib/relations'
import { fullNameLong } from '../../lib/person'
import type { Person, Relationship } from '../../types/domain'

const d = (v: string | null) => (v ? dayjs(v).format('DD.MM.YYYY') : '')

// Выгрузка всей базы в Excel: лист «Родственники» (каждый человек со своими
// родителями/супругами/детьми по именам) + лист «Связи» (кто-кем-кому).
// xlsx подгружается динамически — в основной бандл не попадает.
export async function exportToExcel(
  persons: Record<string, Person>,
  relationships: Record<string, Relationship>,
): Promise<void> {
  const XLSX = await import('xlsx')

  const name = (id: string) => {
    const p = persons[id]
    return p ? fullNameLong(p) : '—'
  }

  const list = Object.values(persons).sort((a, b) =>
    fullNameLong(a).localeCompare(fullNameLong(b), 'ru'),
  )

  const peopleRows = list.map((p) => ({
    Фамилия: p.last_name ?? '',
    Имя: p.first_name,
    Отчество: p.middle_name ?? '',
    'Девичья фамилия': p.maiden_name ?? '',
    Пол: p.gender === 'm' ? 'муж.' : p.gender === 'f' ? 'жен.' : '',
    'Дата рождения': d(p.birth_date),
    'Дата смерти': d(p.death_date),
    'Место рождения': p.birth_place ?? '',
    'Где жил': p.residence ?? '',
    Образование: p.education ?? '',
    'Кем работал': p.occupation ?? '',
    Достижения: p.achievements ?? '',
    Служба:
      p.military_status === 'fought'
        ? 'воевал'
        : p.military_status === 'served'
          ? 'служил'
          : p.military_status === 'not_served'
            ? 'не служил'
            : '',
    'Боевой путь': p.military_notes ?? '',
    Родители: getParents(p.id, relationships)
      .map((l) => name(l.personId))
      .join(', '),
    'Супруг(и)': getSpouses(p.id, relationships)
      .map(
        (l) => name(l.personId) + (relationships[l.relationshipId]?.is_ex ? ' (бывшие)' : ''),
      )
      .join(', '),
    Дети: getChildren(p.id, relationships)
      .map((l) => name(l.personId))
      .join(', '),
    'Братья и сёстры': getSiblings(p.id, relationships).map(name).join(', '),
    Биография: p.bio ?? '',
  }))

  const relRows = Object.values(relationships).map((r) => {
    if (r.type === 'parent') {
      const from = persons[r.from_person_id]
      const term = from?.gender === 'm' ? 'отец' : from?.gender === 'f' ? 'мать' : 'родитель'
      return { Кто: name(r.from_person_id), 'Кем приходится': term, Кому: name(r.to_person_id) }
    }
    return {
      Кто: name(r.from_person_id),
      'Кем приходится': r.is_ex ? 'бывшие супруги' : 'супруги',
      Кому: name(r.to_person_id),
    }
  })

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(peopleRows)
  ws1['!cols'] = [
    18, 14, 16, 16, 6, 12, 12, 22, 22, 24, 24, 30, 12, 30, 30, 30, 30, 30, 50,
  ].map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Родственники')
  const ws2 = XLSX.utils.json_to_sheet(relRows)
  ws2['!cols'] = [30, 18, 30].map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(wb, ws2, 'Связи')

  XLSX.writeFile(wb, `семейное-древо-${dayjs().format('YYYY-MM-DD')}.xlsx`)
}
