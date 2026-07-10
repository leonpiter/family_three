import { describe, expect, it } from 'vitest'
import { ageInfo, formatVital, nextBirthday } from './person'
import type { Person } from '../types/domain'

const person = (over: Partial<Person>): Person => ({
  id: 'x',
  first_name: 'Имя',
  middle_name: null,
  last_name: null,
  maiden_name: null,
  gender: null,
  birth_date: null,
  death_date: null,
  birth_date_precision: 'day',
  death_date_precision: 'day',
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

const NOW = new Date('2026-07-10')

describe('ageInfo', () => {
  it('живой возраст с правильным склонением', () => {
    expect(ageInfo(person({ birth_date: '1984-06-19' }), NOW)).toBe('42 года')
    expect(ageInfo(person({ birth_date: '2005-01-01' }), NOW)).toBe('21 год')
    expect(ageInfo(person({ birth_date: '1985-01-01' }), NOW)).toBe('41 год')
  })
  it('день рождения ещё не наступил в этом году — на год меньше', () => {
    expect(ageInfo(person({ birth_date: '1984-12-31' }), NOW)).toBe('41 год')
  })
  it('ушедший: прожитые годы и «было бы»', () => {
    expect(ageInfo(person({ birth_date: '1955-01-01', death_date: '2020-01-01' }), NOW)).toBe(
      'прожил(а) 65 лет · было бы 71',
    )
  })
  it('без даты рождения — null', () => {
    expect(ageInfo(person({}), NOW)).toBeNull()
  })
  it('точность «год» — приблизительный возраст с ≈', () => {
    expect(ageInfo(person({ birth_date: '1917-01-01', birth_date_precision: 'year' }), NOW)).toBe(
      '≈109 лет',
    )
  })
})

describe('formatVital', () => {
  it('точная дата — полный формат', () => {
    expect(formatVital('1960-03-05', 'day')).toBe('5 марта 1960')
  })
  it('точность «год» — только год', () => {
    expect(formatVital('1917-01-01', 'year')).toBe('1917')
  })
  it('пусто — null', () => {
    expect(formatVital(null, 'day')).toBeNull()
  })
})

describe('nextBirthday с точностью «год»', () => {
  it('не считается для приблизительной даты', () => {
    expect(
      nextBirthday(person({ birth_date: '1984-07-20', birth_date_precision: 'year' }), NOW),
    ).toBeNull()
  })
})

describe('nextBirthday', () => {
  it('считает дни до ближайшего ДР и сколько исполнится', () => {
    const nb = nextBirthday(person({ birth_date: '1984-07-20' }), NOW)
    expect(nb?.inDays).toBe(10)
    expect(nb?.turns).toBe(42)
  })
  it('ДР сегодня — 0 дней', () => {
    expect(nextBirthday(person({ birth_date: '1990-07-10' }), NOW)?.inDays).toBe(0)
  })
  it('ДР уже прошёл — переносит на следующий год', () => {
    const nb = nextBirthday(person({ birth_date: '1984-07-01' }), NOW)
    expect(nb!.inDays).toBeGreaterThan(300)
  })
  it('для ушедших не считается', () => {
    expect(nextBirthday(person({ birth_date: '1955-01-01', death_date: '2020-01-01' }), NOW)).toBeNull()
  })
})
