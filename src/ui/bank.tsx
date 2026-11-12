// Övningsbank, förhandsvisning av en övning och sidan Om/Inställningar.

import { useMemo, useState } from 'react'
import { buildSetup } from '../domain/build'
import { DRILLS, DRILL_BY_ID } from '../domain/drills'
import { FORMATS, ageLabel } from '../domain/formats'
import { ageFits, formatName } from '../domain/planner'
import { THEME_BY_ID, themesFor } from '../domain/themes'
import type { Phase, SessionCtx, ThemeId } from '../domain/types'
import { defaultInput, type Store, type TeamCfg } from '../store'
import { Pill, Section, Stepper, TopBar, go } from './common'
import { DrillView } from './DrillView'
import { teamLine } from './views'

const PHASE_LABEL: Record<Phase, string> = {
  warmup: 'Uppvärmning',
  skill: 'Färdighetsövning',
  game: 'Spelövning',
  match: 'Matchspel',
  prehab: 'Skadeförebyggande',
  gk: 'Målvakt',
  fys: 'Fys',
}
const PHASES: Phase[] = ['warmup', 'skill', 'game', 'match', 'gk', 'prehab', 'fys']

export function Bank({ store }: { store: Store }) {
  const team = store.state.team as TeamCfg
  const [theme, setTheme] = useState<ThemeId | 'alla'>('alla')
  const [phase, setPhase] = useState<Phase | 'alla'>('alla')
  const themes = themesFor(team.format)
  const age = Math.max(6, team.age)
  const list = useMemo(
    () =>
      DRILLS.filter((d) => ageFits(d, age))
        .filter((d) => phase === 'alla' || d.phase === phase)
        .filter((d) => theme === 'alla' || d.themes.includes(theme) || (d.themes.length === 0 && (d.phase === 'warmup' || d.phase === 'match'))),
    [age, phase, theme],
  )
  return (
    <>
      <TopBar title="Övningsbanken" sub={`${list.length} övningar för ${teamLine(team)}`} backTo="" />
      <main>
        <div className="filters">
          <label>
            <span>Tema</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId | 'alla')}>
              <option value="alla">Alla teman</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Typ</span>
            <select value={phase} onChange={(e) => setPhase(e.target.value as Phase | 'alla')}>
              <option value="alla">Alla typer</option>
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {PHASE_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="bank-list">
          {list.map((d) => (
            <li key={d.id}>
              <button type="button" className="card nav-card" onClick={() => go(`ovningar/${d.id}`)}>
                <span>
                  <b>{d.name}</b>
                  <small>
                    {PHASE_LABEL[d.phase]}
                    {d.themes[0] ? ` · ${THEME_BY_ID[d.themes[0]].name}` : ''} · steg {d.level}
                  </small>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="muted center">Inga övningar matchar filtret.</p>}
      </main>
    </>
  )
}

export function DrillPreview({ store, id }: { store: Store; id: string }) {
  const team = store.state.team as TeamCfg
  const def = DRILL_BY_ID.get(id)
  const base = store.state.last ?? defaultInput(team)
  const [players, setPlayers] = useState(base.players)
  const [gks, setGks] = useState(base.goalkeepers)
  if (!def) {
    return (
      <>
        <TopBar title="Övningen finns inte" backTo="ovningar" />
        <main>
          <p className="muted">Övningen kunde inte hittas.</p>
        </main>
      </>
    )
  }
  const age = Math.max(def.age[0], Math.min(def.age[1], Math.max(6, team.age)))
  const ctx: SessionCtx = { age, format: team.format, players, goalkeepers: Math.min(gks, Math.max(0, players - 2)), coaches: base.coaches, space: base.space, minutes: base.minutes }
  const setup = buildSetup(def, ctx)
  return (
    <>
      <TopBar title={def.name} sub={`${PHASE_LABEL[def.phase]} · ${ageLabel(def.age[0])}–${ageLabel(def.age[1]).toLowerCase()}`} backTo="ovningar" />
      <main>
        <div className="pills">
          {def.themes.map((t) => (
            <Pill key={t} tone="green">
              {THEME_BY_ID[t].name}
            </Pill>
          ))}
          <Pill tone="muted">Steg {def.level}</Pill>
        </div>
        <div className="card form-card">
          <Stepper label="Prova med antal spelare" value={players} min={2} max={40} onChange={setPlayers} />
          <Stepper label="Varav målvakter" value={ctx.goalkeepers} min={0} max={Math.min(4, Math.max(0, players - 2))} onChange={setGks} />
        </div>
        {setup ? (
          <div className="card slot-body">
            <DrillView def={def} setup={setup} age={age} showGk={ctx.goalkeepers > 0} />
          </div>
        ) : (
          <p className="warn">Övningen går inte att genomföra med {players} spelare. Appen väljer då automatiskt en annan övning i passet.</p>
        )}
      </main>
    </>
  )
}

const SOURCES: { title: string; items: string[] }[] = [
  {
    title: 'Sverige',
    items: [
      'Svenska Fotbollförbundet: Spelarutbildningsplanen, Fotbollens spela, lek och lär, Spelregler för barn- och ungdomsfotboll, Planstorlekar, Övningsbankens indelning',
      'Distrikt: Skånes FF och Södermanlands FF (övningsmallar och skalning av ytor efter antal spelare)',
      'Föreningar: Sigtuna IF, Östersunds FK och Malmö FF (teman per ålder och block om 2–4 veckor)',
      'Knäkontroll (skadeförebyggande uppvärmning)',
    ],
  },
  {
    title: 'Norden och övriga förbund',
    items: [
      'NFF (Norge), DBU (Danmark), Palloliitto (Finland)',
      'The FA (England), DFB (Tyskland), KNVB (Nederländerna), FIGC (Italien), Football Australia, US Soccer, Irish FA',
      'FIFA Training Centre, FIFA 11+ och 11+ Kids',
    ],
  },
  {
    title: 'Akademier och forskning',
    items: [
      'Ajax, FC Barcelona, Anderlecht, Dinamo Zagreb, AZ Alkmaar och FC Köpenhamn/KB',
      'Forskning om smålagsspel: hur yta per spelare, antal spelare, jokrar och målvakter påverkar belastning och antal aktioner',
      'Coerver, Funino (Horst Wein), taktisk periodisering och spelbaserad inlärning',
    ],
  },
]

export function About({ store }: { store: Store }) {
  const team = store.state.team as TeamCfg
  const f = FORMATS[team.format]
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <TopBar title="Inställningar" sub="Lag, spelform och underlag" backTo="" />
      <main>
        <Section
          title="Laget"
          aside={
            <button type="button" className="link" onClick={() => go('lag')}>
              Ändra
            </button>
          }
        >
          <div className="card">
            <p>
              <b>{teamLine(team)}</b>
            </p>
            <dl className="facts facts-wide">
              <div>
                <dt>Plan</dt>
                <dd>{f.pitchText}</dd>
              </div>
              <div>
                <dt>Mål</dt>
                <dd>{f.goalText}</dd>
              </div>
              <div>
                <dt>Boll</dt>
                <dd>{f.ball}</dd>
              </div>
              <div>
                <dt>Speltid</dt>
                <dd>{f.matchTime}</dd>
              </div>
            </dl>
            <ul className="plain">
              {f.facts.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="hint">Spelform {formatName(team.format)} enligt SvFF:s nationella spelformer.</p>
          </div>
        </Section>

        <Section title="Så anpassas passen">
          <div className="card">
            <ul className="plain">
              <li>Hellre fler små ytor än stora lag: antalet ytor väljs så att lagen hamnar nära övningens tänkta storlek.</li>
              <li>Ojämnt antal löses med joker, numerärt överläge eller ett lag som roterar in – ingen ska stå still.</li>
              <li>Måtten räknas om efter antal spelare så att ytan per spelare behålls, och krymps om ni har ont om plats.</li>
              <li>Antalet tränare styr hur många ytor som körs samtidigt.</li>
              <li>Saknas målvakt byts stora mål mot småmål, med en målvakt spelas det mot ett stort mål och två små.</li>
              <li>Minst hälften av passet är spelövningar och matchspel, och varje pass följer ett tema.</li>
            </ul>
          </div>
        </Section>

        <Section title="Underlag">
          <div className="card">
            <p>Övningarna är skrivna för den här appen. Upplägg, begrepp, mått och tider bygger på en genomgång av följande källor:</p>
            {SOURCES.map((s) => (
              <div key={s.title}>
                <h4>{s.title}</h4>
                <ul className="plain">
                  {s.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="hint">Den skadeförebyggande uppvärmningen följer samma typ av övningar som Knäkontroll och FIFA 11+. Se respektive program för film och nivåer.</p>
          </div>
        </Section>

        <Section title="Data">
          <div className="card">
            <p>Allt sparas bara på den här enheten. Inget skickas någonstans.</p>
            {confirm ? (
              <div className="confirm">
                <p>Radera lag, block och anteckningar?</p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      store.reset()
                      go('', true)
                    }}
                  >
                    Radera allt
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="link link-danger" onClick={() => setConfirm(true)}>
                Radera all data
              </button>
            )}
          </div>
        </Section>
      </main>
    </>
  )
}
