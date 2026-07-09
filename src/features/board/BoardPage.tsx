import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
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
import { computeTreeLayout } from './autoLayout'
import { BirthdaysPanel } from './BirthdaysPanel'
import { PersonSidebar } from '../person/PersonSidebar'
import { PersonPickerDialog } from '../person/PersonPickerDialog'
import { useAvatars } from '../photos/useAvatars'
import { exportToExcel } from '../export/exportExcel'
import { Modal, anyModalOpen } from '../../components/ui/Modal'
import { useAuthStore } from '../auth/authStore'
import { useIsTouch } from '../../hooks/useIsTouch'
import { supabase } from '../../lib/supabase'
import { getParents } from '../../lib/relations'
import { fullName, personToInput } from '../../lib/person'
import { canEditPerson } from '../../lib/permissions'
import { STR, fmt } from '../../lib/strings'
import { toast } from 'sonner'
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
  const deletePerson = useBoardStore((s) => s.deletePerson)
  const selectedPersonId = useBoardStore((s) => s.selectedPersonId)
  const selectPerson = useBoardStore((s) => s.selectPerson)
  const profile = useAuthStore((s) => s.profile)
  const session = useAuthStore((s) => s.session)
  const isTouch = useIsTouch()
  const { screenToFlowPosition, getIntersectingNodes, setCenter, getNodes } = useReactFlow()

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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const centeredOnSelf = useRef(false)

  useEffect(() => {
    void loadAll()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadAll()
    }
    document.addEventListener('visibilitychange', onVisible)
    // Realtime: правки других участников появляются без F5
    const channel = supabase
      .channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'persons' }, () =>
        loadAll(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'relationships' }, () =>
        loadAll(),
      )
      .subscribe()
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [loadAll])

  // Центрируемся на своей карточке при первой загрузке (у каждого — свой центр).
  useEffect(() => {
    if (centeredOnSelf.current || !loaded) return
    const myId = session?.user.id
    if (!myId) return
    const mine = Object.values(persons).find((p) => p.user_id === myId)
    centeredOnSelf.current = true
    if (mine) {
      window.setTimeout(
        () => void setCenter(mine.pos_x + 56, mine.pos_y + 55, { duration: 600, zoom: 1 }),
        100,
      )
    }
  }, [loaded, persons, session, setCenter])

  useEffect(() => {
    const flow = mapToFlow(Object.values(persons), Object.values(relationships))
    // Не сбиваем позицию ноды, которую пользователь тащит прямо сейчас
    // (фоновый refetch по visibilitychange не должен дёргать drag).
    setNodes((prev) => {
      const dragging = new Map(prev.filter((n) => n.dragging).map((n) => [n.id, n.position]))
      if (dragging.size === 0) return flow.nodes
      return flow.nodes.map((n) =>
        dragging.has(n.id) ? { ...n, position: dragging.get(n.id)! } : n,
      )
    })
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

  const runAutoLayout = () => {
    const positions = computeTreeLayout(Object.values(persons), Object.values(relationships))
    movePersons(positions.map((p) => ({ id: p.id, x: p.x, y: p.y })))
    toast.success(STR.layoutDone)
  }

  // Навигация к персоне: центрировать и (на десктопе) открыть карточку.
  const goToPerson = (id: string) => {
    const p = useBoardStore.getState().persons[id]
    if (!p) return
    void setCenter(p.pos_x + 56, p.pos_y + 55, { duration: 500, zoom: 1.2 })
    if (!isTouch) selectPerson(id)
  }

  const exportPng = async () => {
    const nodes = getNodes()
    if (nodes.length === 0) return
    const bounds = getNodesBounds(nodes)
    const pad = 60
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!viewport) return
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(viewport, {
        backgroundColor: '#fafafa',
        width: bounds.width + pad * 2,
        height: bounds.height + pad * 2,
        style: {
          transform: `translate(${-bounds.x + pad}px, ${-bounds.y + pad}px) scale(1)`,
        },
      })
      const a = document.createElement('a')
      a.href = url
      a.download = 'семейное-древо.png'
      a.click()
    } catch {
      toast.error(STR.pngError)
    }
  }

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
      // На тач-устройстве карточка открывается из меню (тап по ноде = меню)
      ...(isTouch ? [{ label: STR.openCard, onClick: () => selectPerson(ego.id) }] : []),
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
      {
        label: STR.edit,
        disabled: !canEditPerson(ego, profile),
        hint: !canEditPerson(ego, profile) ? STR.editRestricted : undefined,
        onClick: () => setEditPersonId(ego.id),
      },
      ...(profile?.role === 'admin'
        ? [{ label: STR.deletePerson, onClick: () => setDeleteTargetId(ego.id) }]
        : []),
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
        onNodeClick={(e, node) => {
          closeOverlays()
          if (linkFrom) {
            if (node.id !== linkFrom) setPendingConn({ source: linkFrom, target: node.id })
            setLinkFrom(null)
            return
          }
          // Мобильный: тап открывает контекстное меню (в нём — «Открыть карточку»
          // и все действия). Десктоп: тап открывает сайдбар.
          if (isTouch) setMenu({ x: e.clientX, y: e.clientY, personId: node.id })
          else selectPerson(node.id)
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
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[24, 24]}
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
        {/* Десктоп: текстовая панель сверху слева */}
        <Panel position="top-left" className="hidden flex-wrap gap-2 sm:flex">
          <Button onClick={addAtCenter}>{STR.addPerson}</Button>
          <Button variant="secondary" className="bg-white" onClick={runAutoLayout}>
            {STR.autoLayout}
          </Button>
          <Button variant="secondary" className="bg-white" onClick={() => setSearchOpen(true)}>
            {STR.search}
          </Button>
          <Button variant="secondary" className="bg-white" onClick={() => void exportPng()}>
            {STR.exportPng}
          </Button>
          <Button
            variant="secondary"
            className="bg-white"
            onClick={() => void exportToExcel(persons, relationships)}
          >
            {STR.exportExcel}
          </Button>
        </Panel>
        {/* Мобильный: круглые кнопки поиска/раскладки/экспорта + FAB «+» */}
        <Panel position="bottom-right" className="flex flex-col gap-3 sm:hidden">
          <button
            aria-label={STR.search}
            onClick={() => setSearchOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-xl shadow-lg active:bg-neutral-100"
          >
            🔍
          </button>
          <button
            aria-label={STR.autoLayout}
            onClick={runAutoLayout}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-xl shadow-lg active:bg-neutral-100"
          >
            🌳
          </button>
          <button
            aria-label={STR.addPerson}
            onClick={addAtCenter}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-3xl text-white shadow-lg active:bg-emerald-800"
          >
            +
          </button>
        </Panel>
        <Panel position="top-right" className="hidden sm:block">
          <BirthdaysPanel onPick={goToPerson} />
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
          key={selectedPersonId}
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
      {searchOpen && (
        <PersonPickerDialog
          exclude={[]}
          onClose={() => setSearchOpen(false)}
          onPick={(p) => {
            setSearchOpen(false)
            goToPerson(p.id)
          }}
        />
      )}

      {deleteTargetId && persons[deleteTargetId] && (
        <Modal title={STR.deletePersonTitle} onClose={() => setDeleteTargetId(null)}>
          <p className="text-sm text-neutral-700">
            {fmt.deletePersonWarning(fullName(persons[deleteTargetId]))}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTargetId(null)}>
              {STR.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void deletePerson(deleteTargetId)
                setDeleteTargetId(null)
              }}
            >
              {STR.deletePerson}
            </Button>
          </div>
        </Modal>
      )}
      {pendingConn && persons[pendingConn.source] && persons[pendingConn.target] && (
        <ConnectTypeDialog
          source={persons[pendingConn.source]}
          target={persons[pendingConn.target]}
          onClose={() => setPendingConn(null)}
          onPick={(fromId, toId, type, isEx) => {
            void addRelationship(fromId, toId, type, isEx)
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
