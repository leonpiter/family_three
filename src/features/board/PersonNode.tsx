import { Handle, Position, type NodeProps } from '@xyflow/react'
import { fullName, lifeYears } from '../../lib/person'
import type { PersonFlowNode } from './mapToFlow'

const circleByGender: Record<string, string> = {
  m: 'bg-sky-100 text-sky-800 border-sky-300',
  f: 'bg-rose-100 text-rose-800 border-rose-300',
  u: 'bg-neutral-100 text-neutral-600 border-neutral-300',
}

const handleCls =
  '!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-600 opacity-0 transition-opacity group-hover:opacity-100'

export function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const p = data.person
  const initials = (p.first_name[0] ?? '') + (p.last_name?.[0] ?? '')
  const years = lifeYears(p)

  return (
    <div className="group flex w-28 flex-col items-center">
      <Handle type="target" position={Position.Top} className={handleCls} />
      <div
        className={`flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 text-2xl font-semibold shadow-sm ${circleByGender[p.gender ?? 'u']} ${
          selected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        {initials || '?'}
      </div>
      <div className="mt-1.5 max-w-full text-center text-xs font-medium leading-tight text-neutral-800">
        {fullName(p)}
      </div>
      {years && <div className="text-[10px] text-neutral-400">{years}</div>}
      <Handle type="source" position={Position.Bottom} className={handleCls} />
    </div>
  )
}
