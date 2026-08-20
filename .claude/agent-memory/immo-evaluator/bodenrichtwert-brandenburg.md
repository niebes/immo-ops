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

**Review cadence:** Potsdam-Mittelmark publishes each March for the 01.01. Stichtag; re-check every
spring. Roskow was reported unchanged year-on-year; the agrarian rates likewise.
