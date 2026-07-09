import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../auth/authStore'
import { STR } from '../../lib/strings'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { EditRequest, Person } from '../../types/domain'

type RequestRow = EditRequest & { author: { display_name: string } | null }

// Замечания к карточке: «написать админу» + список открытых с кнопкой «Готово»
// для админа, автора карточки, самого человека или автора замечания.
export function EditRequests({ person }: { person: Person }) {
  const profile = useAuthStore((s) => s.profile)
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [writeOpen, setWriteOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('edit_requests')
      .select('*, author:profiles(display_name)')
      .eq('person_id', person.id)
      .eq('status', 'open')
      .order('created_at')
    if (!error && data) setRequests(data as RequestRow[])
  }, [person.id])

  useEffect(() => {
    void load()
  }, [load])

  const send = async () => {
    const message = text.trim()
    if (!message) return
    setBusy(true)
    const { error } = await supabase
      .from('edit_requests')
      .insert({ person_id: person.id, message })
    setBusy(false)
    if (error) {
      toast.error(STR.saveError)
      return
    }
    toast.success(STR.sentOk)
    setText('')
    setWriteOpen(false)
    void load()
  }

  const canClose = (r: RequestRow) =>
    profile != null &&
    (profile.role === 'admin' ||
      r.author_id === profile.id ||
      person.created_by === profile.id ||
      person.user_id === profile.id)

  const markDone = async (id: string) => {
    const { error } = await supabase
      .from('edit_requests')
      .update({ status: 'done' })
      .eq('id', id)
    if (error) {
      toast.error(STR.saveError)
      return
    }
    toast.success(STR.saved)
    void load()
  }

  return (
    <div className="space-y-2">
      {requests.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-neutral-900">{STR.notesTitle}</h3>
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg bg-amber-50 p-2.5 text-sm">
              <p className="whitespace-pre-wrap text-neutral-800">{r.message}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {r.author?.display_name ?? '—'} · {dayjs(r.created_at).format('D MMMM')}
                </span>
                {canClose(r) && (
                  <button
                    className="font-medium text-emerald-700 hover:underline"
                    onClick={() => void markDone(r.id)}
                  >
                    {STR.markDone}
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      <Button variant="secondary" onClick={() => setWriteOpen(true)} className="w-full">
        {STR.writeToAdmin}
      </Button>

      {writeOpen && (
        <Modal title={STR.editRequestTitle} onClose={() => setWriteOpen(false)}>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={STR.editRequestPlaceholder}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWriteOpen(false)}>
              {STR.cancel}
            </Button>
            <Button disabled={busy || text.trim() === ''} onClick={() => void send()}>
              {STR.send}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
