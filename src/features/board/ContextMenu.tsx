import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onClick?: () => void
  disabled?: boolean
  hint?: string
  submenu?: MenuItem[]
}

const MENU_W = 224 // соответствует w-56

const itemCls =
  'flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-emerald-50 disabled:cursor-default disabled:text-neutral-400 disabled:hover:bg-transparent'

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [openSub, setOpenSub] = useState<number | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = Math.min(x, window.innerWidth - MENU_W - 8)
  const top = Math.min(y, window.innerHeight - 320)
  const subToLeft = left + MENU_W * 2 + 16 > window.innerWidth

  const renderItem = (item: MenuItem, i: number, closeAfter: boolean) => (
    <div key={i}>
      <button
        disabled={item.disabled}
        className={itemCls}
        onClick={
          item.onClick && !item.disabled
            ? () => {
                item.onClick!()
                if (closeAfter) onClose()
              }
            : undefined
        }
      >
        <span>{item.label}</span>
        {item.submenu && <span className="text-neutral-400">▸</span>}
      </button>
      {item.disabled && item.hint && (
        <div className="px-3 pb-1 text-xs text-neutral-400">{item.hint}</div>
      )}
    </div>
  )

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 rounded-xl border border-neutral-200 bg-white py-1 text-sm text-neutral-800 shadow-lg"
      style={{ left, top }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="relative"
          onMouseEnter={() => setOpenSub(item.submenu ? i : null)}
        >
          {renderItem(item, i, true)}
          {item.submenu && openSub === i && (
            <div
              className={`absolute top-0 z-50 w-56 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg ${
                subToLeft ? 'right-full mr-1' : 'left-full ml-1'
              }`}
            >
              {item.submenu.map((sub, j) => renderItem(sub, j, true))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
