// Passet: översikt, genomförande med tidtagning och utvärdering.

import { useEffect, useMemo, useRef, useState } from 'react'
import { SPACES } from '../domain/alloc'
import { LEVEL_LABEL, SLOT_LABEL, builtGk, builtSlots, equipmentList, swapSlot, type Session } from '../domain/planner'
import { THEME_BY_ID } from '../domain/themes'
import { DRILL_BY_ID } from '../domain/drills'
import type { Block, Store } from '../store'
import { Pill, Section, TopBar, fmtClock, go } from './common'
import { DrillView } from './DrillView'

function ctxLine(s: Session): string {
  const c = s.ctx
  const parts = [`${c.players} spelare`]
  if (c.goalkeepers) parts.push(`${c.goalkeepers} ${c.goalkeepers === 1 ? 'målvakt' : 'målvakter'}`)
  parts.push(`${c.coaches} ${c.coaches === 1 ? 'tränare' : 'tränare'}`, `${c.minutes} min`, SPACES[c.space].name)
  return parts.join(' · ')
}

// ---------- Översikt ----------

export function SessionView({ store, block, index }: { store: Store; block: Block; index: number }) {
  const stored = block.sessions[index]
  const session = stored.session as Session
  const theme = THEME_BY_ID[block.theme]
  const built = useMemo(() => builtSlots(session), [session])
  const gk = useMemo(() => builtGk(session), [session])
  const equip = useMemo(() => equipmentList(session), [session])
  const [open, setOpen] = useState<number | 'gk' | null>(null)
  let clock = 0

  const swap = (i: number) => {
    const slot = session.slots[i]
    const level = slot.slot === 'game2' ? Math.min(3, stored.plan.level + 1) : stored.plan.level
    store.updateSession(block.id, index, swapSlot(session, i, block.theme, level, `${block.id}-${index}`))
  }

  return (
    <>
      <TopBar title={theme.name} sub={`Pass ${index + 1} av ${block.sessions.length} · ${LEVEL_LABEL[stored.plan.level]}`} backTo={`block/${block.id}`} />
      <main className="has-footer">
        <div className="card summary-card">
          <p className="ctx">{ctxLine(session)}</p>
          {!stored.done && (
            <button type="button" className="link" onClick={() => go(`block/${block.id}/${index}/infor`)}>
              Ändra förutsättningar
            </button>
          )}
          <p className="look">
            <b>Titta extra efter i dag</b>
            {theme.lookFor[stored.plan.level - 1]}
          </p>
        </div>

        <Section title="Material">
          <ul className="equip">
            {equip.map((e) => (
              <li key={e.id}>
                <b>{e.count}</b>
                {e.label.toLowerCase()}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Passet" aside={<span className="muted">{session.pauses} min för samlingar och vätska</span>}>
          <ol className="slots">
            {built.map((b, i) => {
              const from = clock
              clock += b.slot.minutes
              const isOpen = open === i
              const swappedName = b.slot.swappedFrom ? DRILL_BY_ID.get(b.slot.swappedFrom)?.name : null
              return (
                <li key={b.slot.slot} className={`card slot${isOpen ? ' is-open' : ''}`}>
                  <button type="button" className="slot-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                    <span className="slot-time">
                      <b>{b.slot.minutes}</b>
                      <small>min</small>
                    </span>
                    <span className="slot-main">
                      <small>
                        {SLOT_LABEL[b.slot.slot]} · från {from} min
                      </small>
                      <b>{b.def.name}</b>
                      <span>{b.setup.summary}</span>
                    </span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="chev">
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {swappedName && <p className="swap-note">Bytt från ”{swappedName}” som inte går att genomföra med dagens förutsättningar.</p>}
                  {isOpen && (
                    <div className="slot-body">
                      <DrillView def={b.def} setup={b.setup} minutes={b.slot.minutes} age={session.ctx.age} showGk={session.ctx.goalkeepers > 0} />
                      {!stored.done && b.slot.slot !== 'prehab' && (
                        <button type="button" className="btn btn-ghost" onClick={() => swap(i)}>
                          Byt övning
                        </button>
                      )}
                    </div>
                  )}
                  {b.slot.slot === 'skill' && gk && (
                    <div className={`gk-card${open === 'gk' ? ' is-open' : ''}`}>
                      <button type="button" className="slot-head" aria-expanded={open === 'gk'} onClick={() => setOpen(open === 'gk' ? null : 'gk')}>
                        <span className="slot-time gk">
                          <b>MV</b>
                        </span>
                        <span className="slot-main">
                          <small>Samtidigt – målvakterna</small>
                          <b>{gk.def.name}</b>
                          <span>{gk.setup.summary}</span>
                        </span>
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="chev">
                          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {open === 'gk' && (
                        <div className="slot-body">
                          <DrillView def={gk.def} setup={gk.setup} minutes={b.slot.minutes} age={session.ctx.age} />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </Section>

        <div className="card ask-card">
          <Pill tone="yellow">Samling efter passet</Pill>
          <p>{theme.question}</p>
        </div>
      </main>
      <footer className="footer-bar">
        {stored.done ? (
          <button type="button" className="btn btn-ghost" onClick={() => go(`block/${block.id}`)}>
            Passet är genomfört – tillbaka till blocket
          </button>
        ) : (
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => go(`block/${block.id}/${index}/kor`)}>
              Starta passet
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => go(`block/${block.id}/${index}/klart`)}>
              Klart
            </button>
          </div>
        )}
      </footer>
    </>
  )
}

// ---------- Genomförande med tidtagning ----------

function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ac = new Ctx()
    ;[0, 0.35, 0.7].forEach((t) => {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.frequency.value = 880
      o.connect(g)
      g.connect(ac.destination)
      g.gain.setValueAtTime(0.0001, ac.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.25)
      o.start(ac.currentTime + t)
      o.stop(ac.currentTime + t + 0.3)
    })
    setTimeout(() => void ac.close(), 1500)
  } catch {
    // Ljud är en bonus – tidtagningen fungerar utan.
  }
  try {
    navigator.vibrate?.([300, 150, 300])
  } catch {
    // Vibration saknas på vissa enheter.
  }
}

export function RunView({ block, index }: { block: Block; index: number }) {
  const stored = block.sessions[index]
  const session = stored.session as Session
  const built = useMemo(() => builtSlots(session), [session])
  const gk = useMemo(() => builtGk(session), [session])
  const [i, setI] = useState(0)
  const cur = built[Math.min(i, built.length - 1)]
  const [left, setLeft] = useState(cur.slot.minutes * 60)
  const [running, setRunning] = useState(false)
  const endAt = useRef(0)
  const fired = useRef(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const s = (endAt.current - Date.now()) / 1000
      setLeft(s)
      if (s <= 0 && !fired.current) {
        fired.current = true
        beep()
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running])

  // Håll skärmen tänd medan klockan går.
  useEffect(() => {
    if (!running) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const req = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
        if (cancelled) void lock?.release()
      } catch {
        // Skärmlås stöds inte överallt.
      }
    }
    void req()
    const onVis = () => {
      if (document.visibilityState === 'visible') void req()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [running])

  const start = () => {
    endAt.current = Date.now() + left * 1000
    fired.current = left <= 0
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const jump = (n: number) => {
    const next = Math.max(0, Math.min(built.length - 1, n))
    setI(next)
    setRunning(false)
    setLeft(built[next].slot.minutes * 60)
    fired.current = false
    setShowAll(false)
    window.scrollTo(0, 0)
  }
  const add = (sec: number) => {
    endAt.current += sec * 1000
    setLeft((v) => Math.max(0, v) + sec)
    if (left + sec > 0) fired.current = false
  }

  const over = left <= 0
  const last = i >= built.length - 1
  const total = cur.slot.minutes * 60
  const pct = Math.max(0, Math.min(100, (1 - left / total) * 100))

  return (
    <div className="run">
      <header className="run-top">
        <button type="button" className="icon-btn" onClick={() => go(`block/${block.id}/${index}`)} aria-label="Tillbaka till passet">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="run-steps" aria-label={`Moment ${i + 1} av ${built.length}`}>
          {built.map((b, k) => (
            <span key={b.slot.slot} className={k < i ? 'is-done' : k === i ? 'is-cur' : ''} style={{ flexGrow: b.slot.minutes }} />
          ))}
        </div>
      </header>
      <main className="has-footer">
        <p className="run-label">
          {SLOT_LABEL[cur.slot.slot]} · {i + 1} av {built.length}
        </p>
        <h1 className="run-name">{cur.def.name}</h1>
        <div className={`clock${over ? ' is-over' : ''}`} role="timer" aria-live="off">
          <span>{over ? 'Tiden är ute' : fmtClock(left)}</span>
          <div className="clock-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="row clock-ctl">
          <button type="button" className="btn btn-primary" onClick={running ? pause : start} disabled={over && !running}>
            {running ? 'Pausa' : left < total ? 'Fortsätt' : 'Starta klockan'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => add(60)}>
            + 1 min
          </button>
        </div>

        <div className="card run-info">
          <p className="run-summary">{cur.setup.summary}</p>
          {cur.setup.groups.length > 1 && (
            <ul className="groups">
              {cur.setup.groups.map((g, k) => (
                <li key={k}>
                  <b>{g.label}</b>
                  <span>{g.text}</span>
                </li>
              ))}
            </ul>
          )}
          <h4>Coacha på</h4>
          <ul className="coaching">
            {cur.def.coaching.map((c, k) => (
              <li key={k}>{c}</li>
            ))}
          </ul>
          {cur.slot.slot === 'skill' && gk && (
            <p className="gk-focus">
              <b>Målvakterna samtidigt</b>
              {gk.def.name}: {gk.def.steps[0]}
            </p>
          )}
        </div>

        {showAll ? (
          <div className="card slot-body">
            <DrillView def={cur.def} setup={cur.setup} minutes={cur.slot.minutes} age={session.ctx.age} showGk={session.ctx.goalkeepers > 0} />
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-wide" onClick={() => setShowAll(true)}>
            Visa skiss och instruktioner
          </button>
        )}
      </main>
      <footer className="footer-bar">
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => jump(i - 1)} disabled={i === 0}>
            Föregående
          </button>
          {last ? (
            <button type="button" className="btn btn-primary" onClick={() => go(`block/${block.id}/${index}/klart`)}>
              Avsluta passet
            </button>
          ) : (
            <button type="button" className={`btn ${over ? 'btn-primary' : 'btn-ghost'}`} onClick={() => jump(i + 1)}>
              Nästa: {SLOT_LABEL[built[i + 1].slot.slot]}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

// ---------- Utvärdering ----------

const RATING_TEXT = ['', 'Fungerade inte', 'Trögt', 'Okej', 'Bra', 'Riktigt bra']

export function ReviewView({ store, block, index }: { store: Store; block: Block; index: number }) {
  const stored = block.sessions[index]
  const theme = THEME_BY_ID[block.theme]
  const [rating, setRating] = useState(stored.done?.rating ?? 4)
  const [note, setNote] = useState(stored.done?.note ?? '')
  const isLast = block.sessions.every((s, i) => i === index || s.done)
  return (
    <>
      <TopBar title="Efter passet" sub={`${theme.name} · pass ${index + 1} av ${block.sessions.length}`} backTo={`block/${block.id}/${index}`} />
      <main className="has-footer">
        <div className="card ask-card">
          <Pill tone="yellow">Fråga spelarna</Pill>
          <p>{theme.question}</p>
        </div>
        <Section title="Hur gick passet?">
          <div className="rating" role="radiogroup" aria-label="Betyg">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} av 5`} className={n <= rating ? 'is-on' : ''} onClick={() => setRating(n)}>
                ★
              </button>
            ))}
          </div>
          <p className="muted center">{RATING_TEXT[rating]}</p>
        </Section>
        <Section title="Anteckning">
          <textarea className="text-input" rows={5} value={note} maxLength={600} placeholder="Vad fungerade? Vad tar vi med oss till nästa pass?" onChange={(e) => setNote(e.target.value)} aria-label="Anteckning efter passet" />
          <p className="hint">Syntes temat i spelet? Titta extra efter: {theme.lookFor[stored.plan.level - 1].toLowerCase()}.</p>
        </Section>
      </main>
      <footer className="footer-bar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            store.finishSession(block.id, index, { at: new Date().toISOString(), rating, note: note.trim() })
            go(isLast ? '' : `block/${block.id}`, true)
          }}
        >
          {isLast ? 'Spara och avsluta blocket' : 'Spara passet'}
        </button>
      </footer>
    </>
  )
}
