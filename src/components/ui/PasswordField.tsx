import { useState, type InputHTMLAttributes } from 'react'
import { STR } from '../../lib/strings'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string | null
}

// Поле пароля с «глазиком» — можно посмотреть, что введено.
export function PasswordField({ label, error, className, ...props }: Props) {
  const [show, setShow] = useState(false)
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-600">{label}</span>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:ring-1 ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-neutral-300 focus:border-emerald-600 focus:ring-emerald-600'
          } ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          title={show ? STR.hidePassword : STR.showPassword}
          aria-label={show ? STR.hidePassword : STR.showPassword}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}
