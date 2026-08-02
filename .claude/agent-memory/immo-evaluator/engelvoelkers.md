---
name: engelvoelkers
description: Portal quirks for engelvoelkers.com (Engel & Völkers) expose/detail-page evaluation
metadata:
  type: reference
---

# Portal: Engel & Völkers (engelvoelkers.com)

Next.js React SPA. `portals.yml` covers the **search** page (extractor
`scripts/portals/engel-voelkers-extract.js`); this file covers the **detail/expose** page.
invisible-playwright works first try — no bot wall, no CAPTCHA.

- **Expose URL pattern:** `/de/de/exposes/{uuid}`.
- **Consent banner does NOT block content.** The Cookie text is present in
  `document.body.innerText` (first ~1.100 chars) but the expose renders fully behind it.
  Do **not** click "Ablehnen" — just slice the intro off the text.
  *Why:* clicking is a wasted round-trip and risks a re-render mid-extraction.

## Read the JSON, not the DOM

Everything is in `#__NEXT_DATA__` at:
`props.pageProps.dehydratedState.queries[0].state.data.listing`

One `evaluate_script` returns the whole record. Useful fields:

| Field | Meaning |
|---|---|
| `price.salesPrice.min/max`, `basePrice.*` | Kaufpreis (min==max when fixed) |
| `area.plotSurface.min/max`, `area.livingSurface.*` | m² |
| `commissionPercent.min/max` + `commissionType` | Käufercourtage; `COMMISSIONMIXED` = split buyer/seller |
| `profile.courtagePassus` | full commission legal text |
| `profile.description` / `profile.locationDescription` | the two description blocks |
| `statusNormalized` | `ACTIVE` — use for the still-active check |
| `publishedAt` / `updatedAt` | listing age |
| `propertyImages[]` / `uploadCareImageIds[]` | photo count |
| `energyCertAvailable` | often `"unknown"` |
| `agent.{name,email,phone,jobTitle,profileUrl}` + `shop*` | Anbieter block |
| `displayId` | the E&V ID shown on the page (e.g. `W-047CIW`) |

- **`features.*` booleans are DEFAULTS, not facts.** `hasBalcony/hasBasement/hasGarden/`
  `hasTerrace/hasPatio/isPetsAllowed/hasCoveredParking` come back `false` on listings that
  demonstrably have those things (a land listing whose text advertises a Garage returned
  `hasCoveredParking:false`). **Never score amenities from these flags — read the description.**
  *Why:* taking them at face value silently marks must-haves as missing and tanks Block E.

- **Photo authenticity is answered by the payload** — no forensics needed:
  `propertyImages[].aiType` (`NONE` = real), `.aiOptimized`, and top-level `hasWaterMark`.
  `imageDisturbers: ["NEW"]` is the "NEU" badge, not a photo. Alt-texts are auto-generated
  descriptions and reveal what the pictures actually show (useful when interiors are missing).

- **Grep traps in `__NEXT_DATA__`:** the blob also embeds the full **i18n label dictionary**
  (`search.expose.propertyDetails.label.constructionYear":"Baujahr"` etc.). A raw substring
  search for `Baujahr`, `Provision`, `Energie` or `commission` hits those *labels* and looks
  like a match even when the listing has no such value. **Always parse and walk the `listing`
  object**; only use raw-text grep for words that can't be labels (e.g. `ersteiger` to rule out
  a Zwangsversteigerung — that one is genuinely absent from the dictionary).

- **No exact address, by design:** `displayLat`/`displayLng` are deliberately offset by
  `fuzzyMoveByMeter` (750 m). Only `addressComponents[]` (country/region/locality) are exact.
  Treat "no exact address" as a Low scam signal at most — it is standard E&V practice.

## Scoring notes

- E&V is a franchise: `shopName` + `agent.name` identify the actual counterparty, and
  `agent.email` sits on `@engelvoelkers.com` (good verification signal). Check the agent name
  against the landlord notes in `modes/_profile.md` before scoring Block H — Konrad Bohn
  (E&V Residential Berlin-Brandenburg) is flagged there as untrustworthy.
- Buyer-paid Courtage of ~3,57 % is the **legal** half-share for a residential purchase
  (Bestellerprinzip is rentals-only) — do not flag it as a violation.
