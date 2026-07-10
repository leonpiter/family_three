import type { Edge, Node } from '@xyflow/react'
import type { Person, Relationship } from '../../types/domain'
import { exSpouseEdgeProps, parentEdgeProps, spouseEdgeProps } from './edgeStyles'

export type PersonFlowNode = Node<
  { person: Person; dropTarget?: boolean; avatarUrl?: string; dimmed?: boolean },
  'person'
>

// Чистая функция: доменные данные -> ноды и рёбра React Flow.
export function mapToFlow(persons: Person[], relationships: Relationship[]) {
  const byId = new Map(persons.map((p) => [p.id, p]))

  const nodes: PersonFlowNode[] = persons.map((p) => ({
    id: p.id,
    type: 'person' as const,
    position: { x: p.pos_x, y: p.pos_y },
    data: { person: p },
  }))

  const edges: Edge[] = relationships.map((r) => {
    if (r.type === 'parent') {
      return {
        id: r.id,
        source: r.from_person_id,
        target: r.to_person_id,
        sourceHandle: 'b',
        targetHandle: 't',
        ...parentEdgeProps,
      }
    }
    // Супруги: горизонтальная линия между обращёнными друг к другу боками
    const from = byId.get(r.from_person_id)
    const to = byId.get(r.to_person_id)
    const fromIsLeft = (from?.pos_x ?? 0) <= (to?.pos_x ?? 0)
    return {
      id: r.id,
      source: r.from_person_id,
      target: r.to_person_id,
      sourceHandle: fromIsLeft ? 'r' : 'l',
      targetHandle: fromIsLeft ? 'l' : 'r',
      ...(r.is_ex ? exSpouseEdgeProps : spouseEdgeProps),
    }
  })

  return { nodes, edges }
}
