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
  addRelationship: (fromId: string, toId: string, type: RelType) => Promise<void>
  removeRelationship: (id: string) => Promise<void>
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
    // Оптимистично: сразу в UI, при ошибке откатываем.
    set((s) => ({ persons: { ...s.persons, [id]: { ...prev, ...patch } } }))
    const { error } = await supabase.from('persons').update(patch).eq('id', id)
    if (error) {
      set((s) => ({ persons: { ...s.persons, [id]: prev } }))
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

  addRelationship: async (fromId, toId, type) => {
    let from = fromId
    let to = toId
    if (type === 'spouse') [from, to] = normalizeSpousePair(fromId, toId)
    const { data, error } = await supabase
      .from('relationships')
      .insert({ from_person_id: from, to_person_id: to, type })
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
}))
