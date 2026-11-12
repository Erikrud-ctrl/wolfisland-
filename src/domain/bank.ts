// Den aktiva övningsbanken: inbyggda övningar plus tränarens egna, med favoriter och dolda övningar.

import { DRILLS as BUILTIN } from './drills'
import type { DrillDef } from './types'

let custom: DrillDef[] = []
let favorites = new Set<string>()
let hidden = new Set<string>()
let all: DrillDef[] = BUILTIN
let active: DrillDef[] = BUILTIN
let byId = new Map<string, DrillDef>(BUILTIN.map((d) => [d.id, d]))

/** Uppdatera banken med tränarens egna övningar och val. Anropas när sparad data ändras. */
export function setBank(customDrills: DrillDef[], favoriteIds: readonly string[], hiddenIds: readonly string[]): void {
  custom = customDrills
  favorites = new Set(favoriteIds)
  hidden = new Set(hiddenIds)
  all = [...custom, ...BUILTIN]
  active = all.filter((d) => !hidden.has(d.id))
  byId = new Map(all.map((d) => [d.id, d]))
}

/** Alla övningar, även dolda. */
export function allDrills(): DrillDef[] {
  return all
}

/** Övningar som får väljas till pass (dolda är borttagna). */
export function activeDrills(): DrillDef[] {
  return active
}

export function findDrill(id: string): DrillDef | undefined {
  return byId.get(id)
}

export function isFavorite(id: string): boolean {
  return favorites.has(id)
}

export function isHidden(id: string): boolean {
  return hidden.has(id)
}

export function isCustom(id: string): boolean {
  return custom.some((d) => d.id === id)
}
