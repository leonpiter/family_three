import { MarkerType, type Edge } from '@xyflow/react'

// parent: сплошная серая со стрелкой к ребёнку; spouse: тёплый пунктир без стрелки.
export const parentEdgeProps: Partial<Edge> = {
  type: 'smoothstep',
  style: { stroke: '#9ca3af', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af', width: 18, height: 18 },
  interactionWidth: 16, // зона клика шире тонкой линии
}

export const spouseEdgeProps: Partial<Edge> = {
  type: 'straight',
  style: { stroke: '#c2410c', strokeWidth: 1.5, strokeDasharray: '6 4' },
  interactionWidth: 16,
}
