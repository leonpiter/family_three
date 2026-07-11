import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

const URL_OR_PLACEHOLDER = url || 'https://placeholder.supabase.co'
const KEY_OR_PLACEHOLDER = anonKey || 'placeholder-anon-key'

// PKCE обязателен: implicit-flow кладёт токены в location.hash и конфликтует
// с HashRouter; с PKCE редирект подтверждения email несёт ?code= в query.
export const supabase = createClient(URL_OR_PLACEHOLDER, KEY_OR_PLACEHOLDER, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Отдельный клиент только для запроса сброса пароля. Implicit-схема даёт ссылку,
// которая открывается в ЛЮБОМ браузере (в т.ч. встроенном в почтовое
// приложение) — PKCE так не умеет: там нужен verifier из того же браузера.
// Токены из hash забирает lib/recovery.ts до старта роутера.
export const supabaseRecovery = createClient(URL_OR_PLACEHOLDER, KEY_OR_PLACEHOLDER, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: false,
    persistSession: false,
    autoRefreshToken: false,
  },
})
