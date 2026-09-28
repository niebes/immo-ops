# Potsdam Mietspiegel — the real ortsübliche Vergleichsmiete (NOT the portal "Mietspiegel" pages)
Applies to: every Miete evaluation in Potsdam and the Brandenburg Umland (all portals). A data source, not a portal quirk.
Consolidated 2026-09-28 from a 120 KB append log. First half: source, table, how to apply it, general rules, Umland/Brandenburg. Second half ("Ortsteil- und Quartiers-Anker"): 14480 Am Stern/Drewitz/Kirchsteigfeld · 14478 Waldstadt/Brunnen Viertel · 14482 Babelsberg · 14471 Potsdam West · 14473 Speicherstadt/Brauhausberg/Lotte/Jutekiez · 14469 Jägervorstadt/Bornstedter Feld/Eiche · 14476 Golm/Feldmark/Fahrland. Berlin: [[berlin-mietspiegel]].

> **PROMOTED 2026-08-02 → `modes/_shared.md`**, "Mietspiegel & Mietpreisbremse — regional reference data (SSOT)". That section is authoritative for the Grundmietentabelle, the Brandenburg-2026 list and the priceBar caveat on the scam signal. If this file and `_shared.md` ever disagree, `_shared.md` wins; fix this file.

**The trap:** "Mietspiegel Potsdam" searches return IS24/immoportal/miet-check pages quoting 12,6–13,5 EUR/m². That is the *Angebotsmiete*, not the ortsübliche Vergleichsmiete (§ 558d BGB), which is roughly **half** of it for Plattenbau stock. Using it makes almost every listing look "at market" and kills the Mietpreisbremse check.

## Source
- Official PDF: `https://www.potsdam.de/system/files/document/Mietspiegel_2026_A5_webdatei_neu.pdf` (Mietspiegel **2026**, in force since 25.06.2026, replaces 2024; index `potsdam.de/de/mietspiegel-0`). The next edition is expected in 2028.
- **Fetch with `curl -sL -o ms2026.pdf … && pdftotext -f 1 -l 6 ms2026.pdf -`.** That gives the whole Vorspann as greppable text in one call.
  - WebFetch cannot parse the PDF; it only saves the bytes, which you then Read with `pages:` (table = page 6, Spanneneinordnung = 8–9, Begriffe = 10–11).
  - Use Read + pages only for the table layout.

## Grundmietentabelle 2026 — Nettokaltmiete EUR/m², Mittelwert (Spanne)
Columns by Wohnfläche: A ≤45 · B >45–60 · C >60–75 · D >75–90 · E >90 (bis 1948 uses A ≤45; the 1949–1970 group shifts to A ≤40, B >40–60).

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

- Wendebauten = Plattenbau Drewitz, begun before 03.10.1990 and finished by 1991.
- The Baualter stays after modernisation; only a Sanierung to Neubau standard moves the class.
- **1971–1990 has NO "kein EA" row** (only A,B · C,D · E,F); only bis 1948 and 1949–1970 have one. For a Platte without an EA, cite the whole band, e.g. Spalte C 5,69 / 5,82 / 6,06, overall 5,19–6,88 (#670). Guessing E,F lowers the benchmark by up to 6 % and fakes an "over Mietspiegel" finding.

## How to apply it
1. Field = Baualtersklasse × EEK row × m² column. Start at the **Mittelwert**.
2. Spanneneinordnung (PDF p. 8–9): wohnwerterhöhende minus -mindernde points = a %-share of the way from the Mittelwert toward the Ober-/Unterwert. Ober- and Unterwert are hard bounds.
3. **Mietpreisbremse: zulässig = ortsüblich +10 %.**
   - Exceptions: § 556e (a higher Vormiete may be carried forward, the norm for Nachmietergesuche) and § 556f (umfassende Modernisierung, or Erstbezug after 01.10.2014; § 556f covers only the FIRST letting after a modernisation).
   - So an overshoot is a **§ 556g Abs. 3 Auskunft / negotiation lever**, never an exclusion.
4. **Always give BOTH numbers:** ortsüblich AND the Angebotsanker (below). Otherwise a market-normal price reads as Wucher, or the reverse.
5. **When the Baujahr is unknown, compute every plausible field side by side**, say which one flips the verdict, and make the Baujahr a contact question.
6. **Column-edge sensitivity:** within ~1 m² of a column edge (45/60/75/90), compute both columns. Neighbouring fields differ by ~8 %, and the area is only "ca." (#627: 60,1 m² → C = exceeded; B would be compliant). Same at 75 m² (#702) and 90 m² (#730).
7. **In 1991–2008 the EEK row changes the SPAN, not the Mittelwert.** Spalte C: A+–C 9,28 (8,88–10,29) vs D–G 9,45 (8,20–11,51). The maximum defensible rent is Oberwert × 1,1 = 11,32 for EEK C vs 12,66 for EEK D.
   - Neighbouring houses at the same 12,10 EUR/m²: #679 (EEK D) is borderline, #678 (EEK C) exceeds the limit in every reading.
   - So a BETTER Energieausweis makes the Rüge STRONGER. Always read the EEK first and compute Oberwert × 1,1, not only Mittelwert × 1,1.
8. **Several legal grounds can apply at once, and then name all of them** (#725 houseboat: § 556f + § 549 Abs. 2 Nr. 1 möbliert + the Mietspiegel covering neither furnished space nor floating homes). Phrase it as "no price lever: expensive, but legally unassailable". With only one ground named, the report sends the user into a negotiation that doesn't exist.

## Scope — houses, exceptions
- **EFH/ZFH/Reihen-/Doppelhäuser: the field is a LOWER bound, not an upper one.** Vorspann p. 2–3: "nur eingeschränkt, da keine Datenerhebung"; BGH VIII ZR 58/08 ("erst recht" in a house), BGH VIII ZR 54/15 (a formal reference to the Mietspiegel suffices for a Reihenendhaus).
  - The Mietpreisbremse still applies (§ 556d covers Wohnraum), but ortsüblich must be shown via Vergleichsobjekte. Report it as a § 556g Abs. 3 lever, never "not applicable".
  - The unnumbered "erst recht" surcharge doesn't cover everything: #589 (DHH Neu Fahrland, Bj 2002, EEK C, 94,94 m², 19,49) was +96,7 % over the Mittelwert 9,91 and +53,5 % over the Oberwert 12,70.
- **Also excluded:** öffentlich geförderte Wohnungen, Wohnheime, betreute Heime. **Surcharges for (teil-)möblierte flats and Untermiete are not covered** (a furniture surcharge can't be tested against the Mietspiegel, #255/#311).
- **The Mietspiegel explicitly covers all Ortsteile** (Fahrland, Neu Fahrland, Golm, Groß Glienicke, Marquardt, Satzkorn, Uetz-Paaren): no "it's a village" discount.

## Angebotsmarkt anchors Potsdam 2026 (quote these alongside ortsüblich, never as a substitute for it)
- **Häuser ~17,61 EUR/m² · Wohnungen ~15,51 EUR/m²** (08/2026). Best areas ~17,24, cheap areas ~10,63; portals also print 12,80–15,14 as the city average.
- For a HOUSE rent use the house anchor (#589: +11 % vs 17,61 but +26 % vs 15,51, which flips "upper market edge" vs "clearly above market").
- **The address-precise IS24 `priceBar` beats every Ortsteil anchor.** It swings ~40 % within one street (Alt Nowawes #588 vs #681, see the 14482 anchor below). An Ortsteil anchor is only a plausibility frame.

## General rules — deciding "verdächtig billig" and the Baualter
- **"Cheap vs 13 EUR" is usually just the building type (Plattenbau inversion).** Against the Angebotsmarkt, 1971–1990 stock at 7–9 EUR/m² looks −30 %, but against its own field (5,5–6,9) it is often ABOVE ortsüblich and exceeds the Mietpreisbremse (#513: Erich-Pommer-Str., Bj 1987, EEK C, 68 m², 9,06 = +56 % over the Mittelwert 5,82; zulässig 6,88).
  - First datapoint: #504 Caputher Heuweg 61, Waldstadt II, 11,59 EUR/m² vs a 1971–1990 Mittelwert of 5,69–6,06.
  - So pull the Plattenbau field first on any "suspiciously cheap" flag from Drewitz, Am Stern, Waldstadt, Schlaatz or Zentrum Ost. It is not a WBS indicator: check WBS separately via the `Wohnberechtigung` keyword.
  - The rule depends on the BAUALTER, not on the Großsiedlung: it holds in rural Ortsteile too (#627 Groß Glienicke, Bj 1985, 6,61 = +13,6 % over the Mittelwert, Bremse +3,2 %). The first question is always the Baujahr, not the Ortsteil.
- **Genuinely cheap vs a bait price — the Unterwert is the dividing line.** Three tests, in order:
  1. **Inside or below the official span?** Inside = ortsüblich by definition (#684 5,83; #627 6,61, even +5,8 % over the Oberwert; #558 7,59; #670 5,23 = exactly the Unterwert of 1971–1990 C,D Spalte C). Only BELOW the Unterwert does the price itself need explaining (#686: 7,69 on Bj 2011 → field 12,01 (10,30–13,84) = −25,3 % under the Unterwert ⇒ bait).
  2. **A named mechanism?** Genossenschaft/Nutzungsentgelt, old stock + sitting tenant, 1971–1990. A private landlord re-letting has no vehicle for a Bestandsmiete. Sweep `Genossenschaft|Genossen|Sozial|Wohnberechtigung|WBS (case-sensitive)|Nachmieter|Tausch`; 0 hits on a private landlord = no explanation.
     - The WBS/Förderung sweep list used on #670: `WBS, Wohnberechtigung(sschein), Sozialwohnung, sozialer Wohnungsbau, Genossenschaft, gefördert, Belegungsbindung, Belegungsrecht, Fehlbelegung, Mietobergrenze, einkommensorientiert, ProPotsdam, GEWOBA`.
     - Rule of thumb for Drewitz: from ~5,20 EUR/m² upward is normal at 60–75 m²; only below that is the WBS question worth asking.
  3. **Kapitalwertprobe:** street purchase EUR/m² × m² = value, and gross yield = Kalt × 12 ÷ value. 3–5 % is realistic in Potsdam; **below ~2 % the letting is economically impossible** (#686: 5.796 EUR/m² × 117 m² ≈ 678 k ⇒ 1,59 %). The query `"{Straße} {PLZ} Wohnung"` returns the street EUR/m² via the IS24 atlas pages.
  - **Extra check: NK per m².** 2,50–3,50 is plausible. #686 claimed 1,03 with Fußbodenheizung + Aufzug + Garage, so the Warmmiete was invented too (same signature as #320: warm = kalt = 700). Genuinely cheap ads have plausible NK or none at all.
  - **Our own reports are an address-precise comparable source.** `grep -rn "{Straße}" reports/ data/listings.md data/scan-history.tsv*` found the same street, No. 8, at 16,90 and 18,90 EUR/m² for #686 (−54,5 %). That satisfies the `_shared.md` requirement for the High signal without a priceBar.
- **Verify the Baualter from the PHOTOS before taking the Ortsteil's default class** (classes differ by up to 1,4×–2,7×):
  - Kassettentüren, profiled Türbekleidungen, a Deckenhohlkehle, high ceilings, deep reveals → pre-war, **bis 1948**.
  - Smooth doors, a low ceiling, precast joints → Plattenbau.
  - Wand-WC with Vorwandinstallation + large-format tiles + plastic windows with integrated blinds → 2010s at the earliest.
  - #558 (Sonnentaustr. 15, `geo_ot: waldstadt_ii`, 83 m², 7,59): the Ortsteil default gave 1971–1990 D = 5,63 → "exceeded", while the one hallway photo showed Kassettentüren + Hohlkehle → bis 1948 kein EA D = 7,83 → **compliant**. The Ortsteil gives the hypothesis; the photo decides. Name both fields anyway.
- **Get the Baujahr HARD for listed buildings: Wikipedia "Liste der Baudenkmale in Potsdam/{Anfangsbuchstabe}"** (pages split by street initial, e.g. `/wiki/Liste_der_Baudenkmale_in_Potsdam/S`) gives Baujahr + architect + Denkmal-ID per house number in one WebFetch.
  - The exposé wording "Ein Energieausweis ist für diesen Gebäudetyp nicht notwendig" (§ 79 Abs. 4 GEG) is itself the hint: Denkmal → bis 1948 → kein-EA row. It is falsifiable against a Baujahr (see [[immowelt]] §Energy).
  - #596 Stiftstr. 8a → 1896, Otto Kerwien, ID 09156593 → bis 1948 kein EA E = 8,17 (5,90–9,40), zulässig 8,99 (1.051 EUR) vs the asked 1.400 = +33 %. § 556f is excluded by Bj 1896. Against the Angebotsmarkt, the same price is cheap.
- **Bestandsmiete in a swap or Nachmieter ad:** ~½ the Angebotsanker = an Altvertrag, which never fires the ">20 % below" signal. See [[tauschwohnung]] §Economics.

## Umland — Brandenburg regulation 2026, Havelland, Potsdam-Mittelmark
- **The Brandenburger Mietpreisbegrenzungs-/Kappungsgrenzenverordnung** (Kabinett 25.11.2025) covers **36 Gemeinden from 01.01.2026** (previously 19). It only covers buildings completed before 2014 (Neubau exempt); zulässig = ortsüblich +10 %, Kappungsgrenze 15 % in 3 years. It is re-issued yearly: **re-check every January.**
- **Never write "Mietpreisbremse: not applicable" for a Speckgürtel rental** (report #246 of 02.07.2026 was already wrong). These Gemeinden have no qualified Mietspiegel, so phrase it as the § 556g Abs. 3 lever (ask for Vormiete + Baujahr). As the ortsübliche proxy, take the same-age **Potsdam** field and label it as a proxy.
- **The list of covered Gemeinden (and the NOT-covered cross-check) is in `modes/_shared.md`** → Brandenburg Umland. Promoted 2026-09-28.
- **§ 549 Abs. 2 Nr. 1 BGB** exempts Wohnraum zum vorübergehenden Gebrauch (möbliert/auf Zeit/Monteur) anyway. Name both grounds (Gemeinde regulated y/n AND § 549).
- **Angebot anchors never fire the ">20 % below" signal alone.** The priceBar must also put the offer below `minSimilarPrice` (#507 Burgunderweg 5, Falkensee: −25 % vs the anchor, but P23 inside the address band 1.100–1.820, explained by Bj 1998 / EEK E).
- **Falkensee:** Angebot Häuser ~16,03, Wohnungen ~13,50–15,70 EUR/m². The priceBar is the best address source (#506 Rotkehlchenstr. 14,29 = P57).
- **Schönwalde-Glien:** Angebot Gemeindeschnitt ~14,02 (12,69–15,48); Häuser 13,19 (150 m²) – 14,55 (100 m²).
- **Beelitz / Beelitz-Heilstätten** (not regulated, no Mietspiegel; the Quartier houses are Bj 2022/23, so § 556f anyway. Name both grounds.)
  - Own Neubau Reihenhaus/DHH anchor (Kalt EUR/m²): #336 12,49 (127,29 m²) · #326 12,88 (144,76) · #486 13,00 (144,76) · #207 14,95 (106,97) · #611 17,02 (105,16). There is a size effect: ~105-m² houses sit 15–30 % above ~145-m² houses. #611 was P58 of the priceBar 990–1.870 EUR.
  - Beelitz WOHNUNGEN: Angebot 13,37–13,48 (cheap ~12,27, sought-after ~14,96). Proxy = the Potsdam field (#605: Bj 1999, EEK D, 65 m² → 1991–2008 D–G C = 9,45 (8,20–11,51), 12,25 = +30 %).
  - **Commute: exposés claim "Potsdam 20 min ÖPNV", which is false.** The RE7 runs Beelitz-Heilstätten → Wannsee/Berlin, not via Potsdam Hbf: ~34 min to Potsdam Hbf with a change at Wannsee; car ~25 min / 24 km. Berlin Hbf ~38 min direct is true.
  - **Fichtenwalde (14547) is not Beelitz-Heilstätten:** ~25 km from Golm, no station (RE7 ~5 km away), hourly bus, A9 junction ⇒ car-dependent. Wohnung Block B = 2,0 (#605).
  - Block B calibration: Beelitz houses (RE7 corridor, accepted by the user in the Hauskauf search since 2026-08-11 and applied to house rentals) = **3,0** (#611); flats stay lower (2,0–2,5).
- **Schwielowsee (Caputh / Ferch / Geltow, 14548)** — not regulated (+ § 556f if Bj ≥ 2014); name both grounds.
  - Proxy: the Potsdam field (2013–2020 E = 12,39 (10,31–14,00)).
  - Angebot ≈ 12,42 (Q1/2026), sought-after areas ≈ 17,56, cheaper ≈ 14,40. Near 12 is CHEAP in a Caputh premium location, not suspicious.
  - Bahnhof Caputh-Schwielowsee: RB23 ~13 min to the Hbf but only hourly; Bus 607/613; to Golm ~30–40 min with a change ⇒ car-leaning, always ask about a Stellplatz.
  - Wohnung Block B = **3,0** (outside the search area, no hard blocker since `acceptable_areas` is empty; #714).
- **Stahnsdorf (14532)** — REGULATED (on the list), but § 556f for Bj ≥ 2014; name both.
  - Proxy: ab 2021 E 15,14 (10,90–17,86).
  - Angebot Ø ~16,5 (12,7–21,1). immoportal's "Neubau ab 2021 26,04" is implausible; don't use it.
  - No rail: Bus 601 to Potsdam Hbf ~32 min every 20 min; Golm ≈ 50–55 min; car ~30 min.
  - Wohnung Block B = **2,5** (#799). It is an acceptable_area in the KAUF search only, not the Miet search.

## Ortsteil- und Quartiers-Anker
The numbers are data. Keep them, and append new datapoints to the matching Quartier instead of adding a new section. Master rule: **the Ortsteil name never fixes the Baualtersklasse.** Almost every Ortsteil below mixes 2–3 classes; the house number, the Baujahr or a photo decides.

### 14480 — Am Stern · Drewitz · Kirchsteigfeld (three Baualtersklassen in one PLZ)
- **Am Stern:**
  - Mostly Platte 1971–1990 (Spalte C 5,82 / 6,06), with interspersed Neubau riegels ab 2021 (C 15,72, D 16,73). That is a factor of ~2,7.
  - **Street-name heuristic:** astronomer/physicist streets (Newton, Galilei, Kepler, Ziolkowski, Schwarzschild) = Platte. The composer streets south of the Großbeerenstraße ("Musikerviertel": Schubert, Flotow …) are small-scale Siedlungs/EFH + 1980s Geschossbau, so bracket bis 1948 / 1949–1970 / 1971–1990 there (#525, #736).
  - Block B: Musikerviertel 4,0 (peripheral, bus-based) vs 4,5 at the Steinstraße (#677/#617/#337).
  - Neubau (Bj 2021):
    - **Ziolkowskistr. 2** (77 WE + 24 TG, Bedarfsausweis B / 56 kWh, KWK fossil, Fußbodenheizung, new-contract ~14,0 EUR/m², 2-Zi 62,54 m² = 876 EUR; a 6-storey build of up to 109 WE planned opposite = a multi-year construction-site con, #561)
    - **Schwarzschildstr. 28** (Max Müller Immobilien GbR, #523)
  - Platte:
    - **Lilienthalstr. 12** (TAG Stern-Wohnanlage, Bj 1975, #525)
    - **Hubertusdamm 43** (same TAG estate, 5-storey blocks with loggias, via Mapio `mapio.net/expose/3036523`, #843)
    - **Hubertusdamm 33** (Bj 1971, Verbrauchsausweis A / 42,6 kWh, Fernwärme, 4 storeys, no lift → 1971–1990 A,B; #856 Bärlin Housing)
  - **Ziolkowskistraße is mixed:** No. 2 = 2021, No. 8 = 1920–1949 (IS24 atlas), the core = Platte. A street-only ad can't be resolved, so bracket 1971–1990 / 1991–2008 / ab 2021 and call the Bremse "nicht abschließend bestimmbar" + § 556g Abs. 3 (#739: 11,08–12,58 = +79…103 % over Platte, +12…27 % over 1991–2008, −25…34 % under ab 2021). The priceBar (5,70–9,50, P83) proves "expensive for the area", not the Baualter.
  - **Am Stern asking corridor** (8 evaluated objects, a plausibility bound):
    - renovated Platte **7,66–11,18 EUR/m² kalt** (#146 7,66 · #149 9,46 · #279 10,07 · #192 10,13 · #239 10,63 · #231 11,18)
    - Neubau 2019/2021 **16,02–16,50** (#217, #105)
    - **Exception, Hubertusdamm row:** ~17 EUR/m² is real re-letting level for cosmetically refreshed Platte (#856 Bärlin Housing 16,99; so #843's "1.139 lt. Vermieter" at 17,00 was real, not a typo). That is a Mietpreisbremse case: § 556f needs an umfassende Modernisierung, and paint + vinyl isn't one.
    - Otherwise anything above ~17 in 14480 triggers the data-integrity check first: typo, Stellplatz/Möbel/Strom included, quarterly figure (#742: 27,65 warm → 23–25 kalt was +40–50 % over the most expensive Am-Stern object ever seen).
- **Drewitz:**
  - GDR Großsiedlung WBS-70/P2 **1986–1989** + Wendebauten to 1991. Since 2010 Stadtumbau "Gartenstadt Drewitz" (the Konrad-Wolf-Allee was narrowed; only SOME blocks were energetically renovated, so check per house).
  - Tram 96/99 → Hbf ~15–18 min, Stern-Center one stop, A115 AS Potsdam-Süd ~5 min, Parforceheide + Nuthewiesen.
  - Immowelt polygon bbox 13,1143–13,1496 O / 52,3500–52,3779 N (the south part is forest).
  - A "Dachgeschoss" in the Siedlung is atypical (flat roofs) = usually the top full storey of a 5-storey P2 block; almost never a lift.
  - #670: 62 m², 324 EUR = 5,23 = exactly the Unterwert of 1971–1990 C,D C. That is inside the span (−8…−14 % from the Mittelwert), so no scam signal and the Bremse is kept (zulässig 6,26–6,67).
  - **Alt Drewitz** (the historic village core, also 14480): a DG is normal there (Satteldächer, Vierseithof remnants, the Alt Drewitzer Dorfkirche visible on photos) → field **bis 1948** (D 7,83–9,15), not Platte.
    - Tells: "Ortskern", "historisches Flair", "nur 3 Parteien", an inner courtyard instead of a Balkon, Velux + an old whitewashed roof truss.
    - Block B clearly better than the Siedlung, with the same transit + RB from Rehbrücke ~18 min to Charlottenburg. 2026: 12,78 kalt for a renovated 90-m² DG (#767).
- **Kirchsteigfeld** (Bj 1993–1998 → field 1991–2008). Recognisable without an address (#593): a Bj in the text, a park-like estate of two houses on a quiet side street, Fernwärme, terrace/Wintergarten flats, Sterncenter walkable, A115 5 min. Bj before 01.10.2014 ⇒ **the Bremse applies**, unlike the 2021 riegels next door.
  - **Vonovia stock** (Maxie-Wander-, Anni-von-Gottberg-, Maimi-von-Mirbach-, Ricarda-Huch-Str., Am Hirtengraben):
    - Consistently **Bj 1995**, Fernwärme, EEK C–E, no Aufzug, Mieterkeller + Balkon/Loggia/Wintergarten, **no EBK** (only a sink + E-Herd), Kaution exactly 3,0 NKM, "Vonovia Kundenservice GmbH (Frau Schultze.)", Objekt-Nr. `82-13…`.
    - 4-Zi units: separate Gäste-WC, a ~13-m² kitchen, an Abstellraum (8 a has no lift).
    - Asking **10,7–12,1 EUR/m² kalt**.
    - **The m² COLUMN decides the verdict, and it is not monotonic:**
      - C (60–75) 9,28 / 9,45 → zulässig ~10,21–10,40 ⇒ the usual 12,10 **exceeds** it (#678 +137 EUR/month; #679 borderline)
      - D (75–90) 9,10 / 9,01 → zulässig **9,91–10,01, the minimum of the whole row** (#702, 76,02 m², 11,30: +105,60 EUR/month; but only 1,02 m² over the 75 edge, and at the C Oberwert 11,51 × 1,1 = 12,66 it would be covered ⇒ Next Step "check the Wohnfläche in the contract")
      - E (>90): EEK D–G 10,28 (7,91–13,71) → zulässig 11,31, **compliant** (#689, 93,51 m², 10,66); EEK C (A+–C row) 9,91 (8,71–12,70) → zulässig 10,90, so #728 (Anni-von-Gottberg-Str. 8 a, 95,6 m², 11,42, EEK C 79 kWh) is +4,7 % over the limit, but under the Oberwert and coverable by Spanneneinordnung ("borderline"). Read the EEK before choosing the row.
      - In short: C 10,21–10,40 · D 9,91–10,01 (min) · E 10,90 (EEK C) / 11,31 (EEK D–G). Never conclude "bigger ⇒ more headroom".
    - **The warm side is above benchmark throughout:** 4,9–5,3 EUR/m² (NK 2,3–2,9 + HK 2,4–2,6) vs Potsdam 3,0–3,8. Always a con + ask for the Betriebskostenabrechnung.
  - **Maxie-Wander-Str. 6 = Vonovia Bj 1995, no Aufzug, 12,10.** A private ad claiming Aufzug at 16,67 there was a fake (#775, see [[kleinanzeigen-de]] §Poster).
  - Kirchsteigfeld all-in warm surcharge ~4,7–4,9 EUR/m², used to decide a Teilwarm heading (#853).
  - #806: 702 EUR on 89,5 m² read as Kalt = 7,84 (a 90s Altvertrag).

### 14478 — Waldstadt I / II, Brunnen Viertel (three Neubau traps in a Plattenbau PLZ)
- **Waldstadt II, Zum Jagenstein / Saarmunder Straße = Wohnungsgenossenschaft "Karl Marx" Neubau ~2018/2019** (113 WE in 5 houses: two 4-storey + three 6-storey; barrierefrei, Laubengang, 113 TG, Fußbodenheizung, wood floors; 45 × 3-Raum / 38 × 2-Raum; the coop's HQ is Saarmunder Str. 2) → field **2013–2020**, § 556f (Erstbezug after 01.10.2014).
  - Spalte D 12,34 (10,90–14,23) instead of 5,63 (factor 2,2); Spalte C 12,06 (11,23–12,74) → zulässig 13,27.
  - Asking **13,48 kalt at 79 m²** (#585); 13,33 at 75 m² (#606).
  - **Identifiable without an address** (#606): PLZ 14478 · `Etage N von 4|6` · Fußbodenheizung · Personenaufzug + "stufenloser Zugang" · TG-Stellplatz · 3-Raum/75 m² · price level. Photos: white smooth doors, large grey tiles, Wand-WC, Wanne + glass shower, Fertigparkett, galvanised steel railings, a tree-canopy view (Ravensberge).
  - Genossenschaft ⇒ membership + shares, a second approval body, Eigenbedarf ~0. See [[wgkarlmarx-de]].
- **Waldstadt I, Tiroler Damm 16 A–E = ProPotsdam Neubau, completed Q2/2019** (5 five-storey houses, 95 WE, GALANDI SCHIRMER, barrierefrei, lifts in all houses, all flats with Balkon, bike rooms; **Keller undocumented**, always ask; ~50–95 m², mostly 2–3 Zi) → **2013–2020**, D 12,34 (10,90–14,23). § 556f ⇒ no Bremse and no legal cap on future increases (a risk in Block A/G).
  - **75 % belegungsgebunden** (5,50 EUR/m² with WBS, 7,00 WBS+40), only 25 % freifinanziert at ~12–13 kalt. So the WBS/Bindung status is THE contact question, and asks ≫ 13 kalt there are implausible, which means the figure is Warm (#607).
  - **Only 16 A–E is Neubau.** `Tiroler Damm 1` is 1960s Waldstadt block stock (4 storeys, WDVS, a stair-tower risalit, Trockenboden, a cellar corridor with exposed pipes, #795). There "Baujahr laut Energieausweis 2014" is the modernisation/certificate year, not Erstbezug (IS24's tooltip says so). Taking it moves the field from 1949–1970 (6,48) to 2013–2020 (11,66) and switches the Bremse off wrongly (18,33 EUR/m²: +183 %).
- **Brunnen Viertel, Brunnenallee** (Waldstadt I / Teltower Vorstadt; KW-Development on the former Plattenwerk site, architect Gregor Fuchshuber, 11 Stadthäuser, 49.700 m²; units named `Haus {röm.} – WE {n}`):
  - Residential part Brunnenallee 9–13 finished 2016–2018, fully occupied since spring 2019 → **2013–2020**: C 12,06 (11,23–12,74), D 12,34 (10,90–14,23). § 556f ⇒ no Bremse and no § 556g lever. Plus for stability: at ~38 % over ortsüblich, the § 558 headroom is ~0 (unless there is an Indexmiete).
  - **Asking band 15,16–16,70 EUR/m² kalt:** #510 (3A, Bj 2018, 76,84 m², 16,68) · #642 (Haus I/WE 8, 74,84 m², 16,70) · #692 (5, 75,04 m², 16,50, BUWOG) · #691 (5A, 72,74 m², 15,30, BUWOG) · #693 (3, 75,00 m², 15,16, BUWOG).
    - It correlates with area, not house: a price list, not a quality signal.
    - Block A: 4,3 is the norm; ≤ 15,5 earns A ≈ 4,6 (#691).
    - ≫ 18 would be new.
    - A tenant's ad shows the Altvertrag below the band (#723: the same unit as #642 at 1.100 = 14,70 on the plan area, while the owner asked 1.250); for Block A take the owner's ask.
  - **Haus I / WE 8 = 74,84 m²** (plans in #642 and #723; ads said 75 and 77). Areas in the quarter are up to ~3 % high, so take the Grundriss. At 74–76 m², compute Spalte C AND D.
  - **Energieausweis:** Bedarfsausweis B / 52 kWh, Fernwärme (#510, #692, #691, all Bj 2018). Credit it only from the unit's own exposé. Heating cross-check: 52 × m² × 0,13 ÷ 12 ≈ 0,56 EUR/m²/month; BUWOG charges ~0,99, i.e. conservatively ⇒ low Nachzahlung risk (a plus).
  - **Betriebskosten anchor: 3,47 EUR/m² warm surcharge** (NK 188 + HK 75 on 75,77 m², #758 Brunnenallee 1; HK not inside NK). Use it to split a Warm-only ad: kalt ≈ warm − 3,47 × m² (#803: 1.450 − 271 = 1.179 = 15,12; band with NK 3,00–4,00 = 14,59–15,59, verdict stable).
  - **Two owner layers that never dedup against each other:** 240 institutional rental flats (BUWOG/Vonovia group: No. 3/3a/5/7a, Objekt-Nr. `90-…` in OBJECT_INFO) and 129 ETWs of private owners (who rarely list themselves). A simultaneous BUWOG listing is almost always a DIFFERENT flat, not the landlord twin of a private Nachmietergesuch. The only real lever is unit identity from the Grundriss (`Haus N – WE n` + floor + m²). Block H: institutional (#510, low Eigenbedarf) vs private owner (#642, Medium) at the same price.
  - "Brunnenallee 1-7" is ONE block's number range: the same number + floor ≠ the same flat (#803 occupied until 30.11. vs #758 empty from 13.09.). The vacancy date is the sharpest dedup key here.
  - **Block B = 4,5:** Bhf Rehbrücke ~350 m (RE7/RB33), Tram 91 → Hbf ~11 min → Wissenschaftspark Golm (direct), Kita + Gymnasium in the quarter, Templiner See. Minus: ex-industrial land, the Wetzlarer Bahn, the busy Heinrich-Mann-Allee, and the commercial construction phase (8 office buildings, 2019–2025/26).

### 14482 — Babelsberg Nord / Süd / Medienstadt
- **Babelsberg Nord** = Gründerzeit Weberviertel (Nowawes) with interspersed Nachwende builds and young Neubau projects. Three possible rows:
  - **bis 1948 (the norm; Altbau ads usually have no EA → kein-EA row):** D 7,83 (6,51–9,24) → zulässig 8,61, Oberwert cap 10,16. #631 (Karl-Marx-Str., Bj 1912, kein EA, 85 m², 22,35 = ~2,9× ortsüblich; a Souterrain is wohnwertmindernd → toward the Unterwert).
  - **1991–2008:** D 9,10 (8,43–10,18) / 9,01 (8,27–9,69). #588 (Alt Nowawes 55b, Bj 2001, 89 m², 17,75 = P90, zulässig 10,01–11,20 → 583–689 EUR/month).
  - **ab 2021:** D 16,73 (14,88–19,64), e.g. "Wohnprojekt Altes Filmstudio Babelsberg" (Erstbezug 11/2021, by the Park). #724 76 m², 15,79 = −5,6 % under ortsüblich + § 556f ⇒ no lever at all.
  - Asking level 15–18 EUR/m² kalt ⇒ the § 556g lever is the norm for Altbau/Nachwende. Order: Baujahr < 01.10.2014 excludes § 556f; accept an "umfassende Modernisierung" only if both year AND cost are stated (a new bathroom on photos isn't one); then only § 556e remains.
  - **The priceBar varies ~40 % within one street:** Alt Nowawes 55b (#588) similar 9,20–14,90 (overall 7,30–18,90) vs 106A (#681) similar 7,10–10,70 (overall 5,80–13,00), ~500 m apart. The western end (Humboldtring/Nuthestraße, Nachwende) carries 15–18; the eastern end (Rathaus, Gründerzeit/Denkmal) sits near the Mietspiegel. Always pull the exposé's own priceBar; the Ortsteil anchor is only a frame (10,50 at 106A was P65 and over zulässig, not "35 % under market").
  - **Block B:** Alt Nowawes is the through-road with tram tracks in the carriageway (Tram 94/99, Bus 694, N14; the Humboldtring/Nuthestraße junction at the western end, lng ~13,089) = **4,0**; side streets **4,5**. S Babelsberg (S7) ~450 m → Hbf ~4 min, Wannsee ~7 min. Noise is a viewing point, not a deduction without evidence.
- **Babelsberg Süd** (same PLZ, different price picture). Keep the anchors separate.
  - **Older, cheaper stock:** priceBar similar 6,10–9,60 (overall 4,90–12) ≈ Mietspiegel level. #615 (60 m², 3 Zi, 11,08 = P87, cheap vs the city anchor but above the local band).
  - **Villa/EFH edge toward Park Babelsberg/Griebnitzsee:** 1990s/2000s Nachwende builds, often DG maisonettes with a Wendeltreppe + Galerie; asking like Nord (15–18). Typical 90-m² DG: 1991–2008 E = 9,91 (8,71–12,70) for EEK A+–C / 10,28 (7,91–13,71) for D–G → zulässig 10,90–11,31.
    - **Nachmieter-Altverträge sit 5–10 % UNDER ortsüblich** (#609: 860 / 92 m² = 9,35) = the Altvertrag effect, so no ">20 % below" signal. The new contract may go to ortsüblich +10 % (~1.000–1.040 at 92 m²), and § 556e doesn't help the landlord when the Vormiete was lower: a cap calculation, not an "unlimited" risk.
  - **Medienstadt** (Marlene-Dietrich-Allee, Filmpark/Studio/rbb; projects "LOLA", "Marlene 21" by KW Development): Nachwende to Neubau, 15–18+ EUR/m². Bracket 1991–2008 (D 9,10) vs ab 2021 (16,73), a factor of 1,8 (#676).
  - **Stahnsdorfer Str. 93, "Villen am Filmpark"** (WEG, Gewobag as WEG-Verwalter, Bj 2016, EEK B 71,7, Fernwärme, TG): priceBar similar 10,00–17,00, overall 7,70–22,20; field 2013–2020 D 12,34 (10,90–14,23), § 556f. #858 at 20,99 = P92. Along the Stahnsdorfer Str. the building class sets the band.
  - **Block B Süd/Medienstadt 4,5** (S7 Babelsberg/Griebnitzsee/Medienstadt, Tram 94/99 north side, Lindenpark/Filmpark walkable; no 5,0 without an address; 4,0 near the Nuthestraße (B2) or the railway).

### 14471 — Potsdam West / Westliche Vorstadt
- The Altbau reputation misleads: ordinary 1970s MFH sit between the Gründerzeit axes (e.g. Stormstr. 16/20/21, 5 storeys, ~15 WE). Spalte C: bis 1948 kein EA 7,49 / C–E 8,82 vs 1971–1990 C,D **5,82**, a factor of ~1,5. Date the building first.
- Stormstr. 16 (#737): priceBar similar **6,10–8,60** (overall 5,10–10,10), IS24 atlas ~11. A Nachmieter Altvertrag at 6,5–8 is normal here, not a scam signal.
- **Block B 4,5** (Tram 91/94 Kastanienallee/Zeppelinstr., Bhf Charlottenhof + Park Sanssouci RB21/22, Innenstadt 5–10 min). Deduct only for flats directly on the Zeppelinstraße (a loud main road; ask which side the flat faces).

### 14473 — Speicherstadt · Brauhausberg · Lotte · Jutekiez
- **Speicherstadt** (Groth Gruppe, between the Brauhausberg and the Havel, opposite the Stadtschloss, Hbf 5–10 min on foot): two phases split right on the § 556f date.
  - South part finished end of **2014** (155 rental + 98 ETW): Erstbezug before 01.10.2014 ⇒ the Bremse applies.
  - North part up to **2022** (~270 WE): § 556f.
  - Fields: 2013–2020 vs ab 2021 (C 12,06 vs 15,72). Compute both; the Baujahr is practically never on the ad, so leave it an open question.
  - ~18 kalt is plausible, > 22 is not (#540).
  - House numbers → phase:
    - `Am Speicher 1-5` = Bj 2014 (south, EEK B 62,8, Fernwärme; #819, Vermietungsbüro Müller, allows NO interior photos) → 2013–2020, § 556f hinges on the Erstbezug date
    - `Am Speicher 12` / `Am Magazin 7` = Bj 2022 (north / Havel Quartier, allod; #168, #740) → § 556f certain, ab 2021
  - Don't confuse with **#430 Havel Quartier / MIRU** (Bj 2022, allod: Indexmiete + 12 months minimum term).
- **"Wohnen am Brauhausberg", Max-Planck-Str. 14–16 / 14A–16A (Südliche Innenstadt):**
  - **Facts:**
    - 107 rental flats, **Bj 2026, Erstbezug from 01.04.2027**, Fernwärme, EBK included, Aufzug, Keller; marketed by **locals Real Estate GmbH** (IS24 4,5★/26, verified, phone 0331 58 18 60). The Bauträger/owner is never named. Landing page `wohnen-am-brauhausberg.com`.
    - Refs **`H{Haus}-{Etage}-{WE}`**; every unit is also on Immowelt.
    - § 556f (no Bremse); field **ab 2021**: C 15,72 (10,52–19,00), D 16,73 (14,88–19,64), E 15,14 (10,90–17,86); priceBar 11,20–18,50 (overall 8,70–23,90).
    - **Asking 21,0–22,5 EUR/m² kalt** (1.550/71,17 · 1.650/78,52 · 1.670/78,48 · 1.800/85,5 · 1.880/84,59 · 1.890/85,45 · 2.030/90,2 = 22,50 top) = ~25–49 % over ortsüblich.
  - **Contract facts for the whole batch:**
    - **Mindestmietdauer 24 Monate** (Immowelt Stichworte + the structured `rental-time` feature; absent on IS24) ⇒ G ≈ 3,8
    - Kaution "drei Monatsmieten" (vague: on the Warmmiete it would be illegal, so always ask)
    - no Provision, no WBS, unbefristet, no Staffel/Index
    - **Energieausweis missing** (`hasScales:false`, "wird bei Besichtigung vorgelegt") ⇒ D max 4,7
    - Equipment: EBK, Aufzug, Keller, a bodengleiche Dusche; **no Badewanne, no Garten, no Gäste-WC**
    - Chips vary per unit (#786 had no Keller chip; don't copy siblings)
  - **Warm trap:**
    - NK = **3,33 EUR/m²**, and "Heizkosten in NK: Nein" on IS24 ⇒ add ~1,00–1,40 EUR/m² HK before checking the 2.200 cap. #732's displayed 2.175 becomes 2.260–2.295.
    - From #826 on, the Immowelt ads carry an HK row "in Warmmiete enthalten" (Warm = KM + NK) while the older ads and the IS24 twins say HK not included. Report both scenarios.
    - Economics: only the 78,5-m² units (1.650–1.670) stay 160–190 under the cap; the 85-m² units at 1.800 sit AT the cap; 1.890 and 2.030 are over it. The cap is the discriminator; €/m² is flat.
    - Block A calibration: #731 3,9 · #729 3,5 · #732 3,1 · #730 2,8. Totals: #731 4,3 · #729 4,2 · #730/#732 4,1. The other blocks are constant (B 4,6–4,7 · D 4,7 · F 4,4 · G 3,8 · H 4,2), so the ranking comes from Block A alone.
  - **Unit plans** (filename `FF26888_…_Haus_{N}_…_WE_{n}` or `…_Wohnung_{n}`; in `floorplans` OR in `images`, see [[immowelt]] §Photos). The balcony/terrace is counted at the **WoFlV maximum of 50 %**, so compute the heated interior on every unit:
    - **85,45-m² type** (H1-01-04 #632, H1-01-05 #729, H1-03-16 #732): Wohnen 32,74 · Schlafen 16,67 · Kind 12,43 · Flur 11,20 (13,9 %) · Bad 5,80 · Abstell 1,72 = **80,56** + 9,78 × 0,5 → interior kalt 22,34 (23,46 at 1.890). Spalte D.
    - **78,48-m² type** (H2-01-05 #731; the same geometry as #624 H3-02-09 78,52 and #629 H2-02-09): Wohnen 33,93 · Schlafen 14,58 · Kind 10,66 · Flur 6,71 (9,1 %) · Bad 5,80 · Abstell 1,67 = **73,35** + 10,25 × 0,5 → interior 22,77. The interior crosses 75 m², so compute C AND D. This type has a larger living room than the 85-m² type; the extra area buys bedrooms and hallway.
    - **EG terrace type** (H5-00-01 #730, 90,2 m², 2.030): Wohnen 32,37 · Schlafen 16,40 · Kind 12,23 · Flur 11,13 · Bad 5,80 · Abstell 1,78 = **79,71** + 21,06 × 0,5 = 90,24 → 11,6 % of the area is outdoor space, interior 25,47. It has 0,85 m² LESS heated area than #729 for +230 EUR. Formally Spalte E (15,14), Spalte D on the interior (16,73): name both.
    - **H6-00-01 (#789):** the ad copied the Haus-5 figure 90,23; the plan shows 79,60 + a **28,62** terrace (× 0,5 = 93,91). The Stichwort 28,62 was the only text hint.
    - Typos and copies: #731 Stichworte 10,52 vs plan 10,25 (only 10,25 reproduces 78,48); #732 9,78 = 9,78 exact; #828 said 9,90 (the Haus-6 value) vs plan 9,78. Stacked units share a plan (H4-01-03 ≡ H4-02-09); mirror units have the same m² with the balcony on the opposite side (H4-02-09 West ≡ H4-02-14 East, 80,61 + 9,78). Dedup on the full ref.
    - A "Dachgeschoss" chip (#732, 3. OG) is NOT a sloped roof: flat green roofs + PV, no 1-m/2-m lines ⇒ full height, no WoFlV reduction.
  - **Floor price ladder:** the same plan costs 1.800 in the 1. OG (#632/#729) vs 1.890 in the 3. OG (#732) = +90 EUR/month per two storeys (+2.160 over the 24-month minimum). Weigh it against orientation (#732 also got the street side).
  - **Site geometry** (2×3 grid):
    - West row: Haus 1 = Max-Planck-Str. **16**, Haus 2 = **15**, Haus 3 = **14** (Haus 1 = the NW corner)
    - East row: Haus 4 = **16A**, Haus 5 = **15A**, Haus 6 = **14A**
    - The street + blu car park lie west of the west row; the wooded Brauhausberg lies east of the east row; a green courtyard sits between them.
    - ⇒ "East = courtyard, West = street" holds ONLY for Houses 1–3. For Houses 4–6, West faces the courtyard (quiet + evening sun, the best combination) and East faces the forest. Determine the row from `H{N}` first.
    - The headline "Balkon mit {West|Ost}ausrichtung" matched the plan's north arrow 3/3 (#791 Ost, #792 West, #793 Ost), so it is a cheap first read. But the WE number does not predict orientation across houses (WE 06 is West in Haus 5, East in Haus 6): check the plan.
    - Immowelt's `address.street` gives the generic "Max-Planck-Straße 15"; the real house number is in the SEO `document.title` or follows from `H{N}` (#730 Haus 5 = 15A).
  - **Photos:** ~30 real photos of the finished MUSTERWOHNUNG + ~10 exterior renders + ~9 surroundings + ~9 marketing tiles. `classification` is badly wrong; `description` is correct. No unit photos ⇒ the Neubau exception, no D cap. "Hausaufteilung - Visualisierung" is actually a drone photo of the externally finished quarter (a Block-F hint, cite with reservation).
  - **Outdoor chips:** a "Terrasse" chip can be an AI enrichment (#729). The reverse also occurs: #730 had both Balkon and Terrasse chips with no AI flag, but the Stichworte sum 21,06 = the terrace alone ⇒ no balcony (the dashed line on the EG plan is the 1. OG balcony above).
  - **Block B 4,8** (Hbf ~400–500 m / 5–7 min on foot; RE1 Berlin ~25, S7 Wannsee ~10). Used on #624, #628–#632, #729–#732, #784–#793, #826–#832.
- **"Lotte", Edisonallee 14 + 16** (Südliche Innenstadt / Zentrum Ost–Nuthepark; Covivio Neubau **Bj 2021**, 50 WE of 52–110 m², `lotte.immo`, developed as the "Lotte + Kleist Quartier" by Deutsche Wohnen, let by **Covivio Immobilien GmbH**):
  - Objekt-Nr. `C392.017294-0NN`; the Grundriss labels the unit ("Mieteinheit 014 – 75,67 m² – 1. OG – 2. Einheit von links – Edisonallee 16") = dedup settled.
  - Field **ab 2021:** D 16,73 (14,88–19,64) → zulässig 18,40; C 15,72 (10,52–19,00) → 17,29 (the 3-Zi units sit at the ~75 edge).
  - § 556f: no lever, and Covivio standardly adds an **Indexmiete for 10 years + 12 months minimum term** (in the "Ausstattung" block, not Sonstiges): the Block A/G risk.
  - **16,87 kalt** (#752, 75,67 m², 1.276,50) = +0,8 % over ortsüblich, +8,8 % over 15,51, P56 of the priceBar (similar 10,70–18,20).
  - Standard for all units: Fernwärme + Fußbodenheizung, Bedarfsausweis B, Endenergie 66,4 / Primär 13 kWh (25.02.2021), Aufzug, green roofs, bike rooms, separate Stellplätze. The landlord text says Balkon + Keller for every flat, although IS24 shows `obj_cellar: n`. A "Gaszentralheizung" mention is a copy-paste block (EA + `district_heating` say Fernwärme).
  - NK **4,15 EUR/m² incl. heating** (314, of which 197 HK) = above 3,00–3,80 but ~3,6× the calculated need ⇒ conservative, more likely a credit (a con, not a risk).
  - **Block B ≈ 4,3** (~1 km east of the Hbf: 7 min ÖPNV / 5 bike / 15 on foot; Bus 694 + N14 at the door, Nuthepark, shops 5 min, A115 ~10 min). Minus: Nuthestraße (B2) noise, and `obj_telekomInternetAvailable: false`.
- **Jutekiez / alte Jutespinnerei** (Lotte-Pulewka-Str. / Wiesenstr.): a **Jutespinnerei from 1863** converted to lofts from 2014, finished **2017/2019** (sources differ) → 29 ETW of 67–125 m² in the hall + 414 rental flats in seven new blocks around it.
  - The Ortsteil is disputed (Immowelt: Teltower Vorstadt; street register: Südliche Innenstadt; city map: Zentrum Ost und Nuthepark); **PLZ 14473 is certain**. No scoring impact. Prose landmark: "restaurierte Jute-Fabrik" / "Jute-Kiez".
  - **Field, both hypotheses:**
    - A: the conversion counts as Neubau standard (the flats didn't exist before; the textbook case) → **2013–2020**: E 12,39 (10,31–14,00) → zulässig 13,63; D 12,34 (10,90–14,23) → 13,57. This one carries the weight.
    - B: shell from 1863, no EA → **bis 1948 kein EA**: E 8,17 (5,90–9,40) → 8,99 (Oberwert cap 10,34); D 7,83 (6,51–9,24) → 8,61.
    - Factor ~1,5 between them.
  - First residential use after 01.10.2014 ⇒ § 556f very likely ⇒ no cap on a new contract.
  - **Price levels: 13 EUR/m² = Bestand, ~16–17 = new contract** (#666: 4 Zi / 98 m², 13,27 Bestand vs #694: 3 Zi / 86 m², 16,57 new = +24,9 %, exactly the predicted reset band). Ask Altvertrag vs Neuvertrag first; use the other number as the address-precise comparable.
  - **Lotte-Pulewka-Str. 41** (86 m², 3 Zi, Maisonette, #761 = the IS24 twin of #694): **1.425 kalt + 400 NK incl. heating = 1.825 warm**, 16,57, Kaution 4.276 = 3,00 NKM, Stellplatz +50, Geschirrspüler-Ablöse 100. ⇒ The hall's NK rate is **4,65 EUR/m²** (not the derived 5,35 used on #738). The Kleinanzeigen twin said 1.885 warm (an estimate); the IS24 split is the consistent one.
  - **Block B 4,5** (~1,5 km east of the Hbf, Nuthepark, Babelsberg across the Nuthe). Noise caveat, now proven by photo: from the terrace, the rail corridor with parked regional trains (#694). Loft photos date from ~2017/2019 (construction site in view); the seven new blocks have since changed the view and the sound path. Read the photo age.

### 14469 — Jägervorstadt · Bornstedter Feld · Eiche
- **Jägervorstadt, Quartier Pappelallee/Voltaireweg, Wohnbau GmbH, Bj 2013:**
  - "Villenkolonie"-style Neubau: a green courtyard with an old sycamore, TG with lift access, Fernwärme + Fußbodenheizung, oak parquet, EBK, bodengleiche showers, video intercom.
  - Landlord **Wohnbau GmbH** (Bonn/München, IS24 3,9★ / 1.297, verified); refs `1.1503.4.NN` = a portfolio, so more units will come; applications only via **immomio** (`tenant.immomio.com/apply/…`).
  - Fixed: vollständig renoviert, **Verbrauchsausweis B / 65 kWh** (PDF at the exposé), Kaution 3 NKM, no Provision, TG optional 80,00/month (not in Warm; name it as a variant). **~15,4 kalt**; NK 1,76 + HK 2,09 = 3,85 warm surcharge.
  - **Trap: Bj 2013 = before 01.10.2014 ⇒ § 556f does NOT apply, the Bremse DOES.** Field 2013–2020 E = 12,39 (10,31–14,00) → zulässig 13,63 at the Mittelwert, **15,40 at the Oberwert**, i.e. only just permissible at maximum Spanneneinordnung. The Mehrmerkmale (FBH, parquet, Aufzug, EBK, often two balconies, G-WC, Wanne + Dusche, EEK B, Fernwärme) justify it ⇒ report § 556g Abs. 3 (Vormiete + Spanneneinordnung), neither "violation" nor "compliant". The priceBar 10,50–15,70 puts it at P64 (#584 Pappelallee 49, 90,93 m², 4,75/5).
  - Immowelt mis-tags this quarter as "Bornstedt"; IS24 says `jägervorstadt` (#584, #700).
- **Bornstedter Feld — "Fontane Gärten"** (Instone Real Estate: **108 ETW in eight Stadtvillen A–H** on ~10.000 m² by the Volkspark; streets Georg-Hermann-Allee, Peter-Huchel-Str., Erich-Arendt-Str., Bonner Str.; the first 54 WE were ready end of 2022, Bj **2022/23**):
  - Grundriss header: "Villa {A–H}, {n}. Obergeschoss, Wohnung {X}.{Etage}.{Nr}" + a site plan of A–H.
  - IS24's Preisinsights geocode sends the Bonner Str. to `nedlitz`, while `geo_ot` says `bornstedt`: both are Potsdam Nord, no Block-A effect.
  - Field **ab 2021:** C 15,72 (10,52–19,00), D 16,73 (14,88–19,64), E 15,14 (10,90–17,86). § 556f: no lever; name the risk that future increases are uncapped (ask Index/Staffel).
  - **Asking band of the Neubau belt 19,7–22,4 EUR/m² kalt:** #639 (Bj 2022, 88,9 m², 19,69) · #760 (Bonner Str. 6, Villa C, 73,1 m², 21,20) · #756 (Georg-Hermann-Allee 127, Bj 2023, 69 m², 22,39) · #781 (Georg-Hermann-Allee 126 = Villa E, penthouse E.3.16, 107,3 m², Bj 2022, gas + FBH, locals Real Estate, 19,31 after a cut from 20,32; Spalte E +8 % over the Oberwert).
    - That is +26…42 % over ortsüblich and +27…44 % over 15,51: the most expensive Potsdam corridor. Block A 3,5–4,0; ≥ 23 would be new.
  - **ETW project ⇒ every rental ad is a private single owner:** Eigenbedarf/sale risk medium–elevated, usually `verifiedBy: []`, no phone.
  - **NK: 4,79 incl. Fernwärme** (#760: 350 / 73,1) and **5,82 NK+HK flat rate** (#781: 625 / 107,3), above the 3,00–3,80 band. Large units break the WARM cap via the NK: check Warm first.
- **Bornstedter Feld — "Am Park Potsdam"** (Diamona & Harnisch, Georg-Hermann-Allee; 5 houses, 80 WE, Bj **2023**, every EG flat with its own garden, OGs Balkon/Loggia; ETW ⇒ single owners via **Passgenau Immobilien**, refs `VM_POTS_{Haus}.{Etage}.{WE}`, plan files `Grundriss_{Haus}.{Etage}{WE}`):
  - Tell without an address: "Diamona & Harnisch" + "direkter Zugang zum Volkspark".
  - Field ab 2021, § 556f. #824 (Haus 2 EG, 75,6 m², 20,49, **Staffelmiete + 2 years Kündigungsausschluss**, NK 3,51 incl. Fernwärme, inside the band).
- **The Volkspark west edge is older: check the Baujahr per street, not per quarter.**
  - **Horst-Bienek-Straße** (a cul-de-sac): IS24 atlas No. 9 = Bj 2010, No. 4 = 1920–1949.
  - #726 (no Bj; kitchen self-installed 2016, TG, Loggia, fully barrier-free) → 2009–2012 or 2013–2020, E 12,01 (10,30–13,84) / 12,39 (10,31–14,00). The 01.10.2014 date decides: before ⇒ Bremse (cap ≈ 13,21–13,63 = 1.914–1.975 on 144,92 m²); from ⇒ § 556f (up to 19,7–22,4 = 2.855–3.246), a factor of 1,6. So "Baujahr/Erstbezug?" is the first contact question.
  - Bestandsmiete there since ~2016: **11,25 kalt** (144,92 m², 1.630) = 6–9 % under ortsüblich, ~half the quarter's asking level. NK only **2,02** (292,45 incl. heating). The opposite extreme to Fontane Gärten in the same quarter: never infer NK from the quarter.
- **Eiche (14469, Potsdam Nord):** borders Golm (top preference) ⇒ Block B regularly **4,5**; ÖPNV only Bus 609/638 (~8 min to Bhf Golm/Sanssouci, ~20 to the Hbf).
  - ⚠ Exposé location texts claim an "S-Bahn S7" in Eiche. **There is none** (the S7 ends at Potsdam Hbf); it is boilerplate.
  - Mixed EFH/ZFH/small MFH + Neubau islands on the Kaiser-Friedrich-Straße (#161/#182: Bj 2024, 18,04). No Ortsteil default; always ask the Baujahr. Observed ~10,0 (Bestand, #137/#145/#249) to 18,04.
  - priceBar Kaiser-Friedrich-Str. 8 (09/2026): similar 8,50–12,60, overall 7,00–15,30 (~19 % under 15,51) = the cheap corner in Bestand; an upper-band ask is no bait.
  - Seen on #100, #118, #137, #145, #169, #170, #249, #298/#299/#331, #802.

### 14476 — Golm (+ "In der Feldmark") · Fahrland
- **Golm** = the profile's top Ortsteil and the site of our swap offer; there is no dominant building type (village core / pre-war, 1990s–2000s around the campus and station, 2020s Neubau).
  - Spalte D: 1991–2008 9,01 (8,27–9,69) · 2013–2020 12,34 (10,90–14,23) · ab 2021 16,73 (14,88–19,64), a factor of 1,9. Compute all plausible fields, ask the Baujahr, narrow it by photo.
  - Block B 4,5–4,8 without an exact address (Bhf Golm RB21/22 ~10 min to the Hbf, Uni/Max-Planck walkable, thin shops).
  - 14,71 kalt for 85 m² (#597) is unremarkable for Golm.
- **"In der Feldmark" (our own street; `swap_offer` No. 29, Bj 2024, DIBAG Hausverwaltung for Bayerische Städte- und Wohnungsbau GmbH & Co. KG):**
  - Field **ab 2021** (C 15,72 (10,52–19,00) vs 2013–2020 C 12,06) + § 556f: no Bremse (name both grounds).
  - Price regime **~18–19 EUR/m² kalt** (ours 1.025,25 / 54,19 = 18,92; #660 1.280 / 70,53 = 18,15): normal and no scam signal, but over the profile cap of 18 and ~15 % over the Mittelwert.
  - **NK ≈ 3,50–3,55** (ours 189,68 / 54,19; #660 250 / 70,53); matching NK is the best evidence that an ad is from this quarter.
  - **⚠ CORRECTED 2026-08-23 (#661): the quarter HAS Keller.** The old rule "no cellar storey, Block E systematically 2,0" was wrong. The Tauschwohnung twin of #660 lists `Keller` in a complete chip list; the Wohnungsswap post had 1 chip. Treat Keller as present/open for Feldmark ads. Our No. 29 lacks one as a property of the unit; ask whether an Abstellraum can be rented.
  - **Indexmiete (§ 557b)** on our contract; assume the same for neighbours and ask. With § 556f the rent is freely resettable on a tenant change, so a low Bestandsmiete in a swap ad is no price promise.
  - **Block B 4,8** (REWE, Bhf Golm and a bus stop walkable: the good corner of Golm).
  - **A vacancy there is best pursued as an internal move via DIBAG** (Carola Dembicki / Melanie Heinke): we are tenants of the same landlord, so no swap partner consent is needed. Always put it in Next Steps.
- **Fahrland (Nördliche Ortsteile):** a village ~11 km north on the B2 to Ketzin/Nauen; **no rail/tram, bus only** (609/638, ~25–35 min to the Hbf) ⇒ car-dependent; to Golm 10–15 min by car.
  - **Ketziner Str. 100–108 = Holger Behnke Neubau:** 3 MFH × 3 storeys, 42 WE / 3.300 m², completion planned summer 2025, 2–4 Zi, **all EG flats with a Terrasse, all OG flats with a Balkon, EG barrier-free**, plus two older Behnke blocks. It settles Balkon/Terrasse when the IS24 mask is empty (`obj_balcony: n`). Erstbezug 2025 ⇒ § 556f; the old block ⇒ 1991–2008 (C 9,28–9,45, zulässig ~10,4). Name both. ~11–12 kalt occurred (#563). **Block B 3,5** (village edge).
  - **Pastor-Moritz-Str. 5/7 = Semmelhaack quarter, Bj 2016** (the address behind #594/#698, Whg. 1.07): 3-storey MFH with a Satteldach, a clinker base (= a Keller with windows), glass balcony railings, **Aufzug −1…3**, Fernwärme, **Verbrauchsausweis B / 60 kWh**, vinyl in wood look, a shower bath.
    - Field 2013–2020 C 12,06 (11,23–12,74) → zulässig 13,27. The ask 08/2026 was **12,59 (900,00 / 71,50 m²)**; the Vormiete 875,00 → +2,9 %.
    - § 556f ⇒ no Bremse, no cap on re-letting.
    - priceBar similar 8,90–13,00, overall 7,40–15,70.
    - **Block B 3,8** (village-core reference, ~250–300 m north of the core, shop/primary school/Kita walkable).
    - Warm side: NK 1,68 + HK 2,52 = 4,20. The HK is ~2× the expected use at 60 kWh, the NK under the benchmark: ask about both.
  - **Gartenstraße 17** (MFH in the village core, **Bj 1996**, Verbrauchsausweis C / 83 kWh, Fernwärme, 4 storeys with a lift, TG, 94-m² DG flats with Balkon + Keller + G-WC): 1991–2008 A+–C E = 9,91 (8,71–12,70) → zulässig 10,90; priceBar 8,60–12,50 (overall 7,10–15,20). **Block B 3,8** (#495 = #626, the same flat).
  - Photo-dated **2013–2020** stock also exists (#594 before the address was known: a Satteldach MFH, clinker base, perforated-metal balcony railings, level shower, Vorwand-WC, vinyl, integrated roller shutters, young trees). The 1991–2008 reading (9,28) would have faked "+33 %, § 556g".
  - **Price level 2026:** Bestand 11–12,6 kalt; Neubau offers ~16,9 (Seeburger Chaussee 2, 75 m², 3 Zi, 1.265).
