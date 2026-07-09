import { describe, expect, it } from 'vitest'
import {
  getChildren,
  getParents,
  getSiblings,
  getSpouses,
  normalizeSpousePair,
} from './relations'
import type { Relationship, RelType } from '../types/domain'

let seq = 0
const rel = (from: string, to: string, type: RelType): Relationship => ({
  id: `r${seq++}`,
  from_person_id: from,
  to_person_id: to,
  type,
  is_ex: false,
  created_at: '',
})

const toRecord = (rels: Relationship[]): Record<string, Relationship> =>
  Object.fromEntries(rels.map((r) => [r.id, r]))

describe('normalizeSpousePair', () => {
  it('возвращает пару в стабильном порядке независимо от направления', () => {
    expect(normalizeSpousePair('aaa', 'bbb')).toEqual(['aaa', 'bbb'])
    expect(normalizeSpousePair('bbb', 'aaa')).toEqual(['aaa', 'bbb'])
  })
})

describe('селекторы родственных связей', () => {
  // папа+мама -> ego, sib; ego -S- жена; ego -> ребёнок
  const rels = toRecord([
    rel('papa', 'ego', 'parent'),
    rel('mama', 'ego', 'parent'),
    rel('papa', 'sib', 'parent'),
    rel('mama', 'sib', 'parent'),
    rel('ego', 'wife', 'spouse'),
    rel('ego', 'kid', 'parent'),
  ])

  it('getParents возвращает родителей со ссылкой на связь', () => {
    const parents = getParents('ego', rels)
    expect(parents.map((p) => p.personId).sort()).toEqual(['mama', 'papa'])
    expect(parents.every((p) => p.relationshipId)).toBe(true)
  })

  it('getChildren', () => {
    expect(getChildren('ego', rels).map((c) => c.personId)).toEqual(['kid'])
    expect(getChildren('papa', rels).map((c) => c.personId).sort()).toEqual(['ego', 'sib'])
  })

  it('getSpouses работает с обеих сторон ребра', () => {
    expect(getSpouses('ego', rels)[0].personId).toBe('wife')
    expect(getSpouses('wife', rels)[0].personId).toBe('ego')
  })

  it('getSiblings: dedup через двух общих родителей, без ego', () => {
    expect(getSiblings('ego', rels)).toEqual(['sib'])
  })

  it('пустые случаи', () => {
    expect(getParents('wife', rels)).toEqual([])
    expect(getSiblings('wife', rels)).toEqual([])
  })
})
