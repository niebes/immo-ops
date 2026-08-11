---
name: sparkasse-immobilien
description: Portal quirks for immobilien.sparkasse.de (Sparkasse Immobilien) listing evaluation — expose pages are SSR and curl-extractable, no browser needed
metadata:
  type: reference
---

# Portal: Sparkasse Immobilien (immobilien.sparkasse.de)

- **Expose URL pattern:** `/expose/{FID-…}.html` (also seen: `FIO-{id}`). The Objektnummer +
  SIP-ID are printed in the Objektdaten block.

## Detail pages need NO browser — plain curl is enough (verified 2026-08-11, #574)

The **search/city pages are the async client-side part** (portal.fio.de injects the cards after
first paint — that's what `portals.yml` documents for scanning). The **expose detail pages are
fully server-rendered**: title, Kaufpreis, Provision, Objektdaten table, Ausstattung,
Objektbeschreibung, Lagebeschreibung, Energieausweis and the Anbieter block are all in the initial
HTML, plus a `application/ld+json` `@type: House` graph. One curl → full evaluation.

```
curl -sL --compressed -A "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" \
  "https://immobilien.sparkasse.de/expose/{ID}.html" -o sk.html
```

- **`--compressed` is mandatory.** Without it the server still gzips and you get
  `UnicodeDecodeError: invalid start byte 0x8b` when you try to parse. That decode error is NOT a
  bot wall — it cost one wasted "the page must be JS-rendered" detour.
- Strip `<script>`/`<style>`, then tags, then unescape → the whole exposé reads as clean text.
  Long fields appear **twice** (truncated teaser + full "Mehr anzeigen" copy); take the longer one.
- *Why this matters:* the previous note said "client-side SPA, use the stealth browser". That is
  true for the city/search pages only; for detail pages it sent every evaluation through the
  browser for no reason. curl holds no browser lock → safe to run in parallel.

## Expired detection (reliable)

A removed listing returns **HTTP 410** with title "Dieses Angebot ist nicht verfügbar" / body
"Es wurde entweder gelöscht oder ist nicht mehr verfügbar." → **EXPIRED**, no scoring. The status
code alone is enough. Check `-w "%{http_code}"` on the curl above. *Why:* Sparkasse exposés expire
fast and websearch-sourced hints go stale within days.

## Fields worth grepping (they are all present in the SSR HTML)

`Kaufpreis` · `Käuferprovision` (buyer share, e.g. "3,57 % inkl. MwSt.") · `Objektnummer` /
`SIP-ID` · Objektdaten table (PLZ, Ort, Etagen, Wohnfläche, Grundstücksfläche, Zimmer, Badezimmer,
Parkplatztyp, Stellplätze) · `Zustand` (portal-normalized: *sanierungsbedürftig* / gepflegt / …) ·
`Effizienzklasse` + `Endenergiebedarf` + Ausstellungsdatum + Heizung/Primärenergieträger ·
Ausstattung keyword list · Anbieterinformationen (Firma, Anschrift, Ansprechpartner, Festnetz +
Mobil). **Not present:** street address ("Straße nicht freigegeben" — normal, low-tier scam signal
only), availability/Bezugstermin, Hausgeld (the word only appears in boilerplate disclaimer text —
don't mistake the disclaimer for a value).

Photo count is rendered as "*N* Bilder ansehen" plus a "Grundrisse" tab; the image URLs themselves
are NOT in the HTML (lazy-loaded), so use the count, and keyword-scan the description for
Visualisierung/Symbolbild to judge real-vs-render.

## invisible-playwright driver note (not Sparkasse-specific)

On a cold call, `new_page(url=…)` / `navigate_page` may hang or error with
"browsingContext is undefined" for ~one call. Recovery: `new_page` with an EMPTY url (about:blank
wakes the driver), then `navigate_page` to the target.

## Config gap seen from the evaluator side (2026-08-11)

`portals.yml` wires Sparkasse Immobilien into the **plot** group as `invisible-playwright` with the
Potsdam city page, but into the **house** group only as a `websearch` entry
(`site:sparkassen-immobilien.de` — a *different* host than immobilien.sparkasse.de). Result: houses
found by the plot scan get measured against the plot gate (200k / 500 m²) and logged
`skipped_criteria` forever. #574 was silently skipped 9× between 2026-08-02 and 2026-08-11 that way.
If more Sparkasse houses show up as coverage-gap recoveries, that mis-wiring is the cause.
