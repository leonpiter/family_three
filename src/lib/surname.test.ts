import { describe, expect, it } from 'vitest'
import { canonicalSurname, surnameColor } from './surname'

describe('canonicalSurname', () => {
  it('женская форма приводится к мужской (одна ветка)', () => {
    expect(canonicalSurname('Мазелева')).toBe('Мазелев')
    expect(canonicalSurname('Телякова')).toBe('Теляков')
    expect(canonicalSurname('Иванова')).toBe('Иванов')
    expect(canonicalSurname('Пушкина')).toBe('Пушкин')
    expect(canonicalSurname('Достоевская')).toBe('Достоевский')
  })
  it('мужская форма остаётся без изменений', () => {
    expect(canonicalSurname('Мазелев')).toBe('Мазелев')
    expect(canonicalSurname('Теляков')).toBe('Теляков')
  })
  it('несклоняемые фамилии не трогаются', () => {
    expect(canonicalSurname('Рабизо')).toBe('Рабизо')
    expect(canonicalSurname('Курилович')).toBe('Курилович')
  })
  it('пусто → пустая строка', () => {
    expect(canonicalSurname(null)).toBe('')
    expect(canonicalSurname('  ')).toBe('')
  })
})

describe('surnameColor', () => {
  it('одинаковый цвет у мужской и женской формы одной фамилии', () => {
    expect(surnameColor('Мазелев')).toBe(surnameColor('Мазелева'))
    expect(surnameColor('Теляков')).toBe(surnameColor('Телякова'))
  })
  it('разные фамилии — как правило разные цвета', () => {
    expect(surnameColor('Рабизо')).not.toBe(surnameColor('Мазелев'))
  })
  it('без фамилии — null', () => {
    expect(surnameColor(null)).toBeNull()
  })
})
