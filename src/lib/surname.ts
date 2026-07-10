// Цвет фамильной линии: рамка кружочка окрашивается по текущей фамилии.
// Сменившие фамилию (замужние дочери и т.п.) получают другой цвет и
// визуально выпадают из линии. Заливка кружка по-прежнему показывает пол.

const PALETTE = [
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#4d7c0f', '#16a34a',
  '#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777',
]

export function normalizeSurname(surname: string | null | undefined): string {
  return (surname ?? '').trim()
}

// Детерминированный цвет по строке фамилии (стабилен между сессиями).
export function surnameColor(surname: string | null | undefined): string | null {
  const s = normalizeSurname(surname).toLowerCase()
  if (!s) return null
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
