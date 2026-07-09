export type ProfileStatus = 'pending' | 'approved' | 'rejected'
export type ProfileRole = 'member' | 'admin'

export interface Profile {
  id: string
  email: string | null
  display_name: string
  status: ProfileStatus
  role: ProfileRole
  created_at: string
}
