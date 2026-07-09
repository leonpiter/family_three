import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { STR } from '../lib/strings'

export function Layout() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-5">
          <Link to="/" className="text-base font-semibold text-neutral-900">
            🌳 {STR.appName}
          </Link>
          {profile?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-emerald-700 font-medium' : 'text-neutral-500 hover:text-neutral-900'}`
              }
            >
              {STR.adminNav}
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-600">{profile?.display_name}</span>
          <button
            onClick={() => void signOut()}
            className="text-neutral-400 transition-colors hover:text-neutral-900"
          >
            {STR.signOut}
          </button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
