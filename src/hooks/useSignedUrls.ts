import { useEffect, useState } from 'react'
import { getSignedUrls } from '../lib/signedUrlCache'

// path -> подписанный URL; обновляется, когда меняется набор путей.
export function useSignedUrls(paths: string[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map())
  const key = [...paths].sort().join('|')

  useEffect(() => {
    if (!key) {
      setUrls(new Map())
      return
    }
    let alive = true
    void getSignedUrls(key.split('|')).then((m) => {
      if (alive) setUrls(m)
    })
    return () => {
      alive = false
    }
  }, [key])

  return urls
}
