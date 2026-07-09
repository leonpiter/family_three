import type { ReactNode } from 'react'
import { STR } from '../../lib/strings'

// Центрированная карточка для страниц входа/регистрации/ожидания.
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-sm">
        <p className="mb-4 text-center text-lg font-semibold text-neutral-900">🌳 {STR.appName}</p>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-center text-base font-medium text-neutral-800">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
