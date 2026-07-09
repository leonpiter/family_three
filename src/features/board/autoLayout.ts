import Dagre from '@dagrejs/dagre'
import type { Person, Relationship } from '../../types/domain'
import { normalizeSpousePair } from '../../lib/relations'

const NODE_W = 112
const NODE_H = 130

export interface Pos {
  id: string
  x: number
  y: number
}

// Раскладка по поколениям: parent-рёбра задают уровни (dagre, сверху вниз),
// супруги стягиваются в один ранг невидимым ребром малого веса.
export function computeTreeLayout(
  persons: Person[],
  relationships: Relationship[],
): Pos[] {
  const g = new Dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 40, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const p of persons) g.setNode(p.id, { width: NODE_W, height: NODE_H })

  for (const r of relationships) {
    if (!persons.find((p) => p.id === r.from_person_id)) continue
    if (!persons.find((p) => p.id === r.to_person_id)) continue
    if (r.type === 'parent') {
      g.setEdge(r.from_person_id, r.to_person_id, { weight: 2, minlen: 1 })
    }
  }
  // Действующих супругов держим рядом (один ранг): ребро с нулевой длиной
  const seen = new Set<string>()
  for (const r of relationships) {
    if (r.type !== 'spouse' || r.is_ex) continue
    const [a, b] = normalizeSpousePair(r.from_person_id, r.to_person_id)
    const key = `${a}|${b}`
    if (seen.has(key) || !g.hasNode(a) || !g.hasNode(b)) continue
    seen.add(key)
    g.setEdge(a, b, { weight: 1, minlen: 0 })
  }

  Dagre.layout(g)

  return persons.map((p) => {
    const n = g.node(p.id)
    // dagre даёт центр — переводим в левый-верхний угол ноды
    return { id: p.id, x: (n?.x ?? 0) - NODE_W / 2, y: (n?.y ?? 0) - NODE_H / 2 }
  })
}
