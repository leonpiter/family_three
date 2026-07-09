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

export type Gender = 'm' | 'f'
export type RelType = 'parent' | 'spouse'

export interface Person {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string | null
  maiden_name: string | null
  gender: Gender | null
  birth_date: string | null
  death_date: string | null
  birth_place: string | null
  bio: string | null
  user_id: string | null
  avatar_photo_id: string | null
  pos_x: number
  pos_y: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  person_id: string
  storage_path: string
  thumb_path: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Relationship {
  id: string
  from_person_id: string
  to_person_id: string
  type: RelType
  created_at: string
}
