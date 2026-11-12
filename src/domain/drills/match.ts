import type { DrillDef, ThemeId } from '../types'

interface MatchRule {
  level: 1 | 2 | 3
  name: string
  rule: string
  coaching: string[]
}

// Matchspelet bygger vidare på passets tema. Sista passet i blocket spelas fritt.
const RULES: Record<ThemeId, MatchRule[]> = {
  driva: [
    { level: 1, name: 'Match – driv över linjen', rule: 'Mål kan också göras genom att driva bollen över motståndarnas mållinje (ett poäng). Vanligt mål ger två.', coaching: ['Utmana när du har fri yta framför dig', 'Skydda bollen med kroppen'] },
    { level: 2, name: 'Match – dribblingsbonus', rule: 'Ett mål räknas dubbelt om målgöraren eller passningsläggaren har tagit sig förbi en motståndare i anfallet.', coaching: ['Våga utmana på offensiv planhalva', 'Tempoväxla efter finten'] },
  ],
  passning: [
    { level: 1, name: 'Match – alla rör bollen', rule: 'Mål räknas dubbelt om minst tre olika spelare har rört bollen i anfallet.', coaching: ['Passa och rör dig', 'Ta emot bort från motståndaren'] },
    { level: 2, name: 'Match – tre tillslag', rule: 'Högst tre tillslag per spelare på egen planhalva, fritt på offensiv.', coaching: ['Titta upp innan bollen kommer', 'Spelbar på båda sidor om bollhållaren'] },
  ],
  spelbarhet: [
    { level: 1, name: 'Match – bredd och djup', rule: 'När målvakten har bollen ska laget ha en spelare vid varje sidlinje och en långt fram innan spelet får sättas igång.', coaching: ['Gör planen stor när vi har bollen', 'Visa var du vill ha bollen'] },
    { level: 2, name: 'Match – spela mellan', rule: 'En passning som tas emot mellan två motståndare och spelas vidare framåt ger ett extra poäng.', coaching: ['Sök ytan mellan motståndarna', 'Halvvänd kropp i mottagningen'] },
  ],
  speluppbyggnad: [
    { level: 1, name: 'Match – bygg från målvakten', rule: 'Alla anfall startar hos målvakten. Motståndarna väntar bakom retreatlinjen (eller mittlinjen) tills första passningen är slagen.', coaching: ['Backarna brett och djupt', 'Första passningen till en rättvänd spelare'] },
    { level: 2, name: 'Match – genom alla lagdelar', rule: 'Mål räknas dubbelt om bollen har spelats via backlinje, mittfält och anfall utan långboll.', coaching: ['Flytta upp laget när bollen går framåt', 'Vänd spelet om det är stängt'] },
  ],
  avslut: [
    { level: 1, name: 'Match – skjut ofta', rule: 'Varje avslut på mål ger ett poäng, mål ger tre. Räkna högt.', coaching: ['Avsluta när du ser målet', 'Gå på retur'] },
    { level: 2, name: 'Match – mål i straffområdet', rule: 'Mål räknas bara på avslut inifrån straffområdet (markera med koner). Mål på ett tillslag räknas dubbelt.', coaching: ['Ta er in framför mål', 'En spelare på retur varje gång'] },
  ],
  kombination: [
    { level: 1, name: 'Match – väggspelsbonus', rule: 'Ett lyckat väggspel förbi en motståndare ger ett poäng, även utan mål.', coaching: ['Passa och spring direkt', 'Väggen spelar på ett tillslag'] },
    { level: 2, name: 'Match – mål efter djupledslöpning', rule: 'Mål räknas dubbelt efter väggspel, överlappning eller passning i djupled bakom backlinjen.', coaching: ['Löp bakom ryggen på försvararen', 'Tajma löpningen med passningen'] },
  ],
  inlagg: [
    { level: 1, name: 'Match – fria kantzoner', rule: 'En spelare per lag får vara i kantzonen och får inte attackeras där. Mål efter inlägg eller inspel räknas dubbelt.', coaching: ['Fyll på framför mål när bollen går ut på kanten', 'Inspel snett inåt bakåt'] },
    { level: 2, name: 'Match – mål efter inlägg', rule: 'Mål efter inlägg, inspel eller cutback räknas tre gånger. Kantzonen är nu fri för försvarare.', coaching: ['Första stolpen, bortre stolpen, straffpunkten', 'Slå inlägget tidigt när läget finns'] },
  ],
  kontring: [
    { level: 1, name: 'Match – snabbt mål', rule: 'Mål inom tio sekunder efter bollvinst räknas dubbelt. Tränaren räknar högt.', coaching: ['Första passningen framåt', 'Löp i djupled direkt'] },
    { level: 2, name: 'Match – kontring från egen planhalva', rule: 'Vinner laget bollen på egen planhalva och gör mål inom tolv sekunder räknas målet tre gånger.', coaching: ['Titta framåt innan du vinner bollen', 'Fyll på i flera korridorer'] },
  ],
  forsvar1v1: [
    { level: 1, name: 'Match – bollvinst ger poäng', rule: 'Varje bollvinst genom brytning eller tackling där laget behåller bollen ger ett poäng. Mål ger tre.', coaching: ['Närmaste spelare pressar', 'Rätt försvarssida'] },
    { level: 2, name: 'Match – man mot man', rule: 'Alla har en egen motståndare att markera. Gör din spelare mål får motståndarna ett extra poäng.', coaching: ['Håll koll på både boll och spelare', 'Styr bollhållaren utåt'] },
  ],
  press: [
    { level: 1, name: 'Match – samlat lag', rule: 'När motståndarna gör mål och hela det försvarande laget inte är på egen planhalva räknas målet dubbelt.', coaching: ['Korta avstånd mellan lagdelarna', 'Kom hem bakom bollen'] },
    { level: 2, name: 'Match – bollvinst högt', rule: 'Bollvinst på offensiv planhalva som leder till avslut ger ett extra poäng.', coaching: ['Press på signal – alla samtidigt', 'Flytta över mot bollsidan'] },
  ],
  atererovring: [
    { level: 1, name: 'Match – fem sekunder', rule: 'Vinner laget tillbaka bollen inom fem sekunder efter att ha tappat den får det ett poäng.', coaching: ['Närmaste spelare jagar direkt', 'Nästa spelare stänger passningen'] },
    { level: 2, name: 'Match – vinn och gör mål', rule: 'Mål direkt efter återerövring på offensiv planhalva räknas tre gånger.', coaching: ['Reagera innan motståndaren har kontroll', 'Laget trycker upp bakom pressen'] },
  ],
  forhindraavslut: [
    { level: 1, name: 'Match – täckta skott', rule: 'Ett täckt skott eller en brytning i eget straffområde ger ett poäng.', coaching: ['Mellan boll och mål', 'Täck med kroppen, vänd inte bort'] },
    { level: 2, name: 'Match – håll nollan', rule: 'Spela korta perioder om tre minuter. Laget som håller nollan en hel period får två poäng.', coaching: ['Försvara ytan framför mål först', 'Först på returen'] },
  ],
  fasta: [
    { level: 1, name: 'Match – extra hörnor', rule: 'Varje gång bollen går över kortlinjen blir det hörna, oavsett vem som rörde den sist. Mål på fast situation räknas dubbelt.', coaching: ['Alla vet sin uppgift', 'Snabb omställning efter rensning'] },
    { level: 2, name: 'Match – frisparkar nära mål', rule: 'Tränaren blåser frispark i olika lägen med jämna mellanrum. Laget har 20 sekunder på sig att ställa upp och slå den.', coaching: ['Bestäm snabbt vem som slår', 'Beredda på andrabollen'] },
  ],
}

function matchDrill(theme: ThemeId, r: MatchRule): DrillDef {
  return {
    id: `match-${theme}-${r.level}`,
    name: r.name,
    phase: 'match',
    themes: [theme],
    age: [6, 19],
    level: r.level,
    build: { type: 'match' },
    purpose: 'Använda passets tema i matchspel.',
    steps: [r.rule, 'I övrigt vanliga regler för spelformen. Spela två eller tre korta perioder och samla laget kort mellan dem.', 'Ställ en fråga om temat i pausen i stället för att ge svaret.'],
    coaching: [...r.coaching, 'Coacha bara på temat – låt resten vara'],
    easier: 'Ta bort villkoret och beröm när temat syns i spelet.',
    harder: 'Lägg till ett krav på antal tillslag eller minska planen.',
    gkFocus: 'Sätt igång spelet snabbt och var spelbar bakåt för backarna.',
    usesGk: true,
  }
}

const FREE: DrillDef = {
  id: 'match-fri',
  name: 'Match – fritt spel',
  phase: 'match',
  themes: [],
  age: [6, 19],
  level: 3,
  build: { type: 'match' },
  purpose: 'Spela fritt och se om temat syns utan villkor.',
  steps: [
    'Vanliga regler för spelformen, inga extra villkor.',
    'Spela två eller tre perioder. Byt positioner mellan perioderna så att alla får prova olika roller.',
    'Samla laget i pausen och fråga: var såg vi det vi har tränat på?',
  ],
  coaching: ['Beröm när temat syns', 'Låt spelarna lösa situationerna själva', 'Alla ska ha lika mycket speltid'],
  easier: 'Mindre plan och färre spelare per lag.',
  harder: 'Spela i matchtempo med domare och fasta positioner.',
  gkFocus: 'Sätt igång spelet snabbt och var spelbar bakåt för backarna.',
  usesGk: true,
}

export const MATCHES: DrillDef[] = [...(Object.keys(RULES) as ThemeId[]).flatMap((t) => RULES[t].map((r) => matchDrill(t, r))), FREE]
