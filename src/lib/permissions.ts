import type { Person, Profile } from '../types/domain'

// Биографические поля карточки меняет автор записи, сам человек или админ.
// Дублирует серверный гард persons_guard_edit — здесь только для UI.
export function canEditPerson(person: Person, profile: Profile | null): boolean {
  if (!profile) return false
  return (
    profile.role === 'admin' ||
    person.created_by === profile.id ||
    person.user_id === profile.id
  )
}
