import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from './authStore'
import { STR } from '../../lib/strings'
import { AuthCard } from '../../components/ui/AuthCard'
import { Button } from '../../components/ui/Button'
import { FullScreenSpinner } from '../../components/ui/Spinner'

export default function PendingPage() {
  const { session, profile, initializing, refreshProfile, signOut } = useAuthStore()
  const [busy, setBusy] = useState(false)

  if (initializing) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.status === 'approved') return <Navigate to="/" replace />

  const rejected = profile?.status === 'rejected'

  const onCheck = async () => {
    setBusy(true)
    await refreshProfile()
    setBusy(false)
    const status = useAuthStore.getState().profile?.status
    if (status !== 'approved') toast.info(STR.stillPending)
  }

  return (
    <AuthCard title={rejected ? STR.rejectedTitle : STR.pendingTitle}>
      <p className="text-center text-sm text-neutral-600">
        {rejected ? STR.rejectedText : STR.pendingText}
      </p>
      <div className="mt-5 space-y-2">
        {!rejected && (
          <Button onClick={() => void onCheck()} disabled={busy} className="w-full">
            {STR.checkAgain}
          </Button>
        )}
        <Button variant="secondary" onClick={() => void signOut()} className="w-full">
          {STR.signOut}
        </Button>
      </div>
    </AuthCard>
  )
}
