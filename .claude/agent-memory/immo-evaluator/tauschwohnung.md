# Tauschwohnung.com — page quirks
Portal match: tauschwohnung.com (source behind "Tauschwohnung GmbH" swaps on IS24/Immowelt/Kleinanzeigen)

## ⚠️ The portal's STRUCTURED fields can hold the poster's SUCHE, not the offered flat
On IS24 swap exposés some posters type their **search criteria** into the object fields. #550
(expose 169908178) shipped `realEstateType: houserent`, TOP_ATTRIBUTES "5 Zimmer / 100 m²
Wohnfläche / 100 m² Grundstück / Kaltmiete 1.500 €" — while the Objektbeschreibung offered a
**4-Zi / 84 m² / 1.300 € warm Wohnung** and *sought* "Haus oder Wohnung … mindestens 5 Zimmern
und einer Fläche von 100 m² für maximal 1.700 € warm". The address (Gorgasring 10, 13599) was
still the poster's own flat, so nothing looked broken.
⇒ **Rule: on every swap, cross-check TOP_ATTRIBUTES/ATTRIBUTE_LIST against the description
before scoring.** Tells that the fields are the Suche: a `Grundstück` figure identical to the
Wohnfläche, `realEstateType: houserent` on something the title calls a "Whg", a room/m² count
that equals the number in the title's "suche …" half, or a round 100/1.500.
⇒ Two knock-on effects: (a) score blocks A–H off the **description** numbers; (b) the
`PRICE_INFO.priceBar` is computed for the *phantom* object and is **unusable** as an
address-precise band — do not quote it and do not let it drive the "20 % below Mietspiegel"
scam signal. *Why:* scoring #550 off the fields would have invented a 100-m²-Haus at 1.500 €
kalt that does not exist, and inverted the two-sided match (their Suche read as their offer).

## Side-2 base rate: our 2-Zi/54-m² Golm offer only serves DOWNSIZERS
#492, #505, #533, #541, #550, #578 all failed side 2 on the same axis — the partner wants to
*enlarge* (≥3–5 Zi, 70–100 m², family households), and the Golm flat is the small end of the
market. Side 1 kept passing (3,5–4,3/5), so the cost was a full evaluation each time.
⇒ Read the Suche's **direction** (vergrößern vs. verkleinern / "weniger Miete") FIRST; if they
name ≥4 Zimmer or a 3+-person household, side 2 is a deterministic fail and the rest of the
evaluation is only worth doing for the record. Worth proposing a triage prefilter
("suche … ≥4 Zi / ≥70 m²" → discard before evaluation).

**But "downsizer" is NOT automatically a side-2 pass — a second, independent kill axis is a
qualitative BAUSUBSTANZ requirement, which our 2024 Neubau can never satisfy.** #579 was the first
genuine downsizer (offers 4 Zi/89 m², seeks 3 Zi) and still failed categorically: the Suche was
"3 Zimmer **mit Altbau-Deckenhöhe für Hochbett**". Ceiling height, Stuck, Dielen, Altbau, "hohe
Decken", Loft/Fabriketage are *physical building-era* criteria — no amount of side-2 leniency turns
a Neubau 2024 with ~2,50 m standard ceilings into one; treat them exactly like an explicitly stated
deal-breaker, not a soft must-have. Note the direction still helps on the *numeric* axes (their rent
1.375 EUR kalt vs our 1.025,25 → budget fits), so the report must say which axis actually decided.
**Third kill axis: an explicitly NUMBERED Mindestfläche.** The Tauschwohnung-GmbH template Suche is
frequently one fully-quantified sentence at the end of the description, in a fixed shape:
*"Ich suche nach einem Tausch in **{Stadt}** mit **mindestens {N} Zimmern** und einer Größe von
**mindestens {M} m²** für **maximal {P} € Miete**."* (#597, Golm). Grep `mindestens|min\.|ab \d+ ?m²|
maximal|max\.` — when M is stated, our 54,19 m² offer **deterministically fails any M ≥ 60**, no
leniency applies (a stated minimum is not a soft preference), and it fails *independently* of the
direction axis: #597's poster was a downsizer on rent (1.250 → max 1.000) but a *holder* on area
(85 → min 70). Check the rent ceiling P against BOTH our numbers — 1.025,25 kalt vs 1.214,93 warm can
land on opposite sides of P (on #597: +2,5 % vs +21,5 %), so say which reading you used.
⇒ Three-axis side-2 check, in this order: (1) direction/size (vergrößern → fail), (2) qualitative
Bausubstanz keywords (Altbau/Deckenhöhe/Stuck/Dielen → fail), (3) explicit numeric floor/ceiling
(mindestens m² / maximal EUR → arithmetic fail). All three belong in the same triage prefilter —
axis (3) is the cheapest to automate (regex on the description). *Why:* on #579 the favourable
direction made the swap look promising right up to the last clause of the title; on #597 the
favourable *rent* direction did the same, and only the stated 70-m²-Minimum settled it.

## Even on IS24 the object-specific twg.click link is NOT guaranteed — check "Weitere Links" first
Some IS24 swap exposés carry only the **generic** `https://twg.click/is24-homepage` in the
`REFERENCE_LIST` titled "Weitere Links" (it 302s to the tauschwohnung.com front page with utm
params), not the per-object `twg.click/is24-{objektNr}-NN`. **Do not construct the object link
from `OBJECT_INFO`'s Objekt-Nr.** — on #526 (expose 169826619, Objekt-Nr. 349800) `is24-349800-01/02/03`
were all hard **404**, and `tauschwohnung.com/wohnung/349800` answered 200 with the soft-404 body
("Seite nicht vorhanden"): the IS24 Objekt-Nr. is NOT a tauschwohnung housing id.
⇒ Rule: read the actual `url` in "Weitere Links". If it is `is24-homepage`, the NUXT route does not
exist for this listing — fall back to the free-text Suche exactly as on Immowelt/Kleinanzeigen
(Keller/Baujahr/Kaution/moveInDate stay whatever IS24's ATTRIBUTE_LIST says, Suche = description).
Budget: one grep of the REFERENCE_LIST, not 4 curls. *Why:* #526 burned 4 probes rediscovering this.

Confirmed again on #549 (expose 169908691, Objekt-Nr. 443422): "Weitere Links" held only
`is24-homepage`. Treat the generic link as the *common* case on IS24 swaps, not the exception —
go straight to the free text.

### IS24 `realEstateType: houserent` swaps are the sparsest variant — expect NO Ausstattung at all
On #549 the whole expose carried just three ATTRIBUTE_LISTs: "Hauptkriterien" (only `Wohnfläche ca.`
+ `Grundstück ca.` — the rest are SCHUFA/Telekom ad LINKs), "Kosten" (Kaltmiete + Preis/m² +
`Gesamtmiete: "1.900 € zzgl. Heiz- und Nebenkosten"`, i.e. **NK and Warmmiete genuinely absent, not
zero**), and "Bausubstanz & Energieausweis" containing the single line `Wesentliche Energieträger:
Keine Angabe`. There is **no Ausstattung block and not one CHECK attribute**, so Keller / Balkon /
Terrasse / EBK are *unresolvable* — the one-line Objektbeschreibung is the only amenity source.
Score the must-haves as unconfirmed (Block E ~2,5), don't read the absence as a negative.
MEDIA was 10 PICTURE tiles **all** captioned `www.tauschwohnung.com` (+1 AD) = 0 real photos → cap D.
`PRICE_INFO.priceBar` still works and is the only price anchor worth having, which matters doubly
here: the **Berliner Mietspiegel excludes Ein-/Zweifamilien- und Reihenhäuser**, so for a Berlin
`houserent` there is no Mietspiegel field to compare against at all — use the priceBar percentile
plus a § 556g Abs. 3 BGB Auskunft note. *Why:* without this you hunt for a criteria table and a
Mietspiegel row that cannot exist, and risk logging "keine Ausstattung" as if the flat lacked it.

**The free-text Suche is often one sentence in the middle of the Objektbeschreibung, not a tail
block** — #526: *"Ich möchte mich Ende 2026 verkleinern um weniger Miete zahlen zu müssen und suche
daher auf diesem Weg eine 3 Zimmer Wohnung."* It carries rooms + timing + an implicit rent ceiling
(their own "derzeit 1175 € Kalt") and no Ort at all. Read the WHOLE description, and mine the
*motive* ("verkleinern", "weniger Miete") — it is the decisive side-2 axis, often more decisive than
the literal room count: a 2-Zi offer that is 150 EUR cheaper serves a downsizer's stated goal even
though it misses "3 Zimmer" by one.

**IS24 swap description text can end in a literal "…" that is the poster's own ellipsis, not
truncation** — verify with `len()` on the raw `text` field before hunting for a fuller copy
(#526: 231 chars, complete).

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
4. Photos: the caption `www.tauschwohnung.com` is a **watermark attribution, not proof of a logo
   tile** — do NOT infer "0 real photos" from the caption alone (that misread would have capped D
   on #548, which has 14 genuine phone photos all captioned that way). Decide by **fetching one
   `fullImageUrl`**: a real photo is ~40–60 KB at 1333×1000 (amateur snap with a translucent
   "Tauschwohnung" wordmark across the middle); a placeholder/logo tile is tiny and uniform, and
   the `Gesponsert`-captioned tile has an **empty** `fullImageUrl` (it is the AD slot, never count
   it). One curl + `file` settles it; only then cap Block D at 3.0 for "no real photos".

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
