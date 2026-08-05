# Tauschwohnung.com — page quirks
Portal match: tauschwohnung.com (source behind "Tauschwohnung GmbH" swaps on IS24/Immowelt)

## The NUXT route only exists from IS24 — from Immowelt AND Kleinanzeigen you are on free text alone
An Immowelt swap expose has **no `twg.click` / "Original-Exposé" link**, and its `Referenznummer`
is the poster's **Anbieter-ID**, not a tauschwohnung.com housing id. `tauschwohnung.com/wohnung/{id}`
answers **HTTP 200 with a soft-404 body** ("Fehler - Seite nicht vorhanden"), so probing by status
code alone gives a false positive — grep the body for `Seite nicht vorhanden` before parsing.
⇒ On an Immowelt-sourced swap, the description's free-text "Ich suche …" paragraph is the whole
side-2 input; Keller / Baujahr / Energieausweis / Kaution / moveInDate stay **unknown**, not
resolvable. Details in `immowelt.md`. *Why:* #521 spent two calls on the IS24-only route.

**Same on Kleinanzeigen** (#524): no `twg.click` link anywhere in the HTML, and the ad's
"Anbieter-ID / Anbieter-Objekt-ID" (e.g. 237825) is the *poster's* id — `tauschwohnung.com/wohnung/237825`
returns 200 + the soft-404 body, and `twg.click/ka-{id}-01` is a hard 404. There is no housing id on the
page, so the Suche is whatever the title + `#viewad-description-text` say — and on #524 they said nothing
at all. Record "Suche unknown", fall back to their own flat as the yardstick, apply the lenient rule.

## Getting the partner's Suche (the side-2 input) — no browser needed
The IS24 expose NEVER contains the Suche. The expose's "Weitere Links" section has an
**"Original-Exposé"** link (`https://twg.click/is24-{objektNr}-NN`) that 302s to the
tauschwohnung.com detail page — plain `curl -sL` with a Firefox UA returns the full SSR
HTML (no consent wall, no bot-block).

Two places to read it:
1. **Rendered HTML**: `<h2>{Name} sucht</h2>` block with `search-item` divs (Miete bis X,
   Wohnfläche ab Y, Zimmer ab Z, Orte — but Orte collapses behind "Mehr anzeigen").
2. **`__NUXT_DATA__` script (better — complete)**: devalue-style flat array where dict
   values are indices into the same array. Find the dict with keys
   `{sourceUserId, targetUserId, housing, user, search, match,...}` (near index ~42):
   - `search` → `{cityNames, radius (km), rentMax, roomsMin, sizeMin, storeyMin/Max,
     residentCountAdults/Children, housingPropertyIds}` — the FULL Suche incl. radius
     and must-have property ids the HTML hides.
   - `housing` → their flat, richer than IS24: `isActive`, `deposit`, `moveInDate`,
     `constructionYear`, `energyEfficiency` (often missing on IS24!), `propertySize`,
     `market: "free"` (= no WBS), `housingPropertyIds`.
   - Property-id map: the array also holds `{id, key, inSearch}` dicts mapping ids →
     keys (`1=balconyOrTerrace, 2=fittedKitchen, 4=garage, 6=garden, 8=guestToilet,
     9=cellar, 12=petsAllowed, 14=floorHeating, 36=terracedHouse, 64=centralHeating,
     66=bathtub, 71=levelShower`). Absence of 9 = no Keller — the only reliable
     Keller signal (IS24 CHECK list omits negatives).
   - Resolve values with `data[idx]`; do NOT recursively follow ints (booleans/ids
     collide with array indices).
3. `moveInDate` can be a stale past date (seen 2024-03-01 on a live 2026 listing) —
   treat as "nach Vereinbarung", not as availability data.
4. Photos: IS24 MEDIA often has just 1 "picture" = the tauschwohnung logo (caption
   `www.tauschwohnung.com`) → that is 0 real photos, cap Block D at 3.0.

**Why:** without the twg.click fetch the two-sided swap match runs blind ("Suche unknown")
and the Keller/Energieausweis facts are wrong or missing; the NUXT payload gave the exact
radius (10 km) that decided the side-2 verdict on #335.

## The NUXT structured `search` dict can CONTRADICT the owner's free-text Suche — read BOTH
On #454 (expose 169486171, obj 191235, Lankwitz DHH) the housing owner's own
Objektbeschreibung said the Suche was "**2-3 Zimmer**, günstig, ruhig/hell/grün, am liebsten
**Bergmannkiez/Kreuzberg**, nur nah angrenzend ok", while the resolved NUXT `search` dict (idx-42
`{...,search}`, userId matching the housing) said `roomsMin 4, sizeMin 110, rentMax 1500,
storeyMin 2, cityNames [Berlin], radius 0`. The two disagree on rooms (2-3 vs ≥4) and size.
Don't trust the structured dict alone as "the Suche" — it can be a stale/match-derived filter.
**Treat the Objektbeschreibung tail ("Suche dafür …") as the authoritative human intent, and use
the structured dict only as a corroborator.** When they agree on the decisive axis (here: both
say **Berlin** city, both exclude a 2-Zi/54-m² Golm flat) the side-2 verdict is robust regardless.
IS24 MEDIA here was 5 tiles all captioned `www.tauschwohnung.com`/`Gesponsert` = 0 real photos
(cap D 3,0), and `energyEfficiency` (Klasse A) came ONLY from NUXT — IS24 ATTRIBUTE_LIST was all null.
**Why:** scoring side 2 off the structured `roomsMin 4/110 m²` alone would misstate what the partner
wants; reading the free text confirmed the real target (Kreuzberg) and made the mismatch unambiguous.
