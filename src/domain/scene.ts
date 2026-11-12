// Hjälpklass för att bygga planskisser med animation.

import type { Item, Move, MoveKind, Scene, Step, Team, Zone } from './types'

/** Liten deterministisk slumpgenerator så att skisserna blir likadana varje gång. */
export function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Pt {
  x: number
  y: number
}

export class SceneBuilder {
  w: number
  h: number
  surface: Scene['surface']
  zones: Zone[] = []
  items: Item[] = []
  steps: Step[] = []
  private pos = new Map<string, Pt>()
  private n = 0
  private pending: Move[] = []

  constructor(w: number, h: number, surface: Scene['surface'] = 'grid') {
    this.w = w
    this.h = h
    this.surface = surface
  }

  private id(prefix: string): string {
    this.n += 1
    return `${prefix}${this.n}`
  }

  private clamp(p: Pt, margin = -2): Pt {
    return {
      x: Math.min(this.w - margin, Math.max(margin, p.x)),
      y: Math.min(this.h - margin, Math.max(margin, p.y)),
    }
  }

  at(id: string): Pt {
    const p = this.pos.get(id)
    if (!p) throw new Error(`okänt objekt ${id}`)
    return { ...p }
  }

  player(team: Team, x: number, y: number, label?: string): string {
    const id = this.id('p')
    this.items.push({ kind: 'player', id, team, x, y, label })
    this.pos.set(id, { x, y })
    return id
  }

  ball(x: number, y: number): string {
    const id = this.id('b')
    this.items.push({ kind: 'ball', id, x, y })
    this.pos.set(id, { x, y })
    return id
  }

  /** Boll vid en spelares fötter. */
  ballAt(playerId: string): string {
    const p = this.at(playerId)
    return this.ball(p.x + 0.9, p.y + 0.9)
  }

  cone(x: number, y: number, color?: 'orange' | 'yellow' | 'blue' | 'red'): string {
    const id = this.id('c')
    this.items.push({ kind: 'cone', id, x, y, color })
    return id
  }

  /** Fyra koner i hörnen av en rektangel. */
  box(x: number, y: number, w: number, h: number, color?: 'orange' | 'yellow' | 'blue' | 'red'): void {
    this.cone(x, y, color)
    this.cone(x + w, y, color)
    this.cone(x, y + h, color)
    this.cone(x + w, y + h, color)
  }

  /** Konport (två koner). */
  gate(x: number, y: number, width: number, vertical = true, color: 'orange' | 'yellow' | 'blue' | 'red' = 'yellow'): void {
    if (vertical) {
      this.cone(x, y - width / 2, color)
      this.cone(x, y + width / 2, color)
    } else {
      this.cone(x - width / 2, y, color)
      this.cone(x + width / 2, y, color)
    }
  }

  goal(side: 'l' | 'r' | 't' | 'b', size: 'big' | 'small', along?: number, width?: number): string {
    const id = this.id('g')
    const wd = width ?? (size === 'big' ? Math.min(7.3, this.h * 0.3) : 2)
    let x = 0
    let y = 0
    if (side === 'l' || side === 'r') {
      x = side === 'l' ? 0 : this.w
      y = along ?? this.h / 2
    } else {
      y = side === 't' ? 0 : this.h
      x = along ?? this.w / 2
    }
    this.items.push({ kind: 'goal', id, x, y, side, size, width: wd })
    return id
  }

  zone(x: number, y: number, w: number, h: number, tone: Zone['tone'] = 'line', label?: string): void {
    this.zones.push({ x, y, w, h, tone, label })
  }

  // ----- animation -----

  private move(id: string, to: Pt, kind: MoveKind, hidden = false): this {
    const t = this.clamp(to)
    this.pending.push({ id, to: t, kind, hidden })
    return this
  }

  /** Passa bollen till en spelare (eller punkt). */
  pass(ballId: string, target: string | Pt): this {
    const p = typeof target === 'string' ? this.at(target) : target
    const to = typeof target === 'string' ? { x: p.x + 0.9, y: p.y + 0.9 } : p
    return this.move(ballId, to, 'pass')
  }

  shot(ballId: string, to: Pt): this {
    return this.move(ballId, to, 'shot')
  }

  run(playerId: string, to: Pt): this {
    return this.move(playerId, to, 'run')
  }

  /** Spelaren driver bollen. */
  dribble(playerId: string, ballId: string, to: Pt): this {
    this.move(playerId, to, 'dribble')
    return this.move(ballId, { x: to.x + 0.9, y: to.y + 0.9 }, 'dribble', true)
  }

  /** Avsluta ett steg: alla köade förflyttningar sker samtidigt. */
  step(dur = 1): this {
    if (!this.pending.length) return this
    for (const m of this.pending) this.pos.set(m.id, { ...m.to })
    this.steps.push({ dur, moves: this.pending })
    this.pending = []
    return this
  }

  /** Paus utan rörelse. */
  wait(dur = 0.4): this {
    this.steps.push({ dur, moves: [] })
    return this
  }

  build(): Scene {
    this.step()
    return {
      w: this.w,
      h: this.h,
      surface: this.surface,
      zones: this.zones,
      items: this.items,
      steps: this.steps,
    }
  }
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** Sprid ut n punkter i en rektangel med slumpmässig förskjutning. */
export function scatter(n: number, x: number, y: number, w: number, h: number, rnd: () => number): Pt[] {
  if (n <= 0) return []
  const cols = Math.max(1, Math.round(Math.sqrt((n * w) / h)))
  const rows = Math.ceil(n / cols)
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const cw = w / cols
    const rh = h / rows
    pts.push({
      x: x + cw * (c + 0.5) + (rnd() - 0.5) * cw * 0.5,
      y: y + rh * (r + 0.5) + (rnd() - 0.5) * rh * 0.5,
    })
  }
  return pts
}

/**
 * Typiska utgångspositioner för ett lag som anfaller åt höger (dir = 1) eller vänster (dir = -1).
 * Laget ställs upp i linjer bakifrån och framåt inom rektangeln.
 */
export function shape(n: number, x: number, y: number, w: number, h: number, dir: 1 | -1): Pt[] {
  const lines: number[] =
    n <= 1 ? [1]
    : n === 2 ? [1, 1]
    : n === 3 ? [1, 2]
    : n === 4 ? [1, 2, 1]
    : n === 5 ? [2, 2, 1]
    : n === 6 ? [2, 3, 1]
    : n === 7 ? [3, 3, 1]
    : n === 8 ? [3, 3, 2]
    : n === 9 ? [3, 4, 2]
    : n === 10 ? [4, 4, 2]
    : [4, Math.ceil((n - 6) / 1), 2]
  const pts: Pt[] = []
  const L = lines.length
  lines.forEach((count, li) => {
    const depth = (li + 0.6) / (L + 0.4)
    const px = dir === 1 ? x + w * depth * 0.85 + w * 0.04 : x + w - w * depth * 0.85 - w * 0.04
    for (let i = 0; i < count; i++) {
      const py = y + (h * (i + 1)) / (count + 1)
      pts.push({ x: px, y: py })
    }
  })
  return pts.slice(0, n)
}
