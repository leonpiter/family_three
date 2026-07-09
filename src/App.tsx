import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireApproved } from './app/RequireApproved'
import { Layout } from './app/Layout'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import PendingPage from './features/auth/PendingPage'
import AdminPage from './features/admin/AdminPage'
import BoardPage from './features/board/BoardPage'
import { useAuthStore } from './features/auth/authStore'
import { supabaseConfigured } from './lib/supabase'
import { STR } from './lib/strings'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    if (supabaseConfigured) void init()
  }, [init])

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="max-w-md text-center text-neutral-600">{STR.supabaseNotConfigured}</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Toaster richColors position="top-center" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route
          element={
            <RequireApproved>
              <Layout />
            </RequireApproved>
          }
        >
          <Route path="/" element={<BoardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
