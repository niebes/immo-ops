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
**Kürzester Weg — WebFetch gar nicht erst anfassen:** plain `curl` liefert das PDF direkt
(`200 application/pdf`, ~1,66 MB), Browser-UA genügt, kein Consent, kein Bot-Wall:
```
curl -sL -A 'Mozilla/5.0 (X11; Linux x86_64) …Chrome/126.0 Safari/537.36' \
  'https://mietspiegel.berlin.de/wp-content/uploads/2026/05/mietspiegel2026.pdf' -o ms2026.pdf
pdftotext -layout ms2026.pdf ms.txt      # /usr/bin/pdftotext ist installiert
grep -n "1950 bis 1964" ms.txt            # 3 Treffer = 9.1 / 9.2 / 9.3, in dieser Reihenfolge
```
(Der alte Weg — `WebFetch` scheitert am Parsen "binary PDF", speichert die Bytes aber und nennt den
Pfad — funktioniert weiterhin, ist nur ein Aufruf mehr.) Abschnitte: **9.1 einfache Wohnlage**
(~Zeile 600), **9.2 mittlere** (~698), **9.3 gute** (~798), **10./11. Orientierungshilfe für die
Spanneneinordnung** (~903 ff.). `Read`+`pages:` wie beim Potsdamer PDF geht auch, `pdftotext` ist
schneller. **Der `grep -n "{Baualtersklasse}"`-Trick ist der eigentliche Zeitsparer:** er springt
in einem Aufruf auf alle drei Wohnlagen-Varianten derselben Zeile, danach reicht ein
`sed -n`/`awk`-Fenster von ~8 Zeilen pro Treffer.
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
| 145–149 | **1950–1964** *(= 1965–1972, Z. 150–154, identische Werte)* | <35 / 35–40 / 40–45 / **45–90** / ab 90 | 7,19/**9,47**/14,79 · 7,40/**9,07**/11,42 · 6,80/**8,54**/11,10 · **6,07/7,56/10,92** · 7,49/**10,00**/12,78 |

⚠ Die 1950er/60er-Zeilen haben nur **fünf** Flächenstufen und die vierte ist mit **45 bis unter
90 m²** extrem breit — 68 m² und 88 m² landen im selben Feld. Nicht reflexhaft die 60–70/70–80-
Staffelung der „bis 1918"-Zeile unterstellen.

Gegenprobe **mittlere Wohnlage (9.2)**: bis 1918 70–80 m² = 6,09/**7,90**/11,70 (Z. 72);
1919–1949 ab 60 m² = 5,90/**7,30**/9,55 (Z. 81); 1950–1964 **ab 45 m²** = 5,90/**7,08**/9,25 (Z. 85).
**Einfache Wohnlage (9.1)**: bis 1918 70–75 m² = 6,24/**8,46**/11,65 (Z. 9); 1919–1949 ab 60 m² =
5,78/**6,99**/9,12 (Z. 16); 1950–1964 **ab 60 m²** = 5,77/**6,63**/8,00 (Z. 21).

**Wohnlage-Gegenprobe immer mitliefern, nicht nur behaupten.** Die Regel oben („die für den
Vermieter günstigste Wohnlage annehmen") setzt voraus, dass man weiß, welche das *ist* — die
m²-Stufen unterscheiden sich pro Tabelle, also ist „gut" nicht per Definition der höchste Wert.
Ein `grep -n "{Baualtersklasse}"` liefert alle drei Zeilen in einem Aufruf; zwei Zahlen in den
Bericht schreiben („einfach 6,63 · mittel 7,08 · gut 7,56 → gut ist auch der Höchstwert, die
Überschreitung ist ein Mindestwert") macht die Feststellung unangreifbar. Für **1950–1964,
45–90 m²** ist gut tatsächlich der Höchstwert — geprüft auf #647 (Königsallee, Bj 1960, 68 m²).
→ Größenordnung insgesamt: **ortsüblich meist 6–12 EUR/m²**, während Berliner **Angebotsmieten**
2026 bei **14–22 EUR/m²** liegen. Eine Wiedervermietung, die 60–100 % über der ortsüblichen Miete
liegt, ist in Berlin der **Normalfall**, nicht die Ausnahme — trotzdem jedes Mal beziffern.

## Angebotsmarkt-Anker (Anchor 2, immer zusätzlich nennen)
- **Westend (14052/14055), Q2 2026: 14,65 EUR/m² Mittel, Spanne 11,87–21,73, −2 % y-o-y.**
- **Grunewald (14193): 17–22 EUR/m²** — Spitzensegment Berlins, steht so auch als
  `max_price_per_m2: 22` in der Suchgruppe "Berlin Grunewald flat rental" in `config/profile.yml`.
  Ein Inserat **über 22** ist damit teuer *selbst am Angebotsmarkt*, nicht nur gegen den Mietspiegel
  — das ist eine eigene Block-A-Aussage und ein Verhandlungsargument (#652: 24,10 EUR/m²).

## § 556f-Ausnahme: der Normalfall bei "Erstbezug nach Sanierung" im Altbau
Berliner Premium-Inserate sind oft **saniert­e Gründerzeitbauten mit "Erstbezug"** — dann liegt die
Miete regelmäßig **100–200 % über der ortsüblichen Vergleichsmiete** (#652: 24,10 vs. Mittel 8,80
= +174 %). Das ist **kein Scam-Signal und kein automatischer Rechtsverstoß**: der Vermieter wird
sich auf **§ 556f Satz 2 (umfassende Modernisierung, ≈ ⅓ der Neubaukosten + Anhebung auf
annähernd Neubaustandard)** berufen, und dann gilt die Mietpreisbremse für die Wohnung gar nicht.
**Nie als "Mietwucher" schreiben, nie stillschweigend als legal durchwinken** — stattdessen immer:
(1) beide Zahlen beziffern, (2) die Ausnahme als *plausibel aber unbelegt* benennen, (3) den
**§ 556g Abs. 1a**-Hebel als konkreten EUR-Betrag ausweisen (ohne Textform-Offenlegung vor
Vertragsschluss fällt die zulässige Miete auf ortsüblich +10 %). Rechne dabei **zwei** Obergrenzen:
Mittelwert +10 % *und* Spannen-Oberwert +10 % — die zweite ist die für den Vermieter günstigste und
macht die festgestellte Überschreitung unangreifbar.
**Warum:** ohne diesen Absatz endet so ein Fall entweder in einem falschen Wucher-Vorwurf oder in
einem kommentarlosen 4/5 — beide Male geht der einzige große Geldhebel der Wohnung verloren.
(Der Grunewald-Anker steht schon oben unter „Angebotsmarkt-Anker" — nicht doppelt pflegen.)
Angebotsanker sind nach oben verzerrt → dürfen **nie allein** das High-Scam-Signal
"Preis >20 % unter Mietspiegel" auslösen. Weitere Bezirke hier ergänzen, wenn sie auftauchen.
Gegenprobe, die den Anker *entkräftet* statt ihn zu benutzen: die IS24-`priceBar` aus der Mobile-API
ist **adressgenau** (`minSimilarPrice`–`maxSimilarPrice` + Perzentil) und schlägt jeden Bezirks-
oder Ortsteil-Anker. #647 Königsallee: Band 14,00–26,60 EUR/m², Angebot 23,53 = 51. Perzentil, also
marktkonform als *Angebot* und zugleich +183 % über der ortsüblichen Miete — beide Aussagen sind
wahr und müssen beide im Bericht stehen.

### Eine „auffällig billige" Berliner Wohnung ist fast immer ein Anker-Fehler, kein Scam
Kommt die Aufgabe schon mit der These „X EUR/m² ist die HÄLFTE des Mietspiegels", steckt der Fehler
praktisch immer in der Verwechslung **Angebotsmiete ↔ ortsübliche Vergleichsmiete** — und zwar
selbst dann, wenn die Zahl in der Aufgabenstellung („Grunewald asks 17–22") sachlich stimmt: sie ist
der **Angebots**anker. Prüfung ist billig und braucht die Live-Seite nicht: 6–12 EUR/m² ist die
ortsübliche Bandbreite, also fällt das High-Signal erst unter ~5 EUR/m². Gegenprobe auf #650
(Hohenzollerndamm, 882 EUR / 92 m² = **9,59 EUR/m²**, als „~½ Mietspiegel" gemeldet): passendes Feld
**gute Wohnlage / bis 1918 / 90–110 m² = 6,60 / 8,45 / 12,99** → der Preis liegt **ÜBER** dem
Mittelwert, Signal feuert nicht, Mietpreisbremse eingehalten. Zweitbeste Erklärung für so einen
Preis, bevor man an Betrug denkt: **Bestandsmiete in einer Tausch-/Nachmieteranzeige** (der Inserent
nennt seine eigene, über Jahre gewachsene Miete) oder eine **WBS-gebundene Einheit** — beides
harmlos bzw. ein ganz anderer Blocker als Scam.
**Warum:** ohne diese Gegenprobe wird eine völlig normale Wohnung als „Likely Scam" abgestempelt,
und in Suchgruppen mit vielen Tauschwohnungen (Grunewald-Batch: 610–1.200 EUR) reihenweise.

Review: Mietspiegel-Neuausgabe im Zweijahresrhythmus, nächste **2028** erwartet; die
Mietenbegrenzungsverordnung läuft bis 31.12.2029 — vor 2030 nichts nachzuschlagen.

**Promotion-Hinweis:** sobald ein zweiter Berlin-Fall dieselben Zahlen braucht, gehört dieser Block
neben die Potsdamer Grundmietentabelle in `modes/_shared.md` ("Mietspiegel & Mietpreisbremse —
regional reference data") statt hier ins Agent-Memory.
