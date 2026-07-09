import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../auth/authStore'
import type { EditRequest, Profile, ProfileStatus } from '../../types/domain'
import { STR } from '../../lib/strings'
import { Button } from '../../components/ui/Button'
import { FullScreenSpinner } from '../../components/ui/Spinner'

dayjs.locale('ru')

const statusView: Record<ProfileStatus, { label: string; cls: string }> = {
  pending: { label: STR.statusPending, cls: 'bg-amber-100 text-amber-800' },
  approved: { label: STR.statusApproved, cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: STR.statusRejected, cls: 'bg-red-100 text-red-700' },
}

type OpenRequest = EditRequest & {
  person: { first_name: string; middle_name: string | null; last_name: string | null } | null
  author: { display_name: string } | null
}

type PersonLite = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string | null
  user_id: string | null
}

const liteName = (p: PersonLite) =>
  [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')

export default function AdminPage() {
  const me = useAuthStore((s) => s.profile)
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>([])
  const [persons, setPersons] = useState<PersonLite[]>([])

  const load = useCallback(async () => {
    const [profilesRes, requestsRes, personsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase
        .from('edit_requests')
        .select('*, person:persons(first_name,middle_name,last_name), author:profiles(display_name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false }),
      supabase.from('persons').select('id,first_name,middle_name,last_name,user_id'),
    ])
    if (profilesRes.error) {
      toast.error(STR.loadError)
      return
    }
    setProfiles(profilesRes.data as Profile[])
    if (!requestsRes.error && requestsRes.data) setOpenRequests(requestsRes.data as OpenRequest[])
    if (!personsRes.error && personsRes.data) {
      const list = personsRes.data as PersonLite[]
      list.sort((a, b) => liteName(a).localeCompare(liteName(b), 'ru'))
      setPersons(list)
    }
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

  const closeRequest = async (id: string) => {
    const { error } = await supabase.from('edit_requests').update({ status: 'done' }).eq('id', id)
    if (error) {
      toast.error(STR.saveError)
      return
    }
    toast.success(STR.saved)
    void load()
  }

  const personName = (r: OpenRequest) =>
    r.person
      ? [r.person.first_name, r.person.middle_name, r.person.last_name].filter(Boolean).join(' ')
      : '—'

  // Привязка аккаунта к карточке: у аккаунта максимум одна карточка (unique user_id)
  const linkPerson = async (profileId: string, personId: string) => {
    const current = persons.find((p) => p.user_id === profileId)
    if (current && current.id !== personId) {
      const { error } = await supabase
        .from('persons')
        .update({ user_id: null })
        .eq('id', current.id)
      if (error) {
        toast.error(STR.saveError)
        return
      }
    }
    if (personId && current?.id !== personId) {
      const { error } = await supabase
        .from('persons')
        .update({ user_id: profileId })
        .eq('id', personId)
      if (error) {
        toast.error(STR.saveError)
        return
      }
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
                <th className="px-4 py-2.5 font-medium">{STR.colPersonLink}</th>
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
                      {p.status === 'approved' ? (
                        <select
                          value={persons.find((pe) => pe.user_id === p.id)?.id ?? ''}
                          onChange={(e) => void linkPerson(p.id, e.target.value)}
                          className="w-44 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-emerald-600"
                        >
                          <option value="">{STR.notLinked}</option>
                          {persons
                            .filter((pe) => !pe.user_id || pe.user_id === p.id)
                            .map((pe) => (
                              <option key={pe.id} value={pe.id}>
                                {liteName(pe)}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
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

      <h2 className="mb-3 mt-8 text-lg font-semibold text-neutral-900">
        {STR.adminNotesTitle}
      </h2>
      {openRequests.length === 0 ? (
        <p className="text-sm text-neutral-500">{STR.noOpenNotes}</p>
      ) : (
        <div className="space-y-2">
          {openRequests.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-neutral-900">{personName(r)}</span>
                <button
                  className="shrink-0 font-medium text-emerald-700 hover:underline"
                  onClick={() => void closeRequest(r.id)}
                >
                  {STR.markDone}
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-neutral-700">{r.message}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {r.author?.display_name ?? '—'} · {dayjs(r.created_at).format('D MMMM YYYY')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
