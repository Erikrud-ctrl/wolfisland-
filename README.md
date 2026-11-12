# Wargöns IK Träning

Träningsplanering för Wargöns IK. En webbapp för mobilen som bygger träningspass efter lagets ålder och spelform och räknar om varje övning efter hur många som är på plats.

## Vad appen gör

- **Ålder och spelform.** Laget ställs in med ålder; spelformen (5 mot 5, 7 mot 7, 9 mot 9, 11 mot 11) följer SvFF:s nationella spelformer men kan ändras.
- **Block.** Välj ett tema (t.ex. *Passa och ta emot*) och 2–8 pass. Passen stegras från grund, via övningar under press, till matchlikt.
- **Inför passet.** Fyll i antal spelare, målvakter, tränare, yta och tid. Lagindelning, antal ytor, mått, material och tider räknas om.
- **Passet.** Uppvärmning → färdighetsövning → spelövning → matchspel, alltid med temat som röd tråd. Varje övning har en animerad planskiss, instruktioner och coachingpunkter. Enskilda övningar kan bytas ut.
- **Extra moment.** Skadeförebyggande uppvärmning (från 10 år), målvaktsmoment parallellt med färdighetsövningen och fys utan boll (från 15 år).
- **Vid planen.** Tidtagning per moment med ljudsignal, och en kort utvärdering efter passet som sparas i blockets historik.

Allt sparas lokalt på enheten. Appen fungerar utan täckning när den har öppnats en gång och kan läggas på hemskärmen.

## Utveckling

```bash
npm install
npm run dev       # utvecklingsserver
npm test          # tester för skalning, övningsbank och planering
npm run build     # bygger till dist/
```

## Struktur

| Sökväg | Innehåll |
| --- | --- |
| `src/domain/formats.ts` | Spelformerna: planmått, mål, boll, speltid |
| `src/domain/themes.ts` | Teman med fokus per spelform |
| `src/domain/alloc.ts` | Fördelning av spelare på ytor, lag och jokrar |
| `src/domain/builders*.ts` | Byggare som gör en övningsmall till lagindelning, mått och skiss |
| `src/domain/drills/` | Övningsbanken, en fil per tema |
| `src/domain/planner.ts` | Blockplanering, tidsfördelning, byte av övning, materiallista |
| `src/ui/` | Skärmarna och den animerade planskissen |

En ny övning läggs till genom att beskriva den som en `DrillDef` i rätt temafil. Testerna kör sedan övningen mot 4–30 spelare, 0–3 målvakter och olika ytor.

## Publicering

`.github/workflows/deploy.yml` bygger och publicerar till GitHub Pages vid push till `main`. Slå på Pages under *Settings → Pages → Source: GitHub Actions*.

## Underlag

Övningarna är skrivna för appen. Upplägg, begrepp, mått och tider bygger på en genomgång av bland annat SvFF:s spelarutbildningsplan och spelregler för barn- och ungdomsfotboll, distrikts- och föreningsplaner, nordiska och internationella förbund, akademier samt forskning om smålagsspel. Källorna listas i appen under Inställningar.
