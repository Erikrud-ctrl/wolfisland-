// Fördelning av spelare på ytor, lag och grupper.

import type { Band, ByBand, Range3, SessionCtx, SpaceId } from './types'

export function bandOf(age: number): Band {
  if (age <= 9) return 0
  if (age <= 12) return 1
  if (age <= 14) return 2
  return 3
}

export function byBand<T>(v: ByBand<T>, age: number): T {
  return Array.isArray(v) ? (v as [T, T, T, T])[bandOf(age)] : (v as T)
}

export const SPACES: Record<SpaceId, { name: string; w: number; l: number }> = {
  hel11: { name: 'Hel 11-mannaplan', w: 65, l: 105 },
  halv11: { name: 'Halv 11-mannaplan', w: 65, l: 52 },
  kvart11: { name: 'Kvarts 11-manna / 7-mannaplan', w: 32, l: 52 },
  plan5: { name: '5-mannaplan', w: 20, l: 30 },
  hall: { name: 'Inomhushall', w: 20, l: 40 },
}

export function spaceArea(space: SpaceId): number {
  const s = SPACES[space]
  return s.w * s.l
}

/**
 * Hur många parallella ytor tränarna rimligen kan överblicka.
 * En ensam tränare med små barn klarar två enkla ytor, annars tre.
 */
export function coachCap(ctx: SessionCtx): number {
  if (ctx.coaches <= 1) return ctx.age <= 9 ? 2 : 3
  return Math.min(8, ctx.coaches * 2)
}

/** Dela n i k grupper så jämnt som möjligt (störst först). */
export function splitEven(n: number, k: number): number[] {
  const base = Math.floor(n / k)
  const extra = n % k
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0))
}

/**
 * Dela n spelare i grupper inom [min, max], så nära pref som möjligt.
 * Returnerar null om det inte går (för få spelare).
 */
export function partition(n: number, [min, pref, max]: Range3, maxGroups = 99): number[] | null {
  if (n < min) return null
  let best: number[] | null = null
  let bestScore = Infinity
  const kMax = Math.min(maxGroups, Math.floor(n / min))
  for (let k = 1; k <= kMax; k++) {
    const sizes = splitEven(n, k)
    if (sizes[0] > max || sizes[sizes.length - 1] < min) continue
    const score = sizes.reduce((s, v) => s + Math.abs(v - pref), 0) / k
    if (score < bestScore - 1e-9) {
      bestScore = score
      best = sizes
    }
  }
  if (best) return best
  // Går inte att hålla sig inom max med tillåtet antal grupper: ta största tillåtna antal.
  const k = Math.max(1, kMax)
  return splitEven(n, k)
}

export interface PitchTeams {
  a: number
  b: number
  /** Jokrar som alltid spelar med bollförande lag. */
  jokers: number
  /** Spelare som vilar och byts in löpande (bara när ytan är full). */
  resting: number
  /** Ett tredje lag som väntar/roterar in. */
  third: number
}

export interface TeamPlan {
  pitches: PitchTeams[]
}

export interface TeamOpts {
  team: Range3
  jokers: 0 | 1 | 2 | 'auto'
  maxPitches: number
}

/** Lägg upp en yta med n spelare som två lag (+ jokrar). */
function onePitch(n: number, [min, , max]: Range3, jokers: TeamOpts['jokers']): PitchTeams | null {
  if (n < min * 2) return null
  const fixedJ = typeof jokers === 'number' ? jokers : 0
  // Fast antal jokrar (t.ex. alltid 2).
  if (fixedJ > 0 && n - fixedJ >= min * 2) {
    const rest = n - fixedJ
    const extra = rest % 2
    const side = Math.floor(rest / 2)
    if (side <= max) return { a: side, b: side, jokers: fixedJ + extra, resting: 0, third: 0 }
  }
  const side = Math.floor(n / 2)
  const odd = n % 2
  if (side <= max) {
    if (!odd) return { a: side, b: side, jokers: 0, resting: 0, third: 0 }
    if (jokers === 'auto' || fixedJ > 0) return { a: side, b: side, jokers: 1, resting: 0, third: 0 }
    return { a: side + 1, b: side, jokers: 0, resting: 0, third: 0 }
  }
  // För många för två lag: tre lag där ett vilar och roterar in.
  const t = Math.floor(n / 3)
  if (t >= min && t <= max) {
    const rem = n - t * 3
    return { a: t, b: t, jokers: rem === 1 && jokers !== 0 ? 1 : 0, resting: rem === 1 && jokers !== 0 ? 0 : rem, third: t }
  }
  // Annars maxlag och resten byter löpande.
  return { a: max, b: max, jokers: 0, resting: n - max * 2, third: 0 }
}

/**
 * Fördela n spelare i lag på en eller flera ytor.
 * Väljer det antal ytor som ger lagstorlek närmast önskad storlek.
 */
export function planTeams(n: number, opts: TeamOpts): TeamPlan | null {
  const [min, pref] = opts.team
  if (n < min * 2) return null
  let best: TeamPlan | null = null
  let bestScore = Infinity
  const kMax = Math.max(1, Math.min(opts.maxPitches, Math.floor(n / (min * 2))))
  for (let k = 1; k <= kMax; k++) {
    const sizes = splitEven(n, k)
    const pitches: PitchTeams[] = []
    let ok = true
    for (const s of sizes) {
      const p = onePitch(s, opts.team, opts.jokers)
      if (!p) {
        ok = false
        break
      }
      pitches.push(p)
    }
    if (!ok) continue
    let score = 0
    for (const p of pitches) {
      // Större lag än tänkt kostar mer än mindre: hellre fler små ytor än stora lag.
      const size = (p.a + p.b) / 2
      score += size > pref ? (size - pref) * 1.3 : pref - size
      score += p.resting * 1.5 + p.third * 0.6 + (p.a !== p.b ? 0.3 : 0)
    }
    score = score / k - k * 0.02
    if (score < bestScore - 1e-9) {
      bestScore = score
      best = { pitches }
    }
  }
  return best
}

export function teamText(p: PitchTeams): string {
  let t = `${p.a} mot ${p.b}`
  if (p.jokers === 1) t += ' + 1 joker'
  if (p.jokers > 1) t += ` + ${p.jokers} jokrar`
  if (p.third) t += ` + ett tredje lag (${p.third}) som roterar in`
  if (p.resting === 1) t += ' + 1 som byter in löpande'
  if (p.resting > 1) t += ` + ${p.resting} som byter in löpande`
  return t
}

export function summarize(lines: string[], unit = 'ytor'): string {
  const counts = new Map<string, number>()
  for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1)
  const parts = [...counts.entries()].map(([t, c]) => (c > 1 ? `${c} × ${t}` : t))
  return lines.length > 1 ? `${lines.length} ${unit} · ${parts.join(', ')}` : parts[0]
}

/** Avrunda mått till jämna meter som går att stega upp. */
export function roundM(v: number, step = 1): number {
  return Math.max(step, Math.round(v / step) * step)
}

/** Räkna ut en rektangel med given area och proportion (längd/bredd). */
export function rect(area: number, ratio: number, step = 1): { w: number; l: number } {
  const w = Math.sqrt(area / ratio)
  return { w: roundM(w, step), l: roundM(w * ratio, step) }
}

/**
 * Anpassa antal ytor och mått till tillgänglig yta.
 * Returnerar en skalfaktor (≤ 1) för måtten samt om det blev trångt.
 */
export function fitToSpace(ctx: SessionCtx, stations: number, w: number, l: number): { scale: number; tight: boolean } {
  // En ensam yta får fylla hela planen, flera ytor behöver luft emellan.
  const need = stations * w * l * (stations > 1 ? 1.2 : 0.95)
  const have = spaceArea(ctx.space)
  if (need <= have) return { scale: 1, tight: false }
  const scale = Math.max(0.7, Math.sqrt(have / need))
  return { scale, tight: true }
}

/** Hur många ytor av given storlek som får plats. */
export function spaceCap(ctx: SessionCtx, w: number, l: number): number {
  return Math.max(1, Math.floor(spaceArea(ctx.space) / (w * l * 1.15)))
}
