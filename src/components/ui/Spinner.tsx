export function Spinner() {
  return (
    <div
      className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-700"
      aria-label="Загрузка"
    />
  )
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  )
}
