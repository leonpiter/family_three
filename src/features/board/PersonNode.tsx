import { Handle, Position, type NodeProps } from '@xyflow/react'
import { circleClass, initialsOf } from '../../lib/avatar'
import { fullName, lifeYears } from '../../lib/person'
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
      <Handle type="target" position={Position.Top} className={handleCls} />
      <div
        className={`flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 text-2xl font-semibold shadow-sm ${circleClass(p.gender)} ${ring}`}
      >
        {initialsOf(p)}
      </div>
      <div className="mt-1.5 max-w-full text-center text-xs font-medium leading-tight text-neutral-800">
        {fullName(p)}
      </div>
      {years && <div className="text-[10px] text-neutral-400">{years}</div>}
      <Handle type="source" position={Position.Bottom} className={handleCls} />
    </div>
  )
}
