import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { FullScreenSpinner } from '../components/ui/Spinner'

// UX-гейт: неавторизованных — на /login, неодобренных — на /pending.
// Реальная защита данных — RLS на стороне Supabase, это только маршрутизация.
export function RequireApproved({ children }: { children: ReactNode }) {
  const { session, profile, initializing } = useAuthStore()

  if (initializing) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <FullScreenSpinner />
  if (profile.status !== 'approved') return <Navigate to="/pending" replace />
  return <>{children}</>
}
