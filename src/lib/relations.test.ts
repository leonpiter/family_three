import { describe, expect, it } from 'vitest'
import { normalizeSpousePair } from './relations'

describe('normalizeSpousePair', () => {
  it('возвращает пару в стабильном порядке независимо от направления', () => {
    expect(normalizeSpousePair('aaa', 'bbb')).toEqual(['aaa', 'bbb'])
    expect(normalizeSpousePair('bbb', 'aaa')).toEqual(['aaa', 'bbb'])
  })
})
