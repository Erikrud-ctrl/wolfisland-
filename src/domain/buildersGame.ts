// Byggare för dueller, bollinnehav, smålagsspel, avslut, lagdelsspel, match och fasta situationer.

import { byBand, partition, planTeams, rect, roundM, summarize, teamText, type PitchTeams } from './alloc'
import { areaText, fitDim, labelStations, maxStations, mk, outfield, playSeq, soloCoachNote, type BuildArgs } from './bhelp'
import { FORMATS } from './formats'
import { SceneBuilder, scatter, shape } from './scene'
import type { BuilderSpec, Range3, SessionCtx, Setup } from './types'

type Spec<T extends BuilderSpec['type']> = Extract<BuilderSpec, { type: T }>

function vests(p: PitchTeams): number {
  return p.b + p.jokers + (p.third ? p.third : 0)
}

function restNote(pitches: PitchTeams[], notes: string[]): void {
  if (pitches.some((p) => p.third)) notes.push('Tre lag på en yta: spela korta matcher (2–3 min), vinnaren står kvar eller rotera i fast ordning. Vilande lag passar boll bredvid planen.')
  if (pitches.some((p) => p.resting)) notes.push('Avbytare byter in själva vid varje mål eller var annan minut – ingen ska stå still länge.')
  if (pitches.some((p) => p.jokers)) notes.push('Jokern spelar alltid med laget som har bollen. Byt joker efter varje omgång.')
  if (pitches.some((p) => p.a !== p.b)) notes.push('Ojämna lag: låt det mindre laget börja med bollen och byt en spelare mellan lagen i halvtid.')
}

// ---------- Dueller: 1 mot 1, 2 mot 1, 2 mot 2, 3 mot 2 ----------

export function buildDuel({ ctx }: BuildArgs, spec: Spec<'duel'>): Setup | null {
  const useGk = spec.goals === 'big' && ctx.goalkeepers > 0
  const n = useGk ? outfield(ctx) : ctx.players
  const unit = spec.att + spec.def
  const per: Range3 = [unit + 1, unit * 2 + (unit <= 2 ? 1 : 0), unit * 3 + 1]
  const w0 = byBand(spec.w, ctx.age)
  const l0 = byBand(spec.l, ctx.age)
  const sizes = partition(n, per, maxStations(ctx, w0, l0))
  if (!sizes) return null
  const notes: string[] = []
  const d = fitDim(ctx, sizes.length, { w: w0, l: l0 }, notes)
  soloCoachNote(ctx, sizes.length, notes)
  const k = sizes.length
  let goalKind: 'small' | 'big' | 'line' | 'gates' = spec.goals
  if (spec.goals === 'big') {
    if (!useGk) {
      goalKind = 'small'
      notes.push('Ingen målvakt på plats: avslut mot småmål eller konmål i stället för stort mål.')
    } else if (ctx.goalkeepers < k) {
      notes.push(`Målvakt finns på ${ctx.goalkeepers} av ${k} ytor – övriga ytor avslutar mot småmål. Byt yta efter halva tiden.`)
    } else if (ctx.goalkeepers > k) {
      notes.push('Fler målvakter än mål: byt målvakt efter 5–6 avslut.')
    }
  }
  if (sizes[0] > per[2]) notes.push('Långa köer: starta nästa par så fort ytan är fri, eller dela ytan i två.')

  const L = d.l
  const W = d.w
  const sb = new SceneBuilder(L + 4, W + 2)
  const ox = 2
  const oy = 1
  sb.zone(ox, oy, L, W, 'line')
  if (goalKind === 'big') {
    sb.goal('r', 'big', oy + W / 2, Math.min(7.3, W * 0.5))
    sb.player('gk', ox + L + 1, oy + W / 2)
  } else if (goalKind === 'small') {
    sb.goal('r', 'small', oy + W / 2)
  } else if (goalKind === 'gates') {
    sb.gate(ox + L, oy + W * 0.22, 2.5, true)
    sb.gate(ox + L, oy + W * 0.78, 2.5, true)
  } else {
    sb.zone(ox + L - 2, oy, 2, W, 'tint', 'Mållinje')
  }
  if (spec.counter) {
    sb.gate(ox, oy + W * 0.25, 2, true, 'blue')
    sb.gate(ox, oy + W * 0.75, 2, true, 'blue')
  }
  const queue = sizes[0] - unit
  const attQ = Math.ceil(queue / 2)
  const defQ = queue - attQ
  const atts: string[] = []
  for (let i = 0; i < spec.att; i++) atts.push(sb.player('a', ox + 2, oy + (W * (i + 1)) / (spec.att + 1)))
  const defs: string[] = []
  for (let i = 0; i < spec.def; i++) {
    const y = oy + (W * (i + 1)) / (spec.def + 1)
    defs.push(spec.chase ? sb.player('b', ox + 0.5, y + 2.2) : sb.player('b', ox + L - 3, y))
  }
  for (let i = 0; i < Math.min(attQ, 4); i++) sb.player('a', ox - 1.2, oy + 1.5 + i * 1.6)
  for (let i = 0; i < Math.min(defQ, 4); i++) sb.player('b', spec.chase ? ox - 1.2 : ox + L + 1.4, oy + W - 1.5 - i * 1.6)

  // Försvararen spelar bollen till anfallaren och går i press.
  let ball: string
  if (spec.chase || !defs.length) {
    ball = sb.ballAt(atts[0])
  } else {
    ball = sb.ballAt(defs[0])
    sb.pass(ball, atts[0]).step(0.9)
  }
  const mid = ox + L * 0.5
  const a0 = sb.at(atts[0])
  sb.dribble(atts[0], ball, { x: mid - 2, y: a0.y })
  atts.slice(1).forEach((a, i) => {
    const p = sb.at(a)
    sb.run(a, { x: mid + 2 + i, y: p.y + (p.y > oy + W / 2 ? 1 : -1) * 1.5 })
  })
  defs.forEach((dd, i) => {
    const p = sb.at(dd)
    sb.run(dd, spec.chase ? { x: mid - 4, y: a0.y + 1.5 } : { x: mid + 1.5 + i * 2.5, y: i === 0 ? a0.y + 0.6 : p.y })
  })
  sb.step(1.1)
  const targetY = goalKind === 'gates' ? oy + W * 0.22 : oy + W / 2 - 0.6
  if (atts.length > 1) {
    sb.pass(ball, atts[1])
    const p0 = sb.at(atts[0])
    sb.run(atts[0], { x: p0.x + L * 0.25, y: p0.y - 2 })
    if (defs[0]) sb.run(defs[0], { x: sb.at(atts[1]).x - 1, y: sb.at(atts[1]).y })
    sb.step(0.8)
    sb.shot(ball, { x: ox + L, y: targetY }).step(0.6)
  } else {
    const cur = sb.at(atts[0])
    sb.dribble(atts[0], ball, { x: ox + L * 0.75, y: cur.y - W * 0.22 })
    if (defs[0]) sb.run(defs[0], { x: ox + L * 0.72, y: cur.y - W * 0.1 })
    sb.step(0.9)
    if (goalKind === 'line') sb.dribble(atts[0], ball, { x: ox + L - 1, y: cur.y - W * 0.22 }).step(0.6)
    else sb.shot(ball, { x: ox + L, y: targetY }).step(0.6)
  }
  sb.wait(0.7)

  const duel = `${spec.att} mot ${spec.def}`
  const texts = sizes.map((v) => `${v} spelare, ${duel}`)
  return mk(
    k,
    d,
    summarize(texts) + ` · yta ${areaText(d)}`,
    labelStations(texts),
    {
      koner: k * (4 + (goalKind === 'gates' ? 4 : 0) + (spec.counter ? 4 : 0)),
      bollar: k * 4,
      vastar: Math.ceil(n / 2),
      smamal: goalKind === 'small' ? k : goalKind === 'big' ? Math.max(0, k - ctx.goalkeepers) : 0,
      stormal: goalKind === 'big' ? Math.min(k, ctx.goalkeepers) : 0,
    },
    notes,
    { n: sizes[0], a: spec.att, b: spec.def },
    sb.build(),
  )
}

// ---------- Bollinnehav ----------

export function buildPossession({ ctx, rnd }: BuildArgs, spec: Spec<'possession'>): Setup | null {
  const n = ctx.players
  const per = byBand(spec.areaPer, ctx.age)
  const probe = rect(spec.team[1] * 2 * per, 1.3)
  const plan = planTeams(n, { team: spec.team, jokers: spec.jokers, maxPitches: maxStations(ctx, probe.w, probe.l) })
  if (!plan) return null
  const notes: string[] = []
  const p0 = plan.pitches[0]
  const active = p0.a + p0.b + p0.jokers
  // Joker underlättar bollinnehavet: krymp ytan något för att behålla utmaningen.
  const d0 = rect(active * per * (p0.jokers ? 0.9 : 1), 1.3)
  const d = fitDim(ctx, plan.pitches.length, d0, notes)
  soloCoachNote(ctx, plan.pitches.length, notes)
  restNote(plan.pitches, notes)

  const L = d.l
  const W = d.w
  const sb = new SceneBuilder(L, W)
  sb.box(0, 0, L, W)
  const ez = Math.max(3, roundM(L * 0.12))
  if (spec.target === 'endzones') {
    sb.zone(0, 0, ez, W, 'tint', 'Slutzon')
    sb.zone(L - ez, 0, ez, W, 'tint', 'Slutzon')
  }
  if (spec.target === 'thirds') {
    sb.zone(L / 3, 0, L / 3, W, 'tint')
  }
  if (spec.target === 'gates') {
    for (const g of scatter(Math.max(3, p0.a), 3, 3, L - 6, W - 6, rnd)) sb.gate(g.x, g.y, 2.5, rnd() > 0.5)
  }
  const inner = spec.target === 'endzones' ? ez : 1
  const A = shape(p0.a, inner, 1, L - inner * 2, W - 2, 1).map((p) => sb.player('a', p.x, p.y))
  const B = shape(p0.b, inner, 1, L - inner * 2, W - 2, -1).map((p) => sb.player('b', p.x + 1.2, p.y + 1.5))
  const J: string[] = []
  if (spec.target === 'targets' && p0.jokers >= 2) {
    J.push(sb.player('n', 0.8, W / 2), sb.player('n', L - 0.8, W / 2))
    for (let i = 2; i < p0.jokers; i++) J.push(sb.player('n', L / 2, W / 2))
  } else {
    for (let i = 0; i < p0.jokers; i++) J.push(sb.player('n', L / 2 + (i ? 3 : 0), W / 2 + (i ? -3 : 0)))
  }
  const ball = sb.ballAt(A[0])
  playSeq(sb, A, B, J, ball, rnd, {
    passes: 4,
    dir: 1,
    into: spec.target === 'endzones' ? { x: L - ez / 2, y: W * 0.4 } : null,
  })

  const texts = plan.pitches.map(teamText)
  return mk(
    plan.pitches.length,
    d,
    summarize(texts) + ` · yta ${areaText(d)}`,
    labelStations(texts),
    {
      koner: plan.pitches.length * (4 + (spec.target === 'endzones' ? 4 : 0) + (spec.target === 'gates' ? p0.a * 2 : 0) + (spec.target === 'thirds' ? 4 : 0)),
      bollar: plan.pitches.length * 3,
      vastar: plan.pitches.reduce((s, p) => s + vests(p), 0),
    },
    notes,
    { a: p0.a, b: p0.b, j: p0.jokers, n: active },
    sb.build(),
  )
}

// ---------- Smålagsspel ----------

export function buildSsg({ ctx, rnd }: BuildArgs, spec: Spec<'ssg'>): Setup | null {
  const wantsBig = spec.goals === 'big' || spec.goals === 'auto'
  const gks = wantsBig ? ctx.goalkeepers : 0
  const n = ctx.players - gks
  const per = byBand(spec.areaPer, ctx.age)
  const probe = rect(spec.team[1] * 2 * per, 1.4)
  const plan = planTeams(n, { team: spec.team, jokers: spec.jokers ?? 'auto', maxPitches: maxStations(ctx, probe.w, probe.l) })
  if (!plan) return null
  const notes: string[] = []
  const k = plan.pitches.length
  const p0 = plan.pitches[0]
  const active = p0.a + p0.b + p0.jokers
  const d0 = rect(active * per * (p0.jokers ? 0.9 : 1), 1.4)
  const d = fitDim(ctx, k, d0, notes)
  soloCoachNote(ctx, k, notes)
  restNote(plan.pitches, notes)

  // Fördela målvakter: två per yta så långt de räcker.
  const gkPerPitch: number[] = []
  let left = gks
  for (let i = 0; i < k; i++) {
    const g = Math.min(2, left)
    gkPerPitch.push(g)
    left -= g
  }
  let goalKind: 'small' | 'big' | 'four' | 'mixed' = spec.goals === 'four' ? 'four' : spec.goals === 'small' ? 'small' : 'big'
  if (wantsBig) {
    if (gks === 0) {
      goalKind = 'small'
      notes.push('Ingen målvakt på plats: spela med småmål (eller konmål där bollen måste rulla in under knähöjd).')
    } else if (gkPerPitch[0] === 1) {
      goalKind = 'mixed'
      notes.push('En målvakt: ena laget anfaller mot stort mål med målvakt, det andra mot två småmål. Byt sida i halvtid.')
    }
    if (gkPerPitch.some((g) => g === 0) && gks > 0) notes.push('Målvakterna räcker inte till alla ytor – övriga ytor spelar med småmål. Låt lagen byta yta.')
    if (left > 0) notes.push(`${left} målvakt${left > 1 ? 'er' : ''} över: byt målvakt var tredje minut.`)
  }

  const L = d.l
  const W = d.w
  const sb = new SceneBuilder(L, W)
  sb.box(0, 0, L, W)
  if (spec.zones === 'halves') sb.zone(L / 2, 0, 0.01, W, 'line')
  if (spec.zones === 'thirds') sb.zone(L / 3, 0, L / 3, W, 'tint')
  if (spec.zones === 'wide') {
    const cw = Math.max(3, roundM(W * 0.18))
    sb.zone(0, 0, L, cw, 'tint', 'Kantzon')
    sb.zone(0, W - cw, L, cw, 'tint', 'Kantzon')
  }
  if (spec.zones === 'endzones') {
    const ez = Math.max(4, roundM(L * 0.18))
    sb.zone(0, 0, ez, W, 'tint')
    sb.zone(L - ez, 0, ez, W, 'tint', 'Avslutszon')
  }
  let finish = { x: L, y: W / 2 }
  if (goalKind === 'four') {
    sb.goal('l', 'small', W * 0.22)
    sb.goal('l', 'small', W * 0.78)
    sb.goal('r', 'small', W * 0.22)
    sb.goal('r', 'small', W * 0.78)
    finish = { x: L, y: W * 0.22 }
  } else if (goalKind === 'small') {
    sb.goal('l', 'small')
    sb.goal('r', 'small')
  } else if (goalKind === 'mixed') {
    sb.goal('r', 'big', W / 2, Math.min(FORMATS[ctx.format].goalW, W * 0.4))
    sb.player('gk', L - 1, W / 2)
    sb.goal('l', 'small', W * 0.22)
    sb.goal('l', 'small', W * 0.78)
  } else {
    const gw = Math.min(FORMATS[ctx.format].goalW, W * 0.4)
    sb.goal('l', 'big', W / 2, gw)
    sb.goal('r', 'big', W / 2, gw)
    sb.player('gk', 1, W / 2)
    sb.player('gk', L - 1, W / 2)
  }
  const A = shape(p0.a, 2, 1, L - 4, W - 2, 1).map((p) => sb.player('a', p.x, p.y))
  const B = shape(p0.b, 2, 1, L - 4, W - 2, -1).map((p) => sb.player('b', p.x + 1, p.y + 1.2))
  const J: string[] = []
  for (let i = 0; i < p0.jokers; i++) J.push(sb.player('n', L / 2, W / 2 + (i ? 4 : -1)))
  const ball = sb.ballAt(A[0])
  playSeq(sb, A, B, J, ball, rnd, { passes: 3, dir: 1, finish })

  const texts = plan.pitches.map((p, i) => teamText(p) + (gkPerPitch[i] ? ` + ${gkPerPitch[i]} målvakt${gkPerPitch[i] > 1 ? 'er' : ''}` : ''))
  const smallPerPitch = (i: number) => (goalKind === 'four' ? 4 : gkPerPitch[i] === 2 ? 0 : 2)
  return mk(
    k,
    d,
    summarize(texts) + ` · plan ${areaText(d)}`,
    labelStations(texts, 'Plan'),
    {
      koner: k * (4 + (spec.zones && spec.zones !== 'none' ? 4 : 0)),
      bollar: k * 3,
      vastar: plan.pitches.reduce((s, p) => s + vests(p), 0),
      smamal: plan.pitches.reduce((s, _p, i) => s + smallPerPitch(i), 0),
      stormal: goalKind === 'four' ? 0 : gkPerPitch.reduce((s, g) => s + g, 0),
    },
    notes,
    { a: p0.a, b: p0.b, j: p0.jokers, n: active },
    sb.build(),
  )
}

// ---------- Avslut ----------

export function buildFinishing({ ctx }: BuildArgs, spec: Spec<'finishing'>): Setup | null {
  const gks = ctx.goalkeepers
  const n = outfield(ctx)
  const band = ctx.age <= 9 ? 0 : ctx.age <= 12 ? 1 : 2
  const L = [16, 22, 28][band]
  const W = [14, 20, 28][band]
  const sizes = partition(n, spec.per, maxStations(ctx, W, L))
  if (!sizes) return null
  const notes: string[] = []
  const k = sizes.length
  const d = fitDim(ctx, k, { w: W, l: L }, notes)
  soloCoachNote(ctx, k, notes)
  const hasGk = gks > 0
  if (!hasGk) notes.push('Ingen målvakt på plats: avsluta mot småmål eller konmål, eller dela målet i zoner med koner och ge poäng för hörnen.')
  else if (gks < k) notes.push(`Målvakt finns på ${gks} av ${k} stationer – övriga stationer avslutar mot småmål. Byt station efter halva tiden.`)
  else if (gks > k) notes.push('Fler målvakter än mål: byt målvakt efter 6–8 avslut.')
  if (sizes[0] > spec.per[2]) notes.push('Många per station: kör från två håll samtidigt (vänster och höger) så blir kön kort.')
  if (spec.variant === 'gk1v1' && !hasGk) notes.push('Utan målvakt: en utespelare agerar försvarare som möter i stället.')

  const sb = new SceneBuilder(L + 2, W)
  const gw = Math.min(FORMATS[ctx.format].goalW, W * 0.45)
  if (hasGk) {
    sb.goal('r', 'big', W / 2, gw)
    sb.player('gk', L + 0.8, W / 2)
  } else {
    sb.goal('r', 'small', W / 2, 3)
  }
  sb.zone(L + 2 - L * 0.42, W * 0.12, L * 0.42, W * 0.76, 'line')
  const goalPt = { x: L + 2, y: W / 2 - gw * 0.3 }
  const q = Math.min(sizes[0], 5)
  const startX = 3
  const cy = W / 2
  const line = (x: number, y: number, count: number, team: 'a' | 'b' = 'a') => {
    const ids: string[] = []
    for (let i = 0; i < count; i++) ids.push(sb.player(team, x - i * 1.6, y))
    return ids
  }
  switch (spec.variant) {
    case 'straight': {
      const ids = line(startX + 3, cy, q)
      sb.cone(startX + 4.5, cy + 1.5)
      sb.cone(L * 0.55, cy - 2)
      sb.cone(L * 0.55, cy + 2)
      const ball = sb.ballAt(ids[0])
      sb.dribble(ids[0], ball, { x: L * 0.52, y: cy - 0.5 }).step(1.1)
      sb.shot(ball, goalPt).step(0.6)
      break
    }
    case 'wall': {
      const ids = line(startX + 3, cy + 2, Math.max(1, q - 1))
      const wall = sb.player('a', L * 0.55, cy - 3)
      sb.cone(L * 0.55, cy - 4.5)
      const ball = sb.ballAt(ids[0])
      sb.pass(ball, wall).step(0.8)
      const meet = { x: L * 0.62, y: cy + 1 }
      sb.run(ids[0], meet)
      sb.pass(ball, { x: meet.x + 0.9, y: meet.y + 0.9 })
      sb.step(0.9)
      sb.shot(ball, goalPt)
      sb.run(wall, { x: startX, y: cy + 4 })
      sb.step(0.6)
      break
    }
    case 'turn': {
      const ids = line(startX + 3, cy, Math.max(1, q - 1))
      const tgt = sb.player('a', L * 0.6, cy)
      const dummy = sb.cone(L * 0.66, cy, 'red')
      void dummy
      const ball = sb.ballAt(ids[0])
      sb.pass(ball, tgt).step(0.9)
      sb.dribble(tgt, ball, { x: L * 0.72, y: cy - 3 }).step(0.8)
      sb.shot(ball, goalPt)
      sb.run(ids[0], { x: L * 0.6, y: cy })
      sb.step(0.6)
      break
    }
    case 'gk1v1': {
      const ids = line(startX + 3, cy, q)
      const ball = sb.ballAt(ids[0])
      sb.dribble(ids[0], ball, { x: L * 0.6, y: cy }).step(1.1)
      sb.dribble(ids[0], ball, { x: L * 0.85, y: cy - 3 }).step(0.7)
      sb.shot(ball, { x: L + 2, y: cy - gw * 0.35 }).step(0.5)
      break
    }
    case 'cross': {
      const wide = line(startX + 3, 2, Math.ceil(q / 2))
      const mid = line(startX + 5, cy + 2, Math.max(1, Math.floor(q / 2)))
      sb.cone(L * 0.8, 1.5)
      const ball = sb.ballAt(wide[0])
      sb.dribble(wide[0], ball, { x: L * 0.82, y: 2.5 })
      sb.run(mid[0], { x: L * 0.6, y: cy + 1 })
      sb.step(1.3)
      const hit = { x: L * 0.86, y: cy - 1 }
      sb.pass(ball, hit)
      sb.run(mid[0], { x: hit.x - 0.9, y: hit.y - 0.9 })
      sb.step(0.9)
      sb.shot(ball, { x: L + 2, y: cy + gw * 0.25 }).step(0.5)
      break
    }
    case 'cutback': {
      const wide = line(startX + 3, 3, Math.ceil(q / 2))
      const mid = line(startX + 5, cy + 3, Math.max(1, Math.floor(q / 2)))
      const ball = sb.ballAt(mid[0])
      sb.pass(ball, { x: L * 0.7, y: 3.5 })
      sb.run(wide[0], { x: L * 0.7 - 0.9, y: 2.6 })
      sb.step(1)
      sb.dribble(wide[0], ball, { x: L * 0.95, y: 4 })
      sb.run(mid[0], { x: L * 0.7, y: cy + 0.5 })
      sb.step(0.9)
      sb.pass(ball, { x: L * 0.76, y: cy })
      sb.run(mid[0], { x: L * 0.76 - 0.9, y: cy - 0.9 })
      sb.step(0.8)
      sb.shot(ball, { x: L + 2, y: cy + gw * 0.3 }).step(0.5)
      break
    }
  }
  sb.wait(0.7)

  const texts = sizes.map((v, i) => `${v} spelare${i < gks ? ' + målvakt' : ''}`)
  return mk(
    k,
    d,
    summarize(texts, 'stationer'),
    labelStations(texts, 'Station'),
    { koner: k * 6, bollar: Math.max(k * 4, Math.min(n, k * 8)), stormal: Math.min(k, gks), smamal: Math.max(0, k - gks) },
    notes,
    { n: sizes[0] },
    sb.build(),
  )
}

// ---------- Lagdelsspel: anfall mot försvar på en planhalva ----------

function halfPitch(ctx: SessionCtx): { w: number; l: number } {
  const f = FORMATS[ctx.format]
  return { w: f.pitch.w, l: roundM(f.pitch.l * 0.6) }
}

export function buildPhase({ ctx, rnd }: BuildArgs, spec: Spec<'phase'>): Setup | null {
  const n = outfield(ctx)
  if (n < spec.minPlayers) return null
  const notes: string[] = []
  const gks = ctx.goalkeepers
  const f = FORMATS[ctx.format]
  // Fler än en fullstor lagdel: resten byter in.
  const maxActive = (f.size - 1) * 2
  const active = Math.min(n, maxActive)
  const resting = n - active
  let att = Math.round(active * spec.attShare)
  att = Math.max(2, Math.min(active - 1, att))
  const def = active - att
  const d = fitDim(ctx, 1, halfPitch(ctx), notes)
  if (resting) notes.push(`${resting} spelare byter in löpande – byt efter varje anfall så att alla är aktiva.`)
  if (!gks) notes.push('Ingen målvakt på plats: det stora målet ersätts av två småmål i hörnen av målområdet.')
  if (gks > 1) notes.push('Två målvakter: byt efter fem anfall.')

  const L = d.l
  const W = d.w
  const sb = new SceneBuilder(L, W, 'pitch')
  const boxD = Math.min(L * 0.3, 16.5)
  const boxW = Math.min(W * 0.62, 40)
  const build = spec.zone === 'build'
  // Vid speluppbyggnad startar anfallet hos målvakten till vänster och målet är portar på mittlinjen.
  if (build) {
    sb.zone(0, (W - boxW) / 2, boxD, boxW, 'line')
    if (gks) {
      sb.goal('l', 'big', W / 2, Math.min(f.goalW, W * 0.3))
    }
    sb.gate(L, W * 0.2, 4, true)
    sb.gate(L, W * 0.5, 4, true)
    sb.gate(L, W * 0.8, 4, true)
  } else {
    sb.zone(L - boxD, (W - boxW) / 2, boxD, boxW, 'line')
    if (gks) sb.goal('r', 'big', W / 2, Math.min(f.goalW, W * 0.3))
    else {
      sb.goal('r', 'small', W * 0.35)
      sb.goal('r', 'small', W * 0.65)
    }
    sb.goal('l', 'small', W * 0.25)
    sb.goal('l', 'small', W * 0.75)
  }
  const A = shape(att, build ? 2 : L * 0.1, 2, L * 0.8, W - 4, 1).map((p) => sb.player('a', p.x, p.y))
  const B = shape(def, build ? L * 0.25 : L * 0.3, 3, L * 0.7, W - 6, -1).map((p) => sb.player('b', p.x, p.y))
  let ball: string
  if (build && gks) {
    const gk = sb.player('gk', 1.5, W / 2)
    ball = sb.ballAt(gk)
    sb.pass(ball, A[0]).step(0.9)
  } else {
    if (!build && gks) sb.player('gk', L - 1.2, W / 2)
    ball = sb.ballAt(A[0])
  }
  playSeq(sb, A, B, [], ball, rnd, {
    passes: 4,
    dir: 1,
    finish: build ? null : { x: L, y: W / 2 - 1.5 },
    into: build ? { x: L - 1, y: W * 0.2 } : null,
    speed: 1.05,
  })

  const text = `${att} anfallare mot ${def} försvarare${gks ? ' + målvakt' : ''}`
  return mk(
    1,
    d,
    `${text} · yta ${areaText(d)}`,
    [
      { label: 'Anfall', text: `${att} spelare (utan väst)` },
      { label: 'Försvar', text: `${def} spelare (väst)${gks && !build ? ' + målvakt' : ''}` },
      ...(resting ? [{ label: 'Byter in', text: `${resting} spelare` }] : []),
    ],
    { koner: 10, bollar: 6, vastar: def, stormal: gks ? 1 : 0, smamal: build ? 0 : gks ? 2 : 4 },
    notes,
    { a: att, b: def, n: active },
    sb.build(),
  )
}

// ---------- Match ----------

export function buildMatch({ ctx, rnd }: BuildArgs): Setup | null {
  const f = FORMATS[ctx.format]
  const n = ctx.players
  if (n < 4) return null
  const notes: string[] = []
  const gks = ctx.goalkeepers
  // Målvakter räknas in i lagen. Hellre två planer med mindre lag än en plan med avbytare.
  const full = f.size
  const fullPitch = { w: f.pitch.w, l: f.pitch.l }
  const plan = planTeams(n, { team: [2, full, full + 1], jokers: 0, maxPitches: Math.min(2, maxStations(ctx, fullPitch.w * 0.6, fullPitch.l * 0.6)) })
  if (!plan) return null
  const k = plan.pitches.length
  const p0 = plan.pitches[0]
  const perTeam = Math.max(p0.a, p0.b)
  // Skala planen efter hur många som faktiskt spelar.
  const scale = Math.sqrt(Math.min(1, (perTeam + 0.5) / full))
  const d0 = { w: roundM(fullPitch.w * scale), l: roundM(fullPitch.l * scale) }
  const d = fitDim(ctx, k, d0, notes)
  soloCoachNote(ctx, k, notes)
  restNote(plan.pitches, notes)
  const needGk = k * 2
  if (gks >= needGk) {
    if (gks > needGk) notes.push('Fler målvakter än mål: byt målvakt i varje paus.')
  } else if (gks > 0) {
    notes.push(ctx.age <= 12 ? 'Målvakterna räcker inte till alla mål: utespelare turas om i mål, byt i varje paus.' : 'Målvakterna räcker inte till alla mål: sista utespelare agerar målvakt, eller spela med småmål på den planen.')
  } else {
    notes.push(ctx.age <= 12 ? 'Ingen ordinarie målvakt: låt spelarna turas om i mål, byt efter varje mål eller var tredje minut.' : 'Ingen målvakt: spela med småmål eller regeln att mål bara får göras med ett tillslag inifrån straffområdet.')
  }
  if (perTeam < full && k === 1) notes.push(`Ni är färre än i matchspel (${f.id}) – planen är nedskalad så att ytan per spelare blir som i match.`)
  if (k > 1) notes.push('Två planer med mindre lag ger fler bollkontakter än en plan med avbytare. Byt motståndare efter halva tiden.')

  const L = d.l
  const W = d.w
  const sb = new SceneBuilder(L, W, 'pitch')
  const gw = Math.min(f.goalW, W * 0.35)
  sb.goal('l', 'big', W / 2, gw)
  sb.goal('r', 'big', W / 2, gw)
  const boxD = Math.min(L * 0.16, 16.5)
  const boxW = Math.min(W * 0.6, 40)
  sb.zone(0, (W - boxW) / 2, boxD, boxW, 'line')
  sb.zone(L - boxD, (W - boxW) / 2, boxD, boxW, 'line')
  if (f.retreat) {
    const rx = f.retreat === 'mid' ? L / 2 : L / 2 - 7 * (L / f.pitch.l)
    sb.zone(rx, 0, 0.01, W, 'tint', 'Retreatlinje')
  }
  sb.player('gk', 1.2, W / 2)
  sb.player('gk', L - 1.2, W / 2)
  const A = shape(p0.a - 1, 3, 2, L * 0.62, W - 4, 1).map((p) => sb.player('a', p.x, p.y))
  const B = shape(p0.b - 1, L * 0.38 - 3, 2, L * 0.62, W - 4, -1).map((p) => sb.player('b', p.x, p.y))
  if (A.length >= 2) {
    const ball = sb.ballAt(A[0])
    playSeq(sb, A, B, [], ball, rnd, { passes: 4, dir: 1, finish: { x: L, y: W / 2 + 1 }, speed: 1.05 })
  }

  const texts = plan.pitches.map(teamText)
  return mk(
    k,
    d,
    summarize(texts, 'planer') + ` · plan ${areaText(d)}`,
    labelStations(texts, 'Plan'),
    { koner: k * 8, bollar: k * 3, vastar: plan.pitches.reduce((s, p) => s + vests(p), 0), stormal: k * 2 },
    notes,
    { a: p0.a, b: p0.b, n: p0.a + p0.b },
    sb.build(),
  )
}

// ---------- Fasta situationer ----------

export function buildSetpiece({ ctx }: BuildArgs, spec: Spec<'setpiece'>): Setup | null {
  const n = outfield(ctx)
  if (n < spec.minPlayers) return null
  const notes: string[] = []
  const gks = ctx.goalkeepers
  const d = fitDim(ctx, 1, halfPitch(ctx), notes)
  const att = Math.ceil(n * 0.55)
  const def = n - att
  if (!gks) notes.push('Ingen målvakt: en utespelare står i mål, eller träna enbart löpningar och tillslag mot tomt mål.')
  if (gks > 1) notes.push('Två målvakter: byt efter fem situationer.')

  const L = d.l
  const W = d.w
  const f = FORMATS[ctx.format]
  const sb = new SceneBuilder(L, W, 'pitch')
  const boxD = Math.min(L * 0.3, 16.5)
  const boxW = Math.min(W * 0.62, 40)
  sb.zone(L - boxD, (W - boxW) / 2, boxD, boxW, 'line')
  sb.goal('r', 'big', W / 2, Math.min(f.goalW, W * 0.3))
  const keeper = sb.player('gk', L - 1.2, W / 2)
  const cx = L - boxD * 0.55
  const mk2 = (team: 'a' | 'b', count: number, x: number, spread: number, dy = 0) => {
    const ids: string[] = []
    // Sprid ut spelarna i förhållande till planens storlek så att de inte ritas ovanpå varandra.
    // Avstånd angivna i meter skalas upp på stora planer; avstånd som redan följer planbredden lämnas.
    const k = spread < 8 ? Math.max(1, W / 36) : 1
    for (let i = 0; i < count; i++) {
      const y = W / 2 + dy + (i - (count - 1) / 2) * spread * k
      ids.push(sb.player(team, x + (i % 2) * 2.6 * k, Math.min(W - 1.5, Math.max(1.5, y))))
    }
    return ids
  }
  switch (spec.variant) {
    case 'corner': {
      const taker = sb.player('a', L - 0.8, 0.8)
      const ball = sb.ballAt(taker)
      const runners = mk2('a', Math.min(att - 1, 5), cx - 5, 3.2)
      mk2('b', Math.min(def, 6), cx + 2.5, 3)
      runners.forEach((r, i) => {
        const p = sb.at(r)
        sb.run(r, { x: L - 3 - (i % 3) * 2.2, y: W / 2 - 4 + i * 2 - (p.y > W / 2 ? 0 : 1) })
      })
      sb.pass(ball, { x: L - 5, y: W / 2 - 2 })
      sb.step(1.3)
      sb.shot(ball, { x: L, y: W / 2 + 1.5 }).step(0.5)
      break
    }
    case 'freekick': {
      const taker = sb.player('a', L - boxD - 7, W / 2 - 6)
      const ball = sb.ballAt(taker)
      const wallN = Math.min(Math.max(2, Math.floor(def / 2)), 4)
      for (let i = 0; i < wallN; i++) sb.player('b', L - boxD + 1, W / 2 - 6 + i * Math.max(1.6, W / 24))
      const runners = mk2('a', Math.min(att - 1, 4), L - boxD - 1, 4, 5)
      mk2('b', Math.min(def - wallN, 4), L - boxD + 3, 4, 5)
      runners.forEach((r, i) => sb.run(r, { x: L - 5 - i, y: W / 2 + 2 + i * 2 }))
      sb.pass(ball, { x: L - 6, y: W / 2 + 3 })
      sb.step(1.2)
      sb.shot(ball, { x: L, y: W / 2 - 1 }).step(0.5)
      break
    }
    case 'throwin': {
      const taker = sb.player('a', L * 0.55, 0.3)
      const ball = sb.ballAt(taker)
      const near = sb.player('a', L * 0.55 - 5, 7)
      const deep = sb.player('a', L * 0.55 + 6, 6)
      const back = sb.player('a', L * 0.55 - 9, 14)
      sb.player('b', L * 0.55 - 4, 8.5)
      sb.player('b', L * 0.55 + 7, 7.5)
      mk2('a', Math.max(0, Math.min(att - 4, 3)), L * 0.7, 6, 4)
      mk2('b', Math.max(0, Math.min(def - 2, 4)), L * 0.78, 6, 2)
      sb.run(near, { x: L * 0.55 + 3, y: 9 })
      sb.run(deep, { x: L * 0.55 - 2, y: 4.5 })
      sb.step(0.8)
      sb.pass(ball, deep).step(0.8)
      sb.pass(ball, back).step(0.9)
      break
    }
    case 'goalkick': {
      // Speglad: målvakten sätter igång spelet från höger mål.
      const ball = sb.ballAt(keeper)
      const backs = [sb.player('a', L - 7, W * 0.2), sb.player('a', L - 7, W * 0.8)]
      const mids = mk2('a', Math.max(1, Math.min(att - 3, 3)), L * 0.55, W * 0.25)
      mk2('b', Math.min(def, 5), L * 0.4, W * 0.18)
      sb.pass(ball, backs[0]).step(0.9)
      sb.run(mids[0], { x: L * 0.62, y: W * 0.3 })
      sb.step(0.6)
      sb.pass(ball, mids[0]).step(0.9)
      break
    }
  }
  sb.wait(0.8)
  const text = `${att} anfallare mot ${def} försvarare${gks ? ' + målvakt' : ''}`
  return mk(
    1,
    d,
    text,
    [
      { label: 'Anfall', text: `${att} spelare` },
      { label: 'Försvar', text: `${def} spelare (väst)${gks ? ' + målvakt' : ''}` },
    ],
    { koner: 4, bollar: 8, vastar: def, stormal: 1 },
    notes,
    { a: att, b: def, n },
    sb.build(),
  )
}
