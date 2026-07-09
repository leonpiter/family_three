import { STR } from '../../lib/strings'

// Заглушка: бесконечная доска с React Flow появится в Спринте 2.
export default function BoardPage() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <p className="text-neutral-400">{STR.boardPlaceholder}</p>
    </div>
  )
}
