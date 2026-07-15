# Tauschwohnung.com — page quirks
Portal match: tauschwohnung.com (source behind "Tauschwohnung GmbH" swaps on IS24/Immowelt)

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
