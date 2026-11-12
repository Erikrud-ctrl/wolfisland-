import { describe, expect, it } from 'vitest'
import { buildSetup } from './build'
import { DRILLS } from './drills'
import { formatForAge } from './formats'
import { THEMES } from './themes'
import type { DrillDef, SessionCtx, Setup, SpaceId } from './types'

const SPACES: SpaceId[] = ['hel11', 'kvart11', 'plan5']

function ctxs(age: number): SessionCtx[] {
  const out: SessionCtx[] = []
  for (let players = 4; players <= 30; players++) {
    for (const goalkeepers of [0, 1, 2, 3]) {
      if (goalkeepers > players - 2) continue
      for (const coaches of [1, 3]) {
        for (const space of SPACES) {
          out.push({ age, format: formatForAge(age), players, goalkeepers, coaches, space, minutes: 75 })
        }
      }
    }
  }
  return out
}

/** Returnerar första felet i en uppställning, eller null om allt är rimligt. */
function problem(d: DrillDef, s: Setup): string | null {
  if (!(s.stations > 0)) return 'inga stationer'
  if (!(s.area.w > 0 && s.area.l > 0)) return 'ogiltig yta'
  if (!s.summary) return 'saknar sammanfattning'
  if (!s.groups.length) return 'saknar lagindelning'
  if (!s.scene.items.length) return 'tom skiss'
  const ids = new Set<string>()
  for (const it of s.scene.items) {
    if (!Number.isFinite(it.x) || !Number.isFinite(it.y)) return `objekt ${it.id} saknar position`
    if (it.x < -4 || it.x > s.scene.w + 4 || it.y < -4 || it.y > s.scene.h + 4) return `objekt ${it.id} utanför ytan (${it.x.toFixed(1)}, ${it.y.toFixed(1)}) i ${s.scene.w}×${s.scene.h}`
    if (ids.has(it.id)) return `dubblett-id ${it.id}`
    ids.add(it.id)
  }
  for (const st of s.scene.steps) {
    if (!(st.dur > 0)) return 'steg utan längd'
    for (const m of st.moves) {
      if (!ids.has(m.id)) return `rörelse för okänt objekt ${m.id}`
      if (!Number.isFinite(m.to.x) || !Number.isFinite(m.to.y)) return `rörelse utan mål ${m.id}`
    }
  }
  for (const [k, v] of Object.entries(s.equipment)) {
    if (!Number.isInteger(v) || (v as number) <= 0) return `material ${k}=${v}`
  }
  for (const txt of [...d.steps, d.easier, d.harder]) {
    for (const token of txt.match(/\{(\w+)\}/g) ?? []) {
      if (s.vars[token.slice(1, -1)] === undefined) return `okänd variabel ${token}`
    }
  }
  return null
}

describe('övningsbanken', () => {
  it('har unika id:n', () => {
    const ids = DRILLS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('använder bara kända teman och rimliga åldrar', () => {
    const known = new Set(THEMES.map((t) => t.id))
    for (const d of DRILLS) {
      for (const t of d.themes) expect(known.has(t), `${d.id}: ${t}`).toBe(true)
      expect(d.age[0], d.id).toBeLessThanOrEqual(d.age[1])
      expect(d.age[0], d.id).toBeGreaterThanOrEqual(6)
      expect(d.age[1], d.id).toBeLessThanOrEqual(19)
      expect(d.steps.length, d.id).toBeGreaterThan(0)
      expect(d.coaching.length, d.id).toBeGreaterThan(1)
    }
  })

  it('ger giltig uppställning för alla övningar och förutsättningar', () => {
    const errors: string[] = []
    for (const d of DRILLS) {
      let built = 0
      const ages = new Set([d.age[0], d.age[1], 9, 11, 13, 16].filter((a) => a >= d.age[0] && a <= d.age[1]))
      for (const age of ages) {
        for (const ctx of ctxs(age)) {
          let s: Setup | null
          try {
            s = buildSetup(d, ctx)
          } catch (e) {
            errors.push(`${d.id}: kraschar för ${JSON.stringify(ctx)}: ${String(e)}`)
            break
          }
          if (!s) continue
          built++
          const p = problem(d, s)
          if (p) {
            errors.push(`${d.id}: ${p} för ${JSON.stringify(ctx)}`)
            break
          }
        }
      }
      if (!built) errors.push(`${d.id}: går aldrig att genomföra`)
    }
    expect(errors).toEqual([])
  }, 120_000)

  it('räknar med alla spelare i lagindelningen för smålagsspel och bollinnehav', () => {
    const errors: string[] = []
    for (const d of DRILLS) {
      if (d.build.type !== 'possession' && d.build.type !== 'ssg') continue
      for (let players = 6; players <= 28; players++) {
        const ctx: SessionCtx = { age: Math.max(d.age[0], Math.min(d.age[1], 11)), format: '7v7', players, goalkeepers: 0, coaches: 3, space: 'hel11', minutes: 75 }
        const s = buildSetup(d, ctx)
        if (!s) continue
        let sum = 0
        for (const g of s.groups) {
          for (const m of g.text.matchAll(/(\d+) mot (\d+)/g)) sum += Number(m[1]) + Number(m[2])
          for (const m of g.text.matchAll(/\+ (\d+) (?:joker|jokrar|som byter)/g)) sum += Number(m[1])
          for (const m of g.text.matchAll(/tredje lag \((\d+)\)/g)) sum += Number(m[1])
        }
        if (sum !== players) errors.push(`${d.id}: ${players} spelare men lagindelningen summerar till ${sum}: ${s.groups.map((g) => g.text).join(' | ')}`)
      }
    }
    expect(errors).toEqual([])
  })
})
