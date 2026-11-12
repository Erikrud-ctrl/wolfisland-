import { describe, expect, it } from 'vitest'
import { DRILL_BY_ID } from './drills'
import { AGES, formatForAge } from './formats'
import { ageFits, buildSession, builtSlots, equipmentList, levelFor, planBlock, swapSlot, type SessionOptions } from './planner'
import { themesFor } from './themes'
import type { SessionCtx } from './types'

const OPTS: SessionOptions = { prehab: true, gkMoment: true, fys: true }

describe('blockplanering', () => {
  it('stegrar svårigheten genom blocket', () => {
    expect([0, 1, 2, 3].map((i) => levelFor(i, 4))).toEqual([1, 2, 2, 3])
    expect([0, 1].map((i) => levelFor(i, 2))).toEqual([1, 3])
    expect(levelFor(0, 8)).toBe(1)
    expect(levelFor(7, 8)).toBe(3)
  })

  it('hittar övningar för varje tema, ålder och pass', () => {
    const errors: string[] = []
    for (const age of AGES) {
      const format = formatForAge(age)
      for (const theme of themesFor(format)) {
        for (const n of [2, 4, 8]) {
          let plans
          try {
            plans = planBlock(theme.id, age, n, `t-${age}-${theme.id}-${n}`)
          } catch (e) {
            errors.push(`${theme.id} ${age} år: ${String(e)}`)
            continue
          }
          for (const [i, p] of plans.entries()) {
            for (const [slot, id] of Object.entries(p.drills)) {
              const d = DRILL_BY_ID.get(id)
              if (!d) errors.push(`${theme.id} ${age} år pass ${i + 1}: okänd övning ${id}`)
              else if (!ageFits(d, age)) errors.push(`${theme.id} ${age} år pass ${i + 1}: ${id} passar inte åldern`)
              else if ((slot === 'skill' || slot === 'game') && Math.abs(d.level - p.level) > 1) errors.push(`${theme.id} ${age} år pass ${i + 1}: ${id} har steg ${d.level}, passet ${p.level}`)
            }
          }
          // Ett block på fyra pass ska inte upprepa färdighets- eller spelövningar.
          if (n === 4) {
            for (const slot of ['skill', 'game'] as const) {
              const ids = plans.map((p) => p.drills[slot])
              if (new Set(ids).size < 3) errors.push(`${theme.id} ${age} år: för få olika övningar (${slot}): ${ids.join(', ')}`)
            }
          }
        }
      }
    }
    expect(errors).toEqual([])
  })

  it('bygger ett komplett pass för alla rimliga förutsättningar', () => {
    const errors: string[] = []
    for (const age of [8, 11, 13, 16, 19]) {
      const format = formatForAge(age)
      for (const theme of themesFor(format)) {
        const plans = planBlock(theme.id, age, 4, `s-${age}-${theme.id}`)
        for (const players of [4, 5, 6, 7, 9, 11, 13, 14, 16, 18, 20, 22, 25, 30]) {
          for (const goalkeepers of [0, 1, 2]) {
            if (goalkeepers > players - 2) continue
            for (const [coaches, space, minutes] of [
              [1, 'plan5', 60],
              [2, 'kvart11', 75],
              [3, 'hel11', 90],
            ] as const) {
              const ctx: SessionCtx = { age, format, players, goalkeepers, coaches, space, minutes }
              for (const [i, plan] of plans.entries()) {
                const tag = `${theme.id} ${age} år, ${players} sp, ${goalkeepers} mv, ${coaches} tr, ${space}, ${minutes} min, pass ${i + 1}`
                const s = buildSession(plan, theme.id, ctx, OPTS, tag)
                const built = builtSlots(s)
                if (built.length !== s.slots.length) errors.push(`${tag}: en övning gick inte att bygga`)
                const kinds = s.slots.map((x) => x.slot)
                for (const need of ['warmup', 'skill', 'game', 'match'] as const) {
                  if (!kinds.includes(need)) errors.push(`${tag}: saknar ${need}`)
                }
                if (age >= 10 && !kinds.includes('prehab')) errors.push(`${tag}: saknar skadeförebyggande`)
                if (age >= 15 && !kinds.includes('fys')) errors.push(`${tag}: saknar fys`)
                const total = s.slots.reduce((a, x) => a + x.minutes, 0) + s.pauses
                if (total !== minutes) errors.push(`${tag}: tiden summerar till ${total}`)
                if (s.slots.some((x) => x.minutes < 5)) errors.push(`${tag}: för kort moment`)
                if (new Set(s.slots.map((x) => x.drillId)).size !== s.slots.length) errors.push(`${tag}: samma övning två gånger`)
                if (!equipmentList(s).length) errors.push(`${tag}: tom materiallista`)
              }
            }
          }
        }
      }
    }
    expect(errors.slice(0, 40)).toEqual([])
  }, 120_000)

  it('byter övning utan att skapa dubbletter', () => {
    const ctx: SessionCtx = { age: 11, format: '7v7', players: 14, goalkeepers: 1, coaches: 2, space: 'kvart11', minutes: 75 }
    const plan = planBlock('passning', 11, 4, 'swap')[0]
    let s = buildSession(plan, 'passning', ctx, { prehab: false, gkMoment: false, fys: false }, 'swap')
    const seen = new Set<string>([s.slots[1].drillId])
    for (let i = 0; i < 3; i++) {
      const next = swapSlot(s, 1, 'passning', plan.level, 'swap')
      expect(next.slots[1].drillId).not.toBe(s.slots[1].drillId)
      expect(new Set(next.slots.map((x) => x.drillId)).size).toBe(next.slots.length)
      s = next
      seen.add(s.slots[1].drillId)
    }
    expect(seen.size).toBeGreaterThan(2)
  })
})
