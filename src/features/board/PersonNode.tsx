import { Handle, Position, type NodeProps } from '@xyflow/react'
import { circleClass, initialsOf } from '../../lib/avatar'
import { fullName, lifeYears } from '../../lib/person'
import { VeteranStar } from '../../components/ui/VeteranStar'
import type { PersonFlowNode } from './mapToFlow'

const handleCls =
  '!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-600 opacity-0 transition-opacity group-hover:opacity-100'

export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const p = data.person
  const years = lifeYears(p)
  // dropTarget — над этой нодой сейчас «висит» перетаскиваемая несвязанная нода
  const ring = data.dropTarget
    ? 'ring-4 ring-amber-400 ring-offset-2'
    : selected
      ? 'ring-2 ring-emerald-500 ring-offset-2'
      : ''

  return (
    <div className="group flex w-28 flex-col items-center">
      <Handle id="t" type="target" position={Position.Top} className={handleCls} />
      {/* Боковые точки на уровне центра круга — для горизонтальных линий супругов */}
      <Handle
        id="l"
        type="source"
        position={Position.Left}
        style={{ top: 44 }}
        className={handleCls}
      />
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={{ top: 44 }}
        className={handleCls}
      />
      <div className="relative">
        <div
          className={`flex h-22 w-22 items-center justify-center overflow-hidden rounded-full border-2 text-2xl font-semibold shadow-sm ${circleClass(p.gender)} ${ring}`}
        >
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={fullName(p)}
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            initialsOf(p)
          )}
        </div>
        {p.military_status === 'fought' && <VeteranStar size={24} />}
      </div>
      <div className="mt-1.5 max-w-full text-center text-xs font-medium leading-tight text-neutral-800">
        {fullName(p)}
      </div>
      {years && <div className="text-[10px] text-neutral-400">{years}</div>}
      <Handle id="b" type="source" position={Position.Bottom} className={handleCls} />
    </div>
  )
}
