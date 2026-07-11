// Восстановление пароля должно работать из ЛЮБОГО браузера — включая встроенный
// браузер почтового приложения, где нет localStorage того браузера, в котором
// запрашивали сброс. Поэтому ссылка восстановления идёт по implicit-схеме:
// токены приходят в hash-фрагменте, и мы забираем их сами.
//
// captureRecoveryFromUrl() ОБЯЗАН вызываться синхронно до монтирования
// HashRouter — иначе роутер примет «#access_token=…» за маршрут.

let recoveryTokens: { access_token: string; refresh_token: string } | null = null

export function captureRecoveryFromUrl(): boolean {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw.includes('access_token') || !raw.includes('type=recovery')) return false

  const params = new URLSearchParams(raw)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return false

  recoveryTokens = { access_token, refresh_token }
  // Убираем токены из адресной строки и сразу ведём роутер на новый пароль
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#/new-password`,
  )
  return true
}

export function takeRecoveryTokens() {
  const t = recoveryTokens
  recoveryTokens = null
  return t
}
