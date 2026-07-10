import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from '../../lib/authErrors'
import { useAuthStore } from './authStore'
import { STR } from '../../lib/strings'
import { AuthCard } from '../../components/ui/AuthCard'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'

// Доступна только в режиме восстановления (после перехода по ссылке из письма).
export default function NewPasswordPage() {
  const navigate = useNavigate()
  const { session, passwordRecovery, setPasswordRecovery } = useAuthStore()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)

  // Прямой заход без восстановления и без сессии — на вход
  if (!passwordRecovery && !session) return <Navigate to="/login" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== repeat) {
      toast.error(STR.passwordsMismatch)
      return
    }
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
        <Field
          label={STR.newPasswordLabel}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
          autoFocus
        />
        <Field
          label={STR.newPasswordRepeat}
          type="password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Button type="submit" disabled={busy} className="w-full">
          {STR.newPasswordSave}
        </Button>
      </form>
    </AuthCard>
  )
}
