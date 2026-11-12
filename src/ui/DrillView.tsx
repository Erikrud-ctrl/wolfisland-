// Visar en övning med skiss, organisation och instruktioner, anpassad till dagens förutsättningar.

import { fill, intervals } from '../domain/build'
import { EQUIP_LABEL } from '../domain/planner'
import type { DrillDef, EquipId, Setup } from '../domain/types'
import { Pitch } from './Pitch'

export function DrillView({ def, setup, minutes, age, showGk }: { def: DrillDef; setup: Setup; minutes?: number; age: number; showGk?: boolean }) {
  const equip = (Object.entries(setup.equipment) as [EquipId, number][]).map(([k, v]) => `${v} ${EQUIP_LABEL[k].toLowerCase()}`)
  return (
    <div className="drill">
      <Pitch scene={setup.scene} />
      <p className="drill-purpose">{def.purpose}</p>

      <dl className="facts">
        <div>
          <dt>Yta</dt>
          <dd>
            {setup.area.l} × {setup.area.w} m{setup.stations > 1 ? ` · ${setup.stations} st` : ''}
          </dd>
        </div>
        {minutes !== undefined && (
          <div>
            <dt>Tid</dt>
            <dd>{intervals(def, minutes, age)}</dd>
          </div>
        )}
        {equip.length > 0 && (
          <div>
            <dt>Material</dt>
            <dd>{equip.join(', ')}</dd>
          </div>
        )}
      </dl>

      <h4>Lagindelning</h4>
      <ul className="groups">
        {setup.groups.map((g, i) => (
          <li key={i}>
            <b>{g.label}</b>
            <span>{g.text}</span>
          </li>
        ))}
      </ul>

      {setup.notes.length > 0 && (
        <div className="notes">
          <h4>Anpassat efter er i dag</h4>
          <ul>
            {setup.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <h4>Så här gör ni</h4>
      <ol className="steps">
        {def.steps.map((s, i) => (
          <li key={i}>{fill(s, setup)}</li>
        ))}
      </ol>

      <h4>Coacha på</h4>
      <ul className="coaching">
        {def.coaching.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>

      <div className="levels">
        <p>
          <b>Lättare</b>
          {fill(def.easier, setup)}
        </p>
        <p>
          <b>Svårare</b>
          {fill(def.harder, setup)}
        </p>
      </div>

      {showGk && def.gkFocus && (
        <p className="gk-focus">
          <b>Målvakten</b>
          {def.gkFocus}
        </p>
      )}
    </div>
  )
}
