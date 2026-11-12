// Byggare för individuella övningar, par, passningsmönster, rondo, stafett, stationer och målvakt.

import { byBand, partition, roundM, splitEven, summarize } from './alloc'
import { areaText, fitDim, labelStations, maxStations, mk, soloCoachNote, type BuildArgs } from './bhelp'
import { SceneBuilder, scatter, type Pt } from './scene'
import type { BuilderSpec, Setup } from './types'

type Spec<T extends BuilderSpec['type']> = Extract<BuilderSpec, { type: T }>

// ---------- Alla i samma yta ----------

export function buildIndividual({ ctx, rnd }: BuildArgs, spec: Spec<'individual'>): Setup | null {
  const n = ctx.players
  if (n < 2) return null
  const notes: string[] = []
  const side0 = roundM(Math.sqrt(Math.max(n, 6) * byBand(spec.areaPer, ctx.age)))
  const d = fitDim(ctx, 1, { w: side0, l: side0 }, notes)
  const taggers = spec.taggers ? Math.max(1, Math.round((n * spec.taggers) / 8)) : 0
  const withBall = spec.ballEach === false ? 0 : n - taggers

  const sb = new SceneBuilder(d.l, d.w)
  sb.box(0, 0, d.l, d.w)
  const gates = spec.layout === 'gates' ? Math.max(4, Math.round(n / 2) + 1) : 0
  const cones = spec.layout === 'cones' ? Math.max(6, n) : 0
  for (const p of scatter(gates, 2, 2, d.l - 4, d.w - 4, rnd)) sb.gate(p.x, p.y, 2, rnd() > 0.5)
  for (const p of scatter(cones, 2, 2, d.l - 4, d.w - 4, rnd)) sb.cone(p.x, p.y, 'yellow')

  const pts = scatter(n, 1.5, 1.5, d.l - 3, d.w - 3, rnd)
  const ids: { p: string; b?: string }[] = []
  pts.forEach((pt, i) => {
    const isTagger = i < taggers
    const p = sb.player(isTagger ? 'b' : 'a', pt.x, pt.y)
    ids.push({ p, b: !isTagger && withBall > 0 ? sb.ballAt(p) : undefined })
  })
  for (let s = 0; s < 3; s++) {
    for (const it of ids) {
      const cur = sb.at(it.p)
      const to: Pt = {
        x: Math.min(d.l - 1.5, Math.max(1.5, cur.x + (rnd() - 0.5) * d.l * 0.45)),
        y: Math.min(d.w - 1.5, Math.max(1.5, cur.y + (rnd() - 0.5) * d.w * 0.45)),
      }
      if (it.b) sb.dribble(it.p, it.b, to)
      else sb.run(it.p, to)
    }
    sb.step(1.4)
  }

  const groups = [{ label: 'Alla', text: `${n} spelare i samma yta${taggers ? `, varav ${taggers} ${taggers === 1 ? 'jagare' : 'jagare'} med väst` : ''}` }]
  return mk(
    1,
    d,
    `Alla i en yta ${areaText(d)}`,
    groups,
    { koner: 4 + gates * 2 + cones, bollar: withBall, vastar: taggers },
    notes,
    { n, taggers },
    sb.build(),
  )
}

// ---------- Par och trianglar ----------

export function buildPairs({ ctx }: BuildArgs, spec: Spec<'pairs'>): Setup | null {
  const n = ctx.players
  const size = spec.size ?? 2
  if (n < size) return null
  const notes: string[] = []
  const count = Math.floor(n / size)
  const rem = n - count * size
  const sizes = splitEven(n, count)
  if (rem) notes.push(size === 2 ? 'Ojämnt antal: en grupp blir tre – de passar i triangel och byter plats efter varje passning.' : 'Grupperna blir olika stora – den större gruppen roterar in en spelare efter varje passning.')
  const dd = byBand(spec.dist, ctx.age)
  const d = fitDim(ctx, 1, { w: roundM(count * 3 + 2), l: roundM(dd + 4) }, notes)

  const shown = Math.min(count, 6)
  const laneH = 4
  const sb = new SceneBuilder(dd + 6, shown * laneH)
  const balls: { ball: string; a: string; b: string; c?: string }[] = []
  for (let i = 0; i < shown; i++) {
    const y = laneH * (i + 0.5)
    sb.cone(3, y + 1.2)
    sb.cone(3 + dd, y + 1.2)
    const a = sb.player('a', 3, y)
    const b = sb.player(spec.mode === 'mirror' ? 'b' : 'a', 3 + dd, y)
    let c: string | undefined
    if (sizes[i] > 2 || (size === 3 && sizes[i] >= 3)) c = sb.player('a', 3 + dd / 2, y - 1.4)
    balls.push({ ball: sb.ballAt(a), a, b, c })
  }
  if (spec.mode === 'mirror') {
    for (let s = 0; s < 2; s++) {
      for (const g of balls) {
        const ap = sb.at(g.a)
        const bp = sb.at(g.b)
        const dy = s === 0 ? 1.3 : -1.3
        // Bollhållaren rör sig i sidled, kompisen följer som en spegelbild.
        sb.dribble(g.a, g.ball, { x: ap.x + (s === 0 ? dd * 0.12 : 0), y: ap.y + dy })
        sb.run(g.b, { x: bp.x, y: bp.y + dy })
      }
      sb.step(1.1)
    }
  } else {
    for (let s = 0; s < 2; s++) {
      for (const g of balls) {
        if (g.c) sb.pass(g.ball, g.c)
        else sb.pass(g.ball, g.b)
      }
      sb.step(0.9)
      for (const g of balls) {
        if (g.c) sb.pass(g.ball, g.b)
        else sb.pass(g.ball, g.a)
      }
      sb.step(0.9)
      for (const g of balls) {
        if (g.c) sb.pass(g.ball, g.a)
      }
      sb.step(0.9)
    }
  }
  const word = size === 3 ? 'grupper om tre' : 'par'
  const text = `${count} ${word}${rem && size === 2 ? ' (varav en trio)' : ''}, ${dd} m mellan spelarna`
  return mk(
    1,
    d,
    text,
    [{ label: 'Alla', text }],
    { koner: count * 2, bollar: count, vastar: spec.mode === 'mirror' ? count : 0 },
    notes,
    { n, count, d: dd },
    sb.build(),
  )
}

// ---------- Passningsmönster ----------

function patternVerts(shape: Spec<'pattern'>['shape'], s: number): { verts: Pt[]; w: number; h: number } {
  const m = 3
  switch (shape) {
    case 'square':
      return { verts: [{ x: m, y: m + s }, { x: m, y: m }, { x: m + s, y: m }, { x: m + s, y: m + s }], w: s + 2 * m, h: s + 2 * m }
    case 'triangle':
      return { verts: [{ x: m, y: m + s * 0.87 }, { x: m + s / 2, y: m }, { x: m + s, y: m + s * 0.87 }], w: s + 2 * m, h: s * 0.87 + 2 * m }
    case 'line':
      return { verts: [{ x: m, y: m + 3 }, { x: m + s, y: m + 3 }, { x: m + 2 * s, y: m + 3 }], w: 2 * s + 2 * m, h: 2 * m + 6 }
    case 'y':
      return {
        verts: [{ x: m, y: m + s * 0.6 }, { x: m + s, y: m + s * 0.6 }, { x: m + s * 1.8, y: m }, { x: m + s * 1.8, y: m + s * 1.2 }],
        w: s * 1.8 + 2 * m,
        h: s * 1.2 + 2 * m,
      }
    case 'diamond':
      return {
        verts: [{ x: m, y: m + s * 0.6 }, { x: m + s * 0.8, y: m }, { x: m + s * 1.6, y: m + s * 0.6 }, { x: m + s * 0.8, y: m + s * 1.2 }],
        w: s * 1.6 + 2 * m,
        h: s * 1.2 + 2 * m,
      }
  }
}

export function buildPattern({ ctx }: BuildArgs, spec: Spec<'pattern'>): Setup | null {
  const n = ctx.players
  const s = byBand(spec.side, ctx.age)
  const { verts, w, h } = patternVerts(spec.shape, s)
  const sizes = partition(n, spec.per, maxStations(ctx, h, w))
  if (!sizes) return null
  const notes: string[] = []
  const d = fitDim(ctx, sizes.length, { w: roundM(h), l: roundM(w) }, notes)
  soloCoachNote(ctx, sizes.length, notes)
  if (sizes[0] > spec.per[2]) notes.push('Många spelare per station: använd två bollar samtidigt så att ingen blir stående.')

  const sb = new SceneBuilder(w, h)
  verts.forEach((v) => sb.cone(v.x, v.y - 1.3))
  const k = sizes[0]
  const V = verts.length
  // En spelare per kon, övriga köar vid startkonen.
  const at: string[][] = verts.map(() => [])
  const alt = [0, Math.floor(V / 2)]
  for (let i = 0; i < Math.min(k, V + 4); i++) {
    const vi = i < V ? i : alt[(i - V) % 2]
    const q = at[vi].length
    const v = verts[vi]
    at[vi].push(sb.player('a', v.x - q * 1.6, v.y + (q ? 0.9 : 0)))
  }
  // Bollen startar hos den som står först i kön vid startkonen.
  const first = at[0][0]
  const ball = sb.ballAt(first)
  let holder = first
  const order = spec.shape === 'y' ? [0, 1, 2] : verts.map((_, i) => i)
  const open = spec.shape === 'y' || spec.shape === 'line'
  for (let i = 1; i <= order.length; i++) {
    const vi = order[i % order.length]
    if (open && i === order.length) {
      // Öppet mönster: sista spelaren driver bollen tillbaka till start.
      sb.dribble(holder, ball, { x: verts[0].x + 1.5, y: verts[0].y + 2.6 }).step(1.6)
      break
    }
    const target = i === order.length ? (at[0][1] ?? at[order[1]][0]) : at[vi][0]
    if (!target || target === holder) break
    if (spec.wall && i === 1 && at[order[1]][0]) {
      // Väggspel: spela in, få tillbaka i steget, spela vidare.
      const wallP = at[order[1]][0]
      const hp = sb.at(holder)
      const wp = sb.at(wallP)
      sb.pass(ball, wallP).step(0.8)
      const meet = { x: hp.x + (wp.x - hp.x) * 0.45, y: hp.y + (wp.y - hp.y) * 0.45 + 1.5 }
      sb.run(holder, meet)
      sb.pass(ball, { x: meet.x + 0.9, y: meet.y + 0.9 })
      sb.step(0.8)
      const nextV = at[order[2 % order.length]][0]
      if (nextV && nextV !== wallP) {
        sb.pass(ball, nextV)
        sb.run(holder, { x: wp.x, y: wp.y + 1.5 })
        sb.step(0.9)
        holder = nextV
        i = 2
        continue
      }
      break
    }
    const hp = sb.at(holder)
    const tp = sb.at(target)
    sb.pass(ball, target)
    // Passa och följ bollen till nästa kon.
    sb.run(holder, { x: tp.x - 1.4, y: tp.y + 1.2 + (hp.y > tp.y ? 0.4 : 0) })
    sb.step(0.9)
    holder = target
  }
  sb.wait(0.6)

  const texts = sizes.map((v) => `${v} spelare`)
  return mk(
    sizes.length,
    d,
    summarize(texts, 'stationer') + ` · ${s} m mellan konerna`,
    labelStations(texts, 'Station'),
    { koner: sizes.length * V, bollar: sizes.length * 2 },
    notes,
    { n: sizes[0], s },
    sb.build(),
  )
}

// ---------- Rondo ----------

export function rondoSplit(size: number): { out: number; inn: number } {
  const inn = size <= 5 ? 1 : size <= 7 ? 2 : 3
  return { out: size - inn, inn }
}

export function buildRondo({ ctx }: BuildArgs, spec: Spec<'rondo'>): Setup | null {
  const n = ctx.players
  const side = byBand(spec.side, ctx.age)
  const sizes = partition(n, spec.per, maxStations(ctx, side + 2, side + 2))
  if (!sizes) return null
  const notes: string[] = []
  const d = fitDim(ctx, sizes.length, { w: side, l: side }, notes)
  soloCoachNote(ctx, sizes.length, notes)
  if (sizes[0] > spec.per[2]) notes.push('Stora grupper: gör rutan ett par meter större och ha tre i mitten.')

  const k = sizes[0]
  const { out, inn } = rondoSplit(k)
  const S = d.l
  const sb = new SceneBuilder(S + 6, S + 6)
  sb.box(3, 3, S, S)
  const cx = 3 + S / 2
  const cy = 3 + S / 2
  const outer: string[] = []
  for (let i = 0; i < out; i++) {
    const a = (i / out) * Math.PI * 2 - Math.PI / 2
    // Projicera ut på kvadratens kant.
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    const t = (S / 2) / Math.max(Math.abs(dx), Math.abs(dy))
    outer.push(sb.player('a', cx + dx * t, cy + dy * t))
  }
  const inner: string[] = []
  for (let i = 0; i < inn; i++) {
    const a = (i / Math.max(1, inn)) * Math.PI * 2 + 0.6
    inner.push(sb.player('b', cx + Math.cos(a) * (inn > 1 ? S * 0.14 : 0), cy + Math.sin(a) * (inn > 1 ? S * 0.14 : 0)))
  }
  const ball = sb.ballAt(outer[0])
  const seq = out >= 4 ? [1, 3 % out, 2, 0] : [1, 2 % out, 0]
  for (const idx of seq) {
    const target = outer[idx]
    const tp = sb.at(target)
    sb.pass(ball, target)
    inner.forEach((p, i) => {
      const pp = sb.at(p)
      const f = i === 0 ? 0.6 : 0.25
      sb.run(p, { x: pp.x + (tp.x - pp.x) * f, y: pp.y + (tp.y - pp.y) * f })
    })
    sb.step(0.85)
  }
  sb.wait(0.5)

  const texts = sizes.map((v) => {
    const r = rondoSplit(v)
    return `${r.out} mot ${r.inn}`
  })
  const vast = sizes.reduce((s, v) => s + rondoSplit(v).inn, 0)
  return mk(
    sizes.length,
    d,
    summarize(texts, 'rutor') + ` · ruta ${S} × ${S} m`,
    labelStations(texts, 'Ruta'),
    { koner: sizes.length * 4, bollar: sizes.length * 2, vastar: vast },
    notes,
    { n: k, a: out, b: inn },
    sb.build(),
  )
}

// ---------- Stafett / banor ----------

export function buildRelay({ ctx }: BuildArgs, spec: Spec<'relay'>): Setup | null {
  const n = ctx.players
  const len = byBand(spec.len, ctx.age)
  const sizes = partition(n, spec.per, 8)
  if (!sizes) return null
  const notes: string[] = []
  const lanes = sizes.length
  const d = fitDim(ctx, 1, { w: roundM(lanes * 4), l: roundM(len + 6) }, notes)
  if (sizes[0] !== sizes[sizes.length - 1]) notes.push('Lagen är olika stora: i det mindre laget springer en spelare två gånger.')

  const shown = Math.min(lanes, 5)
  const laneH = 4.5
  const sb = new SceneBuilder(len + 9, shown * laneH)
  const movers: { p: string; b?: string; y: number }[] = []
  for (let i = 0; i < shown; i++) {
    const y = laneH * (i + 0.5)
    sb.cone(6, y + 1.5, 'orange')
    sb.cone(6 + len, y, 'orange')
    if (spec.mode === 'slalom') {
      const cn = 4
      for (let c = 1; c <= cn; c++) sb.cone(6 + (len * c) / (cn + 1), y, 'yellow')
    }
    for (let q = 0; q < Math.min(sizes[i], 5); q++) {
      const p = sb.player(i % 2 ? 'b' : 'a', 5 - q * 1.5, y)
      if (q === 0) movers.push({ p, b: spec.mode === 'run' ? undefined : sb.ballAt(p), y })
    }
  }
  const go = (x: number, dy: number, dur: number) => {
    for (const m of movers) {
      if (m.b) sb.dribble(m.p, m.b, { x, y: m.y + dy })
      else sb.run(m.p, { x, y: m.y + dy })
    }
    sb.step(dur)
  }
  if (spec.mode === 'slalom') {
    go(6 + len * 0.2, -1.1, 0.6)
    go(6 + len * 0.4, 1.1, 0.6)
    go(6 + len * 0.6, -1.1, 0.6)
    go(6 + len * 0.8, 1.1, 0.6)
  } else {
    go(6 + len * 0.5, 0.8, 0.9)
  }
  go(6 + len + 1.3, 0, 0.6)
  go(6 + len * 0.5, -1.3, 0.9)
  go(6.5, -1.3, 0.9)
  sb.wait(0.5)

  const texts = sizes.map((v) => `${v} spelare`)
  return mk(
    1,
    d,
    `${lanes} lag · ${summarize(texts, 'lag').replace(/^\d+ lag · /, '')} · bana ${len} m`,
    sizes.map((v, i) => ({ label: `Lag ${i + 1}`, text: `${v} spelare` })),
    { koner: lanes * (spec.mode === 'slalom' ? 6 : 2), bollar: spec.mode === 'run' ? 0 : lanes, vastar: Math.floor(lanes / 2) * sizes[0] },
    notes,
    { n: sizes[0], len, lanes },
    sb.build(),
  )
}

// ---------- Stationsbana ----------

export function buildCircuit({ ctx }: BuildArgs, spec: Spec<'circuit'>): Setup | null {
  const n = ctx.players
  if (n < 2) return null
  const S = spec.stations.length
  const g = Math.max(1, Math.min(S, Math.round(n / spec.per[1])))
  const sizes = splitEven(n, g)
  const notes: string[] = []
  if (g < S) notes.push(`Ni är ${g} ${g === 1 ? 'grupp' : 'grupper'} på ${S} stationer – det gör inget, grupperna går runt i tur och ordning.`)
  if (sizes[0] > spec.per[2]) notes.push('Stora grupper: gör övningarna i två led på varje station.')
  const d = fitDim(ctx, 1, { w: 20, l: 30 }, notes)

  const W = 34
  const H = 22
  const sb = new SceneBuilder(W, H)
  const cols = Math.ceil(S / 2)
  const centers: Pt[] = []
  for (let i = 0; i < S; i++) {
    const top = i < cols
    const c = top ? i : S - 1 - i
    const colsRow = top ? cols : S - cols
    centers.push({ x: (W * (c + 0.5)) / Math.max(1, colsRow), y: top ? H * 0.27 : H * 0.73 })
  }
  centers.forEach((c, i) => {
    sb.zone(c.x - 3.6, c.y - 3.2, 7.2, 6.4, 'tint', `${i + 1}`)
    sb.cone(c.x - 2.6, c.y + 2.2, 'yellow')
    sb.cone(c.x + 2.6, c.y + 2.2, 'yellow')
  })
  const groups: string[][] = []
  for (let gi = 0; gi < g; gi++) {
    const c = centers[gi]
    const ids: string[] = []
    const shown = Math.min(sizes[gi], 4)
    for (let i = 0; i < shown; i++) ids.push(sb.player(gi % 2 ? 'b' : 'a', c.x - 2 + i * 1.4, c.y - 0.6))
    groups.push(ids)
  }
  // Grupperna jobbar på plats och roterar sedan ett steg.
  for (const ids of groups) ids.forEach((p) => sb.run(p, { x: sb.at(p).x, y: sb.at(p).y + 1.6 }))
  sb.step(0.7)
  for (const ids of groups) ids.forEach((p) => sb.run(p, { x: sb.at(p).x, y: sb.at(p).y - 1.6 }))
  sb.step(0.7)
  groups.forEach((ids, gi) => {
    const next = centers[(gi + 1) % S]
    ids.forEach((p, i) => sb.run(p, { x: next.x - 2 + i * 1.4, y: next.y - 0.6 }))
  })
  sb.step(1.4)
  sb.wait(0.5)

  return mk(
    1,
    d,
    `${g} ${g === 1 ? 'grupp' : 'grupper'} roterar mellan ${S} stationer`,
    [
      ...sizes.map((v, i) => ({ label: `Grupp ${i + 1}`, text: `${v} spelare, börjar på station ${i + 1}` })),
      ...spec.stations.map((s, i) => ({ label: `Station ${i + 1}`, text: s })),
    ],
    { koner: S * 2 },
    notes,
    { n: sizes[0], stations: S },
    sb.build(),
  )
}

// ---------- Målvaktsmoment ----------

export function buildGk({ ctx }: BuildArgs, spec: Spec<'gk'>): Setup | null {
  const g = ctx.goalkeepers
  if (g < 1) return null
  const notes: string[] = []
  const serverIsCoach = g === 1
  if (serverIsCoach) notes.push('En målvakt: en tränare eller en utespelare som vilar agerar servare.')
  if (g > 2) notes.push('Fler än två målvakter: byt målvakt efter varje serie, övriga servar.')
  const sb = new SceneBuilder(22, 18)
  sb.goal('r', 'big', 9, 6)
  sb.zone(22 - 9, 1, 9, 16, 'line')
  const gk = sb.player('gk', 20.6, 9)
  const server = sb.player(serverIsCoach ? 'coach' : 'gk', 8, 9, serverIsCoach ? 'T' : undefined)
  const ball = sb.ballAt(server)
  switch (spec.variant) {
    case 'handling':
      sb.pass(ball, { x: 19.6, y: 9.6 }).step(0.8)
      sb.pass(ball, server).step(0.8)
      sb.run(gk, { x: 20.6, y: 6.5 }).step(0.5)
      sb.pass(ball, { x: 19.6, y: 6.8 }).step(0.8)
      break
    case 'diving':
      sb.cone(19.5, 5.5, 'yellow')
      sb.cone(19.5, 12.5, 'yellow')
      sb.shot(ball, { x: 20.2, y: 6 })
      sb.run(gk, { x: 20.4, y: 6.6 })
      sb.step(0.7)
      sb.pass(ball, server)
      sb.run(gk, { x: 20.6, y: 9 })
      sb.step(0.9)
      sb.shot(ball, { x: 20.2, y: 12 })
      sb.run(gk, { x: 20.4, y: 11.6 })
      sb.step(0.7)
      break
    case 'distribution': {
      sb.gate(5, 3, 3, true)
      sb.gate(5, 15, 3, true)
      sb.pass(ball, gk).step(0.9)
      sb.pass(ball, { x: 5, y: 3 }).step(1.1)
      break
    }
    case 'reaction':
      sb.run(gk, { x: 19.4, y: 9 }).step(0.4)
      sb.shot(ball, { x: 20.2, y: 7.2 })
      sb.run(gk, { x: 19.8, y: 7.6 })
      sb.step(0.5)
      sb.run(gk, { x: 19.4, y: 9 })
      sb.pass(ball, server)
      sb.step(0.8)
      sb.shot(ball, { x: 20.2, y: 10.8 })
      sb.run(gk, { x: 19.8, y: 10.5 })
      sb.step(0.5)
      break
    case 'crosses': {
      const wide = sb.player(serverIsCoach ? 'coach' : 'gk', 17, 1.5)
      void wide
      sb.pass(ball, { x: 17.8, y: 2.2 }).step(0.8)
      sb.pass(ball, { x: 18.5, y: 8 })
      sb.run(gk, { x: 18.8, y: 8.4 })
      sb.step(1)
      break
    }
  }
  sb.wait(0.6)
  const text = `${g} ${g === 1 ? 'målvakt' : 'målvakter'}${serverIsCoach ? ' + en servare' : ''} vid ett mål`
  return mk(1, { w: 18, l: 22 }, text, [{ label: 'Målvakter', text }], { bollar: 4, koner: 4, stormal: 1 }, notes, { n: g }, sb.build())
}
