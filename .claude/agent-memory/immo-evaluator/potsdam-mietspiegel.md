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

**Mikrolage: `Alt Nowawes` ist die Hauptdurchgangsstraße mit Gleisen in der Fahrbahn** (Tram 94/99,
Bus 694, Nachtbus N14; Haltestelle „Alt Nowawes" zwischen Rathaus Babelsberg und
**Humboldtring/Nuthestraße** — die mehrspurige Ausfallstraße liegt am westlichen Ende, ca. lng 13,089).
S-Bahnhof Potsdam-Babelsberg (S7) ~450 m → Potsdam Hbf ~4 Min., Berlin-Wannsee ~7 Min. Also: Block B
in Babelsberg Nord **4,0 an Alt Nowawes/Durchgangsstraßen, 4,5 in den Seitenstraßen** — Lärm (Tram bis
in die Nacht) als Besichtigungspunkt setzen, nicht als Abwertung ohne Beleg.
*Why:* ohne den Anker kostet jede Babelsberg-Wohnung eine ÖPNV-Recherche, und die 15–18 EUR/m² lesen
sich gegen den stadtweiten Angebotsanker 12,60–13,50 nur „etwas teuer" statt nach dem tatsächlichen
Faktor 2 gegenüber der ortsüblichen Vergleichsmiete.

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
