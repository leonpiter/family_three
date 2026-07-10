import { STR } from '../../lib/strings'

// Звёздочка «участник боевых действий» — накладывается на аватар воевавшего.
// size: диаметр звезды в px.
export function VeteranStar({ size = 22 }: { size?: number }) {
  return (
    <span
      title={STR.veteranBadge}
      aria-label={STR.veteranBadge}
      className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow"
      style={{ width: size, height: size, fontSize: size * 0.6, lineHeight: 1 }}
    >
      ★
    </span>
  )
}
