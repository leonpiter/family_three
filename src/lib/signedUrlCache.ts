import { supabase } from './supabase'

// Bucket приватный — файлы доступны только по подписанным URL.
// URL выписываются батчем (один запрос на пачку) и кэшируются в памяти.
const TTL_SECONDS = 3600
const cache = new Map<string, { url: string; expiresAt: number }>()

export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const missing: string[] = []
  const now = Date.now()

  for (const path of paths) {
    const hit = cache.get(path)
    // запас минута, чтобы URL не истёк, пока картинка грузится
    if (hit && hit.expiresAt > now + 60_000) result.set(path, hit.url)
    else missing.push(path)
  }

  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from('photos')
      .createSignedUrls(missing, TTL_SECONDS)
    if (!error && data) {
      data.forEach((item, i) => {
        if (item.signedUrl) {
          cache.set(missing[i], { url: item.signedUrl, expiresAt: now + TTL_SECONDS * 1000 })
          result.set(missing[i], item.signedUrl)
        }
      })
    }
  }
  return result
}
