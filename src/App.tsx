import { useEffect } from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireApproved } from './app/RequireApproved'
import { Layout } from './app/Layout'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import PendingPage from './features/auth/PendingPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import NewPasswordPage from './features/auth/NewPasswordPage'
import AdminPage from './features/admin/AdminPage'
import BoardPage from './features/board/BoardPage'
import { useAuthStore } from './features/auth/authStore'
import { supabaseConfigured } from './lib/supabase'
import { STR } from './lib/strings'

// В режиме восстановления пароля уводим пользователя на страницу нового пароля,
// куда бы ни привёл редирект из письма.
function RecoveryRedirect() {
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery)
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (passwordRecovery && location.pathname !== '/new-password') {
      navigate('/new-password', { replace: true })
    }
  }, [passwordRecovery, location.pathname, navigate])
  return null
}

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
      <RecoveryRedirect />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/reset" element={<ForgotPasswordPage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />
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
