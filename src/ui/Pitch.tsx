// Ritad och animerad planskiss.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item, MoveKind, Scene, Team } from '../domain/types'

interface Pt {
  x: number
  y: number
}

interface TMove {
  id: string
  from: Pt
  to: Pt
  kind: MoveKind
  hidden: boolean
}

interface TStep {
  t0: number
  dur: number
  moves: TMove[]
}

const END_PAUSE = 1.3

function timeline(scene: Scene): { steps: TStep[]; total: number; start: Map<string, Pt> } {
  const start = new Map<string, Pt>()
  for (const it of scene.items) start.set(it.id, { x: it.x, y: it.y })
  const cur = new Map<string, Pt>(start)
  const steps: TStep[] = []
  let t = 0.6
  for (const s of scene.steps) {
    const moves: TMove[] = []
    for (const m of s.moves) {
      const from = cur.get(m.id)
      if (!from) continue
      moves.push({ id: m.id, from: { ...from }, to: { ...m.to }, kind: m.kind, hidden: !!m.hidden })
    }
    for (const m of moves) cur.set(m.id, m.to)
    steps.push({ t0: t, dur: s.dur, moves })
    t += s.dur
  }
  return { steps, total: t + END_PAUSE, start }
}

const TEAM_FILL: Record<Team, string> = { a: '#ffd60a', b: '#1d4ed8', n: '#ffffff', gk: '#e11d74', coach: '#16181d' }
const TEAM_STROKE: Record<Team, string> = { a: '#4a3b00', b: '#ffffff', n: '#2b2f36', gk: '#ffffff', coach: '#ffffff' }
const TEAM_NAME: Record<Team, string> = { a: 'Lag utan väst', b: 'Lag med väst', n: 'Joker', gk: 'Målvakt', coach: 'Tränare' }
const CONE_FILL = { orange: '#ff7a1a', yellow: '#ffe45c', blue: '#7dd3fc', red: '#ef4444' }

function wavy(from: Pt, to: Pt, amp: number): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 0.01) return ''
  const nx = -dy / len
  const ny = dx / len
  const waves = Math.max(2, Math.round(len / (amp * 5)))
  const n = waves * 8
  let d = `M${from.x.toFixed(2)} ${from.y.toFixed(2)}`
  for (let i = 1; i <= n; i++) {
    const t = i / n
    // Tona ut vågen mot slutet så att pilspetsen pekar rätt.
    const a = Math.sin(t * waves * Math.PI * 2) * amp * Math.min(1, (1 - t) * 6)
    d += ` L${(from.x + dx * t + nx * a).toFixed(2)} ${(from.y + dy * t + ny * a).toFixed(2)}`
  }
  return d
}

function shorten(from: Pt, to: Pt, by: number): Pt {
  const len = Math.hypot(to.x - from.x, to.y - from.y)
  if (len <= by * 1.5) return to
  const f = (len - by) / len
  return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }
}

function ItemShape({ it, r }: { it: Item; r: number }) {
  switch (it.kind) {
    case 'player':
      return (
        <>
          <circle r={r} fill={TEAM_FILL[it.team]} stroke={TEAM_STROKE[it.team]} strokeWidth={r * 0.2} />
          {(it.label || it.team === 'coach') && (
            <text y={r * 0.38} textAnchor="middle" fontSize={r * 1.15} fontWeight={700} fill={it.team === 'a' || it.team === 'n' ? '#16181d' : '#fff'}>
              {it.label ?? 'T'}
            </text>
          )}
        </>
      )
    case 'ball':
      return <circle r={r * 0.48} fill="#fff" stroke="#16181d" strokeWidth={r * 0.2} />
    case 'cone': {
      const s = r * 0.62
      return <path d={`M0 ${-s} L${s} ${s * 0.8} L${-s} ${s * 0.8} Z`} fill={CONE_FILL[it.color ?? 'orange']} stroke="rgba(0,0,0,.45)" strokeWidth={r * 0.1} />
    }
    case 'goal': {
      const depth = it.size === 'big' ? r * 1.5 : r * 1.05
      const half = it.width / 2
      const col = it.size === 'big' ? '#ffffff' : '#ffe45c'
      const sw = r * 0.24
      let x = 0
      let y = 0
      let w = 0
      let h = 0
      if (it.side === 'l') [x, y, w, h] = [-depth, -half, depth, it.width]
      else if (it.side === 'r') [x, y, w, h] = [0, -half, depth, it.width]
      else if (it.side === 't') [x, y, w, h] = [-half, -depth, it.width, depth]
      else [x, y, w, h] = [-half, 0, it.width, depth]
      return <rect x={x} y={y} width={w} height={h} fill="rgba(255,255,255,.28)" stroke={col} strokeWidth={sw} />
    }
  }
}

export function Pitch({ scene, autoPlay = true }: { scene: Scene; autoPlay?: boolean }) {
  const tl = useMemo(() => timeline(scene), [scene])
  const hasAnim = tl.steps.some((s) => s.moves.length > 0)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])
  const [playing, setPlaying] = useState(autoPlay && !reduced && hasAnim)
  const [visible, setVisible] = useState(true)
  const wrap = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, SVGGElement>())
  const stepNodes = useRef<(SVGGElement | null)[]>([])

  const r = Math.min(2.6, Math.max(0.55, Math.max(scene.w, scene.h * 1.2) / 40))
  const pad = r * 2.4
  const sw = r * 0.2

  useEffect(() => {
    setPlaying(autoPlay && !reduced && hasAnim)
  }, [scene, autoPlay, reduced, hasAnim])

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const place = (id: string, p: Pt) => nodes.current.get(id)?.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`)
    const reset = () => {
      for (const [id, p] of tl.start) place(id, p)
    }
    if (!playing || !visible) {
      if (!playing) {
        reset()
        stepNodes.current.forEach((g) => g?.setAttribute('opacity', '0.85'))
      }
      return
    }
    let raf = 0
    const t0 = performance.now()
    const frame = (now: number) => {
      const t = ((now - t0) / 1000) % tl.total
      const pos = new Map<string, Pt>(tl.start)
      tl.steps.forEach((s, i) => {
        const active = t >= s.t0 && t < s.t0 + s.dur
        stepNodes.current[i]?.setAttribute('opacity', active ? '1' : '0')
        if (t < s.t0) return
        const raw = Math.min(1, (t - s.t0) / s.dur)
        for (const m of s.moves) {
          const p = m.kind === 'pass' || m.kind === 'shot' ? raw : raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
          pos.set(m.id, { x: m.from.x + (m.to.x - m.from.x) * p, y: m.from.y + (m.to.y - m.from.y) * p })
        }
      })
      for (const [id, p] of pos) place(id, p)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, visible, tl])

  const teams = useMemo(() => {
    const set = new Set<Team>()
    for (const it of scene.items) if (it.kind === 'player') set.add(it.team)
    return (['a', 'b', 'n', 'gk', 'coach'] as Team[]).filter((t) => set.has(t))
  }, [scene])
  const kinds = useMemo(() => {
    const set = new Set<MoveKind>()
    for (const s of scene.steps) for (const m of s.moves) if (!m.hidden) set.add(m.kind)
    return (['pass', 'dribble', 'run', 'shot'] as MoveKind[]).filter((k) => set.has(k))
  }, [scene])

  const vbW = scene.w + pad * 2
  const vbH = scene.h + pad * 2
  const uid = useMemo(() => 'm' + Math.random().toString(36).slice(2, 8), [])
  const stripes = Math.max(4, Math.round(vbW / (r * 7)))
  const moving = useMemo(() => new Set(tl.steps.flatMap((s) => s.moves.map((m) => m.id))), [tl])
  // Rita i ordning: mål och koner underst, sedan spelare, bollar överst.
  const order = (it: Item) => (it.kind === 'goal' ? 0 : it.kind === 'cone' ? 1 : it.kind === 'player' ? 2 : 3)
  const items = [...scene.items].sort((a, b) => order(a) - order(b))

  return (
    <div className="pitch" ref={wrap}>
      <div className="pitch-frame" style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        <svg viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`} role="img" aria-label="Planskiss över övningen" className={playing ? 'is-playing' : 'is-static'}>
          <defs>
            {(['pass', 'run', 'dribble', 'shot'] as MoveKind[]).map((k) => (
              <marker key={k} id={`${uid}-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth={k === 'shot' ? 4.2 : 5} markerHeight={k === 'shot' ? 4.2 : 5} orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill={k === 'shot' ? '#ffe45c' : '#fff'} />
              </marker>
            ))}
          </defs>
          <rect x={-pad} y={-pad} width={vbW} height={vbH} fill="#2e9457" />
          {Array.from({ length: stripes }, (_, i) =>
            i % 2 ? null : <rect key={i} x={-pad + (vbW * i) / stripes} y={-pad} width={vbW / stripes} height={vbH} fill="#34a361" />,
          )}
          {scene.surface === 'pitch' && <rect x={0} y={0} width={scene.w} height={scene.h} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth={sw} />}
          {scene.zones.map((z, i) =>
            z.w < 0.1 ? (
              <g key={i}>
                <line x1={z.x} y1={z.y} x2={z.x} y2={z.y + z.h} stroke="rgba(255,255,255,.85)" strokeWidth={sw} strokeDasharray={z.tone === 'tint' ? `${r} ${r * 0.8}` : undefined} />
                {z.label && (
                  <text x={z.x + r * 0.5} y={z.y + r * 1.5} fontSize={r * 1.05} fill="rgba(255,255,255,.92)" fontWeight={600}>
                    {z.label}
                  </text>
                )}
              </g>
            ) : (
              <g key={i}>
                <rect
                  x={z.x}
                  y={z.y}
                  width={z.w}
                  height={z.h}
                  fill={z.tone === 'tint' ? 'rgba(255,255,255,.16)' : z.tone === 'tint2' ? 'rgba(0,0,0,.12)' : 'none'}
                  stroke="rgba(255,255,255,.8)"
                  strokeWidth={sw * (z.tone === 'line' ? 1 : 0.7)}
                  strokeDasharray={z.tone === 'line' ? undefined : `${r} ${r * 0.8}`}
                />
                {z.label && (
                  <text x={z.x + z.w / 2} y={z.y + r * 1.5} textAnchor="middle" fontSize={r * 1.05} fill="rgba(255,255,255,.92)" fontWeight={600}>
                    {z.label}
                  </text>
                )}
              </g>
            ),
          )}
          {tl.steps.map((s, i) => (
            <g
              key={i}
              ref={(el) => {
                stepNodes.current[i] = el
              }}
              opacity={0.85}
              className="step"
            >
              {s.moves
                .filter((m) => !m.hidden)
                .map((m, j) => {
                  const end = shorten(m.from, m.to, r * (m.kind === 'pass' || m.kind === 'shot' ? 0.9 : 0.5))
                  const common = { fill: 'none', markerEnd: `url(#${uid}-${m.kind})`, strokeLinecap: 'round' as const }
                  if (m.kind === 'dribble') return <path key={j} className="mv mv-dribble" d={wavy(m.from, end, r * 0.42)} stroke="#fff" strokeWidth={sw * 1.05} {...common} />
                  const d = `M${m.from.x.toFixed(2)} ${m.from.y.toFixed(2)} L${end.x.toFixed(2)} ${end.y.toFixed(2)}`
                  if (m.kind === 'run') return <path key={j} className="mv mv-run" d={d} stroke="rgba(255,255,255,.9)" strokeWidth={sw} strokeDasharray={`${r * 0.7} ${r * 0.6}`} {...common} />
                  if (m.kind === 'shot') return <path key={j} className="mv mv-shot" d={d} stroke="#ffe45c" strokeWidth={sw * 1.9} {...common} />
                  return <path key={j} className="mv mv-pass" d={d} stroke="#fff" strokeWidth={sw * 1.15} {...common} />
                })}
            </g>
          ))}
          {items.map((it) => (
            <g
              key={it.id}
              ref={(el) => {
                if (el && moving.has(it.id)) nodes.current.set(it.id, el)
              }}
              transform={`translate(${it.x} ${it.y})`}
            >
              <ItemShape it={it} r={r} />
            </g>
          ))}
        </svg>
      </div>
      <div className="pitch-foot">
      <ul className="legend">
        {teams.map((t) => (
          <li key={t}>
            <span className="dot" style={{ background: TEAM_FILL[t], borderColor: t === 'a' || t === 'n' ? '#2b2f36' : TEAM_FILL[t] }} />
            {TEAM_NAME[t]}
          </li>
        ))}
        {kinds.map((k) => (
          <li key={k}>
            <span className={`line line-${k}`} />
            {k === 'pass' ? 'Passning' : k === 'run' ? 'Löpning' : k === 'dribble' ? 'Drivning' : 'Avslut'}
          </li>
        ))}
      </ul>
        {hasAnim && (
          <button type="button" className="pitch-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausa animationen' : 'Spela upp animationen'}>
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
