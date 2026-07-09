import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSignedUrls } from '../../hooks/useSignedUrls'
import type { Person } from '../../types/domain'

// personId -> подписанный URL превью аватара (для нод доски и шапки сайдбара).
export function useAvatars(persons: Record<string, Person>): Map<string, string> {
  const avatarIds = Object.values(persons)
    .map((p) => p.avatar_photo_id)
    .filter((id): id is string => id !== null)
  const key = [...avatarIds].sort().join('|')

  // photoId -> thumb_path
  const [thumbPaths, setThumbPaths] = useState<Map<string, string>>(() => new Map())

  useEffect(() => {
    if (!key) {
      setThumbPaths(new Map())
      return
    }
    let alive = true
    void supabase
      .from('photos')
      .select('id,thumb_path')
      .in('id', key.split('|'))
      .then(({ data }) => {
        if (!alive || !data) return
        setThumbPaths(
          new Map((data as { id: string; thumb_path: string }[]).map((r) => [r.id, r.thumb_path])),
        )
      })
    return () => {
      alive = false
    }
  }, [key])

  const urls = useSignedUrls([...thumbPaths.values()])

  return useMemo(() => {
    const m = new Map<string, string>()
    for (const p of Object.values(persons)) {
      if (!p.avatar_photo_id) continue
      const path = thumbPaths.get(p.avatar_photo_id)
      const url = path ? urls.get(path) : undefined
      if (url) m.set(p.id, url)
    }
    return m
  }, [persons, thumbPaths, urls])
}
