// Супружеская пара хранится в нормализованном виде: меньший uuid — в from.
// Вместе с уникальным индексом в БД это исключает дубли «A+B» и «B+A».
export function normalizeSpousePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}
