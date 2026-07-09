import { useMemo, useState, type ReactNode } from 'react'
import { useBoardStore } from '../board/boardStore'
import { buildKinGraph, kinshipAll } from '../../lib/kinship'
import { getChildren, getParents, getSiblings, getSpouses } from '../../lib/relations'
import { fullName } from '../../lib/person'
import { STR } from '../../lib/strings'
import { Button } from '../../components/ui/Button'
import type { Person } from '../../types/domain'

// Блок «Родство» в сайдбаре: прямые группы + вычисленная «другая родня».
export function KinshipList({
  ego,
  onNavigate,
  onAddLink,
}: {
  ego: Person
  onNavigate: (personId: string) => void
  onAddLink: () => void
}) {
  const persons = useBoardStore((s) => s.persons)
  const relationships = useBoardStore((s) => s.relationships)
  const removeRelationship = useBoardStore((s) => s.removeRelationship)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const graph = useMemo(() => buildKinGraph(Object.values(relationships)), [relationships])
  const kin = useMemo(() => kinshipAll(ego.id, persons, graph), [ego.id, persons, graph])
  const termById = useMemo(() => new Map(kin.map((k) => [k.personId, k.term])), [kin])

  const parents = getParents(ego.id, relationships)
  const spouses = getSpouses(ego.id, relationships)
  const children = getChildren(ego.id, relationships)
  const siblings = getSiblings(ego.id, relationships)
  const directIds = new Set([
    ...parents.map((l) => l.personId),
    ...spouses.map((l) => l.personId),
    ...children.map((l) => l.personId),
    ...siblings,
  ])
  const others = kin.filter((k) => !directIds.has(k.personId))

  const row = (personId: string, relationshipId?: string) => {
    const p = persons[personId]
    if (!p) return null
    return (
      <div key={personId} className="flex items-center justify-between gap-2 py-0.5">
        <button
          onClick={() => onNavigate(personId)}
          className="min-w-0 flex-1 rounded px-1 py-0.5 text-left hover:bg-emerald-50"
        >
          <span className="text-sm text-neutral-800">{fullName(p)}</span>
          <span className="ml-2 text-xs text-neutral-400">{termById.get(personId) ?? ''}</span>
        </button>
        {relationshipId &&
          (confirmingId === relationshipId ? (
            <span className="flex shrink-0 items-center gap-2 text-xs">
              <button
                className="font-medium text-red-600 hover:underline"
                onClick={() => {
                  void removeRelationship(relationshipId)
                  setConfirmingId(null)
                }}
              >
                {STR.confirmDelete}
              </button>
              <button
                className="text-neutral-400 hover:underline"
                onClick={() => setConfirmingId(null)}
              >
                {STR.cancel}
              </button>
            </span>
          ) : (
            <button
              title={STR.deleteRelation}
              className="shrink-0 px-1 text-neutral-300 hover:text-red-500"
              onClick={() => setConfirmingId(relationshipId)}
            >
              ×
            </button>
          ))}
      </div>
    )
  }

  const section = (title: string, content: (ReactNode | null)[]) => {
    const items = content.filter(Boolean)
    if (items.length === 0) return null
    return (
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
          {title}
        </h4>
        {items}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900">{STR.kinshipTitle}</h3>
      {section(STR.groupParents, parents.map((l) => row(l.personId, l.relationshipId)))}
      {section(STR.groupSpouses, spouses.map((l) => row(l.personId, l.relationshipId)))}
      {section(STR.groupChildren, children.map((l) => row(l.personId, l.relationshipId)))}
      {section(STR.groupSiblings, siblings.map((id) => row(id)))}
      {section(STR.groupOtherKin, others.map((k) => row(k.personId)))}
      <Button variant="secondary" onClick={onAddLink} className="w-full">
        {STR.addRelation}
      </Button>
    </div>
  )
}
