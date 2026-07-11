import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabaseRecovery } from '../../lib/supabase'
import { authErrorMessage } from '../../lib/authErrors'
import { siteUrl } from '../../lib/siteUrl'
import { STR } from '../../lib/strings'
import { AuthCard } from '../../components/ui/AuthCard'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    // Запрос через implicit-клиент: ссылка из письма откроется в ЛЮБОМ браузере
    // (в т.ч. встроенном в почтовое приложение). Токены прилетят в hash и будут
    // сняты в main.tsx до старта роутера.
    const { error } = await supabaseRecovery.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl(),
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
        <Notice>{STR.resetLinkNotice}</Notice>
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
