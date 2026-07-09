import { STR } from './strings'

// Supabase Auth возвращает ошибки по-английски — маппим частые случаи на русский.
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return STR.errInvalidCredentials
  if (m.includes('email not confirmed')) return STR.errEmailNotConfirmed
  if (m.includes('already registered') || m.includes('already been registered')) return STR.errUserExists
  if (m.includes('password') && (m.includes('at least') || m.includes('6'))) return STR.errPasswordShort
  if (m.includes('rate limit') || m.includes('too many')) return STR.errRateLimit
  return STR.errGeneric
}
