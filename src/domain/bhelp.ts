// Gemensamma hjälpfunktioner för övningsbyggarna.

import { coachCap, fitToSpace, roundM, spaceCap } from './alloc'
import { dist, lerp, type Pt, type SceneBuilder } from './scene'
import type { DrillDef, EquipId, GroupLine, Scene, SessionCtx, Setup } from './types'

export interface BuildArgs {
  def: DrillDef
  ctx: SessionCtx
  rnd: () => number
}

/** Antal utespelare när målvakterna står i mål. */
export function outfield(ctx: SessionCtx): number {
  return Math.max(0, ctx.players - ctx.goalkeepers)
}

export function maxStations(ctx: SessionCtx, w: number, l: number): number {
  return Math.max(1, Math.min(coachCap(ctx), spaceCap(ctx, w, l)))
}

export interface Dim {
  w: number
  l: number
}

/** Skala ner måtten om ytan inte räcker och lägg till en notis. */
export function fitDim(ctx: SessionCtx, stations: number, d: Dim, notes: string[], step = 1): Dim {
  const f = fitToSpace(ctx, stations, d.w, d.l)
  if (!f.tight) return d
  notes.push('Ytan är begränsad – måtten är nedskalade. Korta hellre omgångarna än att tränga ihop fler spelare.')
  return { w: roundM(d.w * f.scale, step), l: roundM(d.l * f.scale, step) }
}

export function soloCoachNote(ctx: SessionCtx, stations: number, notes: string[]): void {
  if (stations > 1 && ctx.coaches <= 1) {
    notes.push(`Du är ensam tränare med ${stations} ytor: ställ dig så att du ser alla och låt spelarna starta om spelet själva.`)
  }
}

export function labelStations(texts: string[], word = 'Yta'): GroupLine[] {
  if (texts.length === 1) return [{ label: 'Alla', text: texts[0] }]
  return texts.map((t, i) => ({ label: `${word} ${i + 1}`, text: t }))
}

export function mk(
  stations: number,
  area: Dim,
  summary: string,
  groups: GroupLine[],
  equipment: Partial<Record<EquipId, number>>,
  notes: string[],
  vars: Record<string, string | number>,
  scene: Scene,
): Setup {
  const eq: Partial<Record<EquipId, number>> = {}
  for (const [k, v] of Object.entries(equipment)) {
    if (v && v > 0) eq[k as EquipId] = Math.ceil(v)
  }
  return {
    stations,
    area,
    summary,
    groups,
    equipment: eq,
    notes,
    vars: { w: area.w, l: area.l, stations, ...vars },
    scene,
  }
}

export interface SeqOpts {
  passes: number
  /** Anfallsriktning längs x. */
  dir: 1 | -1
  /** Avslut mot punkt efter sista passningen. */
  finish?: Pt | null
  /** Sista passningen spelas till denna punkt (t.ex. in i en slutzon). */
  into?: Pt | null
  speed?: number
}

/**
 * Skapa en trovärdig spelsekvens: laget passar sig framåt, en medspelare
 * rör sig till ny yta och närmaste försvarare pressar.
 */
export function playSeq(sb: SceneBuilder, A: string[], B: string[], J: string[], ball: string, rnd: () => number, o: SeqOpts): void {
  const mates = [...A, ...J]
  if (mates.length < 2) return
  let holder = A[0]
  let prev = ''
  const sp = o.speed ?? 0.95
  for (let i = 0; i < o.passes; i++) {
    const hp = sb.at(holder)
    const cands = mates.filter((m) => m !== holder && m !== prev)
    const pool = cands.length ? cands : mates.filter((m) => m !== holder)
    let pick = pool[0]
    let bestScore = -Infinity
    for (const c of pool) {
      const cp = sb.at(c)
      const d = dist(hp, cp)
      const score = o.dir * (cp.x - hp.x) * 0.6 + rnd() * sb.w * 0.25 - (d < 4 ? 8 : 0) - (d > sb.w * 0.7 ? 6 : 0)
      if (score > bestScore) {
        bestScore = score
        pick = c
      }
    }
    sb.pass(ball, pick)
    const pp = sb.at(pick)
    // En medspelare erbjuder sig i ny yta.
    const others = mates.filter((m) => m !== holder && m !== pick)
    if (others.length) {
      const r = others[Math.floor(rnd() * others.length)]
      const rp = sb.at(r)
      sb.run(r, {
        x: rp.x + o.dir * (2 + rnd() * sb.w * 0.12),
        y: rp.y + (rnd() - 0.5) * sb.h * 0.3,
      })
    }
    // Passningsläggaren följer med i spelet.
    sb.run(holder, { x: hp.x + o.dir * (1.5 + rnd() * 2), y: hp.y + (rnd() - 0.5) * 3 })
    // Närmaste försvarare pressar, näst närmaste täcker.
    const sorted = [...B].sort((a, b) => dist(sb.at(a), pp) - dist(sb.at(b), pp))
    if (sorted[0]) sb.run(sorted[0], lerp(sb.at(sorted[0]), pp, 0.65))
    if (sorted[1]) sb.run(sorted[1], lerp(sb.at(sorted[1]), pp, 0.3))
    sb.step(sp)
    prev = holder
    holder = pick
  }
  if (o.into) {
    const runner = mates.find((m) => m !== holder) ?? holder
    sb.run(runner, o.into)
    sb.pass(ball, { x: o.into.x + 0.9, y: o.into.y + 0.9 })
    sb.step(sp)
  }
  if (o.finish) {
    sb.shot(ball, o.finish).step(0.6)
  }
  sb.wait(0.8)
}

export function areaText(d: Dim): string {
  return `${d.l} × ${d.w} m`
}
