// Appens data sparas lokalt i webbläsaren på enheten.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { setBank } from './domain/bank'
import { FORMATS } from './domain/formats'
import { planBlock, type Session, type SessionOptions, type SessionPlan } from './domain/planner'
import { toDrillDef, type CustomDrill } from './domain/templates'
import type { Format, SpaceId, ThemeId } from './domain/types'

export interface TeamCfg {
  name: string
  age: number
  format: Format
}

export interface Review {
  at: string
  rating: number
  note: string
}

export interface StoredSession {
  plan: SessionPlan
  session?: Session
  done?: Review
}

export interface Block {
  id: string
  theme: ThemeId
  createdAt: string
  /** Ålder och spelform när blocket skapades. */
  age: number
  format: Format
  sessions: StoredSession[]
}

export interface LastInput {
  players: number
  goalkeepers: number
  coaches: number
  space: SpaceId
  minutes: number
  options: SessionOptions
}

export interface AppState {
  v: 1
  team: TeamCfg | null
  blocks: Block[]
  last: LastInput | null
  /** Tränarens egna övningar. */
  custom: CustomDrill[]
  /** Id på favoritmarkerade övningar. */
  favorites: string[]
  /** Id på övningar som aldrig ska väljas. */
  hidden: string[]
}

const KEY = 'wik-traning-v1'

const EMPTY: AppState = { v: 1, team: null, blocks: [], last: null, custom: [], favorites: [], hidden: [] }

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as AppState
    // Fält som har tillkommit i senare versioner fylls i med tomma värden.
    if (parsed && parsed.v === 1 && Array.isArray(parsed.blocks)) {
      return {
        ...EMPTY,
        ...parsed,
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      }
    }
  } catch {
    // Trasig eller otillgänglig lagring: börja om från tomt läge.
  }
  return EMPTY
}

function save(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function defaultInput(team: TeamCfg): LastInput {
  const f = FORMATS[team.format]
  return {
    players: f.size * 2,
    goalkeepers: 1,
    coaches: 2,
    space: team.format === '5v5' ? 'plan5' : team.format === '7v7' ? 'kvart11' : 'halv11',
    minutes: f.defaultMinutes,
    options: { prehab: team.age >= 10, gkMoment: true, fys: team.age >= 15 },
  }
}

export function blockProgress(b: Block): { done: number; total: number; next: number } {
  const done = b.sessions.filter((s) => s.done).length
  const next = b.sessions.findIndex((s) => !s.done)
  return { done, total: b.sessions.length, next }
}

export function isFinished(b: Block): boolean {
  return b.sessions.every((s) => s.done)
}

export interface Store {
  state: AppState
  saveFailed: boolean
  setTeam: (team: TeamCfg) => void
  createBlock: (theme: ThemeId, sessions: number) => Block | null
  deleteBlock: (id: string) => void
  setSession: (blockId: string, index: number, session: Session, input: LastInput) => void
  updateSession: (blockId: string, index: number, session: Session) => void
  clearSession: (blockId: string, index: number) => void
  finishSession: (blockId: string, index: number, review: Review) => void
  toggleFavorite: (id: string) => void
  toggleHidden: (id: string) => void
  saveCustom: (drill: CustomDrill) => void
  deleteCustom: (id: string) => void
  reset: () => void
}

export function useStore(): Store {
  const [state, setState] = useState<AppState>(load)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    setSaveFailed(!save(state))
  }, [state])

  // Banken måste vara uppdaterad innan skärmarna ritas, därför här och inte i en effekt.
  useMemo(() => setBank(state.custom.map(toDrillDef), state.favorites, state.hidden), [state.custom, state.favorites, state.hidden])

  const mapSession = useCallback((blockId: string, index: number, fn: (s: StoredSession) => StoredSession, extra?: (s: AppState) => Partial<AppState>) => {
    setState((prev) => ({
      ...prev,
      ...(extra ? extra(prev) : {}),
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, sessions: b.sessions.map((s, i) => (i === index ? fn(s) : s)) } : b)),
    }))
  }, [])

  return {
    state,
    saveFailed,
    setTeam: (team) => setState((p) => ({ ...p, team, last: p.last && p.team?.format === team.format ? p.last : null })),
    createBlock: (theme, sessions) => {
      const team = state.team
      if (!team) return null
      const id = newId()
      const block: Block = {
        id,
        theme,
        createdAt: new Date().toISOString(),
        age: team.age,
        format: team.format,
        sessions: planBlock(theme, team.age, sessions, id).map((plan) => ({ plan })),
      }
      setState((p) => ({ ...p, blocks: [block, ...p.blocks] }))
      return block
    },
    deleteBlock: (id) => setState((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) })),
    setSession: (blockId, index, session, input) => mapSession(blockId, index, (s) => ({ ...s, session }), () => ({ last: input })),
    updateSession: (blockId, index, session) => mapSession(blockId, index, (s) => ({ ...s, session })),
    clearSession: (blockId, index) => mapSession(blockId, index, (s) => ({ plan: s.plan })),
    finishSession: (blockId, index, review) => mapSession(blockId, index, (s) => ({ ...s, done: review })),
    toggleFavorite: (id) =>
      setState((p) => ({
        ...p,
        favorites: p.favorites.includes(id) ? p.favorites.filter((x) => x !== id) : [...p.favorites, id],
        // En favorit kan inte samtidigt vara dold.
        hidden: p.hidden.filter((x) => x !== id),
      })),
    toggleHidden: (id) =>
      setState((p) => ({
        ...p,
        hidden: p.hidden.includes(id) ? p.hidden.filter((x) => x !== id) : [...p.hidden, id],
        favorites: p.favorites.filter((x) => x !== id),
      })),
    saveCustom: (drill) =>
      setState((p) => {
        const exists = p.custom.some((c) => c.id === drill.id)
        return {
          ...p,
          custom: exists ? p.custom.map((c) => (c.id === drill.id ? drill : c)) : [drill, ...p.custom],
          // Nya egna övningar blir favoriter så att de väljs i första hand.
          favorites: exists || p.favorites.includes(drill.id) ? p.favorites : [...p.favorites, drill.id],
        }
      }),
    deleteCustom: (id) =>
      setState((p) => ({
        ...p,
        custom: p.custom.filter((c) => c.id !== id),
        favorites: p.favorites.filter((x) => x !== id),
        hidden: p.hidden.filter((x) => x !== id),
        // Pass som inte är genomförda och använder övningen byggs om nästa gång de öppnas.
        blocks: p.blocks.map((b) => ({
          ...b,
          sessions: b.sessions.map((s) => (!s.done && s.session?.slots.some((x) => x.drillId === id) ? { plan: s.plan } : s)),
        })),
      })),
    reset: () => setState(EMPTY),
  }
}
