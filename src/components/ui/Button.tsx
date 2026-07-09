import type { ButtonHTMLAttributes } from 'react'

const variants = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-neutral-300',
  secondary: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50',
} as const

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  )
}
