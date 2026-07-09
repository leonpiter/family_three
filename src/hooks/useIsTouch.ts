import { useEffect, useState } from 'react'

// Тач-устройство без наведения мыши: на нём одиночный тап по ноде открывает
// контекстное меню, а не сайдбар. Реагирует на смену режима (например, планшет
// с подключённой мышью).
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}
