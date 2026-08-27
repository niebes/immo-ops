# Potsdam Mietspiegel — the real ortsübliche Vergleichsmiete (NOT the portal "Mietspiegel" pages)
Applies to: every Miete evaluation in Potsdam (all portals). Not a portal quirk — a data source.
(Umland/Havelland: see the Falkensee section at the bottom.)

> **PROMOTED 2026-08-02 → `modes/_shared.md`**, section "Mietspiegel & Mietpreisbremse — regional
> reference data (SSOT)". That section is now authoritative for the Grundmietentabelle, the
> Brandenburg-2026 regulated-Gemeinde list, and the priceBar caveat on the scam signal.
> **Read `_shared.md` for the numbers; this file keeps only the working notes** (fetch trick,
> per-listing anchors seen). If the two ever disagree, `_shared.md` wins — fix this file.

**The trap:** searching "Mietspiegel Potsdam" returns IS24/immoportal/miet-check/E&V pages quoting
**12,6–13,5 EUR/m²**. That is the *Angebotsmiete* (what landlords currently ask), not the
*ortsübliche Vergleichsmiete*. Using it makes almost every Potsdam listing look "at market" and
silently kills the Mietpreisbremse check. The qualified Mietspiegel (§ 558d BGB) values are roughly
**half** of it for Plattenbau stock.

## Source
Official PDF: `https://www.potsdam.de/system/files/document/Mietspiegel_2026_A5_webdatei_neu.pdf`
(Mietspiegel **2026**, in Kraft seit 25.06.2026, ersetzt Mietspiegel 2024; index page
`potsdam.de/de/mietspiegel-0`).
**Cheapest fetch is `curl` + `pdftotext`, not WebFetch** (verified 2026-08-15, #589):
`curl -sL -o ms2026.pdf "…/Mietspiegel_2026_A5_webdatei_neu.pdf" && pdftotext -f 1 -l 6 ms2026.pdf -`
gives the whole Vorspann (Geltungsbereich, Ausnahmen, Rechtsgrundlagen) as greppable text in one
Bash call — `pdftotext` is installed at `/usr/bin/pdftotext`. **WebFetch cannot parse it**
("corrupted/binary PDF") — it *saves* the bytes to `~/.claude/projects/…/tool-results/webfetch-*.pdf`
and prints the path, which you can then read with the **Read tool + `pages:`** (table = PDF page 6;
Spanneneinordnung/Orientierungshilfe = pages 8–9; Begriffserläuterungen = 10–11). Use the Read+pages
route only for the *table* layout; for any prose question use pdftotext.
**Why:** the WebFetch+Read dance costs two round trips and can't be grepped; the scope/exception
rules below were only findable by grepping the text.

## **Der Mietspiegel gilt für Ein-/Zweifamilien- und REIHEN-/DOPPELHÄUSER nur eingeschränkt — das Feld ist dort eine UNTERgrenze, keine Obergrenze**
Wörtlich im Vorspann (S. 2–3): *"Er gilt für Ein- und Zweifamilienhäuser sowie Reihenhäuser nur
eingeschränkt, da insoweit **keine Datenerhebung** stattfand. Gemäß **BGH VIII ZR 58/08 vom
17.09.2008** können Mieten, die im Geschosswohnungsbau üblich sind, im Ein- und Zweifamilienhaus
**„erst recht"** verlangt werden"* (Begründung: erhöhter Wohnwert; formell reicht die Berufung auf
den Mietspiegel auch fürs Reihenendhaus, BGH VIII ZR 54/15 v. 26.04.2016).
→ Bei einer **Haus-Miete in Potsdam** (DHH/RH/EFH) das Feld trotzdem ziehen und nennen, aber als
**Untergrenze** formulieren. Die Mietpreisbremse gilt weiter (§ 556d BGB erfasst Wohnraum, nicht nur
Wohnungen), nur ist die ortsübliche Vergleichsmiete für dieses Segment über **Vergleichsobjekte**
zu belegen → Report-Formulierung: **§ 556g Abs. 3 BGB Auskunftshebel** (Vormiete + Baujahr +
Modernisierungen), nie "Mietspiegel nicht anwendbar → kein Check".
Der unbezifferte "erst recht"-Zuschlag rechtfertigt aber keine beliebige Überschreitung: auf #589
(DHH Neu Fahrland, Bj. 2002, EEK C, 94,94 m², 19,49 EUR/m²) waren es **+96,7 % über dem Mittelwert
9,91** und **+53,5 % über dem Oberwert 12,70** — das bleibt ein echter Verhandlungshebel.
*Why:* ohne diesen Absatz landet jede Potsdamer Haus-Miete entweder bei einem falschen
"Mietpreisbremse nicht anwendbar" oder bei einem überzogenen Wucher-Vorwurf.

**Weitere ausdrückliche Ausnahmen** (gleiche Textstelle): öffentlich geförderte Wohnungen,
Studenten-/Jugendwohnheime, Wohnungen in Heimen mit Betreuungsleistungen; **Zuschläge für
(teil-)möblierte Wohnungen und Untermietverhältnisse sind NICHT erfasst** (→ ein Möbel-Aufschlag
lässt sich gegen den Mietspiegel gar nicht prüfen, vgl. #255/#311). Der Mietspiegel gilt
ausdrücklich **auch für alle Ortsteile**: u.a. Fahrland, **Neu Fahrland**, Golm, Groß Glienicke,
Marquardt, Satzkorn, Uetz-Paaren — dort also kein Abschlag "ist ja Dorf".

## Angebotsmarkt-Anker Potsdam 2026 (zum Gegenzitieren, NICHT ortsüblich)
**Häuser ~17,61 EUR/m² · Wohnungen ~15,51 EUR/m²** (Stand 08/2026). Beste Lagen ~17,24, günstige
Lagen ~10,63; die Portalseiten nennen daneben 12,80–15,14 als Stadtmittel.
→ Bei einer **Haus**-Miete immer den **Haus**-Anker nehmen, nicht den Wohnungs-Anker: #589 lag mit
19,49 EUR/m² nur ~+11 % über 17,61, aber ~+26 % über 15,51 — die Aussage "am oberen Marktrand" vs.
"deutlich über Markt" kippt allein an dieser Wahl.

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

**Der Anker dreht die Aussage oft um 180° — Drewitz/Plattenbau ist der Standardfall.** #513
(Erich-Pommer-Str., Bj. 1987, EEK C, 68 m², 9,06 EUR/m²) kam als *"price well below the area
Mietspiegel → keep-and-flag, WBS prüfen"* in die Evaluation. Gegen den Angebotsmarkt (12,60–13,50)
stimmt das (−30 %); gegen die ortsübliche Vergleichsmiete des Feldes 1971–1990 × C,D × Spalte C
= **5,82 (5,23–6,25)** liegt es **+56 % über dem Mittel / +45 % über dem Oberwert**, zulässig wären
6,25 × 1,1 ≈ **6,88 EUR/m²**. Also: Mietpreisbremse *überschritten*, Scam-Signal *feuert nicht*.
→ Bei jedem "verdächtig billig"-Flag aus einer Potsdamer **Großsiedlung (Drewitz, Am Stern,
Waldstadt, Schlaatz, Zentrum Ost)** zuerst das Plattenbau-Feld ziehen: 5,5–6,9 EUR/m² ist dort das
*normale* Niveau, "billig gegen 13 EUR" ist bloß der Gebäudetyp und **kein WBS-Indiz**. WBS separat
per `Wohnberechtigung`-Keyword prüfen, nicht aus dem Preis erschließen. *Why:* ohne diese Umkehrung
liest man −30 % als Scam-/WBS-Verdacht und übersieht, dass tatsächlich der Mieter den
§ 556g Abs. 3 BGB-Auskunftshebel in der Hand hat.

**Die Regel hängt am BAUALTER, nicht an der Großsiedlung — sie gilt genauso im ländlichen Ortsteil.**
#627 (expose 170096870, Ulrich-Steinhauer-Str. 1d, **Groß Glienicke**, Bj. 1985, EEK C, 60,1 m²,
**397 EUR = 6,61 EUR/m²**) kam mit dem Auftrag "397 EUR für 60 m² ist weit unter Mietspiegel — prüfe
hart auf Genossenschaft/Sozialwohnung/WBS/Extraktionsfehler/Scam" herein. Keiner dieser Verdachte traf
zu: gegen den Angebotsanker (15,51) sind es −57 %, gegen das Feld 1971–1990 × C,D × Spalte C
= **5,82 (5,23–6,25)** aber **+13,6 % über dem Mittelwert / +5,8 % über dem Oberwert**, zulässig
6,40 → Bremse um **+3,2 % (12,24 EUR/Mon.)** überschritten. Ein 1985er Geschosswohnungsbau kostet in
**jedem** Potsdamer Randortsteil (Groß Glienicke, Fahrland, Satzkorn, Marquardt …) 5,5–7 EUR/m² — die
Ortsteilliste oben ist nur die häufigste Fundstelle, nicht die Bedingung. Erste Frage ist immer
`obj_yearConstructed`, nicht der Ortsteil.
*Why:* mit der engen Lesart hätte die Ortsteil-Prüfung "keine Großsiedlung" ergeben und der
−57-%-Befund wäre erneut als Scam-/WBS-Verdacht durchgegangen.

**Spaltengrenzen-Sensitivität: bei m² dicht an einer Spaltenkante beide Felder rechnen.** Die
Wohnflächenspalten sind eng geschnitten (B >45–60, C >60–75), und benachbarte Felder unterscheiden
sich um ~8 %. #627 lag mit **60,1 m² genau 0,1 m² in Spalte C** (5,82 → zulässig 6,40 →
**überschritten**); in Spalte B wäre es 6,30 (5,76–6,87) → zulässig 6,93 → **konform** gewesen. Bei
≤1 m² Abstand zur Kante also beide Werte nennen und die Überschreitung entsprechend relativieren
(dazu kommen ohnehin § 556e/§ 556f).
*Why:* eine Mietpreisbremsen-"Verletzung", die an 100 cm² Wohnfläche hängt, darf nicht als harter
Befund in den Report — die Wohnfläche selbst ist ja nur "ca." angegeben.

## „Verdächtig billig" entscheiden: **echte Untermiete vs. Köderpreis — der Unterwert ist die Trennlinie**
Die Abschnitte oben lösen den häufigsten Fall auf („billig gegen 13 EUR" = bloß der Gebäudetyp).
Sie erklären aber *nicht* den seltenen zweiten Fall, den Betrugsköder — und beide kommen als
derselbe Auftrag herein („X EUR für Y m² ist weit unter Markt, prüfe auf Genossenschaft /
Extraktionsfehler / Scam"). Die drei Tests, in dieser Reihenfolge, trennen sie zuverlässig:

**1. Liegt der Preis INNERHALB oder UNTERHALB der amtlichen Spanne?** Das ist die eigentliche
Trennlinie, nicht der Abstand zum Angebotsmarkt (der ist bei *beiden* Fällen −50 %).
- #684 (350 EUR / 60 m² = 5,83): in 2 von 3 Kandidatenfeldern **innerhalb** der Spanne → echt.
- #627 (397 EUR / 60,1 m² = 6,61): sogar **+5,8 % über** dem Oberwert → echt.
- #558 (7,59): unter dem Mittelwert, über dem Unterwert → echt.
- #686 (900 EUR / 117 m² = 7,69, Bj. 2011 → Feld 2009–2012 × Spalte E = 12,01 (10,30–13,84)):
  **−25,3 % unter dem UNTERWERT**, also außerhalb der Spanne → Köder.
⇒ Ein Preis *innerhalb* der Spanne ist per Definition ortsüblich und braucht keine
Betrugserklärung. Erst **unterhalb des Unterwerts** ist der Preis selbst erklärungsbedürftig.

**2. Gibt es einen benannten Mechanismus für die Untermiete?** Echte Billigfälle nennen ihn immer,
weil er den Preis rechtfertigt: Genossenschaft/Nutzungsentgelt (#684, Satz steht in der Prosa),
alter Bestand + sitzender Mieter, Baualtersklasse 1971–1990. **Ein „Privater Anbieter", der
NEU vermietet, hat gar kein Vehikel für eine Bestandsmiete** — Sweep auf
`Genossenschaft|Genossen|Sozial|Wohnberechtigung|WBS(case-sensitiv)|Nachmieter|Tausch`; 0 Treffer
bei einem Privatanbieter heißt: für den Preis existiert keine Erklärung. (#686: 0/0/0/0/0/0/0.)

**3. Kapitalwertprobe — der billigste unabhängige Test, kostet eine WebSearch.**
Objektwert = Kaufpreis-EUR/m² der Straße × Wohnfläche, dann Bruttomietrendite = Kaltmiete×12 ÷ Wert.
Realistisch sind in Potsdam 3–5 %; **unter ~2 % ist die Vermietung wirtschaftlich unmöglich** und
der Preis damit unabhängig vom Mietspiegel widerlegt. #686: Mertz-von-Quirnheim-Str. 7/7a
(„Waterfront Residence", Havelufer) ≈ 5.796 EUR/m² × 117 m² ≈ 678.000 EUR → 10.800/678.000 =
**1,59 %**, inklusive gratis Garagenstellplatz. Die Suchanfrage `"{Straße} {PLZ} Wohnung"` liefert
den Straßen-EUR/m² zuverlässig über die IS24-Atlas-/Immobilienpreis-Seiten.

**Zusatztest, der beide Richtungen absichert: NEBENKOSTEN je m² gegenrechnen.** Plausibel sind
2,50–3,50 EUR/m². #686 nannte 120 EUR auf 117 m² = **1,03 EUR/m²** bei Zentralheizung +
Fußbodenheizung + Aufzug + Garage → auch die Warmmiete ist erfunden, nicht nur die Kaltmiete.
Gleiche Signatur wie #320 (Warmmiete = Kaltmiete = 700 EUR). Echte Billigfälle haben entweder
plausible NK oder gar keine Angabe (#684) — sie erfinden keine unmöglich niedrigen.

**Und: die eigenen Reports sind eine adressgenaue Vergleichsobjekt-Quelle.** Vor dem Scam-Urteil
`grep -rn "{Straßenname}" reports/ data/listings.md data/scan-history.tsv*`. Auf #686 lieferte das
**dieselbe Straße, Hausnummer 8**: 3 Zi/100 m² zu 1.690 EUR = 16,90 EUR/m² (Report #187) und ein
zweites Inserat zu 1.890 EUR = 18,90 EUR/m² → das inkriminierte Angebot liegt −54,5 % darunter.
Damit ist die `_shared.md`-Auflage für das High-Signal erfüllt („Angebotsanker allein reicht nicht"),
denn Vergleichsobjekte derselben Straße *sind* adressgenau — man braucht dafür keine IS24-`priceBar`.
*Why:* dieser Grep kostet einen Bash-Call und ist das stärkste Einzelbeweisstück im ganzen Report;
ohne ihn hängt das High-Signal allein am Mietspiegel-Unterwert und wirkt anfechtbar.

### Gegenprobe zur Großsiedlungs-Regel: **das Baualter aus den FOTOS verifizieren, bevor man das Plattenbau-Feld nimmt**
Der Ortsteil-Reflex ("Waldstadt/Drewitz/Schlaatz → 1971–1990") ist eine *Vermutung*, und weil
zwischen den Baualtersklassen bis zu **Faktor 1,4** liegt, dreht eine falsche Klasse das
Mietpreisbremsen-Ergebnis komplett um. Wenn das Exposé kein Baujahr nennt (Mieterinserate nie),
**erst das Bildmaterial ansehen** — ein einziges Innenfoto genügt oft:
- **Kassettentüren, profilierte Türbekleidungen, Deckenhohlkehle, hohe Decken, tiefe Laibungen**
  → Vorkriegs-/Zwischenkriegsbestand, Feld **bis 1948**, *nicht* Plattenbau.
- **Glatte Türblätter, keine Profile, niedrige Decke, Betonfertigteilfugen** → Plattenbau bestätigt.
Seen on #558 (expose 169875863, Sonnentaustr. 15, `geo_ot: waldstadt_ii`, 83 m², 7,59 EUR/m²): der
Ortsteil-Reflex hätte Feld 1971–1990 × C,D × Spalte D = **5,63 (5,13–6,10)** gezogen → zulässig
6,19–6,71 → **"Mietpreisbremse überschritten"**. Das einzige Foto (Flur) zeigte Kassettentüren +
Hohlkehle → richtiges Feld **bis 1948 · kein EA · Spalte D = 7,83 (6,51–9,24)** → 7,59 liegt
**unter dem Mittelwert**, **Mietpreisbremse eingehalten**. Also: Ortsteil-Anker liefert die
Hypothese, das Foto entscheidet. Beide Felder trotzdem im Report nennen und das Baujahr als
Kontaktfrage setzen.
*Why:* ohne die Gegenprobe wird einem markt- und mietspiegelkonformen Angebot ein
Mietpreisbremsen-Verstoß angedichtet — und der Report empfiehlt einen § 556g-Rügehebel, den es
gar nicht gibt.

### Baujahr HARD bekommen, wenn das Exposé keins nennt: **Wikipedia „Liste der Baudenkmale in Potsdam/{Anfangsbuchstabe}"**
Ein Foto liefert nur eine Baualtersklasse; die Denkmalliste liefert **Baujahr + Architekt + Denkmal-ID
hausnummerngenau** und ist in einem WebFetch da (Seiten sind nach Straßen-Anfangsbuchstabe geteilt,
z. B. `/wiki/Liste_der_Baudenkmale_in_Potsdam/S`). Trifft nur bei denkmalgeschützten Häusern — aber
genau dort fehlt das Baujahr im Exposé am häufigsten, weil der Vermieter stattdessen
**„Ein Energieausweis ist für diesen Gebäudetyp nicht notwendig"** anklickt (§ 79 Abs. 4 GEG,
Baudenkmal-Ausnahme). **Diese Formulierung ist also selbst der Hinweis: Denkmal → Baualtersklasse
`bis 1948` → EEK-Zeile `kein EA`.**
Seen on #596 (Stiftstraße 8a, Brandenburger Vorstadt, 117 m², 11,97 EUR/m²): Exposé nennt weder
Baujahr noch EEK; Liste ergab **Stiftstraße 8, 8a — Mietwohnhaus, 1896, Otto Kerwien, ID 09156593**
→ Feld **bis 1948 · kein EA · Spalte E (>90 m²) = 8,17 (5,90–9,40)** → zulässig 8,99 EUR/m²
(1.051 EUR), Oberwert-Decke 10,34 EUR/m² (1.210 EUR) → Ist 1.400 EUR = **+33 % über der Mittelwert-,
+16 % über der Oberwert-Grenze**, Mietpreisbremse klar überschritten, § 556f Neubau scheidet
wegen Bj. 1896 aus. Gegenrichtung nicht vergessen: gegen den Angebotsmarkt (12,60–13,50) ist
derselbe Preis **günstig** — beide Zahlen nennen.
*Why:* ohne das echte Baujahr hätte man raten müssen, und zwischen `bis 1948 · kein EA` (8,17) und
`ab 2021` (15,14 in Spalte E) liegt Faktor 1,85 — die Mietpreisbremsen-Aussage kippt komplett.

## Ortsteil-Anker: **Am Stern (14480)** — Großsiedlung MIT eingestreuten Neubauten, Baujahr immer prüfen
Am Stern ist überwiegend Plattenbau 1971–1990 (Feld 60–75 m² = 5,82 · 6,06 EUR/m²), aber **nicht
durchgängig** — es gibt Neubauriegel von ~2021, die im selben PLZ-Band stehen und ins Feld
**ab 2021** (60–75 m² = 15,72, 75–90 m² = 16,73) gehören. Das ist ein Faktor ~2,7 auf das Ergebnis
und dreht regelmäßig sowohl den Mietpreisbremse-Befund als auch das Vorzeichen des Vergleichs.
Bekannte Neubau-Adressen (Bj. 2021), fortschreiben wenn neue auftauchen:
- **Ziolkowskistr. 2** — MFH, 77 WE + 24 TG-Plätze, Energie**bedarfs**ausweis **B / 56 kWh/(m²·a)**,
  KWK fossil, Fußbodenheizung, Balkone/Terrassen, Ausweis vom 22.04.2021. Neuvertragsniveau im Haus
  ~14,0 EUR/m² kalt (2-Zi 62,54 m² zu 876 EUR). Gegenüber (Parkplatz Newton-/Ziolkowskistraße)
  geplant: 6-Geschosser mit bis zu 109 WE → mehrjährige Baustelle als Lage-Con nennen. (#561)
- **Schwarzschildstr. 28** — Bj. 2021, Max Müller Immobilien GbR. (#523)

**14480 ist außerdem nicht nur Am Stern/Drewitz — es umfasst KIRCHSTEIGFELD (Bj. 1993–1998).** Damit
hat die PLZ *drei* Baualtersklassen (1971–1990 Platte · **1991–2008** Kirchsteigfeld/90er-Ergänzungs-
bauten · ab 2021 Neubauriegel) und der Plattenbau-Reflex ist dort nur eine von drei Hypothesen.
Erkennungsmerkmale einer 90er-Anlage in 14480, wenn keine Adresse dransteht (#593): Bj. im Fließtext
genannt, "parkähnlich angelegte" Anlage aus **zwei Wohnhäusern** in ruhiger Seitenstraße, Fernwärme-
Zentralheizung, Terrassen-/Wintergartenwohnungen, Sterncenter fußläufig, A 115 in 5 Min. Feld
**1991–2008 · D,E,F,G · Spalte E (>90 m²) = 10,28 (7,91–13,71)** — Spalte E ist auffällig weit, ein
Aufruf von 13,02 EUR/m² liegt +27 % über dem Mittel und trotzdem **unter** dem Oberwert, also über die
Spanneneinordnung deckbar. Und: Bj. vor dem 01.10.2014 ⇒ **§ 556f greift nicht, Mietpreisbremse gilt**
(anders als bei den 2021er Riegeln nebenan).
*Why:* für 14480 hätte der Ortsteil-Reflex Feld 1971–1990 × Spalte E = 6,26 gezogen → "+108 %,
massiver Mietpreisbremsen-Verstoß" statt "innerhalb der Spanne".
Neubau ab 2021 heißt außerdem **§ 556f BGB: Mietpreisbremse dauerhaft nicht anwendbar** (auch bei
Wiedervermietung) — eine angekündigte „Mietanpassung" hat dort *keine* gesetzliche Obergrenze; das
gehört als Risiko in Block A/G, nicht als „compliant" abgehakt.
*Why:* das Standard-Playbook für Potsdamer Großsiedlungen („zuerst das Plattenbau-Feld ziehen") ist
für Am Stern nur die halbe Wahrheit und liefert bei diesen Adressen einen um +100 % falschen Befund.

### Kirchsteigfeld-Detailanker: **Vonovia-Bestand Bj. 1995 — die Wohnflächen-SPALTE entscheidet den Mietpreisbremsen-Befund, nicht der Preis**
Der Vonovia-Bestand im Kirchsteigfeld (Maxie-Wander-Str., Anni-von-Gottberg-Str., Maimi-von-Mirbach-Str.,
Ricarda-Huch-Str., Am Hirtengraben) ist durchgängig **Bj. 1995, Fernwärme-Zentralheizung, EEK C–E,
kein Aufzug, Mieterkeller + Balkon/Loggia/Wintergarten, keine EBK (nur Spüle + E-Herd), Kaution
exakt 3,0 NKM**, Anbieter „Vonovia Kundenservice GmbH (Frau Schultze.)", Objekt-Nr. `82-13…`.
Preisniveau 2026: **10,7–12,1 EUR/m² kalt** — und trotzdem fällt das Mietpreisbremsen-Urteil im selben
Quartier gegensätzlich aus, weil die m²-Spalte springt:
- **60–75 m² (Spalte C)** → 9,28 (A+–C) bzw. **9,45 (D,E,F,G)** → zulässig ~10,2–10,4 EUR/m²
  ⇒ die üblichen 12,10 EUR/m² sind **überschritten** (#678: +137 EUR/Mon.; #679 grenzwertig).
- **75–90 m² (Spalte D)** → 9,10 (A+–C) bzw. **9,01 (D,E,F,G)** — das ist der **niedrigste Wert der
  ganzen 1991–2008-Zeile**, zulässig nur **9,91 EUR/m²**. „Größer ⇒ mehr Luft" gilt hier also NICHT:
  Spalte D ist der **schärfste** Fall, nicht der mildeste (#702, 76,02 m², 11,30 EUR/m²:
  **+105,60 EUR/Mon.** über der Mittelwert-Grenze, +48,73 selbst am Oberwert).
- **>90 m² (Spalte E)** → **10,28 (7,91–13,71)**, zulässig **11,31 EUR/m²** ⇒ derselbe Vermieter,
  dasselbe Baujahr, dieselbe Ausstattung ist **konform** (#689, 93,51 m², 10,66 EUR/m², 60,78 EUR/Mon.
  *unter* der Grenze). Spalte E ist im 1991–2008-Feld auffällig weit — das ist der ganze Grund.
⇒ Die m²-Reihenfolge der zulässigen Miete ist **nicht monoton**: C 10,40 → **D 9,91 (Minimum)** →
E 11,31. Deshalb immer die Spalte ziehen, nie „je größer desto konformer" schließen.
**Spaltenkante 75 m² ist im Quartier der Normalfall** (die 3-Zi-Wohnungen liegen bei 73–78 m²), also
Pflicht-Gegenprobe: bei #702 (76,02 m², nur 1,02 m² drüber, Fläche im Exposé „ca.") wäre in Spalte C
der **Oberwert** 11,51 × 1,1 = **12,66 EUR/m²** — der Aufruf von 11,30 wäre bei maximaler
Spanneneinordnung **gedeckt**. Der Befund „überschritten" ist dort also spaltenkanten-abhängig ⇒ als
Next step „Wohnfläche im Mietvertrag prüfen" setzen, statt die Rüge hart zu behaupten.
Zweiter stabiler Befund: die **warme Seite ist im Quartier durchgehend über Benchmark**, 4,9–5,3 EUR/m²
(NK 2,3–2,9 + Heizkosten 2,4–2,6) gegen Potsdamer 3,0–3,8 — immer als Con nennen und die
Betriebskostenabrechnung als Kontaktfrage setzen, egal wie günstig die Kaltmiete wirkt.
*Why:* ohne die Spaltenprobe schreibt man den Kirchsteigfeld-Reflex „Vonovia 1995 ⇒ Mietpreisbremse
überschritten, § 556g-Rüge" auch auf die großen Wohnungen, bei denen der Preis tatsächlich *unter*
der zulässigen Miete liegt — und verschenkt das stärkste Pro-Argument der Wohnung.

## Ortsteil-Anker: **Drewitz (14480)** — und die Falle „1971–1990 hat KEINE `kein EA`-Zeile"
Zwei Befunde aus #670 (Tauschanzeige, 3 Zi / **62 m²** / **324 EUR = 5,23 EUR/m²**, DG 4. OG):

**1. Die 1971–1990-Gruppe hat — anders als `bis 1948` und `1949–1970` — KEINE eigene
„kein Energieausweis"-Zeile.** Sie hat nur `A,B` · `C,D` · `E,F`. Bei einer Platte ohne EA (der
Normalfall: `energy.hasScales:false`) gibt es also **kein einzelnes Feld**, das man ziehen darf.
⇒ **Das ganze EEK-Band der Baualtersklasse zitieren**, nicht eine Zeile raten. Für Spalte C
(>60–75 m²): Mittelwerte **5,69 (E,F) · 5,82 (C,D) · 6,06 (A,B)**, Gesamtspanne **5,19–6,88**.
*Why:* die Standardanweisung „no EA ⇒ nimm die kein-EA-Zeile" läuft hier ins Leere, und wer
stattdessen reflexhaft `E,F` (schlechteste Klasse) nimmt, senkt den Vergleichswert um bis zu 6 %
und erzeugt einen falschen „über Mietspiegel"-Befund.

**2. Gegen-Anker zum „verdächtig billig"-Auftrag: 5,23 EUR/m² ist der UNTERWERT, nicht darunter.**
Der Orchestrator kam mit „5,23 EUR/m² liegt unter der Untergrenze *jeder* Potsdamer Spanne — also
WBS/sozialer Wohnungsbau (Hard Blocker)". Falsch: **5,23 ist exakt der Unterwert der Zeile
`1971–1990 · C,D · Spalte C` (5,82 [5,23–6,25])** und liegt über dem der `E,F`-Zeile (5,19). Die
Miete liegt damit **innerhalb** der ortsüblichen Spanne, nur −8,1 bis −13,7 % vom Mittel ⇒
**Scam-Schwelle (>20 % unter Mietspiegel) NICHT erreicht** und **Mietpreisbremse eingehalten**
(zulässig 6,26–6,67 EUR/m² = 388–413 EUR gegen verlangte 324). Merksatz für Drewitz-Zahlen:
**alles ab ~5,20 EUR/m² aufwärts ist bei 60–75 m² normal**, erst darunter lohnt die WBS-Frage.
Zusatzbeleg für „Altvertrag statt Förderung": 5,23 = **genau ein Drittel** des Angebotsankers
(15,51) — nach der Faustregel aus `tauschwohnung.md` (½ Anker oder darunter ⇒ Altvertrag).
Der WBS-Sweep lief case-sensitiv über 16 Begriffe (`WBS`, `Wohnberechtigung(sschein)`,
`Sozialwohnung`, `sozialer Wohnungsbau`, `Genossenschaft`, `gefördert(er)`, `Belegungsbindung`,
`Belegungsrecht`, `Fehlbelegung`, `Mietobergrenze`, `einkommensorientiert`, `ProPotsdam`, `GEWOBA`)
und ergab **16× 0**. *Why:* ohne diesen Gegen-Anker hätte ein Hard Blocker auf reiner
Preis-Intuition gefeuert und die Wohnung auf ≤2,0 gedeckelt.

**Ortsteil-Fakten (für Block B):** GDR-Großsiedlung WBS-70/P2, **1986–1989**, plus Wendebauten bis
1991; seit 2010 Stadtumbau „**Gartenstadt Drewitz**" (Konrad-Wolf-Allee zurückgebaut, energetische
Sanierung **einzelner** Blöcke ⇒ Sanierungsstand pro Haus prüfen, nie unterstellen). Tram **96/99**
→ Potsdam Hbf ~15–18 Min., **Stern-Center** fußläufig/eine Tramstation, A 115 (AS Potsdam-Süd)
~5 Min., Naherholung **Parforceheide** + Nuthewiesen. Ortsteil-Geometrie (Immowelt-MultiPolygon,
88 Stützpunkte): BBOX **13,1143–13,1496 O / 52,3500–52,3779 N** — die Südausdehnung bis 52,350 ist
Waldanteil, kein Wohngebiet; taugt als Gegenprobe gegen ein falsches `district`.
⚠ „**Dachgeschoss**" in Drewitz ist atypisch (Platte = Flachdach): entweder eine
Gartenstadt-Aufstockung/Staffelgeschoss oder — wahrscheinlicher — das oberste Vollgeschoss eines
5-geschossigen P2-Riegels, vom Inserenten so genannt. Aufzug dort praktisch nie.

## Ortsteil-Anker: **Waldstadt II (14478) — `Zum Jagenstein` / `Saarmunder Str.` ist NICHT Plattenbau**
Waldstadt II löst reflexhaft die Großsiedlungs-Regel oben aus (Feld 1971–1990). Für **eine** Adresse
ist das falsch: das Quartier **Zum Jagenstein / Saarmunder Straße** ist ein **Neubauquartier der
Wohnungsgenossenschaft „Karl Marx" Potsdam eG**, Fertigstellung **~2018/2019** — **113 WE in 5 Häusern
(zwei viergeschossige + drei sechsgeschossige), barrierefrei, Laubengangerschließung, 113 TG-Plätze,
Fußbodenheizung + Holzböden**, 45 × 3-Raum / 38 × 2-Raum. Der Genossenschaftssitz (Saarmunder Str. 2)
liegt im selben Quartier, „Zum Jagenstein 3" vermietet sie als Gewerbe.
→ Richtiges Feld ist **2013–2020**, nicht 1971–1990. Bei 79 m² (Spalte D) sind das **12,34
(10,90–14,23)** statt 5,63 (5,13–6,10) — **Faktor 2,2**. Und: Erstbezug nach dem 01.10.2014 ⇒
**§ 556f BGB, Mietpreisbremse nicht anwendbar**.
Erkennungsmerkmale im Exposé, wenn „Neubau" nicht dransteht: `Etage: N von 4` bzw. `von 6` +
**Fußbodenheizung** + Personenaufzug + Gäste-WC + „Qualität der Ausstattung: Gehoben".
Preisniveau 2026: **13,48 EUR/m² kalt** für 79 m² (#585) — Genossenschaftsniveau, unter privatem
Neubau, aber ~+9 % über dem ortsüblichen Mittelwert und innerhalb der Spanne.
**Der Anker trägt auch OHNE Adresse** (#606, Kleinanzeigen-Tauschanzeige: nur „14478 Brandenburg -
Potsdam", kein Ortsteil, kein Baujahr, kein Energieausweis). Sechs Merkmale zusammen identifizieren
das Quartier: PLZ 14478 · **Etage 4** (die zwei viergeschossigen Häuser) · Fußbodenheizung ·
Personenaufzug **+ „stufenloser Zugang"** (barrierefrei/Laubengang) · **Tiefgaragen-Stellplatz** ·
3-Raum/75 m² (45 der 113 WE sind 3-Raum) — plus als siebte Probe das Preisniveau: 13,33 EUR/m² kalt
gegen die 13,48 aus #585. Gegenprobe über die Fotos (Pflicht, s. o.): weiße glatte Türen, groß-
formatige graue Badfliesen, wandhängendes WC mit UP-Spülkasten, Wanne **und** separate Glasdusche,
Fertigparkett, feuerverzinktes Stahl-Balkongeländer, Blick von oben ins Baumkronendach (Waldlage
Ravensberge) ⇒ Feld **2013–2020**, Plattenbau ausgeschlossen. Bei 75 m² ist das Spalte **C**
(„>60–75"), nicht D: **12,06 (11,23–12,74)** → zulässig 13,27 EUR/m², d. h. der Quartierspreis liegt
punktgenau auf der 10-%-Grenze — und § 556f (Erstbezug nach 01.10.2014) hebt sie ohnehin auf.
Zusatz für Block G/H: Vermieter ist eine **Genossenschaft** → Mitgliedschaft + Genossenschaftsanteile
statt/neben Kaution, zweites Zustimmungsgremium, Eigenbedarfsrisiko praktisch null.
*Why:* ohne diesen adressfreien Erkennungssatz ist eine 14478-Anzeige ohne Baujahr unbewertbar — der
Ortsteil-Reflex hätte 5,82 EUR/m² gezogen und „+129 %, Mietpreisbremse massiv überschritten" in den
Report geschrieben, statt „marktkonform".
*Why:* der Ortsteil-Reflex hätte „+139 % über Mietspiegel, Mietpreisbremse massiv überschritten,
§ 556g-Rüge" in den Report geschrieben — tatsächlich ist der Preis mietspiegelkonform und die
Mietpreisbremse gilt dort gar nicht. Siehe [[wgkarlmarx-de]] für die Vermieterseite.

## Ortsteil-Anker: **Waldstadt I (14478) — `Tiroler Damm 16 A–E` ist ProPotsdam-Neubau 2019, kein Plattenbau**
Gleiche Falle wie Waldstadt II, andere Adresse. Waldstadt I ist überwiegend Großsiedlung 1960er/70er
(Feld 1971–1990), aber **Tiroler Damm 16 A–E** ist ein Neubauquartier der **ProPotsdam**:
5 fünfgeschossige Häuser auf ~11.000 m², **95 WE, Fertigstellung 2. Quartal 2019**, GALANDI SCHIRMER
Architekten, 16 Mio. EUR (8,5 Mio. Landesdarlehen + 2 Mio. Zuschuss), **komplett barrierefrei, Aufzug
in allen fünf Häusern, alle Wohnungen mit Balkon**, Fahrradabstellräume (Keller **nirgends dokumentiert**
— immer nachfragen), Wohnungen ~50–95 m², überwiegend 2–3 Zi.
→ Richtiges Feld ist **2013–2020 · alle**, nicht 1971–1990: bei 75,12 m² (Spalte D) **12,34
(10,90–14,23)** statt 5,63 (5,13–6,10) — **Faktor 2,2**. Erstbezug 2019 ⇒ **§ 556f BGB,
Mietpreisbremse dauerhaft nicht anwendbar** (auch bei Wiedervermietung; also auch **keine gesetzliche
Deckelung künftiger Mietanpassungen** — als Risiko in Block A/G nennen, nicht als „compliant" abhaken).
**Belegungsstruktur (entscheidet über den Preis-Plausibilitätscheck): 75 % miet- und belegungsgebunden**
(Bindungsmieten **5,50 EUR/m² mit WBS**, **7,00 EUR/m² WBS+40**), nur **25 % freifinanziert** zu ~12–13
EUR/m² kalt. Deshalb: eine Tiroler-Damm-Anzeige mit „keine WBS Wohnung" ist plausibel, aber der
WBS-/Bindungsstatus ist die **einzige** wirklich entscheidende Kontaktfrage; und Preise ≫ 13 EUR/m²
kalt sind dort unplausibel → sie zeigen an, dass die genannte Zahl die **Warmmiete** ist (#607).
*Why:* der Waldstadt-Reflex hätte 5,63 gezogen → „+125 % über Mietspiegel, § 556g-Rüge" auf einem
markt- und mietspiegelkonformen Preis, und hätte zusätzlich die kalt/warm-Frage falsch entschieden.
Siehe [[kleinanzeigen-de]] für die Adress-/WebSearch-Route, die das Baujahr auf einer 0-Foto-Anzeige liefert.

## Quartiers-Anker: **Brunnen Viertel, `Brunnenallee` (14478, Waldstadt I / Teltower Vorstadt)**
Dritte Waldstadt-Falle, gleiche Bauart wie die zwei oben: PLZ 14478 löst den Plattenbau-Reflex aus,
die Brunnenallee ist aber ein **Neubauquartier der KW-Development** auf dem ehemaligen
**Plattenwerksareal** südlich der Waldstadt I (Architekt Gregor Fuchshuber, 11 Stadthäuser,
49.700 m² Gesamtfläche, Häuser mit Nummern nach dem Schema `Haus {röm. Ziffer} – WE {n}`).
Fixwerte, die man nicht neu recherchieren muss:
- **Wohnteil Brunnenallee 9–13 fertiggestellt 2016–2018, seit Frühjahr 2019 vollständig bezogen**
  ⇒ Mietspiegelfeld **2013–2020 · alle EEK**; bei 60–75 m² (Spalte C) **12,06 (11,23–12,74)**,
  bei 75–90 m² (Spalte D) **12,34 (10,90–14,23)**.
- **Erstbezug nach dem 01.10.2014 ⇒ § 556f BGB, Mietpreisbremse dauerhaft nicht anwendbar**, auch bei
  jeder Wiedervermietung. Also **kein § 556g-Abs.-3-Hebel**, so formulieren. Gegenrichtung als
  Stabilitätsplus nennen: weil die Miete ~38 % *über* der ortsüblichen Vergleichsmiete liegt, ist der
  § 558-Erhöhungsspielraum im laufenden Vertrag faktisch null — sofern keine Indexmiete vereinbart ist.
- **Preisniveau des Quartiers: 15,16–16,70 EUR/m² kalt**, fünf unabhängige Belege — #510
  (Brunnenallee 3A, Bj. 2018, 76,84 m², 16,68), #642 (Haus I/WE 8, 74,84 m², 16,70), **#692
  (Brunnenallee 5, Bj. 2018, 75,04 m², 16,50, BUWOG)**, **#691 (Brunnenallee 5A, Bj. 2018, 72,74 m²,
  **15,30**, BUWOG)** und **#693 (Brunnenallee 3, 75,00 m², 15,16, BUWOG)**. Das ist ~+26–38 % über
  ortsüblich und **−2 bis +8 %** um den stadtweiten Angebotsanker 15,51 ⇒ quartiersüblich.
  **Die Spanne korreliert mit der Fläche, nicht mit dem Haus:** die ~75-m²-Wohnungen liegen bei
  15,2–16,7, die kleinere 72,74-m²-Einheit bei 15,30 — der Aufruf ist also **kein** verlässlicher
  Qualitätsindikator, sondern Preisliste. Konsequenz für Block A: **4,3 ist der Quartiers-Normalfall**
  (Basis 5,0 − 0,5 Mietspiegel-Aufschlag), aber ein Aufruf **am unteren Rand (≤ 15,5)** verdient nur die
  reduzierte Korrektur −0,4 ⇒ **A ≈ 4,6** (so gescort auf #691). Ein Aufruf ≫ 18 EUR/m² wäre dort neu.
  Achtung Spaltenkante: 74,84 / 75,04 / 76,84 m² fallen auf beide Seiten der 75-m²-Grenze — bei
  Werten im Bereich 74–76 m² immer **Spalte C *und* D** rechnen und beide nennen; ≤ 74 m² ist
  eindeutig Spalte C (12,06).
- **Energieausweis-Anker: Bedarfsausweis B / 52 kWh(m²·a), Fernwärme** — jetzt **dreifach belegt**
  (#510 Brunnenallee 3A, #692 Brunnenallee 5, #691 Brunnenallee 5A, alle Bj. 2018), identische Werte.
  Für weitere Häuser des Quartiers damit gut plausibel, aber weiterhin **nur aus dem eigenen Exposé
  gutschreiben**. Nutzbare Gegenprobe zur Heizkostenvorauszahlung: 52 kWh/m²·a × Fläche × ~0,13 EUR/kWh
  ÷ 12 ≈ **0,56 EUR/m²/Monat** (72,74 m² → ~41 EUR); die BUWOG-Exposés setzen ~0,99 EUR/m² an, sind also
  **konservativ kalkuliert** ⇒ Nachzahlungsrisiko gering, das im Report als Plus nennen.
- **Bestätigt (#692): die Häuser Nr. 3/3a/5/7a sind tatsächlich der institutionelle BUWOG-Mietbestand.**
  Die in #642 formulierte Zwei-Schichten-Regel hat sich damit an einem Fall verifiziert — eine laufende
  Brunnenallee-Anzeige der BUWOG Immobilien Treuhand GmbH ist eine der 240 Mietwohnungen, **nicht** der
  Vermieterkanal zu einem privaten ETW-Nachmietergesuch. Sauber unterscheiden lässt sich das an der
  **Objekt-Nr. `90-…` im `OBJECT_INFO`** (BUWOG hat eine, ein privater Eigentümer/eine Mieteranzeige nie).
- **Block B = 4,5.** Bhf **Potsdam-Rehbrücke ~350 m** (RE 7 / RB 33 nach Berlin) + **Tram 91**
  Rehbrücke – Heinrich-Mann-Allee – **Hbf ~11 Min.** – Neues Palais – Eiche – **Wissenschaftspark Golm**
  (= direkte Tram zur jetzigen Wohnung des Profils). Kita (2020) und Gymnasium (2025) im Quartier,
  Spielplätze, Templiner See, begrünter parkähnlicher Innenhof. Minus: ehem. Industrieareal, direkte
  Nähe zur **Wetzlarer Bahn**, Zufahrt über die stark befahrene **Heinrich-Mann-Allee**, und der
  **Gewerbe-Bauabschnitt (8 Bürohäuser, Bauzeit 2019–2025/26, 4 davon + Kita fertig)** läuft noch.

**Die operativ wichtigste Eigenschaft des Quartiers: es hat ZWEI Eigentümerschichten, und die
deduplizieren nie gegeneinander** — **240 Mietwohnungen im institutionellen Bestand
(BUWOG / Vonovia-Gruppe)** *und* **129 Eigentumswohnungen einzelner Privateigentümer**. Folge für die
Vermieterkanal-Suche bei einem Nachmietergesuch: eine gleichzeitig auf Immowelt/IS24 laufende
Brunnenallee-Anzeige (gesehen: Nr. 3, 3a, 5, 7a) ist **fast immer eine der 240 BUWOG-Mietwohnungen und
damit eine ANDERE Wohnung** — kein Landlord-Channel-Twin, auch wenn Straße, m² und Zimmerzahl passen.
Ein privater ETW-Eigentümer inseriert typischerweise gar nicht selbst. Der einzige belastbare Hebel ist
dann die **Objektidentität aus dem Grundriss** (`Haus {N} – WE {n}` + Etage + exakte m²), mit der man
beim Erstkontakt gezielt nach dem Eigentümer fragt. Konsequenz auch für Block H: institutionell
(#510, Eigenbedarfsrisiko niedrig) vs. privater Einzeleigentümer (#642, **Medium**) — im selben
Quartier, bei identischem Preis.
*Why:* der Waldstadt-Reflex hätte Feld 1971–1990 × Spalte C = 5,82 gezogen → „+187 %, Mietpreisbremse
massiv überschritten, § 556g-Rüge" auf einem markt- und mietspiegelkonform bepreisten Neubau, bei dem
die Bremse gar nicht gilt; und die Zwei-Schichten-Regel ist das, was eine ergebnislose
Landlord-Channel-Suche von einem übersehenen Twin unterscheidet.

## Ortsteil-Anker: **Babelsberg Nord (14482)** — größtes systematisches Delta Angebot ↔ Mietspiegel
Babelsberg Nord ist Gründerzeit-Weberviertel (Nowawes) **mit eingestreuten Nachwende-Neubauten** —
Baujahr also immer aus dem Exposé nehmen, nie aus dem Ortsteil. Der Ortsteil ist gefragt (beste
Berlin-Anbindung Potsdams), und die Angebotsmieten liegen dort **15–18 EUR/m² kalt**, während das
Mietspiegelfeld **1991–2008 · Spalte D (>75–90 m²) = 9,10 (8,43–10,18) bzw. 9,01 (8,27–9,69)** beträgt.
Das ist ~+95 % auf den Mittelwert und damit das größte Delta aller bisher bewerteten Potsdamer
Ortsteile. Konsequenz: **hier ist der § 556g-Abs.-3-Hebel der Normalfall, nicht die Ausnahme** — aber
nur, wenn das Baujahr die Ausnahmen ausschließt. Prüfreihenfolge: Baujahr < 01.10.2014 ⇒ § 556f raus;
„umfassende Modernisierung" nur akzeptieren, wenn Jahr UND Kosten genannt sind (ein sichtbar neues Bad
auf Fotos reicht nicht, und § 556f deckt ohnehin nur die *erste* Vermietung danach) ⇒ dann bleibt
§ 556e (Vormiete) als einzige Rechtfertigung. Genutzt auf #588 (expose 170031691, Bj. 2001, 89 m²,
17,75 EUR/m² = **90. Perzentil** der `priceBar`, zulässig 10,01–11,20 EUR/m² → 583–689 EUR/Monat Delta).

**Die richtige Zeile ist im Weberviertel meist NICHT 1991–2008, sondern `bis 1948`.** Der Ortsteil ist
Gründerzeit — Baujahre um 1900–1912 sind der Normalfall, die Nachwende-Neubauten die Ausnahme. Und
weil diese Altbau-Inserate typischerweise **gar keinen Energieausweis** angeben, greift die Zeile
**„bis 1948 · kein EA"**: Spalte D (>75–90 m²) = **7,83 (6,51–9,24)**, also zulässig **8,61 €/m²**
(Mittelwert +10 %) bzw. max. **10,16 €/m²** am Oberwert. Das ist noch einmal ~14 % unter dem
1991–2008-Feld und macht das Delta zum 15–18-€/m²-Angebotsniveau **noch größer**, nicht kleiner.
Also: erst Baujahr **und** EA-Angabe aus dem Exposé ziehen, dann die Zeile wählen — der Ortsteilanker
oben nennt bewusst nur das Neubaufeld. Gesehen auf **#631** (expose 170070873, Karl-Marx-Str.,
Bj. 1912, kein EA, 85 m², **22,35 €/m² = ~2,9× ortsüblich**, Delta ~1.036–1.168 €/Monat) — dort
zusätzlich ein **Souterrain**, das in der Spanneneinordnung wohnwert*mindernd* wirkt, den Vergleich
also Richtung **Unterwert** (6,51) statt Mittelwert schiebt.
*Why:* mit dem 1991–2008-Feld (9,10) wirkt derselbe Altbau-Preis „nur" 2,5× statt 2,9× ortsüblich,
und die Verhandlungs-/§-556g-Rechnung im Report ist um mehrere hundert Euro zu niedrig.

**Mikrolage: `Alt Nowawes` ist die Hauptdurchgangsstraße mit Gleisen in der Fahrbahn** (Tram 94/99,
Bus 694, Nachtbus N14; Haltestelle „Alt Nowawes" zwischen Rathaus Babelsberg und
**Humboldtring/Nuthestraße** — die mehrspurige Ausfallstraße liegt am westlichen Ende, ca. lng 13,089).
S-Bahnhof Potsdam-Babelsberg (S7) ~450 m → Potsdam Hbf ~4 Min., Berlin-Wannsee ~7 Min. Also: Block B
in Babelsberg Nord **4,0 an Alt Nowawes/Durchgangsstraßen, 4,5 in den Seitenstraßen** — Lärm (Tram bis
in die Nacht) als Besichtigungspunkt setzen, nicht als Abwertung ohne Beleg.
*Why:* ohne den Anker kostet jede Babelsberg-Wohnung eine ÖPNV-Recherche, und die 15–18 EUR/m² lesen
sich gegen den stadtweiten Angebotsanker 12,60–13,50 nur „etwas teuer" statt nach dem tatsächlichen
Faktor 2 gegenüber der ortsüblichen Vergleichsmiete.

**Die `priceBar` ist adressscharf, NICHT ortsteilscharf — sie schwankt innerhalb EINER Straße um
~40 %.** Alt Nowawes ist der Beleg: **Nr. 55b (#588): ähnliche Angebote 9,20–14,90 EUR/m²**
(Gesamtband 7,30–18,90) — **Nr. 106A (#681): ähnliche Angebote 7,10–10,70 EUR/m²** (Gesamtband
5,80–13,00), rund 50 Hausnummern und ~500 m auseinander. Der westliche Abschnitt (Richtung
Humboldtring/Nuthestraße, Nachwende-Neubau) trägt das 15–18-EUR/m²-Niveau des Ortsteilankers, der
östliche (Richtung Rathaus/Karl-Liebknecht-Str., Gründerzeit-/Denkmalbestand) liegt praktisch auf
Mietspiegelniveau. Konsequenz: **den Ortsteilanker oben nie als Vergleichsmaßstab in Block A
einsetzen, immer die `priceBar` des konkreten Exposés ziehen** — sonst wirkt ein 10,50-EUR/m²-Angebot
an Nr. 106A wie „35 % unter Markt" (im Extremfall bis zum High-Scam-Signal „>20 % unter
Mietspiegel"), während es real im **65. Perzentil** seines Adressbandes und **über** der zulässigen
Miete liegt. Der Ortsteilanker taugt nur noch als Plausibilitätsrahmen, nicht als Zahl.
*Why:* dieselbe Falle wie bei Babelsberg Süd unten, aber innerhalb *eines* Ortsteils und *einer*
Straße — die Nord/Süd-Trennung allein reicht als Schutz nicht aus.

### **Babelsberg SÜD (ebenfalls 14482) ist NICHT Babelsberg Nord — Anker getrennt halten**
Gleiche PLZ, völlig anderes Preisbild: die adressgenaue IS24-`priceBar` in Babelsberg Süd liegt bei
**6,10–9,60 EUR/m² „ähnliche Angebote"** (Gesamtspanne 4,90–12), also praktisch **auf
Mietspiegel-Niveau** statt auf dem 15–18-EUR/m²-Angebotsniveau von Babelsberg Nord. Das Umfeld ist
älterer, günstiger Bestand. Praktische Folge: hier kippt der Vergleich in die *andere* Richtung — ein
Angebot mit 11,08 EUR/m² landet im **87. Perzentil** und ist gegenüber dem stadtweiten Angebotsanker
(12,60–13,50) trotzdem „billig". Immer die `priceBar` ziehen und nicht den Babelsberg-Nord-Anker
übertragen. Gesehen auf #615 (expose 169985362, 60 m², 3 Zi., Nachvermietung).
*Why:* mit dem Nord-Anker sieht dieselbe Wohnung nach ~30 % unter Markt aus (Kaufsignal, im Extremfall
sogar das „>20 % unter Mietspiegel"-Scam-Signal); mit dem echten Süd-Band ist sie 15 % über dem
oberen Rand der Vergleichsangebote und die Mietpreisbremse wird zum realen Thema.
Für die Bewertung im Süden zusätzlich: ÖPNV-Anbindung ist gleich gut (S7 Babelsberg/Griebnitzsee,
Tram 94/99), plus Lindenpark und Filmpark fußläufig → Block B 4,5, ohne Adresse keine 5,0.

## Ortsteil-Anker: **Babelsberg Süd (14482)** — Villen-/EFH-Rand, nicht Nowawes
Südlich der Bahn Richtung Park Babelsberg/Griebnitzsee: durchgrünte, ruhige Bebauung (Kiefern/Eichen,
niedrige Sattel-/Ziegeldächer) mit **Nachwende-Neubauten der 1990er/2000er**, oft DG-Maisonetten mit
Wendeltreppe + Galerie. Angebotsniveau wie Babelsberg Nord (15–18 EUR/m²), ÖPNV S7 Babelsberg/
Griebnitzsee (Hbf 4–6 Min., Wannsee ~7 Min.) + Tram 94/99 nur auf der Nordseite. **Block B 4,5**
(ruhige Lage, ohne Adresse nicht feiner auflösbar; 4,0 bei Nuthestraßen-/Bahnnähe).
Mietspiegel-Feld für die typischen 90-m²-DG-Maisonetten: **1991–2008 · Spalte E (>90 m²) = 9,91
(8,71–12,70) bei EEK A+–C bzw. 10,28 (7,91–13,71) bei D–G** → zulässig 10,90–11,31 EUR/m².
**Nachmieter-Altverträge liegen hier regelmäßig 5–10 % UNTER dem ortsüblichen Mittelwert** und damit
~40 % unter dem Angebotsmarkt (#609: 860 EUR / 92 m² = 9,35 EUR/m²). Das ist der Altvertragseffekt —
das High-Signal „>20 % unter Mietspiegel" darf daran nicht gefeuert werden. Umgekehrt gilt: der neue
Vertrag darf auf ortsüblich +10 % (~1.000–1.040 EUR bei 92 m²) angehoben werden, und § 556e hilft dem
Vermieter nicht, wenn die Vormiete niedriger war → gehört als Deckelrechnung in Block A, nicht als
Preisrisiko „unbegrenzt". *Why:* ohne den Anker wird eine Babelsberg-Nachmieteranzeige entweder als
Scam-Schnäppchen oder als „Miete kann beliebig steigen" fehlgelesen.

### Dritte Teillage in 14482: **Medienstadt Babelsberg (Marlene-Dietrich-Allee & Umfeld)** — Neubau-Korridor, nicht Altbestand
Babelsberg Süd zerfällt preislich in **zwei** Teillagen, nicht eine: (a) der ältere, günstige Bestand
mit der adressgenauen priceBar 6,10–9,60 EUR/m² (s. o.) und (b) die **Medienstadt** um die
Marlene-Dietrich-Allee — Filmpark/Studio Babelsberg/rbb, überwiegend Nachwende- bis Neubau
(Projekte **„LOLA"** und **„Marlene 21"**, KW Development). Dort gilt das Angebotsniveau des neueren
Bestands (15–18 EUR/m² und darüber), und die Mietspiegelzeile ist **nicht** die Plattenbau-/Altbau-
Zeile. Praktische Folge: Baujahr auf dieser Straße zwischen **1991–2008 (9,10 in Spalte D)** und
**ab 2021 (16,73)** bracketen — Faktor 1,8, d. h. es entscheidet allein die Baualtersklasse, ob eine
Miete „+130 %" oder „+25 %" über zulässig liegt, und ob § 556f (Erstbezug nach 01.10.2014) die
Mietpreisbremse ganz aussetzt. ÖPNV: S7 **Medienstadt Babelsberg** *und* Babelsberg, Tram 94/99,
Hbf 4–6 Min., Wannsee ~7 Min. → **Block B 4,5** (ohne Hausnummer keine 5,0; 4,0 bei Nuthestraßen-
(B2-) oder Bahnnähe am Nordrand). Gesehen auf #676 (expose 170161206).
*Why:* mit dem „Babelsberg Süd = älterer, günstiger Bestand"-Anker liest sich eine 23-EUR/m²-Miete
in der Marlene-Dietrich-Allee als absurder Ausreißer statt als Neubau-Toplage — und der falsche
Mietspiegel-Zeile kostet die Mietpreisbremsen-Aussage.

## Ortsteil-Anker: **Speicherstadt (14473, Teltower Vorstadt, Havelufer)**
Groth-Gruppe-Quartier zwischen Brauhausberg und Havel, gegenüber Stadtschloss, 5–10 Gehmin. zum Hbf.
**Zwei Bauabschnitte — und der Schnitt liegt genau auf der § 556f-Grenze:** Südteil Ende **2014**
fertig (155 Miet- + 98 Eigentumswohnungen), Nordteil bis **2022** (~270 WE). Erstbezug **nach dem
01.10.2014 → Mietpreisbremse nicht anwendbar**; Südteil-Erstbezug davor → sie gilt. Baujahr steht auf
Anzeigen praktisch nie drin → immer als offene Frage in die Next Steps, nie „not applicable" behaupten.
Mietspiegelfeld je nach Abschnitt **2013–2020** oder **ab 2021** — das sind bei 60–75 m² 12,06 vs.
15,72 EUR/m², also ein Faktor 1,3 auf das Ergebnis. Beide rechnen und beide nennen.
Preisniveau: Havelufer-Neubau mit TG/Aufzug/Fußbodenheizung liegt deutlich über dem stadtweiten
Angebotsanker 12,60–13,50; ~18 EUR/m² kalt ist dort plausibel, >22 EUR/m² kalt nicht.
Genutzt auf #540. *Why:* ohne das kostet jede Speicherstadt-Wohnung zwei Websuchen und man tippt
das Mietspiegelfeld blind.

## Quartiers-Anker: **"Wohnen am Brauhausberg", Max-Planck-Str. 14–16 / 15A (14473, Südliche Innenstadt)**
Neubauquartier mit **107 Mietwohnungen**, Baujahr **2026**, Erstbezug **ab 01.04.2027**, Fernwärme,
Ausstattung "gehoben", **EBK inklusive**, Aufzug, Keller; vermarktet von **locals Real Estate GmbH**
(Potsdam, IS24 4,5★/26, verifiziert) — der **Bauträger/Vermieter wird nirgends genannt**.
Landingpage `wohnen-am-brauhausberg.com`, Objekt-Nr.-Schema **`H{Haus}-{Etage}-{WE}`** (H1-00-02,
H2-02-09, H3-02-09, H5-01-06) → **es kommen laufend weitere Einheiten in den Scan**, und jede ist auch
auf **Immowelt** doppelt gelistet (dort ohne Objekt-Nr. → über Kaltmiete+m²+Etage zuordnen).
Fixwerte, die man nicht neu recherchieren muss: **§ 556f BGB — Mietpreisbremse nicht anwendbar**
(Erstbezug 2026); Mietspiegelfeld **ab 2021**, bei 75–90 m² = **16,73 (14,88–19,64)**;
IS24-`priceBar` adressgenau **11,20–18,50 EUR/m²** (Gesamtband 8,70–23,90).
Preisniveau des Quartiers **21,0–22,2 EUR/m² kalt** (1.550/71,17 · 1.650/78,52 · 1.670/78,48 ·
1.800/85,5 · 1.880/84,59) — also durchweg **~25–33 % über der ortsüblichen Vergleichsmiete** und über
dem lokalen Angebotsband; Block A landet dort realistisch bei **4,0**, nicht 4,5+.
**Zwei wiederkehrende Fallen:** (1) **"Heizkosten in Nebenkosten enthalten: Nein"** — die ausgewiesene
Warmmiete ist unvollständig, real +60–90 EUR/Monat; (2) **keine Fotos/Grundrisse der konkreten Einheit**,
nur Musterwohnung + Außen-Visualisierungen (Neubau-Ausnahme greift, Block D also nicht deckeln).
Lage: Potsdam Hbf **~400–500 m / 5–7 Gehmin.** (RE1 Berlin ~25 Min., S7 Wannsee ~10 Min.) → Block B 4,8.
Nicht mit **#430 (Havel Quartier / MIRU, Bj. 2022, allod)** verwechseln — gleicher Ortsteil, anderes
Quartier, andere Vertragsfakten (dort Indexmiete + 12 Mon. Mindestlaufzeit). Genutzt auf #624.
*Why:* fünf Geschwistereinheiten (#624/#628/#629/#630/#632) laufen als Einzel-Evaluationen; ohne den
Anker recherchiert jede Mietspiegelfeld, § 556f, Anbieter und Lage neu — und übernimmt womöglich #430s
Indexmiete-Fakten, die für dieses Quartier unbelegt sind.

## Ortsteil-Anker: **Jägervorstadt (14469) — Quartier Pappelallee/Voltaireweg, Wohnbau GmbH, Bj. 2013**
Neubauquartier im „Villenkolonie"-Duktus zwischen Voltaireweg und Pappelallee (begrünter Innenhof mit
altem Bergahorn, Tiefgarage unter den Häusern, Aufzug bis in die TG, Fernwärme + Fußbodenheizung,
Eichenparkett, EBK, bodengleiche Duschen, Videogegensprechanlage). Vermieter **Wohnbau GmbH**
(Bonn/München, IS24 3,9★ / 1.297 Bewertungen, verifiziert), Objektreferenzen im Schema `1.1503.4.NN`
→ **Portfolio-Quartier, es kommen weitere Einheiten in den Scan**; Bewerbung läuft immer über
**immomio** (`tenant.immomio.com/apply/…`), nie über ein Kontaktformular.
Fixe Werte, die man nicht neu recherchieren muss: **Baujahr 2013**, Objektzustand *vollständig
renoviert*, **Verbrauchsausweis Klasse B / 65 kWh(m²·a)** (PDF liegt am Exposé), Kaution exakt
3 NKM, keine Provision, **TG-Stellplatz optional 80,00 EUR/mtl.** (nicht Pflicht — nicht in die
Warmmiete rechnen, aber als Variante nennen). Preisniveau 2026: **~15,4 EUR/m² kalt**,
NK 1,76 + Heizkosten 2,09 = 3,85 EUR/m² warm-Aufschlag.
**Die eigentliche Falle ist das Baujahr 2013 an der § 556f-Grenze:** erstmals bezugsfertig **vor dem
01.10.2014** ⇒ die Neubauausnahme greift **nicht**, die **Mietpreisbremse ist anwendbar** — obwohl
sich das Quartier wie ein Neubau liest. Mietspiegelfeld **2013–2020 · alle EEK**; bei >90 m² Spalte E
= 12,39 (10,31–14,00) ⇒ 15,4 liegt +24 % über dem Mittel und +10 % über dem Oberwert; zulässig am
Mittelwert 13,63, am Oberwert 15,40 — d. h. **nur bei maximaler Spanneneinordnung gerade zulässig**.
Die wohnwerterhöhenden Merkmale (FBH, Parkett, Aufzug, EBK, oft **zwei** Balkone, G-WC, Wanne +
bodengleiche Dusche, EEK B, Fernwärme) sind genau die Begründung dafür → im Report als
**§ 556g Abs. 3 Auskunft (Vormiete + Spanneneinordnung)** formulieren, nicht als Verstoß und nicht
als „compliant". Angebotsseitig ist es unauffällig: IS24-`priceBar` adressgenau 10,50–15,70,
64. Perzentil. Genutzt auf #584 (expose 169976631, Pappelallee 49, 90,93 m², 4,75/5).
*Why:* „Neubauquartier ⇒ § 556f, Mietpreisbremse egal" ist hier falsch (ein Jahr zu früh), und ohne
den Anker kostet jede weitere Einheit dieses Quartiers erneut Baujahr-, EEK- und Vermieterrecherche.

## Ortsteil-Anker: **Fahrland (14476, Nördliche Ortsteile) — Ketziner Str. = Bauträger Holger Behnke**
Dorf-Ortsteil ~11 km nördlich der Innenstadt an der B2 Richtung Ketzin/Nauen. **Kein Bahn-/Tram-,
nur Busanschluss** (609/638, ~25–35 min zum Hbf) → autoabhängig; Block B landet für „Potsdam als
preferred area" realistisch bei **3,5**, nicht bei 4,5. Nach Golm ~10–15 min mit dem Auto.
**Ketziner Str. 100–108 = Neubauquartier Holger Behnke**, 3 Mehrfamilienhäuser à 3 Geschosse,
**42 WE / 3.300 m², Fertigstellung Sommer 2025 geplant**, 2- bis 4-Zimmer; **alle EG-Wohnungen mit
Terrasse, alle OG-Wohnungen mit Balkon, EG barrierefrei** — daneben zwei ältere Behnke-Blöcke.
Nutzen: (a) das ist die einzige belastbare Balkon/Terrasse-Aussage, wenn die IS24-Ausstattungsmaske
leer ist; (b) es klärt die § 556f-Frage — Erstbezug 2025 ⇒ Mietpreisbremse nicht anwendbar, ein
Altblock ⇒ Feld 1991–2008 (Spalte C 9,28–9,45, zulässig ~10,4). Beide Lesarten nennen, Baujahr steht
auf keiner Anzeige. Preisniveau: ~11–12 EUR/m² kalt kam dort 2026 vor (unter dem Angebotsanker).
Genutzt auf #563. *Why:* ohne den Anker kostet jede Fahrland-Wohnung zwei Websuchen, und die
unausgefüllte `obj_balcony: n`-Maske einer Mieternetzwerk-Anzeige bleibt unentscheidbar.
**Nachtrag #594: es gibt in Fahrland eine dritte, mittlere Baualtersklasse — Feld 2013–2020.** Die
bisherigen zwei Lesarten (Behnke-Erstbezug 2025 ⇒ „ab 2021" + § 556f · Altblock ⇒ 1991–2008) decken
den Bestand nicht ab: #594 zeigte per Foto ein modernes 3-geschossiges MFH mit Satteldach, Klinker-
sockel, Lochblech-Balkonbrüstungen, bodengleicher Dusche, Wand-WC mit Vorwandspülkasten, Vinyl-
Dielen und integrierten Rollladenkästen, in einem jungen Quartier mit Reihenhäusern und frisch
gepflanzten Bäumen — also **ca. 2015–2020**, nicht 1991–2008 und nicht 2025. Richtiges Feld bei
71 m² (Spalte C) = **12,06 (11,23–12,74)**, zulässig 13,27; die Anzeige lag mit 12,32 EUR/m² kalt
**+2 % über dem Mittelwert und innerhalb der Spanne**. Die 1991–2008-Lesart (9,28, zulässig 10,21)
hätte daraus fälschlich „+33 %, § 556g-Rüge" gemacht. Und: Erstbezug nach dem 01.10.2014 ⇒ § 556f,
Mietpreisbremse ohnehin nicht anwendbar. Preisniveau Fahrland 2026 damit **11–12,3 EUR/m² kalt** im
Bestand, ~16,9 EUR/m² bei Neubau-Angeboten (Vergleich: Seeburger Chaussee 2, 75 m², 3 Zi, 1.265 EUR).
*Why:* der Ortsteil-Anker bot nur die beiden Extremklassen an — bei einer Anzeige ganz ohne Baujahr
und Energieausweis entscheidet allein das Bildmaterial, welches der drei Felder gilt (vgl. die
Gegenprobe-Regel oben), und zwischen 9,28 und 15,72 liegt Faktor 1,7.
**Nachtrag #626/#495: vierter Fixpunkt = `Gartenstraße 17` (MFH im Fahrlander Ortskern, Bj. 1996,
Verbrauchsausweis C / 83 kWh, Fernwärme, 4 Etagen mit Personenaufzug, Tiefgarage, 94-m²-DG-Wohnungen
mit Balkon + Keller + Gäste-WC).** Feld **1991–2008 · A+/A/B/C · Spalte E (>90 m²) = 9,91
(8,71–12,70), zulässig 10,90**; IS24-`priceBar` adressgenau **8,60–12,50 EUR/m²** (Gesamtband
7,10–15,20). Baujahr steht hier ausnahmsweise im Exposé — nicht raten. **Block B für diese Adresse:
3,8, nicht die 3,5 des Ketziner-Str.-Ankers** — Gartenstraße liegt im gewachsenen Ortskern mit
Nahversorgung/Kita/Schule fußläufig, während Ketziner Str. am Ortsrand hängt; #495 und #626 (dieselbe
Wohnung) sind beide mit 3,8 gescort, das ist der Referenzwert für den Ortskern.
*Why:* der Fahrland-Anker bot bisher nur Ortsrand-Neubau und „Bestand ohne Baujahr" an — dieses Haus
ist der einzige belegte 1990er-Fixpunkt, und ohne die B-Differenzierung schwankt derselbe Ortsteil
zwischen 3,5 und 3,8 je nachdem, welcher Anker zuerst gelesen wird.

## Ortsteil-Anker: **Golm (14476)** — drei Baualtersklassen, kein Ortsteil-Reflex möglich
Golm ist der **Top-Präferenz-Ortsteil des Profils und der Standort unseres Tauschangebots**
(In der Feldmark 29, Bj. 2024) — es kommen laufend Golm-Anzeigen in den Scan, meist ohne Baujahr.
Es gibt dort **keinen dominanten Gebäudetyp**: Dorfkern-/Vorkriegsbestand, 1990er-/2000er-Ergänzungs-
bauten rund um Uni-Campus und Bahnhof, und die Neubauquartiere der 2020er (Feldmark u. a.). Der
Mietspiegel-Befund kippt entsprechend komplett — bei 75–90 m² (Spalte D): **1991–2008 = 9,01
(8,27–9,69)** · **2013–2020 = 12,34 (10,90–14,23)** · **ab 2021 = 16,73 (14,88–19,64)**, also Faktor
1,9. ⇒ Immer **alle plausiblen Felder rechnen und nennen**, Baujahr als Kontaktfrage setzen, und die
Klasse per Bildmaterial eingrenzen (vgl. die Foto-Gegenprobe oben; Wand-WC mit Vorwandinstallation +
großformatige Fliesen + Kunststofffenster mit integrierter Jalousie ⇒ frühestens 2010er).
Infrastruktur für Block B: Bahnhof Potsdam-Golm (RB21/RB22) ~10 Min. zum Hbf, Uni-Campus/Max-Planck
fußläufig, Nahversorgung vorhanden aber dünn ⇒ realistisch **4,5–4,8**, nicht 5,0, solange keine
genaue Adresse dransteht. Preisniveau 2026: 14,71 EUR/m² kalt für 85 m² kam vor (#597) — das liegt
~5 % **unter** dem stadtweiten Angebotsanker 15,51 und ist für Golm unauffällig.
*Why:* ohne den Anker wird für jede Golm-Wohnung neu recherchiert, und der naheliegende Reflex
„Golm = Uni-Neubau ⇒ ab 2021 ⇒ § 556f, Bremse egal" ist bei zwei von drei Feldern schlicht falsch.

### Unterher: Quartier **„In der Feldmark"** (Golm, 14476) — eigener Sub-Anker
Das ist **unsere eigene Straße** (`swap_offer` In der Feldmark 29, Bj. **2024**, DIBAG Hausverwaltung
für **Bayerische Städte- und Wohnungsbau GmbH & Co. KG**). Anzeigen von dort tauchen wiederholt auf
(#660 als Wohnungsswap-Tauschanzeige, Headline `Wohnungsswap - In der Feldmark`) und nennen **nie**
ein Baujahr oder einen Energieausweis. Was man deshalb nicht neu recherchieren muss:
- **Baualtersklasse = ab 2021** ⇒ Mietspiegelfeld je m²-Spalte, und **§ 556f BGB ⇒ Mietpreisbremse
  nicht anwendbar** (trotzdem beide Begründungen in den Report schreiben). Der Unterschied ist groß:
  *ab 2021 · Spalte C* = **15,72 (10,52–19,00)** vs. *2013–2020 · C* = 12,06 (11,23–12,74).
- **Preisregime (EUR/m² kalt):** eigene Wohnung 1.025,25 ÷ 54,19 = **18,92** · #660 1.280 ÷ 70,53 =
  **18,15**. ⇒ ~18–19 EUR/m² ist dort normal und **kein Scam-Signal**, liegt aber über dem
  Profil-Cap `max_price_per_m2: 18` und ~15 % über dem Mietspiegel-Mittelwert.
- **Nebenkosten ≈ 3,50–3,55 EUR/m²** (eigene 189,68 ÷ 54,19 = 3,50; #660 250 ÷ 70,53 = 3,54).
  Deckungsgleiche NK sind zugleich der beste Beleg, dass eine Anzeige wirklich aus diesem Quartier
  stammt.
- **⚠ KORRIGIERT 2026-08-23 (#661): Das Quartier HAT Keller.** Die frühere Regel „kein
  Kellergeschoss im Quartier, Block E systematisch 2,0" ist **falsch** und darf nicht mehr
  angewandt werden. Beleg: dieselbe Wohnung wie #660, auf Immowelt ein zweites Mal über
  **Tauschwohnung.com** inseriert (`expose/3a7cb8ce-…`), führt im **vollständigen** Merkmale-Block
  (kein „Alle N Merkmale anzeigen" ⇒ nicht abgeschnitten) ausdrücklich den Chip **`Keller`** —
  neben `Barrierefrei`, `Einbauküche`, `Bad mit Dusche`, `Garten`, `Erdgeschoss`,
  `Bodenbelag: Fliesen, Parkett`. Die Wohnungsswap-Variante desselben Objekts zeigte nur **einen**
  Chip („Erdgeschoss") und 0 HTML-Treffer für `Keller` — die Merkmale waren dort schlicht nicht
  gepflegt, nicht abwesend.
  ⇒ **Für Feldmark-Anzeigen den Keller als vorhanden/offen behandeln, nicht als bestätigt fehlend.**
  Unsere eigene Wohnung (Nr. 29) hat laut `swap_offer.lacks` keinen — das ist eine Eigenschaft
  *dieser Einheit*, nicht des Quartiers; Kellerabteile sind offenbar nicht jeder Wohnung zugeordnet.
  Kontaktfrage bleibt: lässt sich für Nr. 29 ein Abstellraum nachmieten?
  *Why:* die alte Regel hätte jede künftige Feldmark-Anzeige um einen ganzen Block-E-Punkt zu
  niedrig gescort — und zwar mit dem Etikett „vierfach bestätigt".
- **Vertragsform:** unser Vertrag ist **Indexmiete (§ 557b BGB)**; bei Nachbarwohnungen dasselbe
  annehmen und erfragen. Zusammen mit § 556f heißt das: bei Mieterwechsel ist die Miete **frei neu
  setzbar** — eine niedrige Bestandsmiete in einer Tauschanzeige ist keine Preiszusage.
- **Block B:** REWE und Bahnhof Potsdam-Golm fußläufig, Bushaltestelle direkt — das ist die *gute*
  Ecke Golms, also **4,8** statt der generischen 4,5.
- **Sonderweg statt Tausch:** wird dort eine Wohnung frei, sind wir Bestandsmieter **desselben**
  Vermieters ⇒ interner Wohnungswechsel über DIBAG (Carola Dembicki / Melanie Heinke) ist der
  bessere Pfad als ein Tausch — er braucht keine Tauschpartner-Zustimmung. Immer in „Next Steps".
*Why:* #660 wäre sonst als reiner Tausch-Discard abgelegt worden, obwohl die eigentliche Chance ein
Nicht-Tausch-Pfad im eigenen Haus ist — und Baujahr/Keller/Indexmiete werden dort sonst jedes Mal
als „unbekannt" gescort, obwohl sie firsthand feststehen.

## Umland: **Beelitz-Heilstätten** — eigener Mietanker + die 20-Minuten-Lüge der Exposés
Der Scan liefert laufend Neubau-**Reihenhäuser zur Miete** aus dem QUARTIER BEELITZ-HEILSTÄTTEN
(#207, #326, #336, #486, #611). Zwei Dinge, die sonst jedes Mal neu recherchiert werden:
- **Kein qualifizierter Mietspiegel** (Stadt Beelitz, Potsdam-Mittelmark); Beelitz steht **nicht** auf
  der Liste der 36 seit 01.01.2026 regulierten Brandenburger Gemeinden. Und die Häuser dort sind
  durchweg Bj. 2022/2023 ⇒ **§ 556f BGB, Mietpreisbremse ohnehin nicht anwendbar**. Trotzdem beide
  Begründungen in den Report schreiben (siehe Havelland-Abschnitt: nie bloß „not applicable").
- **Unser eigener Angebotsanker Neubau-Reihenhaus/DHH (Kaltmiete EUR/m²):** #336 12,49 (127,29 m²) ·
  #326 12,88 (144,76) · #486 13,00 (144,76) · #207 14,95 (106,97) · **#611 17,02 (105,16)**. Klarer
  Größeneffekt — die ~105-m²-Häuser liegen 15–30 % über den ~145-m²-Häusern. Adressgenaue Gegenprobe
  bleibt die IS24-`priceBar`: #611 lag mit 1.790 € im **58. Perzentil** des Bandes 990–1.870 €, also
  marktkonform trotz des hohen EUR/m².
- **Pendelzeit: die Exposés behaupten regelmäßig „Potsdam 20 min mit dem ÖPNV" — das ist falsch.**
  Der RE7 hält am Bahnhof Beelitz-Heilstätten (im Quartier) und fährt Richtung **Wannsee/Berlin**,
  nicht über Potsdam Hbf; realistisch **~34 min bis Potsdam Hbf mit Umstieg Wannsee** (so bereits auf
  #336/#486 recherchiert), Auto ~25 min / 24 km. Berlin Hbf ~38 min direkt stimmt dagegen.
  Block B deshalb nie auf die Exposé-Angabe stützen.
- **Anker für WOHNUNGEN in Beelitz (nicht Häuser), 2026:** Angebotsmarkt-Gemeindeschnitt
  **13,37–13,48 EUR/m²** (günstige Lagen ~12,27, gefragte ~14,96) — nur Angebotsmieten. Als
  ortsüblicher Proxy mangels Mietspiegel das gleichaltrige **Potsdamer** Feld ziehen und als
  solchen kennzeichnen (#605: Bj. 1999, EEK D, 65 m² ⇒ 1991–2008 · D–G · Spalte C = 9,45
  (8,20–11,51) ⇒ 12,25 EUR/m² lagen +30 % über dem Mittel und über dem Oberwert, während sie
  gegen den Beelitzer Angebotsanker *unter* Markt liegen). Beide Zahlen nennen — sonst liest sich
  derselbe Preis entweder als Schnäppchen oder als Wucher.
- **Ortsteil `Fichtenwalde` (14547) ist NICHT Beelitz-Heilstätten:** ~20–22 km SW von Potsdam,
  ~25 km von Golm, **kein Bahnhof im Ortsteil** (RE7 erst in Beelitz-Heilstätten, ~5 km, und
  Richtung Wannsee), Bus nur **Stundentakt** nach Potsdam, A9-AS Beelitz-Heilstätten vor der Tür
  ⇒ autoabhängig, Stellplatz faktisch Pflicht. Nahversorgung/Kita/Grund- und Oberschule im Ort,
  Naturpark Nuthe-Nieplitz. **Wohnungs-Block B = 2,0** (#605).
- **Block-B-Kalibrierung:** vor der Profiländerung vom 2026-08-11 bekam Beelitz 2,0–2,5 (#336, #486).
  Seitdem ist Beelitz Teil des vom Nutzer akzeptierten **RE7-Korridors** (bislang nur in der
  *Hauskauf*-Suche, sinngemäß aber auf Haus-**Mieten** übertragbar) mit der Vorgabe „unter
  Werder/Teltow, aber nicht mehr außerhalb des Suchgebiets" ⇒ **3,0** ist der aktuelle Wert (#611).
  Bei Wohnungen (nicht Häusern) bleibt es beim alten, niedrigeren Ansatz.
*Why:* fünf Beelitz-Bewertungen haben denselben Mietspiegel-, Pendel- und Block-B-Streit je einzeln
neu ausgefochten, und die 20-Minuten-Angabe aus dem Exposé hätte Block B um ~1 Punkt zu hoch gesetzt.

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

### Die **vollständige** 36-Gemeinden-Liste (ab 01.01.2026), damit sie nicht jedes Mal neu gesucht wird
`_shared.md` nennt bisher nur „u. a. Falkensee, Blankenfelde-Mahlow, Eichwalde, Glienicke/Nordbahn"
plus die drei Havelländer. Hier die ganze Liste (Quelle: MIL Brandenburg / Kabinettbeschluss
25.11.2025; „(neu)" = ab 2026 erstmals erfasst):
- **Dahme-Spreewald:** Bestensee (neu), Eichwalde, Königs Wusterhausen (neu), Schönefeld (neu),
  Schulzendorf, Wildau (neu), Zeuthen (neu)
- **Havelland:** Brieselang (neu), Falkensee, Schönwalde-Glien (neu)
- **Märkisch-Oderland:** Altlandsberg (neu), Fredersdorf-Vogelsdorf (neu), Rehfelde (neu),
  Strausberg (neu)
- **Oberhavel:** Birkenwerder, Glienicke/Nordbahn, Leegebruch (neu), Mühlenbecker Land,
  Oranienburg (neu)
- **Oder-Spree:** Erkner (neu), **Grünheide (Mark) (neu)**, Woltersdorf
- **Potsdam-Mittelmark:** Kleinmachnow, Nuthetal (neu), Stahnsdorf, Teltow, Werder (Havel) (neu)
- **Teltow-Fläming:** Blankenfelde-Mahlow, Großbeeren, Ludwigsfelde (neu), Zossen (neu)
- (+ Potsdam selbst und die übrigen Altfälle der 19er-Liste)

**Nicht auf der Liste** und daher regelmäßig als Gegenprobe gebraucht: **Beelitz**, Michendorf,
Borkheide, Brück, Nauen, Ketzin, Brandenburg an der Havel.
**Merke außerdem:** § 549 Abs. 2 Nr. 1 BGB nimmt **Wohnraum zum vorübergehenden Gebrauch**
(möbliert/auf Zeit/Monteur) ohnehin aus den §§ 556d ff. heraus — bei solchen Anzeigen also
beide Begründungen nennen (Gemeinde reguliert ja/nein **und** § 549), nie nur eine.
*Why:* #640 (Grünheide) kostete eine WebSearch nur, um festzustellen, dass die Gemeinde seit 2026
reguliert ist; die Verordnung wird jährlich neu erlassen → **jeden Januar gegenprüfen**.
→ **Promotion-Vorschlag:** diese Liste gehört in `modes/_shared.md`, Abschnitt „Brandenburg
Umland — regulated since 01.01.2026", der bisher nur „u. a." schreibt.
Stabile Jahresdaten → **Kandidat zur Promotion nach `modes/_shared.md`** (Mietpreisbremse-Abschnitt),
wenn der Mietspiegel 2026 sich bewährt; Neuauflage voraussichtlich 2028.

## Berlin: **Berliner Mietspiegel 2026** — in 30 s per curl + pdftotext, keine WebFetch-Krücke
Gebraucht wird das regelmäßig, weil die Vonovia-„Potsdam"-Suche (perimeter 30 km) laufend
**Berliner** Wohnungen liefert (Kladow/Spandau, Zehlendorf, Staaken) — und Berlin ist per
Mietenbegrenzungsverordnung **flächendeckend reguliert** (keine Ausnahme für Randlagen).

    curl -sA "Mozilla/5.0" -o t.pdf https://mietspiegel.berlin.de/wp-content/uploads/2026/05/mietspiegeltabelle2026.pdf
    pdftotext -layout t.pdf - | less     # nur ~88 Zeilen, gesamte Tabelle

Die **Tabellen-PDF** (`mietspiegeltabelle2026.pdf`, ~140 KB) ist die richtige Datei — nicht
`mietspiegel2026.pdf` (1,6 MB Fließtext). `pdftotext -layout` liefert sie sauber; **kein**
Read-mit-`pages`-Umweg nötig (anders als beim Potsdamer PDF).
**Layout-Falle:** die drei Wohnlagen stehen **nebeneinander in einer Zeile** — Spaltenblock 1
(Zeilen-Nr. 1–67) = *einfache*, 2 (68–129) = *mittlere*, 3 (130–192) = *gute* Wohnlage. Wer nur
grept, erwischt die falsche Lage. Der Baualters-Header steht nur in der ersten Zeile der Gruppe,
die Größenbänder darunter erben ihn.
Werte gelten Stichtag 01.09.2025, Nettokalt, vollausgestattet; zulässig = Mittelwert **+10 %**
(Baujahr ≤ 31.12.2024, sonst § 556f).

Anker (Bj. **1973–1985 West**, **ab 85 m²**), genutzt auf #515 Lanzendorfer Weg 27, Kladow:
| Wohnlage | untere | Mittelwert | obere |
|---|---|---|---|
| mittel (Zeile 95) | 6,79 | **8,35** | 10,70 |
| gut (Zeile 157) | 7,98 | **10,39** | 13,80 |

→ Vonovia rief dort **16,13 EUR/m²** auf = ~55 % über dem Mittelwert der guten Lage und über
deren oberem Spannenwert. **Berliner Bestandsbauten der 70er sind bei Vonovia routinemäßig weit
über der Mietpreisbremse bepreist** — immer § 556g Abs. 3 BGB (Vormiete + Modernisierungskosten)
als Next Step in den Report schreiben, nie „compliant" ohne Rechnung.
**Why:** ohne diese Notiz kostet jede Berliner Wohnung aus dem Potsdam-Bucket eine neue
PDF-Suche — und die nebeneinanderliegenden Wohnlagen-Blöcke führen zuverlässig zum falschen Wert.

### Wohnlage **hausnummerngenau** in EINEM curl — GDI-Berlin WFS (kein PDF, kein Schätzen)
Erledigt das bisherige „solange ungeprüft beide Werte nennen"-Provisorium. Es gibt **kein**
Straßenverzeichnis-PDF mehr (`strassenverzeichnis2026.pdf` u. ä. → 404); die Wohnlagen 2026 liegen
als WFS-Layer vor. Einstieg steht auf
`mietspiegel.berlin.de/berliner-mietspiegel/erlaeuterungen-zum-mietspiegel/wohnlagen/`
(einziger Link dort: `gdi.berlin.de/view/wohnlagenadr2026`).

    curl -sG "https://gdi.berlin.de/services/wfs/wohnlagenadr2026" \
      --data-urlencode "service=WFS" --data-urlencode "version=2.0.0" \
      --data-urlencode "request=GetFeature" \
      --data-urlencode "typeNames=wohnlagenadr2026:wohnlagenadr2026" \
      --data-urlencode "outputFormat=application/json" --data-urlencode "count=30" \
      --data-urlencode "CQL_FILTER=strasse LIKE 'Machnower%' AND plz='14165'"

Felder: `strasse` · `hnr` (**dreistellig nullgepolstert + Buchstabe**: `011`, `002A`) · **`wol`**
(`einfach|mittel|gut`) · `plz` · `stadtteil` · `bezname` · `plr_name`. Property-Namen erraten geht
schief (`strname` → `Illegal property name`) — im Zweifel `request=DescribeFeatureType`.
Praxistipp: nicht auf die exakte Hausnummer filtern, sondern `strasse LIKE '…%'` + PLZ ziehen und
die Liste lesen — man sieht dann sofort, wie fein es wechselt.

**Die Einstufung springt von Haus zu Haus, nicht straßenweise.** Machnower Straße 14165: Nr. 11 =
**gut**, die direkten Nachbarn 10 und 12 = **mittel** (durchgehend alternierend ungerade=gut /
gerade=mittel). Der Unterschied ist bei „bis 1918 / 90–110 m²" 7,65 vs. 8,45 EUR/m² Mittelwert,
also ~10 % auf die zulässige Miete — „Zehlendorf ist doch gute Lage" als Annahme ist ein Münzwurf.
**Why:** #570 Machnower Str. 11 — ohne den WFS hätte der Report zwei Werte hedgen müssen; mit ihm
steht adressgenau `gut`/Zeile 138 (6,60 · **8,45** · 12,99) und die Mietpreisbremse-Rechnung ist
belastbar statt „konservativ geschätzt". Layer-Name enthält das Jahr → im Januar auf
`wohnlagenadr20NN` hochzählen.

## Quartiers-Anker: **Jutekiez / alte Jutespinnerei (14473, Lotte-Pulewka-Str. / Wiesenstr.)**
Ehemalige **Jutespinnerei, Baujahr 1863** (älteste erhaltene auf dem europäischen Festland), ab 2014 aus
der Ruine denkmalgerecht zu Lofts umgebaut, fertig **2017/2019** (Quellen nennen beide Jahre — offene
Frage) → **29 Eigentumswohnungen 67–125 m²** in der Fabrikhalle plus **414 Mietwohnungen in sieben
Neubaukomplexen** ringsum. ⇒ **Es kommen laufend Geschwistereinheiten in den Scan** (Miet- *und*
Loft-Bestand), Ortsteil im Scan hoch halten.
**Die Ortsteil-Zuordnung ist strittig und kostet sonst jedes Mal zwei Suchen:** Immowelt taggt
„**Teltower Vorstadt**", das Straßenverzeichnis sagt „**Südliche Innenstadt**", der Stadtplan
„**Zentrum Ost und Nuthepark**" — **PLZ 14473 ist bei allen dreien identisch und damit gesichert**.
Ohne Scoring-Folge: alle Kandidaten liegen in Potsdam (= preferred), und das Mietspiegelfeld hängt an
Baualter × EEK × m², nicht am Ortsteil. Prosa-Landmarke, die das Quartier eindeutig identifiziert:
„restaurierte Jute-Fabrik" / „Jute-Kiez".
**Mietspiegelfeld — die eigentliche Falle ist das nie genannte Baujahr, beide Zeilen rechnen:**
Hypothese A (Baualter folgt dem Loft-Umbau = Sanierung auf Neubaustandard; die Wohnungen existierten
vorher **nicht**, Lehrbuchfall) → **2013–2020 · alle EEK**, bei >90 m² Spalte E = **12,39 (10,31–14,00)**
⇒ zulässig 13,63. Hypothese B (Hülle von 1863, kein EA) → **bis 1948 · kein EA · Spalte E = 8,17
(5,90–9,40)** ⇒ zulässig 8,99, Oberwert-Decke 10,34. **Faktor ~1,5 zwischen beiden — A ist tragend.**
**§ 556f: Erstnutzung als Wohnraum nach dem 01.10.2014 ⇒ Mietpreisbremse sehr wahrscheinlich gar nicht
anwendbar** (Fabrikhalle → Wohnungen). Praktische Folge für Tausch-/Nachmieterfälle: beim Neuvertrag
gibt es dann **keine gesetzliche Decke**; realistisches Neuvertragsniveau für ein konvertiertes
Denkmal-Loft mit Stellplatz **15–17 EUR/m² kalt**.
Lage: ca. **1,5 km östlich Potsdam Hbf** (RE1 Berlin ~25 Min., S7 Wannsee ~10 Min.), Nuthepark direkt,
Babelsberg jenseits der Nuthe → **Block B 4,5**. **Caveat: Nuthestraße (B2) + Bahnkorridor** — die
Lärmseite der konkreten Wohnung ist auf Exposés nie angegeben, gehört in die Kontaktfragen.
**Spalte D (>75–90 m²), damit man sie nicht nachschlagen muss:** Hyp. A `2013–2020` = **12,34
(10,90–14,23)** ⇒ zulässig 13,57 · Hyp. B `bis 1948 · kein EA` = **7,83 (6,51–9,24)** ⇒ zulässig 8,61.
**Die 15–17-EUR/m²-Neuvertragsprognose ist inzwischen BESTÄTIGT — zwei Einheiten derselben Fabrikhalle
im Vergleich:** #666 (4 Zi, 98 m², **13,27** kalt) ist ein *Bestands*vertrag, #694 (3 Zi, 86 m²,
**16,57** kalt, frisch inseriertes Nachmietergesuch) ein *Neu*vertrag — **+24,9 %**, exakt das für
#666 vorhergesagte Reset-Band. Also: bei Jutekiez-Inseraten erst fragen, ob der Preis ein Altvertrag
(Tausch/Nachmieter mit Vertragsübernahme) oder ein Neuvertrag ist; **13 EUR/m² = Bestand, ~16–17 =
Neuvertrag, beides quartiersüblich**. Nutze die jeweils andere Zahl als adressgenaues
Vergleichsobjekt — das ist der stärkste Beleg im ganzen Block A und kostet einen Grep.
**Lärm-Caveat ist jetzt fotografisch belegt, nicht mehr Vermutung:** #694 Foto 8 zeigt von der Terrasse
aus direkt gegenüber den **Bahnkorridor mit abgestellten Regionalzügen**. Die Fotos der Loft-Einheiten
stammen fast alle aus der Zeit direkt nach dem Umbau (~2017/2019, Baustelle im Bild) — die Freiflächen
davor sind inzwischen mit den sieben Neubaukomplexen bebaut, Blick *und* Schallweg haben sich also
geändert. Foto-Alter deshalb immer mitlesen: es belegt das Objekt, nicht den heutigen Zustand.
Genutzt auf #666, #694. *Why:* ohne den Anker recherchiert jede Jutekiez-Wohnung Baujahr, Ortsteil, § 556f
und Mietspiegelfeld neu — und tippt bei „restaurierte Fabrik" leicht auf die Altbauzeile, was die
Mietpreisbremse-Bewertung um 62 % verzerrt.

## Baualter 1991–2008: die EEK-Zeile entscheidet über die **Spannenbreite**, nicht über den Mittelwert — ein *besserer* Energieausweis macht die Mietpreisbremsen-Rüge STÄRKER
In der Klasse **1991–2008** liegen die beiden EEK-Zeilen im Mittelwert praktisch gleichauf
(Spalte C: `A+,A,B,C` = **9,28**, `D,E,F,G` = **9,45**), aber die **Spannen** unterscheiden sich
drastisch: **8,88–10,29** vs. **8,20–11,51**. Weil „zulässig" = *Spanneneinordnung* + 10 % ist,
kippt derselbe Quadratmeterpreis je nach Energieausweis in ein anderes Ergebnis:
- EEK **C** → Oberwert 10,29 → maximal deckbar **11,32 EUR/m²**
- EEK **D** → Oberwert 11,51 → maximal deckbar **12,66 EUR/m²**

Direkter Beleg, zwei Nachbarhäuser im selben Quartier mit **exakt demselben Preis von 12,10 EUR/m²**:
**#679** (Maxie-Wander-Str. 8, EEK **D**) = „grenzwertig, am Oberwert gerade noch deckbar";
**#678** (Maxie-Wander-Str. 6, EEK **C**) = **in jeder Lesart überschritten** (+30,4 % über
Mittelwert, +17,6 % über Oberwert, 57–137 EUR/Monat Hebel). Praxis: bei Baujahr 1991–2008 immer
zuerst `obj_energyEfficiencyClass` lesen und den **Oberwert** der passenden Zeile ×1,1 rechnen —
nicht nur den Mittelwert ×1,1.
**Why:** ohne diese Unterscheidung wird derselbe Preis in zwei benachbarten Bewertungen einmal als
compliant und einmal als Verstoß gemeldet, oder — schlimmer — der stärkste Verhandlungshebel eines
gut gedämmten Baus geht verloren, weil man intuitiv annimmt, ein besserer Energieausweis
rechtfertige eine höhere Miete.
