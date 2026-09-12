# Bodenrichtwerte Brandenburg — where the land-value numbers really come from
Applies to: every **Grundstück / Freizeitgrundstück / Haus** purchase evaluation in Brandenburg
(all portals). Not a portal quirk — a data source, same role as [[potsdam-mietspiegel]].
The per-area SSOT table lives in `modes/_shared.md` → "Bauland (Grundstück) — regional reference
data". **If a number here ever contradicts `_shared.md`, `_shared.md` wins — fix this file.**
This file keeps the *working notes*: which sources lie, in which direction, and how to get a value
for an area the SSOT table doesn't cover yet.

## The trap: aggregator pages labelled "Bodenrichtwert" often publish **Angebotspreise**, 3–4× too high
Exact analogue of the Mietspiegel-vs-Angebotsmiete trap. Two aggregator families, **opposite error
directions**, and both call their output "Bodenrichtwert":
- **`miete-aktuell.de/bodenrichtwert-grundstueckspreise/...` — OVERSTATES, badly.** It computes from
  *listing* data ("berechnet aus 62 Objekten", plus an explicit "empfohlener Angebotspreis"). For
  **Weseram (Roskow)** it returns **196,37 EUR/m² erschlossen / 133,60 EUR/m² unerschlossen** — against
  an amtlicher Gemeindemittelwert of ~49 EUR/m². Treat its output as an **Angebots**anker only, and
  always name it as such.
- **`bodenrichtwerte-deutschland.de` — UNDERSTATES** (already in `_shared.md`): its mean blends all
  land uses incl. Acker (~10 EUR/m²). Its per-Gemeinde **Höchstwert** is the more usable figure for
  Wohnbauland; the "Durchschnitt" is not.
**Consequence for scoring:** quote BOTH anchors in Block A and say where the offer sits between them.
An offer above the amtliche band but below the Angebots band is the normal, unremarkable case — it is
neither a bargain nor Wucher, and it must NOT fire the "price >20 % below Mietspiegel/market" High scam
signal (that signal needs an address-precise band putting the price below a *minimum*).
**Why:** on #591 the same plot reads as "+88 % over the local land value" or "−53 % under market"
depending purely on which aggregator you open first — one anchor alone decides the Block-A score.

## The official route, and its blind spot
1. **BORIS-BB — `boris.brandenburg.de`** is the authoritative source; PDF downloads are free, phone
   enquiries free, written enquiries ~17,50 EUR. Always the preferred citation.
2. **Kreis-Pressemitteilungen are useless for the rural fringe.** The Potsdam-Mittelmark
   "Bodenrichtwerte 2026" release (`potsdam-mittelmark.de/.../bodenrichtwerte-2026-in-potsdam-mittelmark`)
   names **only the Speckgürtel**: Kleinmachnow 450–1.250, Stahnsdorf 400–700, Teltow 280–700, Werder
   400–600, Nuthetal 110–490 EUR/m². For the **northwest of the same Kreis** (Roskow, Beetzsee, Päwesin,
   Havelsee, Groß Kreutz) it gives nothing — don't spend a second WebFetch hoping otherwise, go to BORIS
   or fall back to the two aggregators with the caveat above.

## Values collected so far (Stichtag 01.01.2026 unless noted) — candidates for promotion to `_shared.md`
| Gemeinde/OT | Wohnbauland EUR/m² | Source & confidence |
|---|---|---|
| Roskow (inkl. OT Weseram, Lünow, Riewend) | Gemeindemittel ~49, Spanne 20–55 | Aggregator (understating family) → the **55 Oberwert** is the realistic Wohnbauland anchor. Not in the Kreis-PM. Used on #591. |
| Niemegk (PM, SW-Rand, 14823) | Gemeindemittel 32–44, Spanne 10–50 | Aggregator (understating family) → **50 Oberwert** = realistic Wohnbauland-Ortslage anchor. Stichtag 01.01.2024/2025, y-o-y unverändert. Not in the Kreis-PM (Speckgürtel only). Used on #601. |
| Havelsee (PM, NW-Kreis, 14798, inkl. OT Briest/Pritzerbe) | amtlich **44** (Spanne 20–70), Stichtag 01.01.2024 · Angebot **93** (23–207, 108 Objekte / 26-km-Radius) | `aktuelle-grundstueckspreise.de` in one fetch (both families). Not in the Kreis-PM. Used on #633. |
| **Groß Kreutz (Havel)** (PM, RE1-Korridor W von Werder, 14550, inkl. OT Jeserig/Götz/Deetz/Krielow/Bochow/Schmergow/Schenkenberg) | amtlich **103** (Spanne **35–190**), Stichtag 01.01.2024 · Angebot **161** (71–291, 228 Objekte / 24 Mon. / 9-km-Radius), **−2,4 % y-o-y** | `aktuelle-grundstueckspreise.de`, one fetch (both families). Not in the Kreis-PM. Used on #592 (120 EUR/m² → unter Band) and #643 (172,74 → oberes Bandende). **Die Spanne 35–190 ist so weit, dass der Mittelwert 103 fast nichts über eine konkrete Parzelle sagt** — bei einem Angebot >150 EUR/m² immer den punktgenauen BORIS-BB-Wert als Next Step fordern. |

| **Potsdam-Nauener Vorstadt** (Stadtgebiet, 14469) | Ortsteilmittel **778** (Stichtag 2025, **+4,4 %** ggü. 745), Ortsteilspanne **120–1.100** | Aggregator (understating family) — hier also eher eine **Untergrenze**. Genügte auf #697, um ein „Preis auf Anfrage"-Angebot ohne Grundstück zu erledigen: 450–700 m² Bauland = **350–545 k EUR = 70–109 % eines 500-k-Budgets, vor dem Haus**. Für ein reales Grundstücksangebot in Potsdam-Stadt trotzdem BORIS-BB punktgenau nachziehen (Ortsteilspanne 120–1.100 sagt über eine Parzelle nichts). Gegenanker aus dem Portal: Immowelt „Preise in der Region" **3.544–9.895 EUR/m² bebaut** (Mittel 6.374). |

| **Potsdam-Drewitz** (Stadtgebiet, 14480, Potsdam Südost) | Ortsteilmittel **515**, Stichtag 01.01.2026 (veröffentlicht 09.03.2026), **0,0 % y-o-y**; Stadtmittel Potsdam 273 (+2,2 %), Spannweite der Ortsteile 76 (Uetz-Paaren) – 1.680 (Berliner Vorstadt) | Aggregator `bodenrichtwerte-deutschland.de/bodenrichtwert/brandenburg/potsdam` — **eine** WebFetch liefert die ganze Ortsteiltabelle Potsdams (Drewitz, Berliner Vorstadt 1.680, Hist. Innenstadt 1.065, Babelsberg-Nord 951, Klein Glienicke 900). Understating family → eher Untergrenze. Used on #707: 1.250 m² × 515 = 643.750 rechnerischer Bodenwert gegen 490.000 Kaufpreis (392 EUR/m²) = **~24 % unter BRW-Ansatz** — genau der Abschlag, den Abbruchreife + ungeklärtes Baurecht kosten. Für eine Einzelparzelle BORIS-BB punktgenau nachziehen. |

| **Potsdam Nördliche Ortsteile** (Stadtgebiet, 14476/14469) — **Neu Fahrland 279** (0,0 % y-o-y) · **Fahrland 133** (**+38,5 %**) · Nedlitz 172 (−2,8 %) · Sacrow 125 (−0,8 %) · Groß Glienicke 203 (−5,1 %) | Ortsteilmittel, Stichtag 01.01.2026 (veröffentlicht 09.03.2026) | Gleiche eine WebFetch auf `bodenrichtwerte-deutschland.de/bodenrichtwert/brandenburg/potsdam` wie Drewitz — die Ortsteiltabelle enthält den ganzen Norden mit; nie zweimal holen. Understating family → Untergrenze. Used on #762 (Ringstraße 80 Neu Fahrland, 832 m²: BRW-Ansatz 232.128 gegen 650.000 Angebot = **2,80×**). ⚠ **Der Sprung Neu Fahrland 279 → Fahrland 133 ist der wichtigste Befund für die 200-EUR/m²-Grundstückssuche:** Neu Fahrland ist strukturell außer Reichweite (Angebote real 490–1.400 EUR/m²), das direkt benachbarte **Fahrland** liegt bei 241–370 EUR/m² Angebot und ist der einzige Potsdamer Ortsteil, der dem Cap nahekommt. |

| **Borkwalde** (PM, weiterer Metropolenraum, 14822, Amt Brück, RE7-Korridor) | **Ortslage Borkwalde amtlich 140**, Stichtag 01.01.2026, **gesenkt von 180** (auch „Wohnsiedlung Ortszentrum" −20) · Aggregator-Spanne Wohn-/Mischbebauung 100–200, Mittel 157 (−15,6 %) · Angebot **199** (59–287, 176 Objekte / 24 Mon. / **3-km**-Radius, −1,5 % y-o-y) | Die 140 stehen **wörtlich im Kreis-PM-PDF** (siehe unten) — für Borkwalde also *nicht* die Aggregator-Rate nehmen. Used on #645. |

**Der PM-Kreis-PM nennt mehr als den Speckgürtel — grep ihn, bevor du zu den Aggregatoren gehst.**
Die Warnung oben („Kreis-PM nur Speckgürtel") gilt für den *Nordwesten* des Kreises; für den **Südwesten
am RE7** liefert dieselbe PDF konkrete Ortslagen-Werte im Fließtext. Aus `GA_PM_BRW_26.pdf` (Stichtag
01.01.2026, beschlossen 28.01.2026) direkt entnehmbar: **Borkwalde Ortslage 140** (von 180),
**Damsdorf 140** (von 180), **Fichtenwalde 160** (von 200), **Borkheide −20**, Bad Belzig Wohnsiedlung
Friedrich-Engels-Str. 280, Seddiner See/Neuseddin 200→**270**, Kunersdorf Försterei 75→**130**,
Nuthetal/Fahlhorst 80→**160**, Beelitz „Am Stellwerk" +30, Jeserig +30, Götz/Krielow +50, Pritzerbe
Birkenwäldchen +40, Brielow (+ Am Seehof / Brielower Aue) 110→**130**, Schwielowsee: Caputh 550→**500**,
Ferch 400→**360**, Geltow 500→**450**, neu Stücken Wohnpark Naeve 240, Lehnin Wohnpark Hohlweg 260.
Kosten: ein `curl` + `pdftotext -layout` + `grep`. **Der Kreis hat 2026 mehr gesenkt als angehoben im
Umland-Randbereich** — ein 2024er-Aggregatorwert überschätzt dort inzwischen systematisch.

**Erholungs-/Wochenendflächen sind im PM eine eigene, publizierte Klasse — 93 BRW-Zonen "Sondergebiete
Erholung" (2026).** Der Kreis-PM nennt einzelne davon und sie sind die einzigen brauchbaren Vergleichs­
werte für ein Freizeitgrundstück: **Töplitz/Mühlenberg 80** und **Leest/Gohlwerder 80** (bebaute
Erholungsflächen im Außenbereich) sowie **Leest/Galgenberg 40**. Das ergibt ein **Erholungs-Band von
rund 40–80 EUR/m² im Werder-nahen Umland** — und weil das *Berliner Umland* ist, liegt der weitere
Metropolenraum (Borkwalde, Brück, Beelitz-Rand) **darunter**. Die Aggregatoren führen diese Klasse für
kleine Gemeinden **gar nicht** (für Borkwalde nur Wohn-/Mischbebauung + Forst 0,24) — die Lücke ist
wertentscheidend und gehört als BORIS-BB-Next-Step in den Report.

**On a Wochenend-/Erholungsgrundstück the Wohnbauland-BRW is a CEILING, not the anchor.** Every value in
this table is Wohnbauland; Erholungs-/Wochenendflächen are a separate, materially lower BRW class. So on a
Freizeitgrundstück, state the Wohnbauland figure as the generous upper bound and say the true land value sits
below it — then split the ask into land vs. building/hope. #633: 506 m² even at the Wohnbauland **Oberwert 70**
is only 35.420 EUR against a 119.000 EUR ask ⇒ ~84–110 TEUR pays a simple hut plus a pending B-Plan. Without
that split the 235 EUR/m² reads as merely "5,3× BRW" and the report never says what the money actually buys.

**Die Ratio Ask ÷ (Fläche × Wohnbauland-BRW) ist selbst der Beweis der Nutzungsart — und sie kann in
BEIDE Richtungen zeigen.** #633 lag bei 5,3× BRW (die Hoffnung wird bezahlt). #645 (Borkwalde, 2.493 m²,
150.000 EUR) liegt bei 2.493 × 140 = 349.020 EUR, also **43 % des Wohnbauland-Werts** — und *das* ist
der Befund: kein Makler verschenkt 200 TEUR, also ist die Parzelle **kein baureifes Wohnbauland**.
Ein auffällig *niedriger* EUR/m²-Wert auf einer großen Fläche ist bei dieser Klasse der Normalfall und
darf **nie** das High-Signal „>20 % unter Markt" auslösen — gegen das Erholungs-Band (40–80) sitzt #645
mit 60,17 EUR/m² brutto mittig, also marktkonform.
**Und: der Bruttowert ist durch Wald verdünnt.** Bei ~800 m² gepflegter Erholungsfläche + ~1.700 m²
Kiefernwald: 800 × 80 + 1.700 × 0,24 ≈ **64.400 EUR Boden** ⇒ ~85.600 EUR bezahlen die Hütte. Ohne die
Nutzungsarten-Aufteilung des Flurstücks (Katasteramt/BORIS, kostenlos) ist Block A auf dieser Klasse
eine Schätzung — mach sie zum Next Step, nicht zur Fußnote.

**Second usable anchor found: `aktuelle-grundstueckspreise.de/deutschland/brandenburg/{kreis}/{gemeinde}`
gives BOTH families on one page** — an explicit *Angebotspreis* mean+range with the sample size and radius,
AND the amtlicher BRW mean+range with its Stichtag, and it labels which is which ("Bei allen Preisen handelt
es sich um Angebotspreise"). For Niemegk: Angebot **142 EUR/m² (31–250, 112 Objekte / 24 Monate, 19-km-Radius)**
vs amtlich **32 (10–50)**. One WebFetch replaces the two-aggregator dance — but note the Angebots figure
silently widens the radius when the Gemeinde has too few listings, so it is a *regional* anchor, not a local one.
**Why (#601):** a 194-EUR/m² plot reads as "in budget, fine" against the profile caps alone; against these two
anchors it is ~3,9× the amtlicher Oberwert and +36 % over the regional Angebotsmittel — which is the entire
Block-A story and the only real negotiating lever.
Speckgürtel values above are from the Kreis-PM and are the *official* ones.

## Land-/forstwirtschaftliche Flächen — a separate BRW class, split by **two regional zones**
The table above and the `_shared.md` one are **Wohnbauland only**. A Grünland/Acker/Wald parcel is
valued off a completely different, much simpler BRW set — and Brandenburg publishes it in **two
zones**, which is the part that gets missed:

| Nutzungsart | Berliner Umland | **Weiterer Metropolenraum** |
|---|---|---|
| Ackerland | 1,30 | 1,10 |
| Grünland | 1,00 | **0,90** |
| Forst ohne Aufwuchs | 0,33 | **0,24** |

(EUR/m², Potsdam-Mittelmark, Stichtag 01.01.2026, `gutachterausschuss.brandenburg.de/.../GA_PM_BRW_26.pdf`;
described as stable year-on-year.) **Kloster Lehnin / Nahmitz and the whole northwest of PM sit in the
*weiterer Metropolenraum*, not the Umland** — using the Umland column overstates by ~11–38 %.

**Value the parcel by its Nutzungsart mix, not by one blended rate.** BLB/state exposés give the
m² split per Wirtschaftsart, so use it: on the Nahmitz plot (#535/#600) a flat 0,90 × 6.997 m²
gave 6.297 EUR and the verdict "price is ~12 % *under* BRW"; weighting 5.625 m² Grünland × 0,90 +
429 m² Nadelholz × 0,24 + 943 m² naturnahe Fläche × ~0,24 gives ~5.390 EUR, i.e. the 5.500 EUR ask
is at **~102 % of BRW** — market-conform, not a discount. Opposite sign from one shortcut.
**Why it matters:** a state seller (BLB, BVVG, BBG) is bound by Haushaltsrecht to the Verkehrswert,
so "at BRW" is the *expected* result — an apparent deep discount is nearly always your own
blended-rate artefact, not a bargain, and it must never be talked into the ">20 % below market"
High scam signal.

**Re-verified 2026-08-23 (#644)** straight from the Kreis PDF (`curl` + `pdftotext`, one call — the file
is a 4-page press release, not the value catalogue): the 0,33 / 0,24 Forst figures and the Acker/Grünland
rows above are verbatim, beschlossen 28.01.2026, "stabil" y-o-y. **Michendorf is Berliner Umland ⇒ 0,33.**

**On a 100 %-Waldparzelle the Forst-BRW is the ANCHOR, not a footnote** (the paragraph above says the
Wohnbauland-BRW is a ceiling on *Wochenend*-plots; on pure forest it is not even that). #644: 3.391 m²
Wald asked at 8,85 EUR/m² = **~27× the 0,33 amtlich**, so the parcel's real Sachwert is ~1.100 EUR Boden
plus a low-four-digit Aufwuchs against a 30.000 EUR ask. Quote the Wohnbauland figure only to explain the
*motive* (Michendorf ~340 EUR/m², i.e. the same parcel would be ~1,15 Mio as Bauland — that spread IS the
product being sold). Framing it as "27× BRW" alone reads as an accusation; framing it as "a Bauerwartung
that § 8 LWaldG + § 35 BauGB will not deliver" is the finding.

## Havelland: `_shared.md`'s „25–110" band is **WESThavelland only** — the Berlin-nahe NW-Speckgürtel is 2–3× that
The SSOT table's Havelland entries (Paulinenaue ~42, Premnitz 65–120, Westhavelland-Band 25–110)
all describe the **rural west**. The Gemeinden that actually touch Berlin — **Falkensee,
Schönwalde-Glien, Brieselang, Wustermark, Dallgow-Döberitz** — sit in a completely different price
world, and using the 25–110 band there understates by 2–3×.

| Gemeinde | Wohnbauland EUR/m² | Source & confidence |
|---|---|---|
| **Schönwalde-Glien** (HVL, grenzt an Berlin-Spandau, 14621, OT Paaren im Glien / Schönwalde-Dorf / -Siedlung / Perwenitz / Grünefeld / Wansdorf / Pausin) | amtlich **112** Wohn-/Mischbebauung, Spanne **7–440**, Stichtag 01.01.2026, **−6,7 % y-o-y** · Angebot **309** (164–605, 444 Objekte / 24 Mon., −2,5 % y-o-y) · Gewerbe 31, Landwirtschaft 1,65, Forst 0,35 | `bodenrichtwerte-deutschland.de` (amtlich, understating family) + `aktuelle-grundstueckspreise.de` (both families). **Keine Ortsteilwerte** bei beiden Aggregatoren → für eine Parzelle BORIS-BB punktgenau. Used on #763 (614 m² zu 244,30 EUR/m²: −21 % unter Angebotsmittel, innerhalb des amtlichen Bandes, über dem Gemeindemittel = marktkonform). |

⚠ **Die beiden Aggregatoren nennen für dieselbe Gemeinde ZWEI amtliche Mittelwerte, die sich um
Faktor 1,85 unterscheiden — bei fast identischer Spanne.** Für Schönwalde-Glien:
`bodenrichtwerte-deutschland.de` **112** (7–440, Stichtag 01.01.2026) vs.
`aktuelle-grundstueckspreise.de` **207** (7–460, Stichtag 01.01.2024). Beide behaupten „amtlicher
Bodenrichtwert". Die Spannen stimmen praktisch überein, also ist der **Mittelwert der unbrauchbare
Teil** (unterschiedliche Gewichtung/Nutzungsartenmischung) und **nur die Spanne belastbar**.
⇒ Bei einer solchen Kollision: beide Zahlen nennen, den Mittelwert ausdrücklich für wertlos
erklären und gegen die **Spanne** + den **Angebotsanker** einordnen. *Why:* je nachdem welchen man
nimmt, liest sich dasselbe Angebot als „+118 % über BRW" oder „+18 % über BRW" — der Block-A-Befund
hinge an der Wahl des Aggregators.

⚠ **Der Gemeinde-Mittelwert ist bei einer B-Plan-Neubauparzelle systematisch der falsche Anker.**
Er mischt Acker-, Gewerbe- und Hinterlandzonen ein (daher Spannen wie 7–440). Eine voll erschlossene
Parzelle in einem rechtskräftigen B-Plan-Gebiet liegt **erwartungsgemäß deutlich über** dem
Gemeindemittel; das ist kein Aufpreisbefund. Der aussagekräftige Vergleich ist der **Angebotsanker**
(bzw. Parallelangebote im selben B-Plan-Gebiet).

## Plot-Doktrin (portalunabhängig) — zwei Moves, die sich auf #763 bezahlt gemacht haben

**1. Den im Exposé genannten B-Plan-NAMEN wörtlich suchen — die Gemeindeseite widerlegt das Exposé.**
#763 zitierte „Bebauungsplan: **Behindertengerechte Siedlung Chausseestraße** — Gemeinde
Schönwalde-Glien OT Paaren im Glien" und behauptete dazu „**Einzel- oder Doppelhäuser**" +
„ideal für ein Einfamilienhaus mit Garten". Eine Suche nach dem exakten Plannamen fand die Seite der
Gemeinde: der Plan läuft heute als „**Siedlung Chausseestraße, 1. Änderung**" und ist öffentlich als
Plan für **56 DOPPELhäuser** beschrieben. Möglicherweise hat genau die 1. Änderung das Einzelhaus
zugelassen — belegt ist es nicht. ⇒ **Ein genannter B-Plan-Name ist eine prüfbare Behauptung, kein
Beleg.** Eine WebSearch auf den wörtlichen Namen liefert regelmäßig Gemeindeseite, Amtsblatt-PDFs und
Geoportal-Link, und ein Widerspruch zur Exposé-Bauweise (Einzel- vs. Doppelhaus) ändert das Produkt
grundlegend. Ebenso auf einen **sprechenden Plannamen** achten: „Behindertengerechte Siedlung" kann
Barrierefreiheits-Festsetzungen oder sogar eine Zweckbindung tragen. Standard-Next-Step: Gemeinde-
Hauptamt + Geoportal (für Schönwalde-Glien: +49 3322 2484-10, `hauptamt@schoenwalde-glien.de`,
`geoportal-schoenwalde-glien.de`).

**2. ⚠ Es gibt in Brandenburg KEINEN allgemeinen gesetzlichen 30-m-Waldabstand in der BbgBO.**
Die naheliegende Annahme („Waldrandparzelle ⇒ 30 m Bauverbot ⇒ 614 m² faktisch unbebaubar") ist
falsch: die BbgBO regelt nur **Abstandsflächen von 0,4 H, mindestens 3 m**; Waldabstände laufen in
Brandenburg über die **Baugrenzen des B-Plans** bzw. brandschutzrechtliche Auflagen der unteren
Bauaufsicht (und das BbgWaldG regelt nur Feuer/Rauchen innerhalb 50 m). ⇒ Bei einem **rechtskräftigen
B-Plan** ist die Frage planerisch bereits erledigt — die offene Größe ist nicht „der Waldabstand",
sondern **Lage und Tiefe des Baufensters**, und die steht in keinem Exposé (Immowelt-Plotexposés
liefern nie Lageplan/Flurkarte). Formuliere es als Baufenster-Frage an die Gemeinde, nicht als
Metervorschrift. *Why:* die erfundene 30-m-Regel hätte auf #763 eine kaufbare Parzelle als
unbebaubar abgewertet.

**Review cadence:** Potsdam-Mittelmark publishes each March for the 01.01. Stichtag; re-check every
spring. Roskow was reported unchanged year-on-year; the agrarian rates likewise. Havelland publishes
via a havelland.de press release rather than BORIS-BB — re-check each January.
