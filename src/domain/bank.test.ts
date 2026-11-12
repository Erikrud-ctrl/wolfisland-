import { afterEach, describe, expect, it } from 'vitest'
import { activeDrills, allDrills, findDrill, setBank } from './bank'
import { buildSetup } from './build'
import { DRILLS } from './drills'
import { formatForAge } from './formats'
import { buildSession, planBlock, swapSlot } from './planner'
import { TEMPLATES, lines, toDrillDef, type CustomDrill } from './templates'
import type { SessionCtx } from './types'

afterEach(() => setBank([], [], []))

const CTX: SessionCtx = { age: 11, format: '7v7', players: 14, goalkeepers: 1, coaches: 2, space: 'kvart11', minutes: 75 }
const NONE = { prehab: false, gkMoment: false, fys: false }

function own(over: Partial<CustomDrill> = {}): CustomDrill {
  return {
    id: 'egen-test',
    template: 'smalag',
    opts: { lag: '4', mal: 'small', zoner: 'wide', yta: 'normal' },
    name: 'Min kantövning',
    phase: 'game',
    themes: ['passning'],
    age: [9, 13],
    level: 2,
    purpose: 'Testa',
    steps: ['Spela'],
    coaching: [],
    easier: '',
    harder: '',
    ...over,
  }
}

describe('favoriter och dolda övningar', () => {
  it('väljer favoriter först när de passar passets steg', () => {
    const plain = planBlock('passning', 11, 4, 'fav')
    // Välj en färdighetsövning på steg 1 som inte valdes till första passet.
    const other = DRILLS.find((d) => d.phase === 'skill' && d.themes[0] === 'passning' && d.level === 1 && d.age[0] <= 11 && d.age[1] >= 11 && d.id !== plain[0].drills.skill)
    expect(other).toBeDefined()
    setBank([], [other!.id], [])
    expect(planBlock('passning', 11, 4, 'fav')[0].drills.skill).toBe(other!.id)
  })

  it('låter inte en favorit på fel steg gå före en övning på rätt steg', () => {
    const lvl3 = DRILLS.find((d) => d.phase === 'skill' && d.themes[0] === 'passning' && d.level === 3 && d.age[0] <= 11 && d.age[1] >= 11)
    setBank([], [lvl3!.id], [])
    const first = findDrill(planBlock('passning', 11, 4, 'fav2')[0].drills.skill)
    expect(first?.level).toBe(1)
  })

  it('väljer aldrig en dold övning, varken i block, pass eller vid byte', () => {
    const plain = planBlock('passning', 11, 4, 'hid')
    const hidden = [plain[0].drills.skill, plain[0].drills.game, plain[1].drills.skill]
    setBank([], [], hidden)
    const plans = planBlock('passning', 11, 8, 'hid')
    for (const p of plans) for (const id of Object.values(p.drills)) expect(hidden).not.toContain(id)
    let s = buildSession(plans[0], 'passning', CTX, NONE, 'hid')
    for (let i = 0; i < 12; i++) {
      s = swapSlot(s, 1, 'passning', plans[0].level, 'hid')
      expect(hidden).not.toContain(s.slots[1].drillId)
    }
  })

  it('byter ut en övning som doldes efter att blocket planerades', () => {
    const plan = planBlock('passning', 11, 4, 'late')[0]
    setBank([], [], [plan.drills.skill])
    const s = buildSession(plan, 'passning', CTX, NONE, 'late')
    const skill = s.slots.find((x) => x.slot === 'skill')
    expect(skill).toBeDefined()
    expect(skill!.drillId).not.toBe(plan.drills.skill)
  })

  it('kraschar inte om alla övningar i ett tema är dolda', () => {
    setBank(
      [],
      [],
      DRILLS.filter((d) => d.themes.includes('passning')).map((d) => d.id),
    )
    const plans = planBlock('passning', 11, 4, 'all')
    expect(plans).toHaveLength(4)
    expect(buildSession(plans[0], 'passning', CTX, NONE, 'all').slots.length).toBeGreaterThanOrEqual(4)
  })
})

describe('egna övningar', () => {
  it('finns i banken och väljs till block med rätt tema', () => {
    const c = own()
    setBank([toDrillDef(c)], [c.id], [])
    expect(allDrills()[0].id).toBe(c.id)
    expect(activeDrills().some((d) => d.id === c.id)).toBe(true)
    const ids = planBlock('passning', 11, 4, 'own').flatMap((p) => [p.drills.game, p.drills.game2])
    expect(ids).toContain(c.id)
    // Men inte till ett annat tema eller en ålder utanför spannet.
    expect(planBlock('avslut', 11, 4, 'own').flatMap((p) => Object.values(p.drills))).not.toContain(c.id)
    expect(planBlock('passning', 16, 4, 'own').flatMap((p) => Object.values(p.drills))).not.toContain(c.id)
  })

  it('sätter målvaktsflaggan utifrån mallen', () => {
    expect(toDrillDef(own()).usesGk).toBe(false)
    expect(toDrillDef(own({ opts: { lag: '4', mal: 'auto', zoner: 'none', yta: 'normal' } })).usesGk).toBe(true)
    expect(toDrillDef(own({ template: 'avslut', opts: { variant: 'wall', grupp: '5' } })).usesGk).toBe(true)
  })

  it('delar upp fritext i punkter', () => {
    expect(lines('1. Första\n- Andra\n\n  • Tredje  ')).toEqual(['Första', 'Andra', 'Tredje'])
  })

  it('ger giltig uppställning för varje mall och varje val', () => {
    const errors: string[] = []
    for (const t of TEMPLATES) {
      // Variera ett val i taget utifrån standardvalen.
      const combos = [t.defaults, ...t.fields.flatMap((f) => f.choices.map((c) => ({ ...t.defaults, [f.key]: c.value })))]
      for (const opts of combos) {
        const def = toDrillDef(own({ template: t.id, opts, age: [6, 19] }))
        let built = 0
        for (const age of [8, 11, 14, 17]) {
          for (let players = 4; players <= 30; players++) {
            for (const goalkeepers of [0, 1, 2]) {
              const ctx: SessionCtx = { age, format: formatForAge(age), players, goalkeepers, coaches: 2, space: 'halv11', minutes: 75 }
              try {
                const s = buildSetup(def, ctx)
                if (!s) continue
                built++
                const bad = s.scene.items.find((i) => !Number.isFinite(i.x) || !Number.isFinite(i.y) || i.x < -4 || i.x > s.scene.w + 4 || i.y < -4 || i.y > s.scene.h + 4)
                if (bad) errors.push(`${t.id} ${JSON.stringify(opts)}: objekt utanför ytan för ${players} spelare, ${age} år`)
                if (!s.summary || !s.groups.length) errors.push(`${t.id} ${JSON.stringify(opts)}: saknar lagindelning`)
              } catch (e) {
                errors.push(`${t.id} ${JSON.stringify(opts)}: ${String(e)}`)
              }
            }
          }
        }
        if (!built) errors.push(`${t.id} ${JSON.stringify(opts)}: går aldrig att genomföra`)
      }
    }
    expect([...new Set(errors)].slice(0, 20)).toEqual([])
  }, 60_000)
})
