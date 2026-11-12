// Planering av block och pass: väljer övningar, fördelar tid och anpassar efter dagens förutsättningar.

import { buildSetup } from './build'
import { activeDrills, allDrills, findDrill, isFavorite, isHidden } from './bank'
import { hash } from './scene'
import type { DrillDef, EquipId, Format, Phase, SessionCtx, Setup, ThemeId } from './types'

export type SlotId = 'prehab' | 'warmup' | 'skill' | 'game' | 'game2' | 'fys' | 'match'

export const SLOT_LABEL: Record<SlotId, string> = {
  prehab: 'Skadeförebyggande',
  warmup: 'Uppvärmning',
  skill: 'Färdighetsövning',
  game: 'Spelövning',
  game2: 'Spelövning 2',
  fys: 'Fys',
  match: 'Matchspel',
}

const SLOT_PHASE: Record<SlotId, Phase> = {
  prehab: 'prehab',
  warmup: 'warmup',
  skill: 'skill',
  game: 'game',
  game2: 'game',
  fys: 'fys',
  match: 'match',
}

/** Övningarna som valts för ett pass när blocket skapades. */
export interface SessionPlan {
  level: 1 | 2 | 3
  drills: Record<'warmup' | 'skill' | 'game' | 'game2' | 'match', string>
}

export interface SessionOptions {
  prehab: boolean
  gkMoment: boolean
  fys: boolean
}

export interface Slot {
  slot: SlotId
  drillId: string
  minutes: number
  /** Sätts när övningen har bytts automatiskt för att den planerade inte gick att genomföra. */
  swappedFrom?: string
}

export interface Session {
  ctx: SessionCtx
  options: SessionOptions
  slots: Slot[]
  /** Målvaktsmoment som körs parallellt med färdighetsövningen. */
  gkDrillId?: string
  pauses: number
}

export function ageFits(d: DrillDef, age: number): boolean {
  return age >= d.age[0] && age <= d.age[1]
}

/** Steg i progressionen för pass nummer i (0-baserat) av n. */
export function levelFor(i: number, n: number): 1 | 2 | 3 {
  if (n <= 1) return 2
  const v = 1 + Math.round((2 * i) / (n - 1))
  return Math.max(1, Math.min(3, v)) as 1 | 2 | 3
}

export const LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Grund – lära in',
  2: 'Under press – färre spelare, mer motstånd',
  3: 'Matchlikt – använda det i spel',
}

function candidates(phase: Phase, theme: ThemeId, age: number, pool: DrillDef[] = activeDrills()): DrillDef[] {
  // Yngre än åtta år använder de enklaste övningarna i banken.
  const a = Math.max(6, age)
  return pool.filter((d) => {
    if (d.phase !== phase || !ageFits(d, a)) return false
    if (phase === 'warmup') return d.themes.length === 0 || d.themes.includes(theme)
    if (phase === 'match') return d.themes.length === 0 || d.themes.includes(theme)
    if (phase === 'prehab' || phase === 'fys' || phase === 'gk') return true
    return d.themes.includes(theme)
  })
}

function rank(list: DrillDef[], level: number, used: Map<string, number>, seed: string, theme: ThemeId): DrillDef[] {
  const score = (d: DrillDef) => {
    // Rätt steg väger tyngst: hellre upprepa en övning än hoppa två steg i svårighet.
    const lvl = [0, 12, 200][Math.abs(d.level - level)] ?? 200
    const rep = (used.get(d.id) ?? 0) * 25
    // Övningar som har temat som huvudtema går före dem som bara passar in.
    const main = d.themes[0] === theme ? 0 : d.themes.includes(theme) ? 3 : 5
    // Favoriter går först bland övningar på rätt steg, men slår inte ut en övning som passar steget bättre.
    const fav = isFavorite(d.id) ? -8 : 0
    const rnd = (hash(seed + d.id) % 1000) / 1000
    return lvl + rep + main + fav + rnd
  }
  return [...list].sort((a, b) => score(a) - score(b))
}

function matchCandidates(theme: ThemeId, level: number, pool: DrillDef[] = activeDrills()): DrillDef[] {
  const all = pool.filter((d) => d.phase === 'match')
  if (level >= 3) return all.filter((d) => d.themes.length === 0)
  const themed = all.filter((d) => d.themes.includes(theme) && d.level === level)
  return themed.length ? themed : all.filter((d) => d.themes.length === 0)
}

/** Välj övningar för alla pass i ett block. */
export function planBlock(theme: ThemeId, age: number, sessions: number, seed: string): SessionPlan[] {
  const used = new Map<string, number>()
  const take = (pick: (pool?: DrillDef[]) => DrillDef[], level: number, key: string, avoid?: string): string => {
    // Har tränaren dolt allt som passar används hela banken hellre än att blocket blir tomt.
    let list = pick()
    if (!list.length) list = pick(allDrills())
    const ranked = rank(list, level, used, seed + key, theme)
    // Samma övning får inte förekomma två gånger i ett pass.
    const d = ranked.find((x) => x.id !== avoid) ?? ranked[0]
    if (!d) throw new Error(`Inga övningar för ${theme} (${key})`)
    used.set(d.id, (used.get(d.id) ?? 0) + 1)
    return d.id
  }
  const plans: SessionPlan[] = []
  for (let i = 0; i < sessions; i++) {
    const level = levelFor(i, sessions)
    const key = `s${i}`
    const warm = (pool?: DrillDef[]) => {
      const list = candidates('warmup', theme, age, pool)
      // Uppvärmningar som hör till temat väljs i första hand.
      const themed = list.filter((d) => d.themes.includes(theme))
      return themed.length >= 2 ? themed : list
    }
    const warmup = take(warm, 1, key + 'w')
    const skill = take((pool) => candidates('skill', theme, age, pool), level, key + 'k')
    const game = take((pool) => candidates('game', theme, age, pool), level, key + 'g')
    const game2 = take((pool) => candidates('game', theme, age, pool), Math.min(3, level + 1), key + 'h', game)
    const match = take((pool) => matchCandidates(theme, level, pool), level, key + 'm')
    plans.push({ level, drills: { warmup, skill, game, game2, match } })
  }
  return plans
}

/** Kontext för en enskild övning: målvakter som inte behövs i mål deltar som utespelare. */
export function slotCtx(session: Pick<Session, 'ctx' | 'gkDrillId'>, slot: SlotId): SessionCtx {
  const ctx = session.ctx
  if (slot === 'skill' && session.gkDrillId) {
    return { ...ctx, players: ctx.players - ctx.goalkeepers, goalkeepers: 0 }
  }
  return ctx
}

function minutesPlan(total: number, opts: SessionOptions): { slots: [SlotId, number][]; pauses: number } {
  const pauses = Math.round(total * 0.08)
  const prehab = opts.prehab ? (total <= 60 ? 8 : 10) : 0
  const fys = opts.fys ? (total <= 60 ? 8 : 10) : 0
  const rest = total - pauses - prehab - fys
  const two = total >= 85 && rest >= 62
  const w: [SlotId, number][] = two
    ? [
        ['warmup', opts.prehab ? 0.1 : 0.15],
        ['skill', 0.19],
        ['game', 0.21],
        ['game2', 0.18],
        ['match', 0.27],
      ]
    : [
        ['warmup', opts.prehab ? 0.12 : 0.17],
        ['skill', 0.22],
        ['game', 0.27],
        ['match', 0.34],
      ]
  const sum = w.reduce((s, [, v]) => s + v, 0)
  const out: [SlotId, number][] = w.map(([id, v]) => [id, Math.max(5, Math.round((rest * v) / sum))])
  // Matchspelet tar upp avrundningen.
  const used = out.reduce((s, [, m]) => s + m, 0)
  const mi = out.findIndex(([id]) => id === 'match')
  out[mi][1] = Math.max(8, out[mi][1] + (rest - used))
  const slots: [SlotId, number][] = []
  if (prehab) slots.push(['prehab', prehab])
  for (const s of out) {
    if (s[0] === 'match' && fys) slots.push(['fys', fys])
    slots.push(s)
  }
  return { slots, pauses }
}

function feasible(d: DrillDef, ctx: SessionCtx): boolean {
  try {
    return buildSetup(d, ctx) !== null
  } catch {
    return false
  }
}

/** Alternativa övningar för en plats i passet, bäst först. */
export function alternatives(session: Session, slot: SlotId, theme: ThemeId, level: number, exclude: string[], seed: string): DrillDef[] {
  const phase = SLOT_PHASE[slot]
  const ctx = slotCtx(session, slot)
  const base = candidates(phase, theme, ctx.age)
  const used = new Map<string, number>(exclude.map((id) => [id, 1]))
  let pool = base.filter((d) => feasible(d, ctx))
  // Går inget i temat att genomföra (t.ex. väldigt få spelare) duger en övning från ett annat tema.
  if (!pool.length) pool = activeDrills().filter((d) => d.phase === phase && ageFits(d, Math.max(6, ctx.age)) && feasible(d, ctx))
  return rank(pool, level, used, seed, theme)
}

/** Sätt ihop dagens pass utifrån blockets plan och ifyllda förutsättningar. */
export function buildSession(plan: SessionPlan, theme: ThemeId, ctx: SessionCtx, options: SessionOptions, seed: string): Session {
  // Extramoment som inte finns för åldern tar ingen tid från passet.
  const has = (phase: Phase) => candidates(phase, theme, ctx.age).some((d) => feasible(d, ctx))
  const opts: SessionOptions = { ...options, prehab: options.prehab && has('prehab'), fys: options.fys && has('fys') }
  const { slots: mins, pauses } = minutesPlan(ctx.minutes, opts)
  const session: Session = { ctx, options: opts, slots: [], pauses }

  // Målvaktsmoment: kräver två målvakter, eller en målvakt och en tränare som kan serva.
  const skillDef = findDrill(plan.drills.skill)
  // Utespelarna måste dessutom räcka till färdighetsövningen när målvakterna går åt sidan.
  const gkPossible = (ctx.goalkeepers >= 2 || (ctx.goalkeepers === 1 && ctx.coaches >= 2)) && ctx.players - ctx.goalkeepers >= 6
  if (options.gkMoment && gkPossible && skillDef && !skillDef.usesGk) {
    const gks = rank(
      candidates('gk', theme, ctx.age).filter((d) => feasible(d, ctx)),
      plan.level,
      new Map(),
      seed + 'gk',
      theme,
    )
    if (gks[0]) session.gkDrillId = gks[0].id
  }

  const taken: string[] = []
  let lost = 0
  for (const [slot, minutes] of mins) {
    let drillId: string
    let swappedFrom: string | undefined
    if (slot === 'prehab' || slot === 'fys') {
      const list = alternatives(session, slot, theme, 1, taken, seed + slot)
      if (!list[0]) {
        lost += minutes
        continue
      }
      drillId = list[0].id
    } else {
      drillId = plan.drills[slot]
      const def = findDrill(drillId)
      const c = slotCtx(session, slot)
      // En övning som har dolts eller tagits bort sedan blocket planerades byts ut.
      if (!def || isHidden(drillId) || taken.includes(drillId) || !ageFits(def, Math.max(6, c.age)) || !feasible(def, c)) {
        const level = slot === 'game2' ? Math.min(3, plan.level + 1) : plan.level
        const free = (d: DrillDef) => !taken.includes(d.id)
        const alt =
          alternatives(session, slot, theme, level, taken, seed + slot).find(free) ??
          // Sista utvägen: en genomförbar övning från ett annat tema.
          rank(
            activeDrills().filter((d) => d.phase === SLOT_PHASE[slot] && ageFits(d, Math.max(6, c.age)) && free(d) && feasible(d, c)),
            level,
            new Map(),
            seed + slot,
            theme,
          )[0]
        if (!alt) {
          lost += minutes
          continue
        }
        swappedFrom = def && !taken.includes(drillId) && !isHidden(drillId) ? drillId : undefined
        drillId = alt.id
      }
    }
    taken.push(drillId)
    session.slots.push({ slot, drillId, minutes, swappedFrom })
  }
  // Tid från moment som inte gick att genomföra läggs på sista momentet (matchspelet).
  const lastSlot = session.slots[session.slots.length - 1]
  if (lost && lastSlot) lastSlot.minutes += lost
  return session
}

/** Byt övning på en plats i passet mot nästa bästa alternativ. */
export function swapSlot(session: Session, index: number, theme: ThemeId, level: number, seed: string): Session {
  const cur = session.slots[index]
  if (!cur) return session
  // Samma ordning varje gång, så att upprepade byten bläddrar igenom alla alternativ i tur och ordning.
  const list = alternatives(session, cur.slot, theme, level, [], seed + cur.slot)
  if (list.length <= 1 && list[0]?.id === cur.drillId) return session
  const pos = list.findIndex((d) => d.id === cur.drillId)
  const order = pos >= 0 ? [...list.slice(pos + 1), ...list.slice(0, pos)] : list
  const next = order.find((d) => d.id !== cur.drillId && !session.slots.some((s, i) => i !== index && s.drillId === d.id)) ?? order[0]
  if (!next) return session
  const slots = session.slots.map((s, i) => (i === index ? { ...s, drillId: next.id, swappedFrom: undefined } : s))
  return { ...session, slots }
}

export interface BuiltSlot {
  slot: Slot
  def: DrillDef
  setup: Setup
}

export function builtSlots(session: Session): BuiltSlot[] {
  const out: BuiltSlot[] = []
  for (const slot of session.slots) {
    const def = findDrill(slot.drillId)
    if (!def) continue
    const setup = buildSetup(def, slotCtx(session, slot.slot))
    if (setup) out.push({ slot, def, setup })
  }
  return out
}

export function builtGk(session: Session): { def: DrillDef; setup: Setup } | null {
  if (!session.gkDrillId) return null
  const def = findDrill(session.gkDrillId)
  if (!def) return null
  const setup = buildSetup(def, session.ctx)
  return setup ? { def, setup } : null
}

export const EQUIP_LABEL: Record<EquipId, string> = {
  koner: 'Koner',
  bollar: 'Bollar',
  vastar: 'Västar',
  smamal: 'Småmål',
  stormal: 'Stora mål',
}

/** Materiallista för hela passet: det största behovet av varje sak. */
export function equipmentList(session: Session): { id: EquipId; label: string; count: number }[] {
  const max: Partial<Record<EquipId, number>> = {}
  const all = builtSlots(session).map((b) => b.setup)
  const gk = builtGk(session)
  const skill = builtSlots(session).find((b) => b.slot.slot === 'skill')
  for (const s of all) {
    for (const [k, v] of Object.entries(s.equipment) as [EquipId, number][]) {
      let need = v
      // Målvaktsmomentet pågår samtidigt som färdighetsövningen.
      if (gk && skill && s === skill.setup) need += gk.setup.equipment[k] ?? 0
      max[k] = Math.max(max[k] ?? 0, need)
    }
  }
  const order: EquipId[] = ['bollar', 'koner', 'vastar', 'smamal', 'stormal']
  return order.filter((k) => max[k]).map((k) => ({ id: k, label: EQUIP_LABEL[k], count: max[k] as number }))
}

export function formatName(f: Format): string {
  return f.replace('v', ' mot ')
}
