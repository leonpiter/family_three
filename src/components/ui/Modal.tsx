import { useEffect, type ReactNode } from 'react'

// Счётчик открытых модалок: Esc-координатор доски не должен закрывать
// сайдбар/меню, пока Esc адресован модальному окну.
let openCount = 0
export function anyModalOpen(): boolean {
  return openCount > 0
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    openCount++
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      openCount--
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}
