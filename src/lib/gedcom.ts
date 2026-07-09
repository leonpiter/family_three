import type { Gender, Person, Relationship } from '../types/domain'
import { getParents } from './relations'

// GEDCOM 5.5.1 — стандартный генеалогический формат для обмена с MyHeritage,
// Ancestry, «Древо Жизни» и др. Модель БД (parent/spouse-рёбра) собирается
// в семьи (FAM с HUSB/WIFE/CHIL), персоны — в INDI.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function gedDate(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return null
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

function parseGedDate(s: string): string | null {
  const m = /(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/.exec(s.toUpperCase())
  if (m) {
    const mon = MONTHS.indexOf(m[2])
    if (mon >= 0)
      return `${m[3]}-${String(mon + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  const y = /(\d{4})/.exec(s)
  return y ? `${y[1]}-01-01` : null
}

interface Family {
  parents: string[]
  children: string[]
  isEx: boolean
}

// --- ЭКСПОРТ ---
export function exportGedcom(
  persons: Record<string, Person>,
  relationships: Record<string, Relationship>,
): string {
  const list = Object.values(persons)
  const indiId = new Map(list.map((p, i) => [p.id, `I${i + 1}`]))

  // Семьи по набору родителей ребёнка + по супружеским парам
  const fams = new Map<string, Family>()
  const famKey = (ids: string[]) => [...ids].sort().join('+')
  const ensure = (ids: string[], isEx = false) => {
    const key = famKey(ids)
    let f = fams.get(key)
    if (!f) {
      f = { parents: [...ids].sort(), children: [], isEx }
      fams.set(key, f)
    }
    return f
  }

  for (const p of list) {
    const parentIds = getParents(p.id, relationships).map((l) => l.personId)
    if (parentIds.length > 0) ensure(parentIds.slice(0, 2)).children.push(p.id)
  }
  for (const r of Object.values(relationships)) {
    if (r.type === 'spouse') ensure([r.from_person_id, r.to_person_id], r.is_ex)
  }

  const famList = [...fams.values()]
  const famIdByKey = new Map(famList.map((f, i) => [famKey(f.parents), `F${i + 1}`]))

  const famsOf = (personId: string) =>
    famList
      .filter((f) => f.parents.includes(personId))
      .map((f) => famIdByKey.get(famKey(f.parents))!)
  const famcOf = (personId: string) => {
    const f = famList.find((f) => f.children.includes(personId))
    return f ? famIdByKey.get(famKey(f.parents)) : undefined
  }

  const lines: string[] = [
    '0 HEAD',
    '1 SOUR FamilyThree',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
  ]

  for (const p of list) {
    lines.push(`0 @${indiId.get(p.id)}@ INDI`)
    const given = [p.first_name, p.middle_name].filter(Boolean).join(' ')
    const surname = p.last_name ?? ''
    lines.push(`1 NAME ${given} /${surname}/`)
    if (p.maiden_name) lines.push(`2 SURN ${p.maiden_name}`)
    if (p.gender) lines.push(`1 SEX ${p.gender === 'm' ? 'M' : 'F'}`)
    const bd = gedDate(p.birth_date)
    if (bd || p.birth_place) {
      lines.push('1 BIRT')
      if (bd) lines.push(`2 DATE ${bd}`)
      if (p.birth_place) lines.push(`2 PLAC ${p.birth_place}`)
    }
    const dd = gedDate(p.death_date)
    if (dd) {
      lines.push('1 DEAT')
      lines.push(`2 DATE ${dd}`)
    }
    if (p.bio) lines.push(`1 NOTE ${p.bio.replace(/\n/g, ' ')}`)
    for (const fid of famsOf(p.id)) lines.push(`1 FAMS @${fid}@`)
    const fc = famcOf(p.id)
    if (fc) lines.push(`1 FAMC @${fc}@`)
  }

  for (const f of famList) {
    const fid = famIdByKey.get(famKey(f.parents))!
    lines.push(`0 @${fid}@ FAM`)
    // HUSB/WIFE по полу; неизвестный пол — в оставшийся слот
    let husb: string | undefined
    let wife: string | undefined
    for (const pid of f.parents) {
      const g = persons[pid]?.gender
      if (g === 'm' && !husb) husb = pid
      else if (g === 'f' && !wife) wife = pid
      else if (!husb) husb = pid
      else if (!wife) wife = pid
    }
    if (husb) lines.push(`1 HUSB @${indiId.get(husb)}@`)
    if (wife) lines.push(`1 WIFE @${indiId.get(wife)}@`)
    for (const c of f.children) lines.push(`1 CHIL @${indiId.get(c)}@`)
    if (f.isEx) lines.push('1 NOTE Бывшие супруги')
  }

  lines.push('0 TRLR')
  return lines.join('\n')
}

// --- ПАРСЕР (для импорта) ---
export interface GedIndi {
  xref: string
  first_name: string
  last_name: string | null
  gender: Gender | null
  birth_date: string | null
  birth_place: string | null
  death_date: string | null
}
export interface GedFam {
  husb?: string
  wife?: string
  children: string[]
}

export function parseGedcom(text: string): { individuals: GedIndi[]; families: GedFam[] } {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .map((l) => {
      const m = /^(\d+)\s+(@[^@]+@\s+)?(\S+)(?:\s+(.*))?$/.exec(l)
      if (!m) return null
      return { level: Number(m[1]), xref: m[2]?.trim() ?? null, tag: m[3], value: m[4] ?? '' }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const individuals: GedIndi[] = []
  const families: GedFam[] = []
  let indi: GedIndi | null = null
  let fam: GedFam | null = null
  let sub: 'BIRT' | 'DEAT' | null = null

  for (const r of rows) {
    if (r.level === 0) {
      if (indi) individuals.push(indi)
      if (fam) families.push(fam)
      indi = null
      fam = null
      sub = null
      if (r.tag === 'INDI' && r.xref) {
        indi = {
          xref: r.xref.replace(/[@\s]/g, ''),
          first_name: '',
          last_name: null,
          gender: null,
          birth_date: null,
          birth_place: null,
          death_date: null,
        }
      } else if (r.tag === 'FAM' && r.xref) {
        fam = { children: [] }
      }
      continue
    }
    if (indi) {
      if (r.level === 1) {
        sub = null
        if (r.tag === 'NAME') {
          const m = /^([^/]*)\/([^/]*)\//.exec(r.value)
          if (m) {
            indi.first_name = m[1].trim()
            indi.last_name = m[2].trim() || null
          } else indi.first_name = r.value.trim()
        } else if (r.tag === 'SEX') {
          indi.gender = r.value.startsWith('M') ? 'm' : r.value.startsWith('F') ? 'f' : null
        } else if (r.tag === 'BIRT') sub = 'BIRT'
        else if (r.tag === 'DEAT') sub = 'DEAT'
      } else if (r.level === 2) {
        if (sub === 'BIRT' && r.tag === 'DATE') indi.birth_date = parseGedDate(r.value)
        else if (sub === 'BIRT' && r.tag === 'PLAC') indi.birth_place = r.value.trim() || null
        else if (sub === 'DEAT' && r.tag === 'DATE') indi.death_date = parseGedDate(r.value)
      }
    } else if (fam && r.level === 1) {
      const ref = r.value.replace(/[@\s]/g, '')
      if (r.tag === 'HUSB') fam.husb = ref
      else if (r.tag === 'WIFE') fam.wife = ref
      else if (r.tag === 'CHIL') fam.children.push(ref)
    }
  }
  if (indi) individuals.push(indi)
  if (fam) families.push(fam)
  return { individuals, families }
}
