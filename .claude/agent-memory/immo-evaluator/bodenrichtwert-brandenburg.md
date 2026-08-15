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
Speckgürtel values above are from the Kreis-PM and are the *official* ones.

**Review cadence:** Potsdam-Mittelmark publishes each March for the 01.01. Stichtag; re-check every
spring. Roskow was reported unchanged year-on-year.
