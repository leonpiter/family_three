import type { Edge, Node } from '@xyflow/react'
import type { Person, Relationship } from '../../types/domain'
import { parentEdgeProps, spouseEdgeProps } from './edgeStyles'

export type PersonFlowNode = Node<
  { person: Person; dropTarget?: boolean; avatarUrl?: string },
  'person'
>

// Чистая функция: доменные данные -> ноды и рёбра React Flow.
export function mapToFlow(persons: Person[], relationships: Relationship[]) {
  const nodes: PersonFlowNode[] = persons.map((p) => ({
    id: p.id,
    type: 'person' as const,
    position: { x: p.pos_x, y: p.pos_y },
    data: { person: p },
  }))

  const edges: Edge[] = relationships.map((r) => ({
    id: r.id,
    source: r.from_person_id,
    target: r.to_person_id,
    ...(r.type === 'parent' ? parentEdgeProps : spouseEdgeProps),
  }))

  return { nodes, edges }
}
