import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../auth/authStore'
import type { Profile, ProfileStatus } from '../../types/domain'
import { STR } from '../../lib/strings'
import { Button } from '../../components/ui/Button'
import { FullScreenSpinner } from '../../components/ui/Spinner'

dayjs.locale('ru')

const statusView: Record<ProfileStatus, { label: string; cls: string }> = {
  pending: { label: STR.statusPending, cls: 'bg-amber-100 text-amber-800' },
  approved: { label: STR.statusApproved, cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: STR.statusRejected, cls: 'bg-red-100 text-red-700' },
}

export default function AdminPage() {
  const me = useAuthStore((s) => s.profile)
  const [profiles, setProfiles] = useState<Profile[] | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(STR.loadError)
      return
    }
    setProfiles(data as Profile[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (me && me.role !== 'admin') return <Navigate to="/" replace />
  if (!profiles) return <FullScreenSpinner />

  const setStatus = async (id: string, status: ProfileStatus) => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
    if (error) {
      toast.error(STR.saveError)
      return
    }
    toast.success(STR.saved)
    void load()
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">{STR.adminTitle}</h1>
      {profiles.length === 0 ? (
        <p className="text-sm text-neutral-500">{STR.noProfiles}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="px-4 py-2.5 font-medium">{STR.colName}</th>
                <th className="px-4 py-2.5 font-medium">{STR.colEmail}</th>
                <th className="px-4 py-2.5 font-medium">{STR.colDate}</th>
                <th className="px-4 py-2.5 font-medium">{STR.colStatus}</th>
                <th className="px-4 py-2.5 font-medium">{STR.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const sv = statusView[p.status]
                return (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2.5 text-neutral-900">
                      {p.display_name || '—'}
                      {p.role === 'admin' && (
                        <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                          {STR.roleAdmin}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{p.email ?? '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {dayjs(p.created_at).format('D MMMM YYYY')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sv.cls}`}>
                        {sv.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {p.id !== me?.id && (
                        <div className="flex gap-2">
                          {p.status !== 'approved' && (
                            <Button onClick={() => void setStatus(p.id, 'approved')}>
                              {STR.approve}
                            </Button>
                          )}
                          {p.status !== 'rejected' && (
                            <Button variant="danger" onClick={() => void setStatus(p.id, 'rejected')}>
                              {STR.reject}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
