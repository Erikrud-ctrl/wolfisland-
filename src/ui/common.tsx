import { useEffect, useState, type ReactNode } from 'react'

// ---------- Enkel hash-router så att telefonens bakåtknapp fungerar ----------

export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [parts, setParts] = useState<string[]>(read)
  useEffect(() => {
    const on = () => {
      setParts(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parts
}

export function go(path: string, replace = false): void {
  const target = '#/' + path.replace(/^\//, '')
  if (replace) window.location.replace(target)
  else window.location.hash = target
}

export function back(fallback = ''): void {
  if (window.history.length > 1) window.history.back()
  else go(fallback)
}

// ---------- Byggstenar ----------

export function TopBar({ title, sub, backTo, right }: { title: string; sub?: string; backTo?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      {backTo !== undefined ? (
        <button type="button" className="icon-btn" onClick={() => go(backTo)} aria-label="Tillbaka">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <img className="crest" src={`${import.meta.env.BASE_URL}crest.png`} alt="Wargöns IK" width={40} height={40} />
      )}
      <div className="topbar-text">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </header>
  )
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="stepper">
      <div className="stepper-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="stepper-ctl">
        <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Minska ${label.toLowerCase()}`}>
          −
        </button>
        <output aria-live="polite">
          {value}
          {unit && <small> {unit}</small>}
        </output>
        <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Öka ${label.toLowerCase()}`}>
          +
        </button>
      </div>
    </div>
  )
}

export function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`toggle${disabled ? ' is-disabled' : ''}`}>
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function Pill({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'green' | 'yellow' | 'muted' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
