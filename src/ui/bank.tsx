// Övningsbank, förhandsvisning av en övning och sidan Om/Inställningar.

import { useMemo, useState } from 'react'
import { buildSetup } from '../domain/build'
import { allDrills, findDrill } from '../domain/bank'
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

type Show = 'alla' | 'favoriter' | 'egna' | 'dolda'

function Star({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`star${on ? ' is-on' : ''}`}>
      <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z" strokeLinejoin="round" />
    </svg>
  )
}

export function Bank({ store }: { store: Store }) {
  const team = store.state.team as TeamCfg
  const [theme, setTheme] = useState<ThemeId | 'alla'>('alla')
  const [phase, setPhase] = useState<Phase | 'alla'>('alla')
  const [show, setShow] = useState<Show>('alla')
  const themes = themesFor(team.format)
  const age = Math.max(6, team.age)
  const { custom, favorites, hidden } = store.state
  const list = useMemo(() => {
    const fav = new Set(favorites)
    const hid = new Set(hidden)
    const own = new Set(custom.map((c) => c.id))
    return allDrills()
      // Favoriter, egna och dolda visas oavsett ålder, så att de alltid går att hitta och ändra.
      .filter((d) => show !== 'alla' || ageFits(d, age) || own.has(d.id))
      .filter((d) => phase === 'alla' || d.phase === phase)
      .filter((d) => theme === 'alla' || d.themes.includes(theme) || (d.themes.length === 0 && (d.phase === 'warmup' || d.phase === 'match')))
      .filter((d) => (show === 'favoriter' ? fav.has(d.id) : show === 'egna' ? own.has(d.id) : show === 'dolda' ? hid.has(d.id) : true))
      .map((d) => ({ d, fav: fav.has(d.id), hid: hid.has(d.id), own: own.has(d.id) }))
  }, [age, phase, theme, show, custom, favorites, hidden])
  const empty: Record<Show, string> = {
    alla: 'Inga övningar matchar filtret.',
    favoriter: 'Inga favoriter än. Öppna en övning och tryck på stjärnan.',
    egna: 'Inga egna övningar än.',
    dolda: 'Inga dolda övningar.',
  }
  return (
    <>
      <TopBar title="Övningsbanken" sub={`${list.length} övningar för ${teamLine(team)}`} backTo="" />
      <main>
        <button type="button" className="btn btn-primary" onClick={() => go('ovningar/ny')}>
          Ny egen övning
        </button>
        <div className="seg seg-small" role="radiogroup" aria-label="Visa">
          {(['alla', 'favoriter', 'egna', 'dolda'] as Show[]).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={show === v} className={show === v ? 'is-on' : ''} onClick={() => setShow(v)}>
              {v === 'alla' ? 'Alla' : v === 'favoriter' ? 'Favoriter' : v === 'egna' ? 'Egna' : 'Dolda'}
            </button>
          ))}
        </div>
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
          {list.map(({ d, fav, hid, own }) => (
            <li key={d.id}>
              <button type="button" className={`card nav-card${hid ? ' is-hidden' : ''}`} onClick={() => go(`ovningar/${d.id}`)}>
                <span>
                  <b>
                    {fav && <Star on />}
                    {d.name}
                  </b>
                  <small>
                    {own ? 'Egen · ' : ''}
                    {hid ? 'Dold · ' : ''}
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
        {list.length === 0 && <p className="muted center">{empty[show]}</p>}
      </main>
    </>
  )
}

export function DrillActions({ store, id }: { store: Store; id: string }) {
  const fav = store.state.favorites.includes(id)
  const hid = store.state.hidden.includes(id)
  return (
    <div className="row drill-actions">
      <button type="button" className={`btn btn-ghost${fav ? ' is-fav' : ''}`} aria-pressed={fav} onClick={() => store.toggleFavorite(id)}>
        <Star on={fav} />
        {fav ? 'Favorit' : 'Gör till favorit'}
      </button>
      <button type="button" className="btn btn-ghost" aria-pressed={hid} onClick={() => store.toggleHidden(id)}>
        {hid ? 'Visa igen' : 'Dölj övningen'}
      </button>
    </div>
  )
}

export function DrillPreview({ store, id }: { store: Store; id: string }) {
  const team = store.state.team as TeamCfg
  const def = findDrill(id)
  const own = store.state.custom.some((c) => c.id === id)
  const hid = store.state.hidden.includes(id)
  const base = store.state.last ?? defaultInput(team)
  const [players, setPlayers] = useState(base.players)
  const [gks, setGks] = useState(base.goalkeepers)
  const [confirm, setConfirm] = useState(false)
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
          {own && <Pill tone="yellow">Egen övning</Pill>}
          {def.themes.map((t) => (
            <Pill key={t} tone="green">
              {THEME_BY_ID[t].name}
            </Pill>
          ))}
          <Pill tone="muted">Steg {def.level}</Pill>
        </div>
        <DrillActions store={store} id={id} />
        <p className="hint">
          {hid ? 'Dold: övningen väljs aldrig till nya pass eller vid byte av övning.' : 'Favoriter väljs i första hand när de passar passets steg. Dolda övningar väljs aldrig.'}
        </p>
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
        {own && (
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => go(`ovningar/${id}/redigera`)}>
              Redigera övningen
            </button>
            {confirm ? (
              <div className="confirm">
                <p>Ta bort övningen? Pass som inte är genomförda och använder den byggs om.</p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      store.deleteCustom(id)
                      go('ovningar', true)
                    }}
                  >
                    Ta bort
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="link link-danger" onClick={() => setConfirm(true)}>
                Ta bort övningen
              </button>
            )}
          </div>
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
              <li>Favoritmarkerade och egna övningar väljs i första hand när de passar passets steg. Dolda övningar väljs aldrig.</li>
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
