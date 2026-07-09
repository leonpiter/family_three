import { describe, expect, it } from 'vitest'
import { mapToFlow } from './mapToFlow'
import type { Person, Relationship, RelType } from '../../types/domain'

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  first_name: 'Имя',
  middle_name: null,
  last_name: null,
  maiden_name: null,
  gender: null,
  birth_date: null,
  death_date: null,
  birth_place: null,
  bio: null,
  user_id: null,
  avatar_photo_id: null,
  pos_x: 0,
  pos_y: 0,
  created_by: null,
  created_at: '',
  updated_at: '',
  ...over,
})

const rel = (id: string, from: string, to: string, type: RelType): Relationship => ({
  id,
  from_person_id: from,
  to_person_id: to,
  type,
  created_at: '',
})

describe('mapToFlow', () => {
  it('превращает персон в ноды с сохранёнными позициями', () => {
    const { nodes } = mapToFlow([person('a', { pos_x: 100, pos_y: 200 })], [])
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      id: 'a',
      type: 'person',
      position: { x: 100, y: 200 },
    })
    expect(nodes[0].data.person.first_name).toBe('Имя')
  })

  it('родительское ребро — smoothstep со стрелкой от родителя к ребёнку', () => {
    const { edges } = mapToFlow(
      [person('a'), person('b')],
      [rel('r1', 'a', 'b', 'parent')],
    )
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('a')
    expect(edges[0].target).toBe('b')
    expect(edges[0].type).toBe('smoothstep')
    expect(edges[0].markerEnd).toBeDefined()
  })

  it('супружеское ребро — пунктирная прямая без стрелки', () => {
    const { edges } = mapToFlow(
      [person('a'), person('b')],
      [rel('r1', 'a', 'b', 'spouse')],
    )
    expect(edges[0].type).toBe('straight')
    expect(edges[0].style?.strokeDasharray).toBeDefined()
    expect(edges[0].markerEnd).toBeUndefined()
  })

  it('ребро использует id связи (для последующего удаления)', () => {
    const { edges } = mapToFlow(
      [person('a'), person('b')],
      [rel('rel-42', 'a', 'b', 'parent')],
    )
    expect(edges[0].id).toBe('rel-42')
  })
})
