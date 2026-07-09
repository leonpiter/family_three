import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { STR } from '../lib/strings'

export function Layout() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link to="/" className="shrink-0 text-base font-semibold text-neutral-900">
            🌳 <span className="hidden sm:inline">{STR.appName}</span>
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
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="hidden text-neutral-600 sm:inline">{profile?.display_name}</span>
          <button
            onClick={() => void signOut()}
            className="text-neutral-400 transition-colors hover:text-neutral-900"
          >
            {STR.signOut}
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
