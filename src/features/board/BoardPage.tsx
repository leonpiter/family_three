import { useEffect, useState } from 'react'
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
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<PersonFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapToFlow([], []).edges)
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null)
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null)

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

  if (loading && !loaded) return <FullScreenSpinner />

  const addAtCenter = () =>
    setCreateAt(
      screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
    )

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={(_e, _node, dragged) =>
          movePersons(dragged.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })))
        }
        onConnect={(c: Connection) => {
          if (c.source && c.target && c.source !== c.target)
            setPendingConn({ source: c.source, target: c.target })
        }}
        onNodeDoubleClick={(_e, node) => {
          const p = persons[node.id]
          if (p) setEditPerson(p)
        }}
        onPaneClick={(e) => {
          // двойной клик по пустому полотну = создать персону в этой точке
          if (e.detail === 2)
            setCreateAt(screenToFlowPosition({ x: e.clientX, y: e.clientY }))
        }}
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
          nodeColor={(n) => {
            const g = (n.data as { person?: Person }).person?.gender
            return g === 'm' ? '#bae6fd' : g === 'f' ? '#fecdd3' : '#e5e7eb'
          }}
        />
        <Panel position="top-left">
          <Button onClick={addAtCenter}>{STR.addPerson}</Button>
        </Panel>
        {loaded && Object.keys(persons).length === 0 && (
          <Panel position="top-center" className="mt-20">
            <p className="rounded-xl bg-white/90 px-4 py-2 text-sm text-neutral-500 shadow-sm">
              {STR.boardEmpty}
            </p>
          </Panel>
        )}
      </ReactFlow>

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
          initial={editPerson}
          onClose={() => setEditPerson(null)}
          onSubmit={async (values) => {
            await updatePerson(editPerson.id, values)
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
