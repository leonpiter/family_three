import { useEffect, useRef, useState } from 'react'
import { useIsTouch } from '../../hooks/useIsTouch'

export interface MenuItem {
  label: string
  onClick?: () => void
  disabled?: boolean
  hint?: string
  submenu?: MenuItem[]
}

const MENU_W = 224 // соответствует w-56

const itemCls =
  'flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-emerald-50 disabled:cursor-default disabled:text-neutral-400 disabled:hover:bg-transparent sm:py-1.5'

export function ContextMenu(props: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}) {
  const isTouch = useIsTouch()
  return isTouch ? <MobileSheet {...props} /> : <DesktopMenu {...props} />
}

// --- Мобильная нижняя шторка: подменю раскрывается аккордеоном вниз ---
function MobileSheet({
  items,
  onClose,
}: {
  items: MenuItem[]
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rowCls =
    'flex w-full items-center justify-between px-5 py-3.5 text-left text-base disabled:text-neutral-400 active:bg-emerald-50'

  const runItem = (item: MenuItem) => {
    if (item.disabled) return
    item.onClick?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-center bg-white py-2">
          <span className="h-1 w-10 rounded-full bg-neutral-300" />
        </div>
        {items.map((item, i) => (
          <div key={i} className="border-t border-neutral-100 first:border-t-0">
            <button
              disabled={item.disabled}
              className={rowCls}
              onClick={() =>
                item.submenu
                  ? setExpanded((e) => (e === i ? null : i))
                  : runItem(item)
              }
            >
              <span>{item.label}</span>
              {item.submenu && (
                <span className="text-neutral-400">{expanded === i ? '▾' : '▸'}</span>
              )}
            </button>
            {item.disabled && item.hint && (
              <div className="px-5 pb-2 text-sm text-neutral-400">{item.hint}</div>
            )}
            {item.submenu && expanded === i && (
              <div className="bg-neutral-50">
                {item.submenu.map((sub, j) => (
                  <div key={j}>
                    <button
                      disabled={sub.disabled}
                      className={`${rowCls} pl-8`}
                      onClick={() => runItem(sub)}
                    >
                      <span>{sub.label}</span>
                    </button>
                    {sub.disabled && sub.hint && (
                      <div className="px-8 pb-2 text-sm text-neutral-400">{sub.hint}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Десктопное меню у курсора с боковым подменю ---
function DesktopMenu({
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
