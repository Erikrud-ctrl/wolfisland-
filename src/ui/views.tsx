// Hem, laginställning, nytt block, blocköversikt och "Inför passet".

import { useMemo, useState } from 'react'
import { SPACES } from '../domain/alloc'
import { DRILL_BY_ID } from '../domain/drills'
import { AGES, FORMATS, FORMAT_LIST, SENIOR_AGE, ageLabel, formatForAge } from '../domain/formats'
import { LEVEL_LABEL, buildSession, formatName, levelFor } from '../domain/planner'
import { THEME_BY_ID, themesFor } from '../domain/themes'
import type { Format, SessionCtx, SpaceId, ThemeId } from '../domain/types'
import { blockProgress, defaultInput, isFinished, type Block, type LastInput, type Store, type TeamCfg } from '../store'
import { Pill, Section, Stepper, Toggle, TopBar, fmtDate, go } from './common'

export function teamLine(team: TeamCfg): string {
  return `${team.name ? team.name + ' · ' : ''}${ageLabel(team.age)} · ${formatName(team.format)}`
}

// ---------- Laginställning ----------

export function TeamSetup({ store, first }: { store: Store; first?: boolean }) {
  const cur = store.state.team
  const [name, setName] = useState(cur?.name ?? '')
  const [age, setAge] = useState(cur?.age ?? 11)
  const [format, setFormat] = useState<Format>(cur?.format ?? formatForAge(cur?.age ?? 11))
  const svff = formatForAge(age)
  const f = FORMATS[format]
  return (
    <>
      <TopBar title={first ? 'Välkommen' : 'Laget'} sub={first ? 'Träningsplanering för Wargöns IK' : 'Ålder och spelform'} backTo={first ? undefined : 'om'} />
      <main>
        {first && <p className="lead">Börja med att ställa in ditt lag. Ålder och spelform styr vilka övningar, mått och tider du får.</p>}
        <Section title="Lagets namn">
          <input className="text-input" type="text" value={name} maxLength={30} placeholder="t.ex. P2014" onChange={(e) => setName(e.target.value)} aria-label="Lagets namn" />
        </Section>
        <Section title="Ålder">
          <div className="chips" role="radiogroup" aria-label="Ålder">
            {AGES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={a === age}
                className={`chip${a === age ? ' is-on' : ''}`}
                onClick={() => {
                  setAge(a)
                  setFormat(formatForAge(a))
                }}
              >
                {a >= SENIOR_AGE ? 'Senior' : a}
              </button>
            ))}
          </div>
          {age <= 7 && <p className="hint">6–7-åringar spelar 3 mot 3 enligt SvFF. Appen använder de enklaste övningarna från 5 mot 5 med minsta mått.</p>}
        </Section>
        <Section title="Spelform">
          <div className="seg" role="radiogroup" aria-label="Spelform">
            {FORMAT_LIST.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={id === format} className={id === format ? 'is-on' : ''} onClick={() => setFormat(id)}>
                {id}
              </button>
            ))}
          </div>
          {format !== svff && <p className="hint">SvFF:s spelform för {ageLabel(age).toLowerCase()} är {formatName(svff)}. Du kan välja en annan om laget spelar upp eller ner.</p>}
          <dl className="facts facts-wide">
            <div>
              <dt>Ålder</dt>
              <dd>{f.ages}</dd>
            </div>
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
            <div>
              <dt>Träning</dt>
              <dd>
                {f.sessionMin[0]}–{f.sessionMin[1]} min, en ledare per {f.perCoach} spelare
              </dd>
            </div>
          </dl>
        </Section>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              store.setTeam({ name: name.trim(), age, format })
              go('', true)
            }}
          >
            Spara laget
          </button>
        </div>
      </main>
    </>
  )
}

// ---------- Hem ----------

function BlockCard({ block }: { block: Block }) {
  const theme = THEME_BY_ID[block.theme]
  const p = blockProgress(block)
  const next = p.next >= 0 ? block.sessions[p.next] : null
  return (
    <article className="card block-card">
      <div className="card-head">
        <Pill tone="green">{theme.group}</Pill>
        <span className="muted">
          {p.done} av {p.total} pass
        </span>
      </div>
      <h3>{theme.name}</h3>
      <div className="dots" aria-hidden="true">
        {block.sessions.map((s, i) => (
          <span key={i} className={s.done ? 'is-done' : i === p.next ? 'is-next' : ''} />
        ))}
      </div>
      {next && (
        <p className="muted">
          Nästa: pass {p.next + 1} · {LEVEL_LABEL[next.plan.level]}
        </p>
      )}
      <div className="row">
        {next && (
          <button type="button" className="btn btn-primary" onClick={() => go(next.session ? `block/${block.id}/${p.next}` : `block/${block.id}/${p.next}/infor`)}>
            {next.session ? 'Öppna passet' : 'Inför passet'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => go(`block/${block.id}`)}>
          Visa blocket
        </button>
      </div>
    </article>
  )
}

export function Home({ store }: { store: Store }) {
  const team = store.state.team as TeamCfg
  const active = store.state.blocks.filter((b) => !isFinished(b))
  const finished = store.state.blocks.filter(isFinished)
  return (
    <>
      <TopBar
        title="Wargöns IK"
        sub={teamLine(team)}
        right={
          <button type="button" className="icon-btn" onClick={() => go('om')} aria-label="Inställningar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        }
      />
      <main>
        {store.saveFailed && <p className="warn">Det gick inte att spara på enheten. Kontrollera att webbläsaren inte är i privat läge.</p>}
        {active.length === 0 ? (
          <div className="empty">
            <h2>Inget block igång</h2>
            <p>Välj ett tema och hur många pass ni ska träna på det. Appen bygger passen med stegrad svårighet – från grund till matchlikt.</p>
            <button type="button" className="btn btn-primary" onClick={() => go('block/nytt')}>
              Starta ett block
            </button>
          </div>
        ) : (
          <Section
            title="Pågående block"
            aside={
              <button type="button" className="link" onClick={() => go('block/nytt')}>
                Nytt block
              </button>
            }
          >
            {active.map((b) => (
              <BlockCard key={b.id} block={b} />
            ))}
          </Section>
        )}

        <button type="button" className="card nav-card" onClick={() => go('ovningar')}>
          <span>
            <b>Övningsbanken</b>
            <small>Bläddra bland alla övningar och prova hur de skalas med antal spelare</small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {finished.length > 0 && (
          <Section title="Avslutade block">
            {finished.map((b) => (
              <button type="button" key={b.id} className="card nav-card" onClick={() => go(`block/${b.id}`)}>
                <span>
                  <b>{THEME_BY_ID[b.theme].name}</b>
                  <small>
                    {b.sessions.length} pass · {fmtDate(b.createdAt)}
                  </small>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </Section>
        )}
      </main>
    </>
  )
}

// ---------- Nytt block ----------

export function NewBlock({ store }: { store: Store }) {
  const team = store.state.team as TeamCfg
  const themes = useMemo(() => themesFor(team.format), [team.format])
  const [theme, setTheme] = useState<ThemeId | null>(null)
  const [count, setCount] = useState(4)
  const groups = [...new Set(themes.map((t) => t.group))]
  const recent = new Set(store.state.blocks.slice(0, 3).map((b) => b.theme))
  return (
    <>
      <TopBar title="Nytt block" sub={teamLine(team)} backTo="" />
      <main className="has-footer">
        <p className="lead">Välj ett tema. Alla pass i blocket följer temat – i uppvärmning, övningar och matchspel.</p>
        {groups.map((g) => (
          <Section key={g} title={g}>
            <div className="theme-list" role="radiogroup" aria-label={g}>
              {themes
                .filter((t) => t.group === g)
                .map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className={`theme${theme === t.id ? ' is-on' : ''}`} onClick={() => setTheme(t.id)}>
                    <span className="theme-name">
                      {t.name}
                      {recent.has(t.id) && <Pill tone="muted">Nyligen</Pill>}
                    </span>
                    <span className="theme-short">{t.short}</span>
                    {theme === t.id && <span className="theme-focus">{t.focus[team.format]}</span>}
                  </button>
                ))}
            </div>
          </Section>
        ))}
        <Section title="Antal pass">
          <Stepper label="Pass i blocket" hint="2–4 veckor på samma tema brukar vara lagom" value={count} min={2} max={8} onChange={setCount} />
          <ol className="progression">
            {Array.from({ length: count }, (_, i) => (
              <li key={i}>
                <b>Pass {i + 1}</b>
                <span>{LEVEL_LABEL[levelFor(i, count)]}</span>
              </li>
            ))}
          </ol>
        </Section>
      </main>
      <footer className="footer-bar">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!theme}
          onClick={() => {
            if (!theme) return
            const b = store.createBlock(theme, count)
            if (b) go(`block/${b.id}`, true)
          }}
        >
          {theme ? `Skapa block: ${THEME_BY_ID[theme].name}` : 'Välj ett tema'}
        </button>
      </footer>
    </>
  )
}

// ---------- Blocköversikt ----------

export function BlockView({ store, block }: { store: Store; block: Block }) {
  const theme = THEME_BY_ID[block.theme]
  const p = blockProgress(block)
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <TopBar title={theme.name} sub={`${ageLabel(block.age)} · ${formatName(block.format)} · ${p.done} av ${p.total} pass`} backTo="" />
      <main>
        <div className="card focus-card">
          <Pill tone="green">{theme.group}</Pill>
          <p>{theme.focus[block.format] ?? theme.short}</p>
        </div>
        <Section title="Passen">
          <ol className="session-list">
            {block.sessions.map((s, i) => {
              const state = s.done ? 'done' : i === p.next ? 'next' : 'later'
              const names = (['skill', 'game'] as const).map((k) => DRILL_BY_ID.get(s.session?.slots.find((x) => x.slot === k)?.drillId ?? s.plan.drills[k])?.name).filter(Boolean)
              return (
                <li key={i} className={`card session-item is-${state}`}>
                  <div className="card-head">
                    <b>Pass {i + 1}</b>
                    {s.done ? <Pill tone="green">Klart · {fmtDate(s.done.at)}</Pill> : state === 'next' ? <Pill tone="yellow">Nästa</Pill> : <Pill tone="muted">Kommande</Pill>}
                  </div>
                  <p className="muted">{LEVEL_LABEL[s.plan.level]}</p>
                  <p className="look">Titta extra efter: {theme.lookFor[s.plan.level - 1]}</p>
                  <p className="drill-names">{names.join(' · ')}</p>
                  {s.done && (
                    <p className="review">
                      <span aria-label={`Betyg ${s.done.rating} av 5`}>{'★'.repeat(s.done.rating) + '☆'.repeat(5 - s.done.rating)}</span>
                      {s.done.note && <span> {s.done.note}</span>}
                    </p>
                  )}
                  <div className="row">
                    {state === 'next' && (
                      <button type="button" className="btn btn-primary" onClick={() => go(s.session ? `block/${block.id}/${i}` : `block/${block.id}/${i}/infor`)}>
                        {s.session ? 'Öppna passet' : 'Inför passet'}
                      </button>
                    )}
                    {state === 'done' && s.session && (
                      <button type="button" className="btn btn-ghost" onClick={() => go(`block/${block.id}/${i}`)}>
                        Visa passet
                      </button>
                    )}
                    {state === 'later' && (
                      <button type="button" className="btn btn-ghost" onClick={() => go(`block/${block.id}/${i}/infor`)}>
                        Kör det här passet nu
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Section>
        <div className="actions">
          {confirm ? (
            <div className="confirm">
              <p>Ta bort blocket och alla anteckningar?</p>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    store.deleteBlock(block.id)
                    go('', true)
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
              Ta bort blocket
            </button>
          )}
        </div>
      </main>
    </>
  )
}

// ---------- Inför passet ----------

const SPACE_ORDER: SpaceId[] = ['hel11', 'halv11', 'kvart11', 'plan5', 'hall']

export function Prep({ store, block, index }: { store: Store; block: Block; index: number }) {
  const team = store.state.team as TeamCfg
  const stored = block.sessions[index]
  const init: LastInput = stored.session
    ? {
        players: stored.session.ctx.players,
        goalkeepers: stored.session.ctx.goalkeepers,
        coaches: stored.session.ctx.coaches,
        space: stored.session.ctx.space,
        minutes: stored.session.ctx.minutes,
        options: stored.session.options,
      }
    : (store.state.last ?? defaultInput(team))
  const [inp, setInp] = useState<LastInput>(init)
  const set = (patch: Partial<LastInput>) => setInp((p) => ({ ...p, ...patch }))
  const theme = THEME_BY_ID[block.theme]
  const f = FORMATS[block.format]
  const gkMax = Math.min(4, Math.max(0, inp.players - 2))
  const gks = Math.min(inp.goalkeepers, gkMax)
  const canPrehab = block.age >= 10
  const canFys = block.age >= 15
  const tooFew = inp.players < 4
  const ratio = inp.players / Math.max(1, inp.coaches)

  const create = () => {
    const ctx: SessionCtx = { age: block.age, format: block.format, players: inp.players, goalkeepers: gks, coaches: inp.coaches, space: inp.space, minutes: inp.minutes }
    const options = { prehab: inp.options.prehab && canPrehab, gkMoment: inp.options.gkMoment && gks > 0, fys: inp.options.fys && canFys }
    const session = buildSession(stored.plan, block.theme, ctx, options, `${block.id}-${index}`)
    store.setSession(block.id, index, session, { ...inp, goalkeepers: gks })
    go(`block/${block.id}/${index}`, true)
  }

  return (
    <>
      <TopBar title="Inför passet" sub={`${theme.name} · pass ${index + 1} av ${block.sessions.length}`} backTo={`block/${block.id}`} />
      <main className="has-footer">
        <Section title="Vilka är på plats?">
          <div className="card form-card">
            <Stepper label="Spelare" hint="Alla på plats, även målvakter" value={inp.players} min={2} max={40} onChange={(v) => set({ players: v })} />
            <Stepper label="Varav målvakter" hint="Som står i mål i dag" value={gks} min={0} max={gkMax} onChange={(v) => set({ goalkeepers: v })} />
            <Stepper label="Tränare" hint={`SvFF: en ledare per ${f.perCoach} spelare`} value={inp.coaches} min={1} max={6} onChange={(v) => set({ coaches: v })} />
          </div>
          {ratio > f.perCoach + 2 && <p className="hint">Ni är {Math.round(ratio)} spelare per tränare. Appen håller nere antalet ytor så att du hinner se alla – ta gärna hjälp av en förälder.</p>}
          {tooFew && <p className="warn">Minst fyra spelare behövs för att bygga ett pass.</p>}
        </Section>

        <Section title="Yta">
          <div className="option-list" role="radiogroup" aria-label="Tillgänglig yta">
            {SPACE_ORDER.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={inp.space === id} className={`option${inp.space === id ? ' is-on' : ''}`} onClick={() => set({ space: id })}>
                <span>{SPACES[id].name}</span>
                <small>
                  ca {SPACES[id].l} × {SPACES[id].w} m
                </small>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Tid">
          <div className="card form-card">
            <Stepper label="Passets längd" hint={`SvFF: ${f.sessionMin[0]}–${f.sessionMin[1]} min för ${formatName(block.format)}`} value={inp.minutes} min={40} max={120} step={5} unit="min" onChange={(v) => set({ minutes: v })} />
          </div>
        </Section>

        <Section title="Extra moment">
          <div className="card form-card">
            <Toggle
              label="Skadeförebyggande uppvärmning"
              hint={canPrehab ? 'Knäkontroll, bål och landning – cirka tio minuter' : 'Från 10 år'}
              checked={inp.options.prehab && canPrehab}
              disabled={!canPrehab}
              onChange={(v) => set({ options: { ...inp.options, prehab: v } })}
            />
            <Toggle
              label="Målvaktsmoment"
              hint={gks === 0 ? 'Kräver minst en målvakt' : gks === 1 && inp.coaches < 2 ? 'En målvakt och en tränare: målvakten får fokuspunkter i övningarna' : 'Egen uppgift parallellt med färdighetsövningen'}
              checked={inp.options.gkMoment && gks > 0}
              disabled={gks === 0}
              onChange={(v) => set({ options: { ...inp.options, gkMoment: v } })}
            />
            <Toggle
              label="Fys utan boll"
              hint={canFys ? 'Löpning, snabbhet eller styrka före matchspelet' : 'Från 15 år – yngre tränar fys med boll'}
              checked={inp.options.fys && canFys}
              disabled={!canFys}
              onChange={(v) => set({ options: { ...inp.options, fys: v } })}
            />
          </div>
        </Section>
      </main>
      <footer className="footer-bar">
        <button type="button" className="btn btn-primary" disabled={tooFew} onClick={create}>
          Bygg passet för {inp.players} spelare
        </button>
      </footer>
    </>
  )
}
