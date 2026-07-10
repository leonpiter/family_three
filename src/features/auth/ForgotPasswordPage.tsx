import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from '../../lib/authErrors'
import { siteUrl } from '../../lib/siteUrl'
import { STR } from '../../lib/strings'
import { AuthCard } from '../../components/ui/AuthCard'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    // redirectTo с собственным маркером ?pwreset=1 — приложение распознаёт его
    // при старте и ведёт на страницу нового пароля (надёжно с HashRouter;
    // не 'type', чтобы supabase-js не принял за свой служебный параметр).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}?pwreset=1`,
    })
    setBusy(false)
    if (error) {
      toast.error(authErrorMessage(error.message))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthCard title={STR.resetSentTitle}>
        <p className="text-center text-sm text-neutral-600">
          {STR.resetSentText} <b>{email}</b>
        </p>
        <p className="mt-2 text-center text-sm text-neutral-400">{STR.checkEmailHint}</p>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-emerald-700 hover:underline">
            {STR.backToLogin}
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={STR.resetTitle}>
      <p className="mb-3 text-center text-sm text-neutral-500">{STR.resetHint}</p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <Field
          label={STR.emailLabel}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Button type="submit" disabled={busy} className="w-full">
          {STR.resetSend}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-emerald-700 hover:underline">
          {STR.backToLogin}
        </Link>
      </p>
    </AuthCard>
  )
}
