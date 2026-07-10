import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { STR } from '../../lib/strings'
import type { DatePrecision, Gender, MilitaryStatus } from '../../types/domain'
import type { PersonInput } from './boardStore'

const emptyInput: PersonInput = {
  first_name: '',
  middle_name: null,
  last_name: null,
  maiden_name: null,
  gender: null,
  birth_date: null,
  death_date: null,
  birth_date_precision: 'day',
  death_date_precision: 'day',
  birth_place: null,
  bio: null,
  education: null,
  occupation: null,
  achievements: null,
  residence: null,
  military_status: null,
  military_notes: null,
}

const inputCls =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'

// Список годов для выпадашки: от текущего вниз до 1850 (свежие — первыми).
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1849 }, (_, i) => CURRENT_YEAR - i)

// Поле даты с переключателем «только год» (когда точная дата неизвестна).
// В режиме года — ввод вручную ИЛИ выбор из выпадающего списка (datalist).
function VitalField({
  label,
  listId,
  value,
  precision,
  onChange,
}: {
  label: string
  listId: string
  value: string | null
  precision: DatePrecision
  onChange: (value: string | null, precision: DatePrecision) => void
}) {
  const yearOnly = precision === 'year'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-neutral-600">{label}</span>
        <label className="flex cursor-pointer items-center gap-1 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={yearOnly}
            onChange={(e) => onChange(value, e.target.checked ? 'year' : 'day')}
          />
          {STR.yearOnly}
        </label>
      </div>
      {yearOnly ? (
        <>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            list={listId}
            placeholder={STR.yearPlaceholder}
            value={value ? value.slice(0, 4) : ''}
            onChange={(e) => {
              const y = e.target.value.replace(/\D/g, '').slice(0, 4)
              onChange(y ? `${y}-01-01` : null, 'year')
            }}
            className={inputCls}
          />
          <datalist id={listId}>
            {YEARS.map((y) => (
              <option key={y} value={y} />
            ))}
          </datalist>
        </>
      ) : (
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null, 'day')}
          className={inputCls}
        />
      )}
    </div>
  )
}

export function PersonDialog({
  title,
  submitLabel,
  initial,
  onSubmit,
  onClose,
}: {
  title: string
  submitLabel: string
  initial?: Partial<PersonInput>
  onSubmit: (values: PersonInput) => Promise<void>
  onClose: () => void
}) {
  const [values, setValues] = useState<PersonInput>({ ...emptyInput, ...initial })
  const [busy, setBusy] = useState(false)

  const setField = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) =>
    setValues((s) => ({ ...s, [key]: value }))

  const orNull = (v: string) => (v.trim() === '' ? null : v)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await onSubmit(values)
    setBusy(false)
    onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={STR.firstName}
            value={values.first_name}
            onChange={(e) => setField('first_name', e.target.value)}
            required
            autoFocus
          />
          <Field
            label={STR.middleName}
            value={values.middle_name ?? ''}
            onChange={(e) => setField('middle_name', orNull(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={STR.lastName}
            value={values.last_name ?? ''}
            onChange={(e) => setField('last_name', orNull(e.target.value))}
          />
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-600">{STR.gender}</span>
            <select
              value={values.gender ?? ''}
              onChange={(e) => setField('gender', (e.target.value || null) as Gender | null)}
              className={inputCls}
            >
              <option value="">{STR.genderUnset}</option>
              <option value="m">{STR.genderM}</option>
              <option value="f">{STR.genderF}</option>
            </select>
          </label>
        </div>
        {(values.gender === 'f' || values.maiden_name) && (
          <Field
            label={STR.maidenName}
            value={values.maiden_name ?? ''}
            onChange={(e) => setField('maiden_name', orNull(e.target.value))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <VitalField
            label={STR.birthDate}
            listId="years-birth"
            value={values.birth_date}
            precision={values.birth_date_precision}
            onChange={(v, prec) =>
              setValues((s) => ({ ...s, birth_date: v, birth_date_precision: prec }))
            }
          />
          <VitalField
            label={STR.deathDate}
            listId="years-death"
            value={values.death_date}
            precision={values.death_date_precision}
            onChange={(v, prec) =>
              setValues((s) => ({ ...s, death_date: v, death_date_precision: prec }))
            }
          />
        </div>
        <Field
          label={STR.birthPlace}
          value={values.birth_place ?? ''}
          onChange={(e) => setField('birth_place', orNull(e.target.value))}
        />
        <Field
          label={STR.residence}
          value={values.residence ?? ''}
          onChange={(e) => setField('residence', orNull(e.target.value))}
        />
        <Field
          label={STR.education}
          value={values.education ?? ''}
          onChange={(e) => setField('education', orNull(e.target.value))}
        />
        <Field
          label={STR.occupation}
          value={values.occupation ?? ''}
          onChange={(e) => setField('occupation', orNull(e.target.value))}
        />
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-600">{STR.achievements}</span>
          <textarea
            value={values.achievements ?? ''}
            onChange={(e) => setField('achievements', orNull(e.target.value))}
            rows={2}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-600">{STR.militaryStatus}</span>
          <select
            value={values.military_status ?? ''}
            onChange={(e) =>
              setField('military_status', (e.target.value || null) as MilitaryStatus | null)
            }
            className={inputCls}
          >
            <option value="">{STR.militaryUnset}</option>
            <option value="not_served">{STR.militaryNotServed}</option>
            <option value="served">{STR.militaryServed}</option>
            <option value="fought">{STR.militaryFought}</option>
          </select>
        </label>
        {(values.military_status === 'served' || values.military_status === 'fought') && (
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-600">{STR.militaryNotes}</span>
            <textarea
              value={values.military_notes ?? ''}
              onChange={(e) => setField('military_notes', orNull(e.target.value))}
              rows={2}
              placeholder={STR.militaryNotesHint}
              className={inputCls}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-600">{STR.bio}</span>
          <textarea
            value={values.bio ?? ''}
            onChange={(e) => setField('bio', orNull(e.target.value))}
            rows={4}
            className={inputCls}
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {STR.cancel}
          </Button>
          <Button type="submit" disabled={busy || values.first_name.trim() === ''}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
