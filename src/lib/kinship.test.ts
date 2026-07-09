import { describe, expect, it } from 'vitest'
import { buildKinGraph, kinshipAll, kinshipBetween, relationshipSentence } from './kinship'
import type { Gender, Person, Relationship, RelType } from '../types/domain'

const person = (id: string, gender: Gender | null, name = id): Person => ({
  id,
  first_name: name,
  last_name: null,
  maiden_name: null,
  gender,
  birth_date: null,
  death_date: null,
  birth_place: null,
  bio: null,
  user_id: null,
  pos_x: 0,
  pos_y: 0,
  created_by: null,
  created_at: '',
  updated_at: '',
})

let relSeq = 0
const rel = (from: string, to: string, type: RelType): Relationship => ({
  id: `r${relSeq++}`,
  from_person_id: from,
  to_person_id: to,
  type,
  created_at: '',
})

// Большая семья вокруг ego (мужчина):
//   pra(f) — мать деда ded; dedSister(f) — сестра деда
//   ded(m)+bab(f) — родители матери mother и дяди uncle; uncleSon(m) — сын дяди
//   father(m)+mother(f) — супруги, родители ego и sister
//   stepfather(m) — второй супруг матери (не родитель ego)
//   sister(f)+sisterHusband(m) — супруги; sisterSon(m) — сын сестры
//   ego(m)+wife(f) — супруги
//   wifeGrandpa(m) — отец отца жены; wifeFather(m)+wifeMother(f) — родители wife и wifeBrother(m)
//   wifeChild(f) — дочь только жены (падчерица ego)
//   son(m)+sonWife(f) — супруги; daughter(f) — дети ego и wife
//   grandson(m) — сын сына; ggson(m) — сын внука
//   stranger(m) — ни с кем не связан
const P: Record<string, Person> = Object.fromEntries(
  (
    [
      ['pra', 'f'],
      ['dedSister', 'f'],
      ['ded', 'm'],
      ['bab', 'f'],
      ['father', 'm'],
      ['mother', 'f'],
      ['stepfather', 'm'],
      ['uncle', 'm'],
      ['uncleSon', 'm'],
      ['sister', 'f'],
      ['sisterHusband', 'm'],
      ['sisterSon', 'm'],
      ['ego', 'm'],
      ['wife', 'f'],
      ['wifeGrandpa', 'm'],
      ['wifeFather', 'm'],
      ['wifeMother', 'f'],
      ['wifeBrother', 'm'],
      ['wifeChild', 'f'],
      ['son', 'm'],
      ['sonWife', 'f'],
      ['daughter', 'f'],
      ['grandson', 'm'],
      ['ggson', 'm'],
      ['stranger', 'm'],
    ] as [string, Gender][]
  ).map(([id, g]) => [id, person(id, g)]),
)

const RELS: Relationship[] = [
  rel('pra', 'ded', 'parent'),
  rel('pra', 'dedSister', 'parent'),
  rel('ded', 'mother', 'parent'),
  rel('bab', 'mother', 'parent'),
  rel('ded', 'uncle', 'parent'),
  rel('bab', 'uncle', 'parent'),
  rel('ded', 'bab', 'spouse'),
  rel('uncle', 'uncleSon', 'parent'),
  rel('father', 'ego', 'parent'),
  rel('mother', 'ego', 'parent'),
  rel('father', 'sister', 'parent'),
  rel('mother', 'sister', 'parent'),
  rel('father', 'mother', 'spouse'),
  rel('mother', 'stepfather', 'spouse'),
  rel('sister', 'sisterHusband', 'spouse'),
  rel('sister', 'sisterSon', 'parent'),
  rel('ego', 'wife', 'spouse'),
  rel('wifeGrandpa', 'wifeFather', 'parent'),
  rel('wifeFather', 'wife', 'parent'),
  rel('wifeMother', 'wife', 'parent'),
  rel('wifeFather', 'wifeBrother', 'parent'),
  rel('wifeMother', 'wifeBrother', 'parent'),
  rel('wife', 'wifeChild', 'parent'),
  rel('ego', 'son', 'parent'),
  rel('wife', 'son', 'parent'),
  rel('ego', 'daughter', 'parent'),
  rel('wife', 'daughter', 'parent'),
  rel('son', 'sonWife', 'spouse'),
  rel('son', 'grandson', 'parent'),
  rel('grandson', 'ggson', 'parent'),
]

const G = buildKinGraph(RELS)
const term = (ego: string, target: string) => kinshipBetween(ego, target, P, G)?.term

describe('kinship: ближний круг', () => {
  it('родители по полу', () => {
    expect(term('ego', 'father')).toBe('отец')
    expect(term('ego', 'mother')).toBe('мать')
  })
  it('дети по полу', () => {
    expect(term('ego', 'son')).toBe('сын')
    expect(term('ego', 'daughter')).toBe('дочь')
  })
  it('супруги в обе стороны', () => {
    expect(term('ego', 'wife')).toBe('жена')
    expect(term('wife', 'ego')).toBe('муж')
  })
  it('братья и сёстры (общий родитель)', () => {
    expect(term('ego', 'sister')).toBe('сестра')
    expect(term('sister', 'ego')).toBe('брат')
  })
  it('полукровные сиблинги — тот же термин', () => {
    const p = { a: person('a', 'm'), b: person('b', 'f'), pp: person('pp', 'f') }
    const g = buildKinGraph([rel('pp', 'a', 'parent'), rel('pp', 'b', 'parent')])
    expect(kinshipBetween('a', 'b', p, g)?.term).toBe('сестра')
  })
})

describe('kinship: поколения вверх и вниз', () => {
  it('дедушка/бабушка', () => {
    expect(term('ego', 'ded')).toBe('дедушка')
    expect(term('ego', 'bab')).toBe('бабушка')
  })
  it('прабабушка (пра-генератор)', () => {
    expect(term('ego', 'pra')).toBe('прабабушка')
  })
  it('внук и правнук', () => {
    expect(term('ego', 'grandson')).toBe('внук')
    expect(term('ego', 'ggson')).toBe('правнук')
  })
  it('обратное направление: ego для деда — внук', () => {
    expect(term('ded', 'ego')).toBe('внук')
  })
})

describe('kinship: дяди, племянники, кузены', () => {
  it('дядя', () => {
    expect(term('ego', 'uncle')).toBe('дядя')
  })
  it('племянник', () => {
    expect(term('ego', 'sisterSon')).toBe('племянник')
  })
  it('двоюродный брат', () => {
    expect(term('ego', 'uncleSon')).toBe('двоюродный брат')
  })
})

describe('kinship: свойственники (in-laws)', () => {
  it('родители жены — тесть и тёща', () => {
    expect(term('ego', 'wifeFather')).toBe('тесть')
    expect(term('ego', 'wifeMother')).toBe('тёща')
  })
  it('родители мужа — свёкор и свекровь', () => {
    expect(term('wife', 'father')).toBe('свёкор')
    expect(term('wife', 'mother')).toBe('свекровь')
  })
  it('жена сына — невестка (DS)', () => {
    expect(term('ego', 'sonWife')).toBe('невестка')
  })
  it('муж сестры — зять (UDS)', () => {
    expect(term('ego', 'sisterHusband')).toBe('зять')
  })
  it('отчим (супруг родителя без кровной связи)', () => {
    expect(term('ego', 'stepfather')).toBe('отчим')
  })
  it('коллизия: родной отец не становится отчимом (кратчайший путь)', () => {
    expect(term('ego', 'father')).toBe('отец')
  })
  it('падчерица (ребёнок супруга); родная дочь остаётся дочерью', () => {
    expect(term('ego', 'wifeChild')).toBe('падчерица')
    expect(term('ego', 'daughter')).toBe('дочь')
  })
})

describe('kinship: композиция и границы', () => {
  it('брат жены (SUD — композиция)', () => {
    expect(term('ego', 'wifeBrother')).toBe('брат жены')
  })
  it('дедушка жены (SUU — композиция с generic-суффиксом)', () => {
    expect(term('ego', 'wifeGrandpa')).toBe('дедушка жены')
  })
  it('сестра деда → «тётя матери» (композиция UUUD)', () => {
    expect(term('ego', 'dedSister')).toBe('тётя матери')
  })
  it('не связанные — null', () => {
    expect(kinshipBetween('ego', 'stranger', P, G)).toBeNull()
  })
  it('глубже maxDepth — null', () => {
    // pra от ggson — 5 шагов вверх
    expect(kinshipBetween('ggson', 'pra', P, G)).toBeNull()
  })
  it('два S подряд запрещены: «супруг супруга» — не родство', () => {
    // a -S- b, b -S- c: путь a→c только через два S подряд — блокирован
    const p = { a: person('a', 'm'), b: person('b', 'f'), c: person('c', 'm') }
    const g = buildKinGraph([rel('a', 'b', 'spouse'), rel('b', 'c', 'spouse')])
    expect(kinshipBetween('a', 'c', p, g)).toBeNull()
  })
  it('пол не указан — нейтральные термины', () => {
    const p = { a: person('a', null), b: person('b', 'm'), c: person('c', null) }
    const g = buildKinGraph([rel('a', 'b', 'parent'), rel('b', 'c', 'spouse')])
    expect(kinshipBetween('b', 'a', p, g)?.term).toBe('родитель')
    expect(kinshipBetween('b', 'c', p, g)?.term).toBe('супруг(а)')
  })
})

describe('kinshipAll', () => {
  it('не содержит ego, отсортирован по близости, термины верны', () => {
    const all = kinshipAll('ego', P, G)
    expect(all.find((k) => k.personId === 'ego')).toBeUndefined()
    expect(all.find((k) => k.personId === 'stranger')).toBeUndefined()
    const byId = Object.fromEntries(all.map((k) => [k.personId, k]))
    expect(byId.wifeFather.term).toBe('тесть')
    expect(byId.grandson.term).toBe('внук')
    for (let i = 1; i < all.length; i++) {
      expect(all[i].distance).toBeGreaterThanOrEqual(all[i - 1].distance)
    }
  })
})

describe('relationshipSentence', () => {
  it('parent-ребро с полом', () => {
    expect(relationshipSentence(rel('mother', 'ego', 'parent'), P)).toBe('mother — мать: ego')
    expect(relationshipSentence(rel('father', 'ego', 'parent'), P)).toBe('father — отец: ego')
  })
  it('spouse-ребро', () => {
    expect(relationshipSentence(rel('ego', 'wife', 'spouse'), P)).toBe('ego и wife — супруги')
  })
})
