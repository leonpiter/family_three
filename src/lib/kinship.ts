import type { Gender, Person, Relationship } from '../types/domain'
import { fullName } from './person'
import { fmt } from './strings'

// Движок родства. Названия связей не хранятся в БД — они вычисляются из двух
// примитивов (parent/spouse) и пола: «тесть» = отец жены, «брат» = общий родитель.
// Термины-данные живут здесь (не в strings.ts — там только UI-ярлыки).

export type KinStep = 'U' | 'D' | 'S' // вверх к родителю / вниз к ребёнку / к супругу

export interface KinGraph {
  parents: Map<string, string[]> // childId -> parentIds
  children: Map<string, string[]> // parentId -> childIds
  spouses: Map<string, string[]> // только действующие браки
  exSpouses: Map<string, string[]> // бывшие: термин только напрямую, свойственники не считаются
}

export interface KinResult {
  personId: string
  term: string
  steps: KinStep[]
  distance: number
}

export function buildKinGraph(rels: Relationship[]): KinGraph {
  const parents = new Map<string, string[]>()
  const children = new Map<string, string[]>()
  const spouses = new Map<string, string[]>()
  const exSpouses = new Map<string, string[]>()
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const arr = m.get(k)
    if (arr) arr.push(v)
    else m.set(k, [v])
  }
  for (const r of rels) {
    if (r.type === 'parent') {
      push(parents, r.to_person_id, r.from_person_id)
      push(children, r.from_person_id, r.to_person_id)
    } else {
      const target = r.is_ex ? exSpouses : spouses
      push(target, r.from_person_id, r.to_person_id)
      push(target, r.to_person_id, r.from_person_id)
    }
  }
  return { parents, children, spouses, exSpouses }
}

interface Path {
  nodes: string[] // nodes[0] = ego
  steps: KinStep[]
}

// DFS-перечисление простых путей: нода не повторяется, два S подряд запрещены
// («супруг супруга» — не родство), глубина ограничена.
function enumeratePaths(egoId: string, graph: KinGraph, maxDepth: number): Map<string, Path[]> {
  const result = new Map<string, Path[]>()
  const nodes: string[] = [egoId]
  const steps: KinStep[] = []

  const visit = (current: string) => {
    if (steps.length > 0) {
      const path: Path = { nodes: [...nodes], steps: [...steps] }
      const arr = result.get(current)
      if (arr) arr.push(path)
      else result.set(current, [path])
    }
    if (steps.length >= maxDepth) return
    const last = steps[steps.length - 1]
    const moves: [string[] | undefined, KinStep][] = [
      [graph.parents.get(current), 'U'],
      [graph.children.get(current), 'D'],
      [last === 'S' ? undefined : graph.spouses.get(current), 'S'],
    ]
    for (const [ids, step] of moves) {
      if (!ids) continue
      for (const id of ids) {
        if (nodes.includes(id)) continue
        nodes.push(id)
        steps.push(step)
        visit(id)
        nodes.pop()
        steps.pop()
      }
    }
  }
  visit(egoId)
  return result
}

interface TermForms {
  m: string
  f: string
  n: string // пол не указан
}

interface TermEntry {
  nom: TermForms // именительный падеж (по полу цели)
  gen?: TermForms // родительный — для роли префикса в композиции («брат жены»)
  priority: number
}

const TERMS: Record<string, TermEntry> = {
  U: {
    nom: { m: 'отец', f: 'мать', n: 'родитель' },
    gen: { m: 'отца', f: 'матери', n: 'родителя' },
    priority: 0,
  },
  D: {
    nom: { m: 'сын', f: 'дочь', n: 'ребёнок' },
    gen: { m: 'сына', f: 'дочери', n: 'ребёнка' },
    priority: 0,
  },
  S: {
    nom: { m: 'муж', f: 'жена', n: 'супруг(а)' },
    gen: { m: 'мужа', f: 'жены', n: 'супруга' },
    priority: 0,
  },
  UD: {
    nom: { m: 'брат', f: 'сестра', n: 'брат или сестра' },
    gen: { m: 'брата', f: 'сестры', n: 'брата или сестры' },
    priority: 1,
  },
  UUD: {
    nom: { m: 'дядя', f: 'тётя', n: 'дядя или тётя' },
    gen: { m: 'дяди', f: 'тёти', n: 'дяди или тёти' },
    priority: 1,
  },
  UDD: {
    nom: { m: 'племянник', f: 'племянница', n: 'племянник или племянница' },
    priority: 1,
  },
  UUDD: {
    nom: { m: 'двоюродный брат', f: 'двоюродная сестра', n: 'двоюродный брат или сестра' },
    priority: 1,
  },
  US: { nom: { m: 'отчим', f: 'мачеха', n: 'отчим или мачеха' }, priority: 2 },
  SD: { nom: { m: 'пасынок', f: 'падчерица', n: 'пасынок или падчерица' }, priority: 2 },
  DS: { nom: { m: 'зять', f: 'невестка', n: 'зять или невестка' }, priority: 2 },
  UDS: { nom: { m: 'зять', f: 'невестка', n: 'зять или невестка' }, priority: 2 },
}

const pick = (forms: TermForms, g: Gender | null): string =>
  g === 'm' ? forms.m : g === 'f' ? forms.f : forms.n

const genderOf = (id: string, persons: Record<string, Person>): Gender | null =>
  persons[id]?.gender ?? null

// U×n → (пра-)дедушка/бабушка; D×n → (пра-)внук/внучка
function genericNom(sig: string, g: Gender | null): string | null {
  const up = /^U{2,}$/.test(sig)
  const down = /^D{2,}$/.test(sig)
  if (!up && !down) return null
  const pra = 'пра'.repeat(sig.length - 2)
  const m = pra + (up ? 'дедушка' : 'внук')
  const f = pra + (up ? 'бабушка' : 'внучка')
  return g === 'm' ? m : g === 'f' ? f : `${m} или ${f}`
}

function genericGen(sig: string, g: Gender | null): string | null {
  const up = /^U{2,}$/.test(sig)
  const down = /^D{2,}$/.test(sig)
  if ((!up && !down) || !g) return null
  const pra = 'пра'.repeat(sig.length - 2)
  if (up) return pra + (g === 'm' ? 'деда' : 'бабушки')
  return pra + (g === 'm' ? 'внука' : 'внучки')
}

// SU — единственная сигнатура, где термин зависит от пола ПРОМЕЖУТОЧНОЙ ноды:
// родители жены — тесть/тёща, родители мужа — свёкор/свекровь.
function resolveSU(path: Path, persons: Record<string, Person>): string {
  const spouseG = genderOf(path.nodes[1], persons)
  const targetG = genderOf(path.nodes[2], persons)
  if (spouseG === 'f') return targetG === 'm' ? 'тесть' : targetG === 'f' ? 'тёща' : 'родитель жены'
  if (spouseG === 'm')
    return targetG === 'm' ? 'свёкор' : targetG === 'f' ? 'свекровь' : 'родитель мужа'
  return targetG === 'm'
    ? 'отец супруга(и)'
    : targetG === 'f'
      ? 'мать супруга(и)'
      : 'родитель супруга(и)'
}

interface Resolved {
  term: string
  quality: number // 0 — точный термин, 1 — композиция, 2 — «дальний родственник»
  priority: number
}

function resolvePath(path: Path, persons: Record<string, Person>): Resolved {
  const sig = path.steps.join('')
  const targetG = genderOf(path.nodes[path.nodes.length - 1], persons)

  if (sig === 'SU') return { term: resolveSU(path, persons), quality: 0, priority: 1 }

  const gnom = genericNom(sig, targetG)
  if (gnom) return { term: gnom, quality: 0, priority: 1 }

  const entry = TERMS[sig]
  if (entry) return { term: pick(entry.nom, targetG), quality: 0, priority: entry.priority }

  // Композиция: «{суффикс-номинатив} {префикс-родительный}» — «брат жены»,
  // «тётя матери», «дедушка жены». Длинный суффикс предпочтительнее.
  for (let i = 1; i < path.steps.length; i++) {
    const prefix = sig.slice(0, i)
    const suffix = sig.slice(i)
    if (suffix === 'SU') continue // SU требует контекста ноды — в композиции не участвует
    const sufEntry = TERMS[suffix]
    const sufNom = genericNom(suffix, targetG) ?? (sufEntry ? pick(sufEntry.nom, targetG) : null)
    if (!sufNom) continue
    const midG = genderOf(path.nodes[i], persons)
    const preEntry = TERMS[prefix]
    const preGen = preEntry?.gen ? pick(preEntry.gen, midG) : genericGen(prefix, midG)
    if (!preGen) continue
    return { term: `${sufNom} ${preGen}`, quality: 1, priority: 5 }
  }

  const distant =
    targetG === 'f'
      ? 'дальняя родственница'
      : targetG === 'm'
        ? 'дальний родственник'
        : 'дальний родственник или родственница'
  return { term: distant, quality: 2, priority: 9 }
}

// Лучший путь: короче → точнее (термин бьёт композицию) → priority → детерминизм.
function bestOf(paths: Path[], persons: Record<string, Person>): { path: Path; res: Resolved } {
  let best: { path: Path; res: Resolved; sig: string } | null = null
  for (const path of paths) {
    const res = resolvePath(path, persons)
    const sig = path.steps.join('')
    if (!best) {
      best = { path, res, sig }
      continue
    }
    const cmp =
      path.steps.length - best.path.steps.length ||
      res.quality - best.res.quality ||
      res.priority - best.res.priority ||
      (sig < best.sig ? -1 : sig > best.sig ? 1 : 0)
    if (cmp < 0) best = { path, res, sig }
  }
  return { path: best!.path, res: best!.res }
}

const exSpouseTerm = (g: Gender | null): string =>
  g === 'm' ? 'бывший муж' : g === 'f' ? 'бывшая жена' : 'бывший супруг(а)'

export function kinshipBetween(
  egoId: string,
  targetId: string,
  persons: Record<string, Person>,
  graph: KinGraph,
  maxDepth = 4,
): KinResult | null {
  const paths = enumeratePaths(egoId, graph, maxDepth).get(targetId)
  const base =
    paths && paths.length > 0
      ? (() => {
          const { path, res } = bestOf(paths, persons)
          return {
            personId: targetId,
            term: res.term,
            steps: path.steps,
            distance: path.steps.length,
          }
        })()
      : null
  // Бывший супруг — прямой термин; кружного пути короче быть не может
  if (graph.exSpouses.get(egoId)?.includes(targetId) && (!base || base.distance > 1)) {
    return {
      personId: targetId,
      term: exSpouseTerm(genderOf(targetId, persons)),
      steps: ['S'],
      distance: 1,
    }
  }
  return base
}

export function kinshipAll(
  egoId: string,
  persons: Record<string, Person>,
  graph: KinGraph,
  maxDepth = 4,
): KinResult[] {
  const all = enumeratePaths(egoId, graph, maxDepth)
  const byId = new Map<string, KinResult>()
  for (const [personId, paths] of all) {
    if (!persons[personId]) continue
    const { path, res } = bestOf(paths, persons)
    byId.set(personId, { personId, term: res.term, steps: path.steps, distance: path.steps.length })
  }
  for (const exId of graph.exSpouses.get(egoId) ?? []) {
    if (!persons[exId]) continue
    const existing = byId.get(exId)
    if (!existing || existing.distance > 1) {
      byId.set(exId, {
        personId: exId,
        term: exSpouseTerm(genderOf(exId, persons)),
        steps: ['S'],
        distance: 1,
      })
    }
  }
  const out = [...byId.values()]
  out.sort((a, b) => a.distance - b.distance || a.term.localeCompare(b.term, 'ru'))
  return out
}

// Фраза для поповера ребра: «Анна — мать: Иван», «Иван и Мария — супруги».
export function relationshipSentence(
  rel: Relationship,
  persons: Record<string, Person>,
): string {
  const from = persons[rel.from_person_id]
  const to = persons[rel.to_person_id]
  if (!from || !to) return ''
  if (rel.type === 'spouse')
    return rel.is_ex
      ? fmt.exSpousePair(fullName(from), fullName(to))
      : fmt.spousePair(fullName(from), fullName(to))
  const term = from.gender === 'm' ? 'отец' : from.gender === 'f' ? 'мать' : 'родитель'
  return fmt.kinOf(fullName(from), term, fullName(to))
}
