// Skapa och redigera egna övningar utifrån en mall.

import { useMemo, useState } from 'react'
import { buildSetup } from '../domain/build'
import { AGES, SENIOR_AGE } from '../domain/formats'
import { TEMPLATES, TEMPLATE_BY_ID, lines, toDrillDef, type CustomDrill, type Opts, type TemplateId } from '../domain/templates'
import { THEMES } from '../domain/themes'
import type { SessionCtx, ThemeId } from '../domain/types'
import { defaultInput, newId, type Store, type TeamCfg } from '../store'
import { Section, Stepper, TopBar, go } from './common'
import { Pitch } from './Pitch'

const PHASES: { id: CustomDrill['phase']; label: string; hint: string }[] = [
  { id: 'warmup', label: 'Uppvärmning', hint: 'Först i passet' },
  { id: 'skill', label: 'Färdighetsövning', hint: 'Teknik och delmoment' },
  { id: 'game', label: 'Spelövning', hint: 'Med motståndare och riktning' },
]

const LEVELS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: 'Grund' },
  { id: 2, label: 'Under press' },
  { id: 3, label: 'Matchlikt' },
]

const ageText = (a: number) => (a >= SENIOR_AGE ? 'Senior' : `${a} år`)

export function Editor({ store, id }: { store: Store; id?: string }) {
  const team = store.state.team as TeamCfg
  const existing = id ? store.state.custom.find((c) => c.id === id) : undefined
  const [template, setTemplate] = useState<TemplateId>(existing?.template ?? 'smalag')
  const [opts, setOpts] = useState<Opts>(existing?.opts ?? TEMPLATE_BY_ID.smalag.defaults)
  const [name, setName] = useState(existing?.name ?? '')
  const [phase, setPhase] = useState<CustomDrill['phase']>(existing?.phase ?? 'game')
  const [themes, setThemes] = useState<ThemeId[]>(existing?.themes ?? [])
  const [level, setLevel] = useState<1 | 2 | 3>(existing?.level ?? 2)
  const [ageFrom, setAgeFrom] = useState(existing?.age[0] ?? Math.max(6, team.age - 2))
  const [ageTo, setAgeTo] = useState(existing?.age[1] ?? Math.min(SENIOR_AGE, team.age + 2))
  const [purpose, setPurpose] = useState(existing?.purpose ?? '')
  const [steps, setSteps] = useState(existing?.steps.join('\n') ?? '')
  const [coaching, setCoaching] = useState(existing?.coaching.join('\n') ?? '')
  const [easier, setEasier] = useState(existing?.easier ?? '')
  const [harder, setHarder] = useState(existing?.harder ?? '')
  const [tried, setTried] = useState(false)

  const base = store.state.last ?? defaultInput(team)
  const [players, setPlayers] = useState(base.players)
  const tpl = TEMPLATE_BY_ID[template]

  const draft: CustomDrill = useMemo(
    () => ({
      id: existing?.id ?? 'egen-utkast',
      template,
      opts,
      name: name.trim(),
      phase,
      themes,
      age: [Math.min(ageFrom, ageTo), Math.max(ageFrom, ageTo)],
      level: phase === 'warmup' ? 1 : level,
      purpose: purpose.trim(),
      steps: lines(steps),
      coaching: lines(coaching),
      easier: easier.trim(),
      harder: harder.trim(),
    }),
    [existing?.id, template, opts, name, phase, themes, ageFrom, ageTo, level, purpose, steps, coaching, easier, harder],
  )

  const previewAge = Math.max(draft.age[0], Math.min(draft.age[1], Math.max(6, team.age)))
  const ctx: SessionCtx = { age: previewAge, format: team.format, players, goalkeepers: Math.min(base.goalkeepers, Math.max(0, players - 2)), coaches: base.coaches, space: base.space, minutes: base.minutes }
  const setup = buildSetup(toDrillDef(draft), ctx)

  const errors: string[] = []
  if (!draft.name) errors.push('Ge övningen ett namn.')
  if (phase !== 'warmup' && themes.length === 0) errors.push('Välj minst ett tema.')
  if (draft.steps.length === 0) errors.push('Skriv minst en rad under ”Så här gör ni”.')

  const pickTemplate = (t: TemplateId) => {
    setTemplate(t)
    setOpts(TEMPLATE_BY_ID[t].defaults)
  }
  const toggleTheme = (t: ThemeId) => setThemes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const save = () => {
    setTried(true)
    if (errors.length) {
      window.scrollTo(0, 0)
      return
    }
    const drill: CustomDrill = { ...draft, id: existing?.id ?? `egen-${newId()}` }
    store.saveCustom(drill)
    go(`ovningar/${drill.id}`, true)
  }

  if (id && !existing) {
    return (
      <>
        <TopBar title="Övningen finns inte" backTo="ovningar" />
        <main>
          <p className="muted">Övningen kunde inte hittas.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar title={existing ? 'Redigera övning' : 'Ny egen övning'} sub="Välj en mall och skriv dina instruktioner" backTo={existing ? `ovningar/${existing.id}` : 'ovningar'} />
      <main className="has-footer">
        {tried && errors.length > 0 && (
          <div className="warn" role="alert">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}

        <Section title="1. Mall">
          <div className="tpl-list" role="radiogroup" aria-label="Mall">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={template === t.id} className={`tpl${template === t.id ? ' is-on' : ''}`} onClick={() => pickTemplate(t.id)}>
                <b>{t.name}</b>
                <small>{t.hint}</small>
              </button>
            ))}
          </div>
        </Section>

        <Section title="2. Upplägg">
          {tpl.fields.map((f) => (
            <fieldset key={f.key} className="field">
              <legend>{f.label}</legend>
              <div className="choice-list" role="radiogroup" aria-label={f.label}>
                {f.choices.map((c) => {
                  const on = (opts[f.key] ?? tpl.defaults[f.key]) === c.value
                  return (
                    <button key={c.value} type="button" role="radio" aria-checked={on} className={`choice${on ? ' is-on' : ''}`} onClick={() => setOpts((o) => ({ ...o, [f.key]: c.value }))}>
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </Section>

        <Section title="Så blir det">
          <div className="card form-card">
            <Stepper label="Prova med antal spelare" value={players} min={2} max={40} onChange={setPlayers} />
          </div>
          {setup ? (
            <div className="card slot-body">
              <Pitch key={`${template}|${JSON.stringify(opts)}|${players}`} scene={setup.scene} />
              <p className="run-summary">{setup.summary}</p>
              {setup.notes.length > 0 && (
                <ul className="plain">
                  {setup.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="warn">Mallen går inte att genomföra med {players} spelare. I ett pass väljer appen då en annan övning.</p>
          )}
        </Section>

        <Section title="3. Om övningen">
          <label className="field">
            <span>Namn</span>
            <input className="text-input" type="text" value={name} maxLength={60} placeholder="t.ex. Kantspel i tre zoner" onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset className="field">
            <legend>Typ</legend>
            <div className="choice-list" role="radiogroup" aria-label="Typ">
              {PHASES.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={phase === p.id} className={`choice${phase === p.id ? ' is-on' : ''}`} onClick={() => setPhase(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <small>{PHASES.find((p) => p.id === phase)?.hint}</small>
          </fieldset>
          <fieldset className="field">
            <legend>Teman</legend>
            <div className="choice-list">
              {THEMES.map((t) => (
                <button key={t.id} type="button" role="checkbox" aria-checked={themes.includes(t.id)} className={`choice${themes.includes(t.id) ? ' is-on' : ''}`} onClick={() => toggleTheme(t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
            <small>{phase === 'warmup' ? 'Utan tema kan uppvärmningen väljas till alla block.' : 'Övningen kan väljas till block med något av dessa teman.'}</small>
          </fieldset>
          {phase !== 'warmup' && (
            <fieldset className="field">
              <legend>Steg i blocket</legend>
              <div className="choice-list" role="radiogroup" aria-label="Steg i blocket">
                {LEVELS.map((l) => (
                  <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className={`choice${level === l.id ? ' is-on' : ''}`} onClick={() => setLevel(l.id)}>
                    {l.id}. {l.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="age-range">
            <label className="field">
              <span>Från ålder</span>
              <select value={ageFrom} onChange={(e) => setAgeFrom(Number(e.target.value))}>
                {AGES.map((a) => (
                  <option key={a} value={a}>
                    {ageText(a)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Till ålder</span>
              <select value={ageTo} onChange={(e) => setAgeTo(Number(e.target.value))}>
                {AGES.map((a) => (
                  <option key={a} value={a}>
                    {ageText(a)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        <Section title="4. Instruktioner">
          <label className="field">
            <span>Syfte</span>
            <input className="text-input" type="text" value={purpose} maxLength={160} placeholder="Vad ska spelarna bli bättre på?" onChange={(e) => setPurpose(e.target.value)} />
          </label>
          <label className="field">
            <span>Så här gör ni</span>
            <small>En punkt per rad</small>
            <textarea className="text-input" rows={5} value={steps} maxLength={1200} placeholder={'Två lag anfaller mot varsitt mål.\nMål efter inlägg räknas dubbelt.'} onChange={(e) => setSteps(e.target.value)} />
          </label>
          <label className="field">
            <span>Coacha på</span>
            <small>En punkt per rad</small>
            <textarea className="text-input" rows={4} value={coaching} maxLength={800} placeholder={'Fyll på framför mål\nInspel snett inåt bakåt'} onChange={(e) => setCoaching(e.target.value)} />
          </label>
          <label className="field">
            <span>Lättare</span>
            <input className="text-input" type="text" value={easier} maxLength={200} placeholder="Valfritt" onChange={(e) => setEasier(e.target.value)} />
          </label>
          <label className="field">
            <span>Svårare</span>
            <input className="text-input" type="text" value={harder} maxLength={200} placeholder="Valfritt" onChange={(e) => setHarder(e.target.value)} />
          </label>
        </Section>
      </main>
      <footer className="footer-bar">
        <button type="button" className="btn btn-primary" onClick={save}>
          {existing ? 'Spara ändringarna' : 'Spara övningen'}
        </button>
      </footer>
    </>
  )
}
