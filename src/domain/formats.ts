// SvFF:s nationella spelformer (Spelregler för barn- och ungdomsfotboll samt Planstorlekar, 2025).

import type { Format } from './types'

export interface FormatInfo {
  id: Format
  /** Spelare per lag inklusive målvakt. */
  size: number
  ages: string
  /** Planmått i meter som används för att skala matchspel. */
  pitch: { w: number; l: number }
  pitchText: string
  goalW: number
  goalText: string
  ball: string
  matchTime: string
  offside: boolean
  retreat: false | 'mid' | '7m'
  /** SvFF:s rekommenderade passlängd. */
  sessionMin: [number, number]
  defaultMinutes: number
  /** Spelare per ledare enligt SvFF. */
  perCoach: number
  facts: string[]
}

export const FORMATS: Record<Format, FormatInfo> = {
  '5v5': {
    id: '5v5',
    size: 5,
    ages: '8–9 år',
    pitch: { w: 20, l: 30 },
    pitchText: '30 × 15–20 m',
    goalW: 3,
    goalText: '3 × 1,5 m',
    ball: 'Storlek 3',
    matchTime: '3 × 10 eller 3 × 15 min',
    offside: false,
    retreat: 'mid',
    sessionMin: [60, 75],
    defaultMinutes: 60,
    perCoach: 8,
    facts: [
      'Retreatlinje vid mittlinjen när målvakten sätter igång spelet.',
      'Målvakten rullar, kastar eller passar ut bollen – ingen utspark.',
      'Ingen offside. Fria, flygande byten.',
      'Ligger ett lag under med fyra mål får det sätta in en extra spelare.',
    ],
  },
  '7v7': {
    id: '7v7',
    size: 7,
    ages: '10–12 år',
    pitch: { w: 30, l: 50 },
    pitchText: '50–55 × 30–35 m',
    goalW: 5,
    goalText: '5 × 2 m',
    ball: 'Storlek 4',
    matchTime: '3 × 20 min',
    offside: false,
    retreat: '7m',
    sessionMin: [60, 90],
    defaultMinutes: 75,
    perCoach: 10,
    facts: [
      'Retreatlinje 7 meter från mittlinjen när målvakten sätter igång spelet.',
      'Målvakten får inte göra utspark – rulla, kasta eller passa.',
      'Ingen offside. Inkast, hörna och straff införs.',
      'Ligger ett lag under med fyra mål får det sätta in en extra spelare.',
    ],
  },
  '9v9': {
    id: '9v9',
    size: 9,
    ages: '13–14 år',
    pitch: { w: 50, l: 68 },
    pitchText: '65–72 × 50–55 m',
    goalW: 6,
    goalText: '6 × 2,2 m',
    ball: 'Storlek 4 (13 år), 5 (14 år)',
    matchTime: '3 × 25 min',
    offside: true,
    retreat: false,
    sessionMin: [60, 90],
    defaultMinutes: 90,
    perCoach: 10,
    facts: ['Offside införs.', 'Inspark i stället för målvaktsutkast.', 'Roller och spelytor introduceras.'],
  },
  '11v11': {
    id: '11v11',
    size: 11,
    ages: '15 år – senior',
    pitch: { w: 65, l: 105 },
    pitchText: '100–110 × 60–68 m',
    goalW: 7.32,
    goalText: '7,32 × 2,44 m',
    ball: 'Storlek 5',
    matchTime: '2 × 40 min (15 år) till 2 × 45 min',
    offside: true,
    retreat: false,
    sessionMin: [60, 90],
    defaultMinutes: 90,
    perCoach: 10,
    facts: ['Spelregler för fotboll gäller fullt ut.', 'Korridorer, guldzon och assistzon används som begrepp.'],
  },
}

export const FORMAT_LIST: Format[] = ['5v5', '7v7', '9v9', '11v11']

export const SENIOR_AGE = 19

/** Spelform enligt SvFF för en given ålder. */
export function formatForAge(age: number): Format {
  if (age <= 9) return '5v5'
  if (age <= 12) return '7v7'
  if (age <= 14) return '9v9'
  return '11v11'
}

export function ageLabel(age: number): string {
  return age >= SENIOR_AGE ? 'Senior' : `${age} år`
}

export const AGES: number[] = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
