// Grundtyper för träningsplaneraren.

export type Format = '5v5' | '7v7' | '9v9' | '11v11'

/** Åldersband som styr mått, tider och svårighetsgrad. */
export type Band = 0 | 1 | 2 | 3 // 0: t.o.m. 9 år, 1: 10–12, 2: 13–14, 3: 15+

export type SpaceId = 'hel11' | 'halv11' | 'kvart11' | 'plan5' | 'hall'

export type ThemeId =
  | 'driva'
  | 'passning'
  | 'spelbarhet'
  | 'speluppbyggnad'
  | 'avslut'
  | 'kombination'
  | 'inlagg'
  | 'kontring'
  | 'forsvar1v1'
  | 'press'
  | 'atererovring'
  | 'forhindraavslut'
  | 'fasta'

export type Phase = 'warmup' | 'skill' | 'game' | 'match' | 'prehab' | 'gk' | 'fys'

/** Förutsättningarna som fylls i precis innan passet. */
export interface SessionCtx {
  age: number // 19 = senior
  format: Format
  /** Totalt antal spelare på plats, inklusive målvakter. */
  players: number
  goalkeepers: number
  coaches: number
  space: SpaceId
  minutes: number
}

// ---------- Planskiss ----------

export type Team = 'a' | 'b' | 'n' | 'gk' | 'coach'

export interface PlayerItem {
  kind: 'player'
  id: string
  team: Team
  x: number
  y: number
  label?: string
}
export interface BallItem {
  kind: 'ball'
  id: string
  x: number
  y: number
}
export interface ConeItem {
  kind: 'cone'
  id: string
  x: number
  y: number
  color?: 'orange' | 'yellow' | 'blue' | 'red'
}
export interface GoalItem {
  kind: 'goal'
  id: string
  x: number
  y: number
  /** Sidan av ytan som målet står på (öppningen pekar inåt). */
  side: 'l' | 'r' | 't' | 'b'
  size: 'big' | 'small'
  /** Målets bredd i meter. */
  width: number
}
export type Item = PlayerItem | BallItem | ConeItem | GoalItem

export type MoveKind = 'pass' | 'run' | 'dribble' | 'shot'

export interface Move {
  id: string
  to: { x: number; y: number }
  kind: MoveKind
  /** Dolda förflyttningar ritas utan pil (t.ex. boll som följer en dribbling). */
  hidden?: boolean
}
export interface Step {
  /** Längd i sekunder. */
  dur: number
  moves: Move[]
}
export interface Zone {
  x: number
  y: number
  w: number
  h: number
  label?: string
  tone?: 'line' | 'tint' | 'tint2'
}
export interface Scene {
  /** Ytans mått i meter. w ritas längs skärmens bredd. */
  w: number
  h: number
  surface: 'grid' | 'pitch'
  zones: Zone[]
  items: Item[]
  steps: Step[]
}

// ---------- Uppställning (resultatet av skalningen) ----------

export interface GroupLine {
  label: string
  text: string
}

export type EquipId = 'koner' | 'bollar' | 'vastar' | 'smamal' | 'stormal'

export interface Setup {
  /** Antal parallella ytor/stationer. */
  stations: number
  /** Mått per yta i meter. */
  area: { w: number; l: number }
  /** Kort sammanfattning, t.ex. "2 ytor · 4 mot 4 + 1 joker". */
  summary: string
  groups: GroupLine[]
  equipment: Partial<Record<EquipId, number>>
  /** Anpassningar som gjorts efter antal spelare, yta, tränare. */
  notes: string[]
  /** Värden som kan användas i övningstexten: {a} {b} {j} {w} {l} {n}. */
  vars: Record<string, string | number>
  scene: Scene
}

// ---------- Övningar ----------

/** Ett värde per åldersband [≤9, 10–12, 13–14, 15+] eller samma för alla. */
export type ByBand<T> = T | [T, T, T, T]

export type Range3 = [min: number, pref: number, max: number]

export type BuilderSpec =
  | {
      type: 'individual'
      /** m² per spelare. */
      areaPer: ByBand<number>
      layout: 'free' | 'gates' | 'cones'
      /** Antal kullare/jagare per 8 spelare (0 = ingen). */
      taggers?: number
      ballEach?: boolean
    }
  | {
      type: 'pairs'
      dist: ByBand<number>
      mode: 'pass' | 'mirror'
      /** 3 = trianglar i stället för par. */
      size?: 2 | 3
    }
  | {
      type: 'pattern'
      shape: 'square' | 'triangle' | 'line' | 'y' | 'diamond'
      per: Range3
      side: ByBand<number>
      /** Passningen spelas förbi/via mittspelare (väggspel). */
      wall?: boolean
    }
  | {
      type: 'rondo'
      per: Range3
      side: ByBand<number>
    }
  | {
      type: 'duel'
      att: number
      def: number
      goals: 'small' | 'big' | 'line' | 'gates'
      w: ByBand<number>
      l: ByBand<number>
      /** Försvararen kontrar mot småmål i andra änden. */
      counter?: boolean
      /** Försvararen startar bredvid/bakom (jaktsituation). */
      chase?: boolean
    }
  | {
      type: 'possession'
      team: Range3
      jokers: 0 | 1 | 2 | 'auto'
      areaPer: ByBand<number>
      target: 'none' | 'endzones' | 'targets' | 'gates' | 'thirds'
    }
  | {
      type: 'ssg'
      team: Range3
      goals: 'small' | 'big' | 'four' | 'auto'
      areaPer: ByBand<number>
      zones?: 'none' | 'halves' | 'thirds' | 'wide' | 'endzones'
      jokers?: 0 | 'auto'
    }
  | {
      type: 'finishing'
      variant: 'straight' | 'wall' | 'cross' | 'turn' | 'gk1v1' | 'cutback'
      per: Range3
    }
  | {
      type: 'phase'
      /** Andel av spelarna som anfaller (resten försvarar). */
      attShare: number
      zone: 'build' | 'final' | 'mid'
      minPlayers: number
    }
  | { type: 'match' }
  | {
      type: 'setpiece'
      variant: 'corner' | 'freekick' | 'throwin' | 'goalkick'
      minPlayers: number
    }
  | {
      type: 'circuit'
      stations: string[]
      per: Range3
    }
  | {
      type: 'relay'
      per: Range3
      len: ByBand<number>
      mode: 'dribble' | 'run' | 'slalom'
    }
  | {
      type: 'gk'
      variant: 'handling' | 'diving' | 'distribution' | 'reaction' | 'crosses'
    }

export interface DrillDef {
  id: string
  name: string
  phase: Phase
  /** Teman övningen passar för. Tom lista = generell. */
  themes: ThemeId[]
  /** Åldersspann, inklusive. 19 = senior. */
  age: [number, number]
  /** Steg i blockets progression: 1 grund, 2 under press, 3 matchlikt. */
  level: 1 | 2 | 3
  build: BuilderSpec
  purpose: string
  steps: string[]
  coaching: string[]
  easier: string
  harder: string
  /** Vad målvakten ska tänka på om hen deltar. */
  gkFocus?: string
  /** Rekommenderad arbetstid och vila per omgång i minuter. */
  bout?: [work: number, rest: number]
  /** Sant om övningen behöver målvakt i stort mål för att fungera bäst. */
  usesGk?: boolean
}
