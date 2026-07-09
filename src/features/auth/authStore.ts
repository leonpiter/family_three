import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/domain'

interface AuthState {
  session: Session | null
  profile: Profile | null
  initializing: boolean
  init: () => Promise<void>
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

let initialized = false

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,

  init: async () => {
    if (initialized) return
    initialized = true

    const {
      data: { session },
    } = await supabase.auth.getSession()
    set({ session })
    if (session) await get().refreshProfile()
    set({ initializing: false })

    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession })
      // Известная ловушка supabase-js: await внутри колбэка onAuthStateChange
      // блокирует обработку — выносим запрос профиля из колбэка.
      if (newSession) {
        setTimeout(() => void get().refreshProfile(), 0)
      } else {
        set({ profile: null })
      }
    })
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id
    if (!userId) return
    // maybeSingle: 0 строк не даёт ошибку. Сразу после регистрации профиль
    // создаётся триггером — если гонка, один повтор через 800 мс.
    let { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!data && get().session?.user.id === userId) {
      await new Promise((r) => setTimeout(r, 800))
      ;({ data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle())
    }
    set({ profile: (data as Profile | null) ?? null })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
