import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from '../../lib/authErrors'
import { STR } from '../../lib/strings'
import { AuthCard } from '../../components/ui/AuthCard'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      toast.error(authErrorMessage(error.message))
      return
    }
    navigate('/')
  }

  return (
    <AuthCard title={STR.loginTitle}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <Field
          label={STR.emailLabel}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Field
          label={STR.passwordLabel}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" disabled={busy} className="w-full">
          {STR.loginButton}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        {STR.noAccount}{' '}
        <Link to="/register" className="text-emerald-700 hover:underline">
          {STR.toRegister}
        </Link>
      </p>
    </AuthCard>
  )
}
