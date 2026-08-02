# Potsdam Mietspiegel — the real ortsübliche Vergleichsmiete (NOT the portal "Mietspiegel" pages)
Applies to: every Miete evaluation in Potsdam (all portals). Not a portal quirk — a data source.
(Umland/Havelland: see the Falkensee section at the bottom.)

**The trap:** searching "Mietspiegel Potsdam" returns IS24/immoportal/miet-check/E&V pages quoting
**12,6–13,5 EUR/m²**. That is the *Angebotsmiete* (what landlords currently ask), not the
*ortsübliche Vergleichsmiete*. Using it makes almost every Potsdam listing look "at market" and
silently kills the Mietpreisbremse check. The qualified Mietspiegel (§ 558d BGB) values are roughly
**half** of it for Plattenbau stock.

## Source
Official PDF: `https://www.potsdam.de/system/files/document/Mietspiegel_2026_A5_webdatei_neu.pdf`
(Mietspiegel **2026**, in Kraft seit 25.06.2026, ersetzt Mietspiegel 2024; index page
`potsdam.de/de/mietspiegel-0`).
**WebFetch cannot parse it** ("corrupted/binary PDF") — but WebFetch *saves* the bytes to
`~/.claude/projects/…/tool-results/webfetch-*.pdf` and prints the path. Then read that path with the
**Read tool + `pages:`** (table = PDF page 6; Spanneneinordnung/Orientierungshilfe = pages 8–9;
Begriffserläuterungen = 10–11). One WebFetch + one Read gets the whole table.

## Grundmietentabelle 2026 — Nettokaltmiete EUR/m², Mittelwert (Spanne)
Columns by Wohnfläche: A ≤45 · B >45–60 · C >60–75 · D >75–90 · E >90
(Baualter ≤1948 uses A ≤45; the 1949–1970 row group shifts: A ≤40, B >40–60.)

| Baualter / EEK | A | B | C | D | E |
|---|---|---|---|---|---|
| bis 1948 · A+,A,B | 9,95 (8,28–11,64) | 9,78 (7,35–11,11) | 9,54 (7,76–10,65) | 11,11 (6,76–20,91) | ← D+E gemeinsam |
| bis 1948 · C,D,E | 9,18 (7,19–11,10) | 8,62 (6,90–10,62) | 8,82 (6,90–10,43) | 9,15 (6,90–11,49) | 8,87 (6,90–10,58) |
| bis 1948 · F,G,H | 7,22 (4,82–8,69) | 7,78 (6,12–9,04) | 7,08 (3,80–8,84) | 6,97 (4,19–9,56) | 6,97 (3,52–9,12) |
| bis 1948 · kein Energieausweis | 6,89 (6,16–7,97) | 7,03 (6,00–8,65) | 7,49 (5,72–9,19) | 7,83 (6,51–9,24) | 8,17 (5,90–9,40) |
| 1949–1970 · B,C | 8,66 (7,04–10,16) | 6,48 (5,85–7,06) | 6,50 (5,82–6,94) | 6,56 (6,00–7,06) | 7,49 (5,59–12,50) |
| 1949–1970 · D,E,F,G, kein EA | 7,93 (6,71–8,86) | 6,49 (5,85–7,21) | 6,46 (5,75–7,15) | 6,44 (5,40–7,17) | ← D+E gemeinsam |
| **1971–1990 (inkl. Wendebauten)** · A,B | 7,53 (6,46–9,02) | 6,64 (5,85–7,86) | **6,06 (5,46–6,88)** | 5,87 (5,42–6,41) | 6,88 (5,69–7,77) |
| **1971–1990** · C,D | 7,07 (6,10–8,32) | 6,30 (5,76–6,87) | **5,82 (5,23–6,25)** | 5,63 (5,13–6,10) | 6,26 (5,37–7,43) |
| **1971–1990** · E,F | 6,67 (6,31–7,18) | 5,86 (5,29–6,39) | **5,69 (5,19–6,10)** | 5,55 (5,17–5,95) | – |
| 1991–2008 · A+,A,B,C | 9,27 (8,53–10,31) | 9,48 (8,93–10,34) | 9,28 (8,88–10,29) | 9,10 (8,43–10,18) | 9,91 (8,71–12,70) |
| 1991–2008 · D,E,F,G | 9,36 (8,86–10,12) | 9,24 (8,58–10,20) | 9,45 (8,20–11,51) | 9,01 (8,27–9,69) | 10,28 (7,91–13,71) |
| 2009–2012 · alle | 11,44 (11,32–11,66) | 10,92 (10,74–11,38) | 11,07 (9,38–11,88) | 11,43 (9,03–13,04) | 12,01 (10,30–13,84) |
| 2013–2020 · alle | 11,96 (11,69–12,15) | 11,66 (11,23–11,92) | 12,06 (11,23–12,74) | 12,34 (10,90–14,23) | 12,39 (10,31–14,00) |
| ab 2021 · alle | 15,28 (10,57–16,74) | 16,58 (14,70–19,50) | 15,72 (10,52–19,00) | 16,73 (14,88–19,64) | 15,14 (10,90–17,86) |

Wendebauten = Plattenbau Drewitz, begonnen vor 03.10.1990, fertig bis 1991.
Baualter bleibt nach Modernisierung maßgeblich (nur Sanierung auf Neubaustandard rückt die Klasse).

## How to use it
1. Field = Baualtersklasse × EEK-Zeile × m²-Spalte. Start beim **Mittelwert**.
2. Spanneneinordnung (PDF S. 8–9): wohnwerterhöhende minus -mindernde Punkte = %-Satz, damit
   anteilig vom Mittelwert Richtung Ober-/Unterwert gehen. Ober-/Unterwert sind harte Grenzen.
3. Mietpreisbremse-Check: zulässig = ortsübliche Vergleichsmiete **+10 %**. Ausnahmen § 556e
   (höhere Vormiete darf fortgeschrieben werden — der Regelfall bei Nachmietergesuchen) und
   § 556f (umfassende Modernisierung / Neubau ab 01.10.2014). Deshalb: eine Überschreitung ist
   ein **Verhandlungs-/Rügehebel (§ 556g Abs. 3 Auskunft)**, kein Ausschlussgrund — so im Report formulieren.
4. Immer BEIDE Zahlen nennen (ortsüblich *und* Angebotsmarkt), sonst liest sich ein völlig
   marktüblicher Preis wie Wucher.

Seen/first used on #504 (Caputher Heuweg 61, Waldstadt II: 11,59 EUR/m² vs. 5,69–6,06 Mittelwert).

## Umland: **Falkensee/Schönwalde-Glien/Brieselang (Berliner Speckgürtel) unterliegen seit 01.01.2026 der Mietpreisbremse**
Die neue Brandenburger Mietpreisbegrenzungs-/Kappungsgrenzenverordnung (Kabinett 25.11.2025) gilt ab
**01.01.2026 für 36 statt bisher 19 Gemeinden** — neu dabei u. a. **Falkensee**, Blankenfelde-Mahlow,
Eichwalde, Glienicke/Nordbahn. **Im Havelland sind es genau drei: Falkensee, Schönwalde-Glien (neu),
Brieselang (neu)** — also praktisch jede Miete, die aus dem Havelland in den Scan läuft. Erfasst sind nur Gebäude mit **Baufertigstellung vor 2014** (Neubau
ausgenommen); zulässig = ortsübliche Vergleichsmiete **+10 %**, Kappungsgrenze 15 % in 3 Jahren.
→ Bei jeder Miete im Havelland/Speckgürtel: **nicht mehr „Mietpreisbremse: not applicable"** schreiben
(so noch in Report #246 vom 02.07.2026 — das war bereits falsch). Falkensee hat **keinen qualifizierten
kommunalen Mietspiegel**, die ortsübliche Vergleichsmiete ist also nur über Vergleichsobjekte belegbar
→ im Report als **§ 556g Abs. 3 BGB Auskunftshebel (Vormiete + Baujahr erfragen)** formulieren, nicht als
Ausschlussgrund. Marktanker Falkensee 2026 (nur *Angebots*mieten!): Häuser ~**16,03 EUR/m²**, Wohnungen
~13,50–15,70 EUR/m². Beste adressgenaue Quelle bleibt das IS24-`PRICE_INFO.priceBar`
(`minSimilarPrice`–`maxSimilarPrice` + Perzentil) direkt aus der Mobile-API. Genutzt auf #506
(Rotkehlchenstr., 14,29 EUR/m², 57. Perzentil).
Marktanker **Schönwalde-Glien** 2026 (ebenfalls nur *Angebots*mieten, kein qualifizierter Mietspiegel):
Gemeindeschnitt ~**14,02 EUR/m²** (Spanne 12,69–15,48), Häuser ~**13,19 EUR/m² (150 m²) bis 14,55 EUR/m²
(100 m²)**.
**Und: den Angebots-Anker nie allein den Scam-Check „>20 % unter Mietspiegel" auslösen lassen.** Auf #507
(Burgunderweg 5, 10,43 EUR/m²) lagen −25 % ggü. diesem Anker vor, aber die `priceBar` stellte das Angebot
ins **23. Perzentil INNERHALB** des adressgenauen Bandes 1.100–1.820 EUR — erklärt durch Bj. 1998,
Energieklasse E, 1 Vollbad. Angebotsmieten sind nach oben verzerrt; ein High-Signal darf nur feuern, wenn
AUCH die `priceBar` das Angebot unter `minSimilarPrice` drückt.
**Why:** ohne diese Notiz wird für jede Falkensee-Miete erneut recherchiert — und die naheliegende
Annahme „Brandenburger Kleinstadt → keine Mietpreisbremse" ist seit 2026 schlicht falsch.
Stabile Jahresdaten → **Kandidat zur Promotion nach `modes/_shared.md`** (Mietpreisbremse-Abschnitt),
wenn der Mietspiegel 2026 sich bewährt; Neuauflage voraussichtlich 2028.
