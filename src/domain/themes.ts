// Teman för träningsblock. Begreppen följer SvFF:s spelarutbildningsplan (spelets skeden och möjligheter i spelet).

import type { Format, ThemeId } from './types'

export interface ThemeInfo {
  id: ThemeId
  name: string
  group: 'Anfallsspel' | 'Försvarsspel' | 'Omställning' | 'Fasta situationer'
  short: string
  /** Vad blocket fokuserar på i respektive spelform. Saknas spelformen passar temat inte där. */
  focus: Partial<Record<Format, string>>
  /** Vad tränaren tittar extra efter – en punkt per steg i blocket (grund, under press, matchlikt). */
  lookFor: [string, string, string]
  /** Fråga att ställa till spelarna i samlingen efter passet. */
  question: string
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'driva',
    name: 'Driva, vända och utmana',
    group: 'Anfallsspel',
    short: 'Bollkontroll och 1 mot 1 i anfall',
    focus: {
      '5v5': 'Driva mot fri yta, vända bort från motståndare och våga utmana med fint och dribbling.',
      '7v7': 'Driva, vända och utmana 1 mot 1 – välja när jag ska utmana och när jag ska passa.',
      '9v9': 'Utmana rättvänd i fart, ta med bollen i första tillslaget och skapa övertag.',
      '11v11': 'Vinna 1 mot 1 i sista tredjedelen och driva för att binda upp försvarare.',
    },
    lookFor: ['Bollen nära foten och blicken uppe', 'Tempoväxling efter finten', 'Utmanar i rätt läge – annars passning'],
    question: 'När är det läge att utmana och när är det bättre att passa?',
  },
  {
    id: 'passning',
    name: 'Passa och ta emot',
    group: 'Anfallsspel',
    short: 'Passningsspel, mottagning och att bli rättvänd',
    focus: {
      '5v5': 'Passa efter marken till en medspelare och ta emot bollen så att den hamnar där jag vill.',
      '7v7': 'Passa och ta emot så att jag blir rättvänd – första tillslaget tar mig mot fri yta.',
      '9v9': 'Passningsspel i högt tempo: passningens fart, rätt fot och mottagning bort från press.',
      '11v11': 'Passningsspel genom och förbi lagdelar, korta och långa passningar med rätt tyngd.',
    },
    lookFor: ['Fast passning efter marken med insidan', 'Mottagning bort från motståndaren', 'Titta upp före bollen kommer'],
    question: 'Vad kan du göra innan du får bollen för att nästa passning ska bli lättare?',
  },
  {
    id: 'spelbarhet',
    name: 'Spelbarhet',
    group: 'Anfallsspel',
    short: 'Spelbar, spelavstånd, spelbredd och speldjup',
    focus: {
      '5v5': 'Visa dig för laget – flytta dig så att bollhållaren kan passa till dig.',
      '7v7': 'Grundförutsättningarna: vara spelbar och skapa spelavstånd, spelbredd och speldjup.',
      '9v9': 'Spelbarhet i alla spelytor – framför, mellan och bakom motståndarnas lagdelar.',
      '11v11': 'Spelbarhet i alla spelytor och korridorer, med motrörelser och avledande rörelser.',
    },
    lookFor: ['Rör sig ur passningsskugga', 'Bredd och djup när vi har bollen', 'Spelbar i ytan mellan motståndare'],
    question: 'Hur vet du att du är spelbar?',
  },
  {
    id: 'speluppbyggnad',
    name: 'Speluppbyggnad',
    group: 'Anfallsspel',
    short: 'Bygga anfall från målvakt och backlinje',
    focus: {
      '7v7': 'Sätta igång spelet från målvakten bakom retreatlinjen och spela sig förbi första lagdelen.',
      '9v9': 'Spela genom lagdelarna och flytta upp laget när bollen flyttas framåt.',
      '11v11': 'Spel i vinklar genom korridorerna – spela genom, utanför, över eller vända spelet.',
    },
    lookFor: ['Backarna gör planen stor', 'Spelar framåt när det går, annars vänder spelet', 'Hela laget flyttar upp'],
    question: 'Vilka sätt finns det att ta sig förbi en lagdel?',
  },
  {
    id: 'avslut',
    name: 'Komma till avslut och göra mål',
    group: 'Anfallsspel',
    short: 'Skott, avslut i straffområdet och returer',
    focus: {
      '5v5': 'Skjuta ofta och från nära håll – våga avsluta med båda fötterna.',
      '7v7': 'De flesta avsluten i straffområdet: ta sig in framför mål och avsluta snabbt.',
      '9v9': 'Avslut i straffområdet och spelare som går på retur.',
      '11v11': 'Från assistzon till guldzon: löpningar i straffområdet och fyllda ytor framför mål.',
    },
    lookFor: ['Avslutar på få tillslag', 'Placerar skottet lågt', 'Någon går alltid på retur'],
    question: 'Varifrån görs de flesta målen – och hur tar vi oss dit?',
  },
  {
    id: 'kombination',
    name: 'Väggspel och djupledsspel',
    group: 'Anfallsspel',
    short: 'Väggspel, överlappning och löpning i djupled',
    focus: {
      '7v7': 'Väggspel och djupledsspel för att ta sig förbi en motståndare två mot en.',
      '9v9': 'Väggspel, överlappning och avledande rörelse för att skapa övertag.',
      '11v11': 'Kombinationer med motrörelse, korslöpning och överlappning i sista tredjedelen.',
    },
    lookFor: ['Passa och rör dig direkt', 'Löpning bakom försvararens rygg', 'Rätt tajming på djupledslöpningen'],
    question: 'Vad ska du göra direkt efter att du har slagit en passning?',
  },
  {
    id: 'inlagg',
    name: 'Inlägg och avslut',
    group: 'Anfallsspel',
    short: 'Kantspel, inlägg, inspel och cutback',
    focus: {
      '9v9': 'Ta sig runt på kanten och slå inlägg eller inspel snett inåt bakåt.',
      '11v11': 'Inläggsspel från olika zoner med löpningar mot första stolpen, bortre stolpen och straffpunkten.',
    },
    lookFor: ['Inlägg bakom backlinjen eller snett inåt bakåt', 'Tre ytor fyllda i straffområdet', 'Avslut på ett tillslag'],
    question: 'Vilka ytor i straffområdet behöver vi ha spelare i när inlägget kommer?',
  },
  {
    id: 'kontring',
    name: 'Kontring',
    group: 'Omställning',
    short: 'Snabb omställning till anfall',
    focus: {
      '7v7': 'Snabbt speldjup framåt och bakåt när vi vinner bollen.',
      '9v9': 'Snabbt bli spelbar i spelyta 2 och 3 direkt efter bollvinst.',
      '11v11': 'Kontra i flera korridorer – första passningen framåt och fart i löpningarna.',
    },
    lookFor: ['Första passningen framåt', 'Löpningar i djupled direkt', 'Avslut innan försvaret hinner hem'],
    question: 'Vad är det första du ska titta efter när vi vinner bollen?',
  },
  {
    id: 'forsvar1v1',
    name: 'Pressa, markera och bryta',
    group: 'Försvarsspel',
    short: 'Försvara 1 mot 1 och ta bollen',
    focus: {
      '5v5': 'Pressa bollhållaren, markera en motståndare och bryta passningar.',
      '7v7': 'Försvarssida, pressa, markera, tackla och bryta – närmaste spelare går på bollen.',
      '9v9': 'Försvara 1 mot 1 med understöd och täckning från medspelare.',
      '11v11': 'Vinna dueller och styra bollhållaren dit vi har understöd.',
    },
    lookFor: ['Rätt försvarssida mellan boll och mål', 'Sidledes, låg tyngdpunkt, styr åt ett håll', 'Bryter när bollen är långt från foten'],
    question: 'Var ska du stå i förhållande till din motståndare och ert mål?',
  },
  {
    id: 'press',
    name: 'Förhindra speluppbyggnad',
    group: 'Försvarsspel',
    short: 'Samlat lag, lagdelar och presspel',
    focus: {
      '7v7': 'Samla laget i lagdelar och hålla korta avstånd mellan spelarna.',
      '9v9': 'Förhindra spel genom lagdelarna – överflyttning, centrering och understöd.',
      '11v11': 'Samla laget i de tre korridorerna närmast bollen och välja presshöjd.',
    },
    lookFor: ['Korta avstånd mellan lagdelarna', 'Laget flyttar över mot bollsidan', 'Press på signal – alla samtidigt'],
    question: 'Varför vill vi ha korta avstånd mellan oss när motståndarna har bollen?',
  },
  {
    id: 'atererovring',
    name: 'Återerövring av bollen',
    group: 'Omställning',
    short: 'Vinna tillbaka bollen direkt',
    focus: {
      '5v5': 'Ta tillbaka bollen direkt när vi tappar den – närmaste spelare jagar.',
      '7v7': 'Snabbt pressa bollhållaren när vi tappar bollen.',
      '9v9': 'Pressa bollhållaren och snabbt förhindra passningsalternativ.',
      '11v11': 'Direkt återerövring och skydd framför och bakom backlinjen.',
    },
    lookFor: ['Närmaste spelare pressar inom tre sekunder', 'Nästa spelare stänger passningen', 'Laget kommer hem bakom bollen om pressen misslyckas'],
    question: 'Vem ska pressa när vi tappar bollen – och vad gör de andra?',
  },
  {
    id: 'forhindraavslut',
    name: 'Förhindra och rädda avslut',
    group: 'Försvarsspel',
    short: 'Försvara straffområdet och täcka skott',
    focus: {
      '7v7': 'Förhindra avslut i straffområdet – stå mellan boll och mål och täcka skott.',
      '9v9': 'Försvara straffområdet och vara först på returerna.',
      '11v11': 'Försvara ytor i straffområdet vid inlägg och inspel, samarbete med målvakten.',
    },
    lookFor: ['Alltid en spelare mellan boll och mål', 'Täcker skott utan att vända bort', 'Först på returen'],
    question: 'Vad är viktigast att skydda när motståndarna kommer nära vårt mål?',
  },
  {
    id: 'fasta',
    name: 'Fasta situationer',
    group: 'Fasta situationer',
    short: 'Hörnor, frisparkar, inkast och inspark',
    focus: {
      '9v9': 'Hörnor, frisparkar, inkast och inspark – enkla upplägg och tydliga uppgifter.',
      '11v11': 'Offensiva och defensiva fasta situationer med roterande roller.',
    },
    lookFor: ['Alla kan sin uppgift', 'Rätt tajming i löpningen', 'Beredda på andrabollen'],
    question: 'Vilken är din uppgift vid vår hörna – och vid deras?',
  },
]

export const THEME_BY_ID: Record<ThemeId, ThemeInfo> = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeInfo>

export function themesFor(format: Format): ThemeInfo[] {
  return THEMES.filter((t) => t.focus[format])
}
