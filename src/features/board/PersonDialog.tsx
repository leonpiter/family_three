import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { STR } from '../../lib/strings'
import type { Gender } from '../../types/domain'
import type { PersonInput } from './boardStore'

const emptyInput: PersonInput = {
  first_name: '',
  last_name: null,
  maiden_name: null,
  gender: null,
  birth_date: null,
  death_date: null,
  birth_place: null,
  bio: null,
}

const inputCls =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'

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
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={STR.firstName}
            value={values.first_name}
            onChange={(e) => setField('first_name', e.target.value)}
            required
            autoFocus
          />
          <Field
            label={STR.lastName}
            value={values.last_name ?? ''}
            onChange={(e) => setField('last_name', orNull(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={STR.maidenName}
            value={values.maiden_name ?? ''}
            onChange={(e) => setField('maiden_name', orNull(e.target.value))}
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
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={STR.birthDate}
            type="date"
            value={values.birth_date ?? ''}
            onChange={(e) => setField('birth_date', orNull(e.target.value))}
          />
          <Field
            label={STR.deathDate}
            type="date"
            value={values.death_date ?? ''}
            onChange={(e) => setField('death_date', orNull(e.target.value))}
          />
        </div>
        <Field
          label={STR.birthPlace}
          value={values.birth_place ?? ''}
          onChange={(e) => setField('birth_place', orNull(e.target.value))}
        />
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
