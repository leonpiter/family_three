import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { usePendingCount } from '../features/admin/usePendingCount'
import { STR } from '../lib/strings'

export function Layout() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const isAdmin = profile?.role === 'admin'
  const pending = usePendingCount(isAdmin)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-50">
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link to="/" className="shrink-0 text-base font-semibold text-neutral-900">
            🌳 <span className="hidden sm:inline">{STR.appName}</span>
          </Link>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm ${isActive ? 'font-medium text-emerald-700' : 'text-neutral-500 hover:text-neutral-900'}`
              }
            >
              {/* Колокольчик со счётчиком, когда есть ожидающие заявки */}
              {pending > 0 && (
                <span
                  title={STR.pendingRequestsTitle}
                  className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white"
                >
                  🔔 {pending}
                </span>
              )}
              <span className="hidden sm:inline">{STR.adminNav}</span>
              {/* На мобильном без счётчика показываем сам колокольчик как ярлык */}
              {pending === 0 && <span className="sm:hidden">🔔</span>}
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
