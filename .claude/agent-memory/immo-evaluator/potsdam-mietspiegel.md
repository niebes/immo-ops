# Potsdam Mietspiegel — the real ortsübliche Vergleichsmiete (NOT the portal "Mietspiegel" pages)
Applies to: every Miete evaluation in Potsdam and the Brandenburg Umland (all portals). A data source, not a portal quirk.
Consolidated 2026-09-28 from a 120 KB append log. Covers: source, table, how to apply it, general rules, Umland/Brandenburg. **The per-PLZ/Quartier datapoints ("Ortsteil- und Quartiers-Anker") live in [[potsdam-mietspiegel-ortsteile]]** (`potsdam-mietspiegel-ortsteile.md`, split off 2026-10-09): read it too whenever the listing is inside Potsdam (14467–14482: Am Stern/Drewitz/Kirchsteigfeld, Waldstadt/Brunnen Viertel, Babelsberg, Potsdam West, Speicherstadt/Brauhausberg/Lotte/Jutekiez, Jägervorstadt/Bornstedter Feld/Eiche/Grube, Golm/Feldmark/Fahrland). Berlin: [[berlin-mietspiegel]].

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
- **The address-precise IS24 `priceBar` beats every Ortsteil anchor.** It swings ~40 % within one street (Alt Nowawes #588 vs #681, see 14482 in [[potsdam-mietspiegel-ortsteile]]). An Ortsteil anchor is only a plausibility frame.

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
Moved to [[potsdam-mietspiegel-ortsteile]] (2026-10-09). Append new Quartier datapoints there, not here.
