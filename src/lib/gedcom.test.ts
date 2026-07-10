import { describe, expect, it } from 'vitest'
import { exportGedcom, parseGedcom } from './gedcom'
import type { Person, Relationship, RelType } from '../types/domain'

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  first_name: id,
  middle_name: null,
  last_name: null,
  maiden_name: null,
  gender: null,
  birth_date: null,
  death_date: null,
  birth_place: null,
  bio: null,
  education: null,
  occupation: null,
  achievements: null,
  residence: null,
  military_status: null,
  military_notes: null,
  user_id: null,
  avatar_photo_id: null,
  pos_x: 0,
  pos_y: 0,
  created_by: null,
  created_at: '',
  updated_at: '',
  ...over,
})

let seq = 0
const rel = (from: string, to: string, type: RelType, isEx = false): Relationship => ({
  id: `r${seq++}`,
  from_person_id: from,
  to_person_id: to,
  type,
  is_ex: isEx,
  created_at: '',
})

const rec = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x]))

describe('exportGedcom', () => {
  // папа(m)+мама(f) -> ребёнок; папа и мама супруги
  const persons = rec([
    person('papa', { first_name: 'Иван', last_name: 'Петров', gender: 'm', birth_date: '1960-03-05' }),
    person('mama', { first_name: 'Анна', last_name: 'Петрова', gender: 'f' }),
    person('kid', { first_name: 'Пётр', last_name: 'Петров', gender: 'm' }),
  ])
  const rels = rec([
    rel('papa', 'kid', 'parent'),
    rel('mama', 'kid', 'parent'),
    rel('papa', 'mama', 'spouse'),
  ])
  const ged = exportGedcom(persons, rels)

  it('содержит заголовок и трейлер', () => {
    expect(ged).toMatch(/^0 HEAD/)
    expect(ged.trimEnd()).toMatch(/0 TRLR$/)
  })
  it('имя и дата в формате GEDCOM', () => {
    expect(ged).toContain('1 NAME Иван /Петров/')
    expect(ged).toContain('2 DATE 5 MAR 1960')
    expect(ged).toContain('1 SEX M')
  })
  it('семья с HUSB/WIFE/CHIL', () => {
    expect(ged).toMatch(/0 @F1@ FAM/)
    expect(ged).toContain('1 HUSB @I1@')
    expect(ged).toContain('1 WIFE @I2@')
    expect(ged).toContain('1 CHIL @I3@')
  })
})

describe('parseGedcom', () => {
  it('разбирает INDI и FAM обратно', () => {
    const persons = rec([
      person('a', { first_name: 'Иван', last_name: 'Петров', gender: 'm', birth_date: '1960-03-05', birth_place: 'Москва' }),
      person('b', { first_name: 'Анна', last_name: 'Петрова', gender: 'f' }),
      person('c', { first_name: 'Пётр', last_name: 'Петров', gender: 'm' }),
    ])
    const rels = rec([
      rel('a', 'c', 'parent'),
      rel('b', 'c', 'parent'),
      rel('a', 'b', 'spouse'),
    ])
    const { individuals, families } = parseGedcom(exportGedcom(persons, rels))
    expect(individuals).toHaveLength(3)
    const ivan = individuals.find((i) => i.first_name === 'Иван')!
    expect(ivan.last_name).toBe('Петров')
    expect(ivan.gender).toBe('m')
    expect(ivan.birth_date).toBe('1960-03-05')
    expect(ivan.birth_place).toBe('Москва')
    expect(families).toHaveLength(1)
    expect(families[0].children).toHaveLength(1)
    expect(families[0].husb).toBeDefined()
    expect(families[0].wife).toBeDefined()
  })
})
