// Räknar fram en konkret uppställning för en övning utifrån dagens förutsättningar.

import type { BuildArgs } from './bhelp'
import { buildCircuit, buildGk, buildIndividual, buildPairs, buildPattern, buildRelay, buildRondo } from './buildersBasic'
import { buildDuel, buildFinishing, buildMatch, buildPhase, buildPossession, buildSetpiece, buildSsg } from './buildersGame'
import { hash, rng } from './scene'
import type { DrillDef, SessionCtx, Setup } from './types'

export function buildSetup(def: DrillDef, ctx: SessionCtx): Setup | null {
  const args: BuildArgs = { def, ctx, rnd: rng(hash(def.id)) }
  const spec = def.build
  switch (spec.type) {
    case 'individual':
      return buildIndividual(args, spec)
    case 'pairs':
      return buildPairs(args, spec)
    case 'pattern':
      return buildPattern(args, spec)
    case 'rondo':
      return buildRondo(args, spec)
    case 'relay':
      return buildRelay(args, spec)
    case 'circuit':
      return buildCircuit(args, spec)
    case 'gk':
      return buildGk(args, spec)
    case 'duel':
      return buildDuel(args, spec)
    case 'possession':
      return buildPossession(args, spec)
    case 'ssg':
      return buildSsg(args, spec)
    case 'finishing':
      return buildFinishing(args, spec)
    case 'phase':
      return buildPhase(args, spec)
    case 'match':
      return buildMatch(args)
    case 'setpiece':
      return buildSetpiece(args, spec)
  }
}

/** Fyll i {a}, {b}, {j}, {w}, {l}, {n} i en övningstext. */
export function fill(text: string, setup: Setup): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = setup.vars[key]
    return v === undefined ? m : String(v)
  })
}

/** Förslag på arbetstid och vila som ryms i den avsatta tiden. */
export function intervals(def: DrillDef, minutes: number, age: number): string {
  const young = age <= 9
  if (def.phase === 'match') {
    // Matchspelet delas i perioder med en kort samling emellan.
    const periods = minutes >= 24 ? 3 : minutes >= 12 ? 2 : 1
    if (periods === 1) return `${minutes} min sammanhängande`
    const each = Math.floor((minutes - (periods - 1)) / periods)
    return `${periods} × ${each} min, kort samling emellan`
  }
  const [work, rest] = def.bout ?? (young ? [2.5, 1] : [4, 1])
  const rounds = Math.max(1, Math.floor((minutes + rest) / (work + rest)))
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : `${v}`.replace('.', ','))
  if (rounds <= 1) return `${minutes} min sammanhängande`
  return `${rounds} × ${fmt(work)} min, vila ${fmt(rest)} min`
}
