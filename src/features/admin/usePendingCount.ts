import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Число заявок в статусе «ожидает» — для колокольчика в шапке (только админ).
// Обновляется в реальном времени (подписка на profiles).
export function usePendingCount(enabled: boolean): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    let alive = true
    const load = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (alive) setCount(count ?? 0)
    }
    void load()
    const channel = supabase
      .channel('pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe()
    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [enabled])

  return count
}
