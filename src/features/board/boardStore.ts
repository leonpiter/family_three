import { create } from 'zustand'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { STR } from '../../lib/strings'
import { normalizeSpousePair } from '../../lib/relations'
import type { Person, Relationship, RelType, Gender } from '../../types/domain'

export interface PersonInput {
  first_name: string
  middle_name: string | null
  last_name: string | null
  maiden_name: string | null
  gender: Gender | null
  birth_date: string | null
  death_date: string | null
  birth_place: string | null
  bio: string | null
}

interface BoardState {
  persons: Record<string, Person>
  relationships: Record<string, Relationship>
  loading: boolean
  loaded: boolean
  selectedPersonId: string | null
  selectPerson: (id: string | null) => void
  loadAll: () => Promise<void>
  createPerson: (input: PersonInput & { pos_x: number; pos_y: number }) => Promise<Person | null>
  updatePerson: (
    id: string,
    patch: Partial<PersonInput> & { avatar_photo_id?: string | null },
  ) => Promise<void>
  movePersons: (moves: { id: string; x: number; y: number }[]) => void
  addRelationship: (fromId: string, toId: string, type: RelType, isEx?: boolean) => Promise<void>
  updateRelationship: (id: string, patch: { is_ex: boolean }) => Promise<void>
  removeRelationship: (id: string) => Promise<void>
  deletePerson: (id: string) => Promise<void>
}

// Позиции пишутся в БД пачкой с debounce 400 мс после окончания перетаскивания.
const pendingPositions = new Map<string, { x: number; y: number }>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

export const useBoardStore = create<BoardState>((set, get) => ({
  persons: {},
  relationships: {},
  loading: false,
  loaded: false,
  selectedPersonId: null,

  selectPerson: (id) => set({ selectedPersonId: id }),

  loadAll: async () => {
    set({ loading: !get().loaded })
    const [personsRes, relsRes] = await Promise.all([
      supabase.from('persons').select('*'),
      supabase.from('relationships').select('*'),
    ])
    if (personsRes.error || relsRes.error) {
      set({ loading: false })
      toast.error(STR.loadError)
      return
    }
    const persons = Object.fromEntries((personsRes.data as Person[]).map((p) => [p.id, p]))
    // Не затираем ещё не записанные в БД позиции (drag + фоновый refetch).
    for (const [id, pos] of pendingPositions) {
      if (persons[id]) persons[id] = { ...persons[id], pos_x: pos.x, pos_y: pos.y }
    }
    set((s) => ({
      persons,
      relationships: Object.fromEntries(
        (relsRes.data as Relationship[]).map((r) => [r.id, r]),
      ),
      loading: false,
      loaded: true,
      // выбранная персона могла быть удалена с другого устройства
      selectedPersonId:
        s.selectedPersonId && persons[s.selectedPersonId] ? s.selectedPersonId : null,
    }))
  },

  createPerson: async (input) => {
    const { data, error } = await supabase.from('persons').insert(input).select().single()
    if (error) {
      toast.error(STR.saveError)
      return null
    }
    const person = data as Person
    set((s) => ({ persons: { ...s.persons, [person.id]: person } }))
    return person
  },

  updatePerson: async (id, patch) => {
    const prev = get().persons[id]
    if (!prev) return
    // Оптимистично: сразу в UI, при ошибке откатываем только изменённые поля,
    // чтобы не затереть параллельный move/другой апдейт.
    set((s) => ({ persons: { ...s.persons, [id]: { ...prev, ...patch } } }))
    const { error } = await supabase.from('persons').update(patch).eq('id', id)
    if (error) {
      const prevRec = prev as unknown as Record<string, unknown>
      const rollback = Object.fromEntries(Object.keys(patch).map((k) => [k, prevRec[k]]))
      set((s) => {
        const cur = s.persons[id]
        if (!cur) return {}
        return { persons: { ...s.persons, [id]: { ...cur, ...rollback } } }
      })
      toast.error(STR.saveError)
    }
  },

  movePersons: (moves) => {
    set((s) => {
      const persons = { ...s.persons }
      for (const m of moves) {
        const p = persons[m.id]
        if (p) persons[m.id] = { ...p, pos_x: m.x, pos_y: m.y }
      }
      return { persons }
    })
    for (const m of moves) pendingPositions.set(m.id, { x: m.x, y: m.y })
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => {
      const batch = [...pendingPositions.entries()]
      pendingPositions.clear()
      void Promise.all(
        batch.map(([id, pos]) =>
          supabase.from('persons').update({ pos_x: pos.x, pos_y: pos.y }).eq('id', id),
        ),
      ).then((results) => {
        if (results.some((r) => r.error)) toast.error(STR.posSaveError)
      })
    }, 400)
  },

  addRelationship: async (fromId, toId, type, isEx = false) => {
    let from = fromId
    let to = toId
    if (type === 'spouse') [from, to] = normalizeSpousePair(fromId, toId)
    const { data, error } = await supabase
      .from('relationships')
      .insert({ from_person_id: from, to_person_id: to, type, is_ex: type === 'spouse' && isEx })
      .select()
      .single()
    if (error) {
      // 23505 — unique_violation: такая связь уже существует
      toast.error(error.code === '23505' ? STR.relExists : STR.saveError)
      return
    }
    const rel = data as Relationship
    set((s) => ({ relationships: { ...s.relationships, [rel.id]: rel } }))
  },

  updateRelationship: async (id, patch) => {
    const prev = get().relationships[id]
    if (!prev) return
    set((s) => ({ relationships: { ...s.relationships, [id]: { ...prev, ...patch } } }))
    const { error } = await supabase.from('relationships').update(patch).eq('id', id)
    if (error) {
      set((s) => ({ relationships: { ...s.relationships, [id]: prev } }))
      toast.error(STR.saveError)
    }
  },

  removeRelationship: async (id) => {
    const prev = get().relationships
    const next = { ...prev }
    delete next[id]
    set({ relationships: next })
    const { error } = await supabase.from('relationships').delete().eq('id', id)
    if (error) {
      set({ relationships: prev })
      toast.error(STR.saveError)
    }
  },

  // Только админ (RLS persons_delete). Связи и строки фото уходят каскадом,
  // файлы в storage чистим сами.
  deletePerson: async (id) => {
    const { data: photoRows } = await supabase
      .from('photos')
      .select('storage_path,thumb_path')
      .eq('person_id', id)
    const { error } = await supabase.from('persons').delete().eq('id', id)
    if (error) {
      toast.error(STR.saveError)
      return
    }
    const paths = ((photoRows ?? []) as { storage_path: string; thumb_path: string }[]).flatMap(
      (r) => [r.storage_path, r.thumb_path],
    )
    if (paths.length > 0) await supabase.storage.from('photos').remove(paths)
    set((s) => {
      const persons = { ...s.persons }
      delete persons[id]
      const relationships = Object.fromEntries(
        Object.entries(s.relationships).filter(
          ([, r]) => r.from_person_id !== id && r.to_person_id !== id,
        ),
      )
      return {
        persons,
        relationships,
        selectedPersonId: s.selectedPersonId === id ? null : s.selectedPersonId,
      }
    })
    toast.success(STR.deleted)
  },
}))
