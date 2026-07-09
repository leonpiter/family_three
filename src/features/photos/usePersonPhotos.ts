import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { STR } from '../../lib/strings'
import type { Photo } from '../../types/domain'

export function usePersonPhotos(personId: string) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('person_id', personId)
      .order('created_at')
    if (error) {
      toast.error(STR.loadError)
      return
    }
    setPhotos(data as Photo[])
  }, [personId])

  useEffect(() => {
    setPhotos(null)
    void reload()
  }, [reload])

  return { photos, reload }
}
