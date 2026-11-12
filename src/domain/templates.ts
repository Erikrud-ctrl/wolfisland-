// Mallar för egna övningar. En mall plus några val blir en övning som skalas och ritas precis som de inbyggda.

import type { BuilderSpec, ByBand, DrillDef, Range3, ThemeId } from './types'

export type TemplateId = 'smalag' | 'innehav' | 'rondo' | 'duell' | 'avslut' | 'passning' | 'par' | 'alla' | 'stafett' | 'lagdel'

export interface Choice {
  value: string
  label: string
}

export interface Field {
  key: string
  label: string
  choices: Choice[]
}

export type Opts = Record<string, string>

export interface Template {
  id: TemplateId
  name: string
  hint: string
  fields: Field[]
  defaults: Opts
  spec: (o: Opts) => BuilderSpec
}

const SIZE: Field = {
  key: 'yta',
  label: 'Yta per spelare',
  choices: [
    { value: 'liten', label: 'Liten – fler aktioner' },
    { value: 'normal', label: 'Normal' },
    { value: 'stor', label: 'Stor – mer tid med bollen' },
  ],
}

function scaled(base: [number, number, number, number], o: Opts): ByBand<number> {
  const f = o.yta === 'liten' ? 0.8 : o.yta === 'stor' ? 1.25 : 1
  return base.map((v) => Math.round(v * f)) as [number, number, number, number]
}

function teamRange(o: Opts, key = 'lag'): Range3 {
  const p = Number(o[key]) || 4
  return [Math.max(2, p - 1), p, p + 1]
}

const TEAM = (label = 'Spelare per lag'): Field => ({
  key: 'lag',
  label,
  choices: [2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) })),
})

export const TEMPLATES: Template[] = [
  {
    id: 'smalag',
    name: 'Smålagsspel mot mål',
    hint: 'Två lag spelar mot mål på en eller flera små planer.',
    fields: [
      TEAM(),
      {
        key: 'mal',
        label: 'Mål',
        choices: [
          { value: 'auto', label: 'Stora mål med målvakt' },
          { value: 'small', label: 'Småmål' },
          { value: 'four', label: 'Fyra småmål' },
        ],
      },
      {
        key: 'zoner',
        label: 'Zoner',
        choices: [
          { value: 'none', label: 'Inga' },
          { value: 'halves', label: 'Mittlinje' },
          { value: 'thirds', label: 'Mittzon' },
          { value: 'wide', label: 'Kantzoner' },
          { value: 'endzones', label: 'Avslutszoner' },
        ],
      },
      SIZE,
    ],
    defaults: { lag: '4', mal: 'small', zoner: 'none', yta: 'normal' },
    spec: (o) => ({
      type: 'ssg',
      team: teamRange(o),
      goals: o.mal as 'auto' | 'small' | 'four',
      areaPer: scaled([45, 55, 70, 85], o),
      zones: o.zoner as 'none' | 'halves' | 'thirds' | 'wide' | 'endzones',
    }),
  },
  {
    id: 'innehav',
    name: 'Bollinnehav',
    hint: 'Två lag håller bollen i en yta utan mål, med eller utan jokrar.',
    fields: [
      TEAM(),
      {
        key: 'jokrar',
        label: 'Jokrar',
        choices: [
          { value: 'auto', label: 'Vid ojämnt antal' },
          { value: '2', label: 'Alltid två' },
          { value: '0', label: 'Inga' },
        ],
      },
      {
        key: 'poang',
        label: 'Poäng ges för',
        choices: [
          { value: 'none', label: 'Antal passningar' },
          { value: 'endzones', label: 'Passning in i slutzon' },
          { value: 'gates', label: 'Passning genom port' },
          { value: 'thirds', label: 'Spel genom mittzon' },
          { value: 'targets', label: 'Spel på målspelare' },
        ],
      },
      SIZE,
    ],
    defaults: { lag: '4', jokrar: 'auto', poang: 'none', yta: 'normal' },
    spec: (o) => ({
      type: 'possession',
      team: teamRange(o),
      // Målspelare i varsin ände kräver två jokrar.
      jokers: o.poang === 'targets' ? 2 : o.jokrar === 'auto' ? 'auto' : (Number(o.jokrar) as 0 | 2),
      areaPer: scaled([30, 35, 40, 45], o),
      target: o.poang as 'none' | 'endzones' | 'gates' | 'thirds' | 'targets',
    }),
  },
  {
    id: 'rondo',
    name: 'Rondo',
    hint: 'Spelare på utsidan håller bollen mot en eller flera i mitten.',
    fields: [
      {
        key: 'grupp',
        label: 'Spelare per ruta',
        choices: [4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: String(n) })),
      },
      {
        key: 'ruta',
        label: 'Rutans sida',
        choices: [6, 8, 10, 12, 15].map((n) => ({ value: String(n), label: `${n} m` })),
      },
    ],
    defaults: { grupp: '6', ruta: '10' },
    spec: (o) => {
      const g = Number(o.grupp) || 6
      return { type: 'rondo', per: [Math.max(4, g - 1), g, g + 2], side: Number(o.ruta) || 10 }
    },
  },
  {
    id: 'duell',
    name: 'Duell i liten yta',
    hint: 'Få spelare åt gången: 1 mot 1 upp till 3 mot 2, med korta köer.',
    fields: [
      {
        key: 'antal',
        label: 'Situation',
        choices: [
          { value: '1-1', label: '1 mot 1' },
          { value: '2-1', label: '2 mot 1' },
          { value: '2-2', label: '2 mot 2' },
          { value: '3-2', label: '3 mot 2' },
          { value: '3-3', label: '3 mot 3' },
        ],
      },
      {
        key: 'mal',
        label: 'Anfallarna gör mål genom att',
        choices: [
          { value: 'small', label: 'Skjuta i småmål' },
          { value: 'big', label: 'Skjuta i stort mål med målvakt' },
          { value: 'line', label: 'Driva över linjen' },
          { value: 'gates', label: 'Driva genom en port' },
        ],
      },
      {
        key: 'kontring',
        label: 'Försvararna vid bollvinst',
        choices: [
          { value: 'nej', label: 'Anfallet är slut' },
          { value: 'ja', label: 'Kontrar mot portar' },
        ],
      },
    ],
    defaults: { antal: '1-1', mal: 'small', kontring: 'nej' },
    spec: (o) => {
      const [att, def] = (o.antal || '1-1').split('-').map(Number)
      const n = att + def
      const w: [number, number, number, number] = n <= 2 ? [10, 12, 12, 14] : n <= 4 ? [14, 16, 18, 20] : [18, 20, 24, 26]
      const l: [number, number, number, number] = n <= 2 ? [14, 16, 18, 20] : n <= 4 ? [18, 22, 25, 28] : [22, 26, 30, 34]
      return { type: 'duel', att, def, goals: o.mal as 'small' | 'big' | 'line' | 'gates', w, l, counter: o.kontring === 'ja' }
    },
  },
  {
    id: 'avslut',
    name: 'Avslutsövning',
    hint: 'Avslut på mål i små grupper per station.',
    fields: [
      {
        key: 'variant',
        label: 'Upplägg',
        choices: [
          { value: 'straight', label: 'Driv och skjut' },
          { value: 'wall', label: 'Väggspel och skott' },
          { value: 'turn', label: 'Felvänd – vänd och skjut' },
          { value: 'gk1v1', label: 'Friläge mot målvakt' },
          { value: 'cross', label: 'Inlägg och avslut' },
          { value: 'cutback', label: 'Cutback och avslut' },
        ],
      },
      {
        key: 'grupp',
        label: 'Spelare per station',
        choices: [3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) })),
      },
    ],
    defaults: { variant: 'straight', grupp: '5' },
    spec: (o) => {
      const g = Number(o.grupp) || 5
      return { type: 'finishing', variant: o.variant as 'straight' | 'wall' | 'turn' | 'gk1v1' | 'cross' | 'cutback', per: [3, g, g + 2] }
    },
  },
  {
    id: 'passning',
    name: 'Passningsmönster',
    hint: 'Passa och följ bollen mellan koner i ett bestämt mönster.',
    fields: [
      {
        key: 'form',
        label: 'Form',
        choices: [
          { value: 'square', label: 'Kvadrat' },
          { value: 'triangle', label: 'Triangel' },
          { value: 'diamond', label: 'Diamant' },
          { value: 'y', label: 'Y' },
          { value: 'line', label: 'Linje' },
        ],
      },
      {
        key: 'vagg',
        label: 'Väggspel',
        choices: [
          { value: 'nej', label: 'Nej' },
          { value: 'ja', label: 'Ja' },
        ],
      },
      {
        key: 'avstand',
        label: 'Avstånd mellan konerna',
        choices: [6, 8, 10, 12, 15, 20].map((n) => ({ value: String(n), label: `${n} m` })),
      },
    ],
    defaults: { form: 'square', vagg: 'nej', avstand: '10' },
    spec: (o) => {
      const verts = o.form === 'triangle' || o.form === 'line' ? 3 : 4
      return {
        type: 'pattern',
        shape: o.form as 'square' | 'triangle' | 'diamond' | 'y' | 'line',
        per: [verts + 1, verts + 2, verts + 4],
        side: Number(o.avstand) || 10,
        wall: o.vagg === 'ja',
      }
    },
  },
  {
    id: 'par',
    name: 'Två och två eller tre och tre',
    hint: 'Alla jobbar samtidigt i par eller trianglar.',
    fields: [
      {
        key: 'storlek',
        label: 'Grupper',
        choices: [
          { value: '2', label: 'Par' },
          { value: '3', label: 'Tre och tre' },
        ],
      },
      {
        key: 'uppgift',
        label: 'Uppgift',
        choices: [
          { value: 'pass', label: 'Passa till varandra' },
          { value: 'mirror', label: 'En med boll, en följer' },
        ],
      },
      {
        key: 'avstand',
        label: 'Avstånd',
        choices: [5, 8, 10, 12, 15, 20, 25].map((n) => ({ value: String(n), label: `${n} m` })),
      },
    ],
    defaults: { storlek: '2', uppgift: 'pass', avstand: '10' },
    spec: (o) => ({
      type: 'pairs',
      dist: Number(o.avstand) || 10,
      mode: o.storlek === '3' ? 'pass' : (o.uppgift as 'pass' | 'mirror'),
      size: o.storlek === '3' ? 3 : 2,
    }),
  },
  {
    id: 'alla',
    name: 'Alla i en yta',
    hint: 'Hela gruppen i samma yta, till exempel med varsin boll.',
    fields: [
      {
        key: 'bana',
        label: 'I ytan finns',
        choices: [
          { value: 'free', label: 'Ingenting' },
          { value: 'gates', label: 'Konportar' },
          { value: 'cones', label: 'Utspridda koner' },
        ],
      },
      {
        key: 'jagare',
        label: 'Jagare utan boll',
        choices: [
          { value: '0', label: 'Inga' },
          { value: '1', label: 'Några få' },
          { value: '2', label: 'Många' },
        ],
      },
      SIZE,
    ],
    defaults: { bana: 'free', jagare: '0', yta: 'normal' },
    spec: (o) => ({
      type: 'individual',
      areaPer: scaled([20, 25, 28, 30], o),
      layout: o.bana as 'free' | 'gates' | 'cones',
      taggers: Number(o.jagare) || 0,
    }),
  },
  {
    id: 'stafett',
    name: 'Stafett eller bana',
    hint: 'Små lag på led som turas om längs en bana.',
    fields: [
      {
        key: 'uppgift',
        label: 'Uppgift',
        choices: [
          { value: 'dribble', label: 'Driva runt en kon' },
          { value: 'slalom', label: 'Slalom mellan koner' },
          { value: 'run', label: 'Löpa utan boll' },
        ],
      },
      {
        key: 'lag',
        label: 'Spelare per lag',
        choices: [2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
      },
      {
        key: 'langd',
        label: 'Banans längd',
        choices: [8, 10, 12, 15, 20, 30].map((n) => ({ value: String(n), label: `${n} m` })),
      },
    ],
    defaults: { uppgift: 'dribble', lag: '3', langd: '12' },
    spec: (o) => {
      const p = Number(o.lag) || 3
      return { type: 'relay', per: [2, p, p + 1], len: Number(o.langd) || 12, mode: o.uppgift as 'dribble' | 'slalom' | 'run' }
    },
  },
  {
    id: 'lagdel',
    name: 'Anfall mot försvar',
    hint: 'Hela gruppen på en del av planen. Kräver minst åtta utespelare.',
    fields: [
      {
        key: 'zon',
        label: 'Var på planen',
        choices: [
          { value: 'build', label: 'Speluppbyggnad från målvakt' },
          { value: 'mid', label: 'Från mittplan mot mål' },
          { value: 'final', label: 'Sista tredjedelen' },
        ],
      },
      {
        key: 'balans',
        label: 'Antal',
        choices: [
          { value: '0.5', label: 'Lika många' },
          { value: '0.58', label: 'Anfallet i överläge' },
          { value: '0.42', label: 'Försvaret i överläge' },
        ],
      },
    ],
    defaults: { zon: 'final', balans: '0.58' },
    spec: (o) => ({ type: 'phase', attShare: Number(o.balans) || 0.5, zone: o.zon as 'build' | 'mid' | 'final', minPlayers: 8 }),
  },
]

export const TEMPLATE_BY_ID: Record<TemplateId, Template> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<TemplateId, Template>

/** En egen övning så som den sparas på enheten. */
export interface CustomDrill {
  id: string
  template: TemplateId
  opts: Opts
  name: string
  phase: 'warmup' | 'skill' | 'game'
  themes: ThemeId[]
  age: [number, number]
  level: 1 | 2 | 3
  purpose: string
  steps: string[]
  coaching: string[]
  easier: string
  harder: string
}

function usesGoalkeeper(spec: BuilderSpec): boolean {
  if (spec.type === 'ssg') return spec.goals === 'auto' || spec.goals === 'big'
  if (spec.type === 'duel') return spec.goals === 'big'
  return spec.type === 'finishing' || spec.type === 'phase'
}

/** Gör om en sparad egen övning till samma form som de inbyggda övningarna. */
export function toDrillDef(c: CustomDrill): DrillDef {
  const t = TEMPLATE_BY_ID[c.template] ?? TEMPLATES[0]
  const build = t.spec({ ...t.defaults, ...c.opts })
  return {
    id: c.id,
    name: c.name,
    phase: c.phase,
    themes: c.themes,
    age: c.age,
    level: c.level,
    build,
    purpose: c.purpose,
    steps: c.steps,
    coaching: c.coaching,
    easier: c.easier,
    harder: c.harder,
    usesGk: usesGoalkeeper(build),
  }
}

/** Dela upp fritext i punkter, en per rad. */
export function lines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-–•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
}
