import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useBoardStore } from '../board/boardStore'
import { useAuthStore } from '../auth/authStore'
import { PersonDialog } from '../board/PersonDialog'
import { PersonPickerDialog } from './PersonPickerDialog'
import { KinshipList } from './KinshipList'
import { EditRequests } from './EditRequests'
import { PhotoAlbum } from '../photos/PhotoAlbum'
import { canEditPerson } from '../../lib/permissions'
import { circleClass, initialsOf } from '../../lib/avatar'
import {
  ageInfo,
  formatVital,
  fullName,
  fullNameLong,
  lifeYears,
  militaryLabel,
  personToInput,
} from '../../lib/person'
import { STR } from '../../lib/strings'
import { Button } from '../../components/ui/Button'
import { VeteranStar } from '../../components/ui/VeteranStar'
import type { Person } from '../../types/domain'

// Правая панель с карточкой человека: поля, родство, фотоальбом.
export function PersonSidebar({
  person,
  avatarUrl,
  onClose,
  onRequestLink,
}: {
  person: Person
  avatarUrl?: string
  onClose: () => void
  onRequestLink: (targetId: string) => void
}) {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const updatePerson = useBoardStore((s) => s.updatePerson)
  const selectPerson = useBoardStore((s) => s.selectPerson)
  const { setCenter } = useReactFlow()
  const [editOpen, setEditOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const navigate = (id: string) => {
    const p = useBoardStore.getState().persons[id]
    if (!p) return
    selectPerson(id)
    // центр ноды: ширина 112px, круг 88px + подпись
    void setCenter(p.pos_x + 56, p.pos_y + 55, { duration: 500 })
  }

  const isYou = session != null && person.user_id === session.user.id
  const canEdit = canEditPerson(person, profile)
  const years = lifeYears(person)

  const fieldRow = (label: string, value: string | null) =>
    value ? (
      <div>
        <div className="text-xs text-neutral-400">{label}</div>
        <div className="whitespace-pre-wrap text-sm text-neutral-800">{value}</div>
      </div>
    ) : null

  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l border-neutral-200 bg-white shadow-xl sm:w-95">
      {/* Мобильный: крупная шапка «← Назад» */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-700 active:bg-neutral-100 sm:hidden"
      >
        <span className="text-lg">←</span> {STR.back}
      </button>
      {/* Десктоп: компактный × */}
      <button
        onClick={onClose}
        title={STR.close}
        className="absolute right-3 top-3 z-10 hidden h-7 w-7 items-center justify-center rounded-full text-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 sm:flex"
      >
        ×
      </button>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div
              className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 text-3xl font-semibold ${circleClass(person.gender)}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName(person)} className="h-full w-full object-cover" />
              ) : (
                initialsOf(person)
              )}
            </div>
            {person.military_status === 'fought' && <VeteranStar size={26} />}
          </div>
          <div className="mt-2 text-base font-semibold text-neutral-900">
            {fullNameLong(person)}
            {person.maiden_name && (
              <span className="font-normal text-neutral-500"> ({person.maiden_name})</span>
            )}
          </div>
          {years && <div className="text-sm text-neutral-400">{years}</div>}
          {ageInfo(person) && (
            <div className="text-xs text-neutral-400">{ageInfo(person)}</div>
          )}
          {isYou && (
            <span className="mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {STR.youBadge}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {fieldRow(STR.birthDate, formatVital(person.birth_date, person.birth_date_precision))}
          {fieldRow(STR.deathDate, formatVital(person.death_date, person.death_date_precision))}
          {fieldRow(STR.birthPlace, person.birth_place)}
          {fieldRow(STR.residence, person.residence)}
          {fieldRow(STR.education, person.education)}
          {fieldRow(STR.occupation, person.occupation)}
          {fieldRow(STR.achievements, person.achievements)}
          {fieldRow(STR.militaryStatus, militaryLabel(person.military_status))}
          {fieldRow(STR.militaryNotes, person.military_notes)}
          {fieldRow(STR.bio, person.bio)}
          {canEdit ? (
            <Button variant="secondary" onClick={() => setEditOpen(true)} className="w-full">
              {STR.edit}
            </Button>
          ) : (
            <p className="text-center text-xs text-neutral-400">{STR.editRestricted}</p>
          )}
        </div>

        <div className="mt-5">
          <EditRequests person={person} />
        </div>

        <div className="mt-6 border-t border-neutral-100 pt-4">
          <KinshipList
            ego={person}
            onNavigate={navigate}
            onAddLink={() => setPickerOpen(true)}
          />
        </div>

        <div className="mt-6 border-t border-neutral-100 pt-4">
          {/* key: при смене человека альбом монтируется заново — без чужого состояния */}
          <PhotoAlbum key={person.id} person={person} />
        </div>
      </div>

      {editOpen && (
        <PersonDialog
          title={STR.editPersonTitle}
          submitLabel={STR.save}
          initial={personToInput(person)}
          onClose={() => setEditOpen(false)}
          onSubmit={async (values) => {
            await updatePerson(person.id, values)
          }}
        />
      )}
      {pickerOpen && (
        <PersonPickerDialog
          exclude={[person.id]}
          onClose={() => setPickerOpen(false)}
          onPick={(p) => {
            setPickerOpen(false)
            onRequestLink(p.id)
          }}
        />
      )}
    </aside>
  )
}
