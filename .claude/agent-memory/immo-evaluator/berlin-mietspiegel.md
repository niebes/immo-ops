# Berliner Mietspiegel 2026 — reference data + extraction recipe
Matches: any **Berlin** rental evaluation (all 12 Bezirke). Companion to `potsdam-mietspiegel.md`.
Sibling doctrine (both anchors, never only one) lives in `modes/_shared.md`.

## Never write "Mietpreisbremse: not applicable" for a Berlin flat
Die **Mietenbegrenzungsverordnung** des Berliner Senats trat am **01.01.2026** in Kraft und gilt bis
**31.12.2029**; sie erklärt **das gesamte Stadtgebiet** zum Gebiet mit angespanntem Wohnungsmarkt
(lückenloser Anschluss an die Vorgängerverordnung). Zulässig bei Wiedervermietung = ortsübliche
Vergleichsmiete **+10 %**. Ausnahmen nur § 556e (höhere Vormiete) und § 556f (Neubau ab 01.10.2014 /
umfassende Modernisierung ≈ ⅓ der Neubaukosten).
**Der Hebel ist § 556g Abs. 1a BGB:** beruft sich der Vermieter auf eine Ausnahme, muss er das
**unaufgefordert, in Textform, VOR Vertragsschluss** offenlegen — sonst kann er sich nicht darauf
berufen. Immer als konkreten EUR/Monat-Betrag beziffern, nicht nur "liegt über dem Mietspiegel".

## Extraction recipe (2 Aufrufe, ~1 min)
`WebFetch` auf **`https://mietspiegel.berlin.de/wp-content/uploads/2026/05/mietspiegel2026.pdf`**
scheitert am Parsen ("binary PDF") — **speichert die Bytes aber und nennt den Pfad**. Dann:
`pdftotext -layout <pfad> out.txt` (ist installiert, `/usr/bin/pdftotext`) → die Tabellen kommen
sauber spaltenweise heraus. Abschnitte: **9.1 einfache Wohnlage** (~Zeile 600), **9.2 mittlere**
(~698), **9.3 gute** (~798), **10./11. Orientierungshilfe für die Spanneneinordnung** (~903 ff.).
`Read`+`pages:` wie beim Potsdamer PDF geht auch, `pdftotext` ist schneller.
**Warum:** ohne das Rezept endet jede Berlin-Bewertung bei den Portal-„Mietspiegel"-Seiten, die
Angebotsmieten ausweisen und die Mietpreisbremsen-Prüfung still killen.

## Struktur der Tabelle
Feld = **Wohnlage (einfach/mittel/gut) × Bezugsfertigkeit × Wohnfläche**, je untere Spanne /
Mittelwert / obere Spanne, **Nettokaltmiete EUR/m², Stichtag 01.09.2025**, qualifiziert (§ 558d BGB),
gilt für **voll ausgestattete** Wohnungen (Sammelheizung + Bad + WC in der Wohnung; eine
**Etagenheizung zählt als Sammelheizung**).
- Baualtersklassen: **bis 1918 · 1919–1949 · 1950–1964 · 1965–1972 · 1973–1985 West ·
  1986–1990 West · 1973–1990 Ost · 1991–2001 · 2002–2009 · 2010–2015 · 2016–2019 · 2020–2024.**
- ⚠ **Häufigster Fehler: Baujahr 1919–1930 in die „bis 1918"-Zeile legen.** Ein Altbau von **1920**
  gehört in **1919–1949**, und das ist ein anderer, deutlich niedrigerer Wert (#646: 8,11 statt 8,97).
  Die m²-Staffelung unterscheidet sich pro Baualtersklasse — immer die Zeilenbeschriftung lesen.
- Die Wohnlage ist **ausschließlich** über das **Straßenverzeichnis zum Mietspiegel 2026**
  (Amtsblatt 28.05.2026, eigenes Dokument) bestimmbar — nicht aus dem Bezirk ableiten. Solange es
  nicht abgefragt ist: **die für den Vermieter günstigste Wohnlage annehmen** und das im Bericht
  offenlegen, damit die festgestellte Überschreitung ein Mindestwert ist.
- Es gibt **keine Sondermerkmalzuschläge** mehr (anders als in älteren Ausgaben); die Feinjustierung
  innerhalb der Spanne läuft über die **Orientierungshilfe/Merkmalgruppen** (nicht Teil des
  qualifizierten Mietspiegels, aber BGH-anerkannt, VIII ZR 123/20).

## Häufig gebrauchte Felder (gute Wohnlage, Tabelle 9.3) — untere / **Mittel** / obere
| Zeile | Bezugsfertigkeit | Wohnfläche | EUR/m² |
|---|---|---|---|
| 130–139 | **bis 1918** | <35 / 35–40 / 40–45 / 45–50 / 50–60 | 7,62/**11,75**/16,43 · 8,57/**11,67**/14,92 · 7,20/**9,54**/14,40 · 6,70/**9,64**/13,32 · 6,89/**9,03**/13,16 |
| 135–139 | bis 1918 | 60–70 / **70–80** / 80–90 / 90–110 / ab 110 | 7,09/**9,46**/13,54 · 6,25/**8,97**/13,66 · 6,75/**8,80**/12,17 · 6,60/**8,45**/12,99 · 6,30/**8,84**/13,24 |
| 140–144 | **1919–1949** | <35 / 35–40 / 40–45 / 45–65 / **ab 65** | 7,19/**9,47**/14,79 · 7,40/**9,07**/11,42 · 6,80/**8,54**/11,10 · 6,84/**8,82**/11,74 · **6,37/8,11/11,93** |

Gegenprobe **mittlere Wohnlage (9.2)**: bis 1918 70–80 m² = 6,09/**7,90**/11,70 (Z. 72);
1919–1949 ab 60 m² = 5,90/**7,30**/9,55 (Z. 81). **Einfache Wohnlage (9.1)**: bis 1918 70–75 m² =
6,24/**8,46**/11,65 (Z. 9); 1919–1949 ab 60 m² = 5,78/**6,99**/9,12 (Z. 16).
→ Größenordnung insgesamt: **ortsüblich meist 6–12 EUR/m²**, während Berliner **Angebotsmieten**
2026 bei **14–22 EUR/m²** liegen. Eine Wiedervermietung, die 60–100 % über der ortsüblichen Miete
liegt, ist in Berlin der **Normalfall**, nicht die Ausnahme — trotzdem jedes Mal beziffern.

## Angebotsmarkt-Anker (Anchor 2, immer zusätzlich nennen)
- **Westend (14052/14055), Q2 2026: 14,65 EUR/m² Mittel, Spanne 11,87–21,73, −2 % y-o-y.**
Angebotsanker sind nach oben verzerrt → dürfen **nie allein** das High-Scam-Signal
"Preis >20 % unter Mietspiegel" auslösen. Weitere Bezirke hier ergänzen, wenn sie auftauchen.

Review: Mietspiegel-Neuausgabe im Zweijahresrhythmus, nächste **2028** erwartet; die
Mietenbegrenzungsverordnung läuft bis 31.12.2029 — vor 2030 nichts nachzuschlagen.

**Promotion-Hinweis:** sobald ein zweiter Berlin-Fall dieselben Zahlen braucht, gehört dieser Block
neben die Potsdamer Grundmietentabelle in `modes/_shared.md` ("Mietspiegel & Mietpreisbremse —
regional reference data") statt hier ins Agent-Memory.
