import type { DrillDef } from '../types'
import { ATEREROVRING } from './atererovring'
import { AVSLUT } from './avslut'
import { DRIVA } from './driva'
import { FYS, GK, PREHAB } from './extra'
import { FASTA } from './fasta'
import { FORHINDRAAVSLUT } from './forhindraavslut'
import { FORSVAR1V1 } from './forsvar1v1'
import { INLAGG } from './inlagg'
import { KOMBINATION } from './kombination'
import { KONTRING } from './kontring'
import { MATCHES } from './match'
import { PASSNING } from './passning'
import { PRESS } from './press'
import { SPELBARHET } from './spelbarhet'
import { SPELUPPBYGGNAD } from './speluppbyggnad'
import { WARMUPS } from './warmup'

export const DRILLS: DrillDef[] = [
  ...WARMUPS,
  ...DRIVA,
  ...PASSNING,
  ...SPELBARHET,
  ...SPELUPPBYGGNAD,
  ...AVSLUT,
  ...KOMBINATION,
  ...INLAGG,
  ...KONTRING,
  ...FORSVAR1V1,
  ...PRESS,
  ...ATEREROVRING,
  ...FORHINDRAAVSLUT,
  ...FASTA,
  ...MATCHES,
  ...PREHAB,
  ...FYS,
  ...GK,
]

export const DRILL_BY_ID: Map<string, DrillDef> = new Map(DRILLS.map((d) => [d.id, d]))
