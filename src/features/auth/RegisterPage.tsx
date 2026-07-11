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
import { Notice } from '../../components/ui/Notice'
import { PasswordField } from '../../components/ui/PasswordField'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: siteUrl(),
      },
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
      <AuthCard title={STR.checkEmailTitle}>
        <p className="text-center text-sm text-neutral-600">
          {STR.checkEmailText} <b>{email}</b>
        </p>
        <p className="mt-2 text-center text-sm text-neutral-400">{STR.checkEmailHint}</p>
        <Notice>{STR.confirmLinkNotice}</Notice>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={STR.registerTitle}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <Field
          label={STR.nameLabel}
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={STR.namePlaceholder}
          autoComplete="name"
          required
        />
        <Field
          label={STR.emailLabel}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <PasswordField
          label={STR.passwordLabel}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={password.length > 0 && password.length < 6 ? STR.passwordTooShort : null}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Button type="submit" disabled={busy} className="w-full">
          {STR.registerButton}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        {STR.haveAccount}{' '}
        <Link to="/login" className="text-emerald-700 hover:underline">
          {STR.toLogin}
        </Link>
      </p>
    </AuthCard>
  )
}
