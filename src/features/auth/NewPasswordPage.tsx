import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from '../../lib/authErrors'
import { useAuthStore } from './authStore'
import { STR } from '../../lib/strings'
import { AuthCard } from '../../components/ui/AuthCard'
import { Button } from '../../components/ui/Button'
import { PasswordField } from '../../components/ui/PasswordField'
import { Spinner } from '../../components/ui/Spinner'

const MIN_LEN = 6

// Доступна после перехода по ссылке восстановления (или залогиненному
// пользователю — как смена пароля).
export default function NewPasswordPage() {
  const navigate = useNavigate()
  const { session, initializing, passwordRecovery, setPasswordRecovery } = useAuthStore()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)

  // Восстановление: сессия ставится из токенов ссылки — ждём её,
  // иначе сохранение упало бы с ошибкой.
  if (passwordRecovery && !session) {
    return (
      <AuthCard title={STR.newPasswordTitle}>
        <div className="flex flex-col items-center gap-3 py-2">
          <Spinner />
          <p className="text-sm text-neutral-500">{STR.recoveryPreparing}</p>
        </div>
      </AuthCard>
    )
  }
  if (!initializing && !passwordRecovery && !session) return <Navigate to="/login" replace />

  const tooShort = password.length > 0 && password.length < MIN_LEN
  const mismatch = repeat.length > 0 && password !== repeat
  const canSubmit =
    !busy && password.length >= MIN_LEN && repeat.length >= MIN_LEN && password === repeat

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      toast.error(authErrorMessage(error.message))
      return
    }
    setPasswordRecovery(false)
    toast.success(STR.passwordChanged)
    navigate('/')
  }

  return (
    <AuthCard title={STR.newPasswordTitle}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <PasswordField
          label={STR.newPasswordLabel}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={tooShort ? STR.passwordTooShort : null}
          autoComplete="new-password"
          required
          autoFocus
        />
        <PasswordField
          label={STR.newPasswordRepeat}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          error={mismatch ? STR.passwordsMismatch : null}
          autoComplete="new-password"
          required
        />
        <Button type="submit" disabled={!canSubmit} className="w-full">
          {STR.newPasswordSave}
        </Button>
      </form>
    </AuthCard>
  )
}
