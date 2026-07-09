// Применение SQL-файла к базе через Supabase Management API.
// Использование: node scripts/apply-sql.mjs supabase/migrations/0007_xxx.sql
// Токен берётся из .env.local (SUPABASE_ACCESS_TOKEN) — файл в .gitignore.
import { readFileSync } from 'node:fs'

const PROJECT_REF = 'vakjmcpnfckkejkridds'

const file = process.argv[2]
if (!file) {
  console.error('Использование: node scripts/apply-sql.mjs <файл.sql>')
  process.exit(1)
}

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const token = /SUPABASE_ACCESS_TOKEN=(\S+)/.exec(env)?.[1]
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN не найден в .env.local')
  process.exit(1)
}

const query = readFileSync(file, 'utf8')
const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  },
)
const text = await res.text()
if (!res.ok) {
  console.error(`Ошибка HTTP ${res.status}: ${text}`)
  process.exit(1)
}
console.log(`Применено: ${file} (HTTP ${res.status})`)
if (text && text !== '[]') console.log(text)
