import { STR } from '../../lib/strings'

// Выделенная подсказка (жёлтая плашка) — для важных пояснений в формах.
export function Notice({ children }: { children: string }) {
  return (
    <p className="mt-4 rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-900">
      <b>{STR.noticeImportant}</b> {children}
    </p>
  )
}
