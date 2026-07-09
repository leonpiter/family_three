import { useCallback, useEffect, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useBoardStore } from './boardStore'
import { mapToFlow, type PersonFlowNode } from './mapToFlow'
import { PersonNode } from './PersonNode'
import { PersonDialog } from './PersonDialog'
import { ConnectTypeDialog } from './ConnectTypeDialog'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { EdgePopover } from './EdgePopover'
import { linkByRole, roleGender, rolePosition, type RelativeRole } from './addRelative'
import { PersonSidebar } from '../person/PersonSidebar'
import { useAvatars } from '../photos/useAvatars'
import { anyModalOpen } from '../../components/ui/Modal'
import { getParents } from '../../lib/relations'
import { personToInput } from '../../lib/person'
import { STR } from '../../lib/strings'
import { Button } from '../../components/ui/Button'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import type { Person } from '../../types/domain'

const nodeTypes = { person: PersonNode }

function Board() {
  const persons = useBoardStore((s) => s.persons)
  const relationships = useBoardStore((s) => s.relationships)
  const loading = useBoardStore((s) => s.loading)
  const loaded = useBoardStore((s) => s.loaded)
  const loadAll = useBoardStore((s) => s.loadAll)
  const createPerson = useBoardStore((s) => s.createPerson)
  const updatePerson = useBoardStore((s) => s.updatePerson)
  const movePersons = useBoardStore((s) => s.movePersons)
  const addRelationship = useBoardStore((s) => s.addRelationship)
  const removeRelationship = useBoardStore((s) => s.removeRelationship)
  const selectedPersonId = useBoardStore((s) => s.selectedPersonId)
  const selectPerson = useBoardStore((s) => s.selectPerson)
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<PersonFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapToFlow([], []).edges)

  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null)
  const [editPersonId, setEditPersonId] = useState<string | null>(null)
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; personId: string } | null>(null)
  const [edgePop, setEdgePop] = useState<{ x: number; y: number; relId: string } | null>(null)
  const [linkFrom, setLinkFrom] = useState<string | null>(null)
  const [addRel, setAddRel] = useState<{ role: RelativeRole; egoId: string } | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  useEffect(() => {
    void loadAll()
    // MVP без Realtime: обновляем данные, когда вкладка снова становится видимой.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadAll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadAll])

  useEffect(() => {
    const flow = mapToFlow(Object.values(persons), Object.values(relationships))
    setNodes(flow.nodes)
    setEdges(flow.edges)
  }, [persons, relationships, setNodes, setEdges])

  // Esc-координатор: модалки и меню закрывают себя сами; здесь — link-режим и сайдбар.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (anyModalOpen()) return
      if (menu || edgePop) return // закроются собственными обработчиками
      if (linkFrom) setLinkFrom(null)
      else if (selectedPersonId) selectPerson(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu, edgePop, linkFrom, selectedPersonId, selectPerson])

  const hasRelations = useCallback(
    (id: string) =>
      Object.values(relationships).some(
        (r) => r.from_person_id === id || r.to_person_id === id,
      ),
    [relationships],
  )

  const avatars = useAvatars(persons)

  if (loading && !loaded) return <FullScreenSpinner />

  const closeOverlays = () => {
    setMenu(null)
    setEdgePop(null)
  }

  const addAtCenter = () =>
    setCreateAt(
      screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
    )

  const buildMenuItems = (ego: Person): MenuItem[] => {
    const parentLinks = getParents(ego.id, relationships)
    const parentGenders = parentLinks.map((l) => persons[l.personId]?.gender)
    const hasFather = parentGenders.includes('m') || parentLinks.length >= 2
    const hasMother = parentGenders.includes('f') || parentLinks.length >= 2
    const noParents = parentLinks.length === 0
    const spouseLabel =
      ego.gender === 'm' ? STR.roleWife : ego.gender === 'f' ? STR.roleHusband : STR.roleSpouse

    const roleItem = (
      role: RelativeRole,
      label: string,
      disabled = false,
      hint?: string,
    ): MenuItem => ({
      label,
      disabled,
      hint,
      onClick: () => setAddRel({ role, egoId: ego.id }),
    })

    return [
      {
        label: STR.addRelativeMenu,
        submenu: [
          roleItem('father', STR.roleFather, hasFather, hasFather ? STR.hasFatherHint : undefined),
          roleItem('mother', STR.roleMother, hasMother, hasMother ? STR.hasMotherHint : undefined),
          roleItem('spouse', spouseLabel),
          roleItem('son', STR.roleSon),
          roleItem('daughter', STR.roleDaughter),
          roleItem('brother', STR.roleBrother, noParents, noParents ? STR.needParentsHint : undefined),
          roleItem('sister', STR.roleSister, noParents, noParents ? STR.needParentsHint : undefined),
        ],
      },
      { label: STR.linkExisting, onClick: () => setLinkFrom(ego.id) },
      { label: STR.edit, onClick: () => setEditPersonId(ego.id) },
    ]
  }

  // Аватары + подсветка цели при перетаскивании несвязанной ноды
  const displayNodes = nodes.map((n) => {
    const avatarUrl = avatars.get(n.id)
    const dropTarget = n.id === dropTargetId
    if (!avatarUrl && !dropTarget) return n
    return { ...n, data: { ...n.data, avatarUrl, dropTarget } }
  })

  const editPerson = editPersonId ? persons[editPersonId] : null
  const addRelEgo = addRel ? persons[addRel.egoId] : null

  return (
    <div className={`relative h-full w-full ${linkFrom ? 'linking' : ''}`}>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={(_e, node) => {
          if (hasRelations(node.id)) return
          const hit = getIntersectingNodes(node)[0]?.id ?? null
          if (hit !== dropTargetId) setDropTargetId(hit)
        }}
        onNodeDragStop={(_e, node, dragged) => {
          movePersons(dragged.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })))
          // Drop-to-connect: несвязанную ноду бросили на другую
          if (dropTargetId && !hasRelations(node.id))
            setPendingConn({ source: node.id, target: dropTargetId })
          setDropTargetId(null)
        }}
        onConnect={(c: Connection) => {
          if (c.source && c.target && c.source !== c.target)
            setPendingConn({ source: c.source, target: c.target })
        }}
        onNodeClick={(_e, node) => {
          closeOverlays()
          if (linkFrom) {
            if (node.id !== linkFrom) setPendingConn({ source: linkFrom, target: node.id })
            setLinkFrom(null)
            return
          }
          selectPerson(node.id)
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault()
          setEdgePop(null)
          setMenu({ x: e.clientX, y: e.clientY, personId: node.id })
        }}
        onEdgeClick={(e, edge) => {
          closeOverlays()
          setEdgePop({ x: e.clientX, y: e.clientY, relId: edge.id })
        }}
        onPaneClick={(e) => {
          closeOverlays()
          if (linkFrom) {
            setLinkFrom(null)
            return
          }
          // двойной клик по пустому полотну = создать персону в этой точке
          if (e.detail === 2)
            setCreateAt(screenToFlowPosition({ x: e.clientX, y: e.clientY }))
          else selectPerson(null)
        }}
        onMoveStart={closeOverlays}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          className="hidden md:block"
          nodeColor={(n) => {
            const g = (n.data as { person?: Person }).person?.gender
            return g === 'm' ? '#bae6fd' : g === 'f' ? '#fecdd3' : '#e5e7eb'
          }}
        />
        <Panel position="top-left">
          <Button onClick={addAtCenter}>{STR.addPerson}</Button>
        </Panel>
        {linkFrom && (
          <Panel position="top-center">
            <p className="rounded-xl bg-emerald-700 px-4 py-2 text-sm text-white shadow-md">
              {STR.linkModeHint}
            </p>
          </Panel>
        )}
        {loaded && Object.keys(persons).length === 0 && (
          <Panel position="top-center" className="mt-20">
            <p className="rounded-xl bg-white/90 px-4 py-2 text-sm text-neutral-500 shadow-sm">
              {STR.boardEmpty}
            </p>
          </Panel>
        )}
      </ReactFlow>

      {selectedPersonId && persons[selectedPersonId] && (
        <PersonSidebar
          person={persons[selectedPersonId]}
          avatarUrl={avatars.get(selectedPersonId)}
          onClose={() => selectPerson(null)}
          onRequestLink={(targetId) =>
            setPendingConn({ source: selectedPersonId, target: targetId })
          }
        />
      )}

      {menu && persons[menu.personId] && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems(persons[menu.personId])}
          onClose={() => setMenu(null)}
        />
      )}

      {edgePop && relationships[edgePop.relId] && (
        <EdgePopover
          x={edgePop.x}
          y={edgePop.y}
          rel={relationships[edgePop.relId]}
          persons={persons}
          onDelete={() => {
            void removeRelationship(edgePop.relId)
            setEdgePop(null)
          }}
          onClose={() => setEdgePop(null)}
        />
      )}

      {createAt && (
        <PersonDialog
          title={STR.createPersonTitle}
          submitLabel={STR.createAction}
          onClose={() => setCreateAt(null)}
          onSubmit={async (values) => {
            await createPerson({ ...values, pos_x: createAt.x, pos_y: createAt.y })
          }}
        />
      )}
      {editPerson && (
        <PersonDialog
          title={STR.editPersonTitle}
          submitLabel={STR.save}
          initial={personToInput(editPerson)}
          onClose={() => setEditPersonId(null)}
          onSubmit={async (values) => {
            await updatePerson(editPerson.id, values)
          }}
        />
      )}
      {addRel && addRelEgo && (
        <PersonDialog
          title={STR.createPersonTitle}
          submitLabel={STR.createAction}
          initial={{ gender: roleGender(addRel.role, addRelEgo) }}
          onClose={() => setAddRel(null)}
          onSubmit={async (values) => {
            const pos = rolePosition(addRel.role, addRelEgo, relationships)
            const created = await createPerson({ ...values, pos_x: pos.x, pos_y: pos.y })
            if (created)
              await linkByRole(addRel.role, addRelEgo.id, created.id, relationships, addRelationship)
          }}
        />
      )}
      {pendingConn && persons[pendingConn.source] && persons[pendingConn.target] && (
        <ConnectTypeDialog
          source={persons[pendingConn.source]}
          target={persons[pendingConn.target]}
          onClose={() => setPendingConn(null)}
          onPick={(fromId, toId, type) => {
            void addRelationship(fromId, toId, type)
            setPendingConn(null)
          }}
        />
      )}
    </div>
  )
}

export default function BoardPage() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  )
}
