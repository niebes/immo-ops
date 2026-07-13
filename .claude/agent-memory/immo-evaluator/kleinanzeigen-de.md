# Kleinanzeigen (kleinanzeigen.de) — listing-page quirks

Matches: kleinanzeigen.de `/s-anzeige/{slug}/{id}-{cat}-{loc}` rental/immobilien pages.

## Getting the data
- **Detail pages (`/s-anzeige/...`) are plain-curl accessible** — a simple `curl -A "Mozilla/5.0 ... Firefox"` returns the full 200 HTML with every field (title `#viewad-title`, price `#viewad-price`, locality `#viewad-locality`, `#viewad-details` list incl. Standort street address, `#viewad-description-text`, seller block with "Aktiv seit", gallery elements). Only the SEARCH pages bot-block headless. *Why:* on 2026-07-13 the invisible-playwright driver was crashed session-wide; curl evaluated #324 with zero browser. Prefer curl for single-listing evals.
- A cookie consent overlay appears ("Willkommen bei Kleinanzeigen", buttons "Alle akzeptieren" /
  "Datenschutzeinstellungen"). It does NOT block `read_page` — full listing DOM renders behind it,
  so you can extract everything without touching the banner. Do not click "Alle akzeptieren".
- All load-bearing fields are in the `read_page` accessibility tree, no interaction needed:
  - Price heading (e.g. "1.000 €"), location line ("14482 Potsdam - Babelsberg Süd").
  - Spec `list` items: Wohnfläche, Etage, Wohnungstyp (Erdgeschosswohnung…), "Verfügbar ab",
    "Online-Besichtigung", and **"Tauschangebot" → "Kein Tausch"** (use this to confirm a genuine
    rental vs a swap — even when the title says "Nachmieter").
  - Second `list`: Nebenkosten + Warmmiete. (Kaltmiete = the top price heading — BUT for
    Genossenschafts/Nachmieter ads the top heading is often the **Warmmiete**, and the true
    Kaltmiete/Heizkosten/Betriebskosten split only appears in the free-text description. Always
    read the description to split warm vs cold; the search-snippet number is frequently the Kaltmiete
    while the page heading is the Warmmiete.)
  - Kaution field may read **"Kaution / Genoss.-Anteile"** → for a Genossenschaftswohnung this is
    refundable cooperative shares, NOT a deposit and NOT an advance-fee scam signal; the low rent is
    the coop structure, not too-good-to-be-true. *Why:* otherwise you'd wrongly flag scam + illegal Kaution.
  - Feature `list`: Terrasse/Balkon, Einbauküche, Badewanne, Keller, Aufzug, Haustiere erlaubt, etc.
  - Anbieter block: name + "Privater Nutzer" + "Aktiv seit {date}" (account age = scam signal).
  - Photo count: gallery shows "/13" style counter.

## EXPIRED / deleted detection (important)
- A deleted or reserved ad still renders the FULL cached listing — it does NOT 404 or show
  "nicht gefunden". Instead the status appears as badges in the gallery `article` AND prepended to
  the page `heading`: e.g. heading reads "Reserviert • Gelöscht • {title}". Generic refs
  "Gelöscht" / "Reserviert" sit right above the title.
- **"Gelöscht" = deleted → EXPIRED. Do NOT score the still-visible cached numbers.** *Why:* the page
  looks fully populated, so without checking the heading/badges you'd wrongly produce a full score for
  an ad the Anbieter has already taken down (typically because a Nachmieter was found).
- **Beware hidden badge templates:** EVERY listing page (also active ones) carries display:none
  elements containing "Gelöscht"/"Reserviert" (matched by `[class*="reserved"]`-style selectors),
  and the h1 always has `data-soldlabel="Nicht mehr verfügbar"` as an ATTRIBUTE — a grep for
  "nicht mehr verfügbar" in raw HTML false-positives on every active ad (hit on #328).
  Decide status only from VISIBLE text — `document.body.innerText.includes('Gelöscht')` or an h1
  prefix — never from DOM presence. *Why:* selector-based badge checks false-positive an active ad
  as EXPIRED (hit on #314).

## Tauschwohnung swaps (two-sided match)
- Genuine swaps: Anbieter block = "Tauschwohnung GmbH", "Gewerblicher Nutzer"; description opens
  "Es handelt es sich hierbei um ein Tauschangebot. (Anbieter-ID: …)".
- **The partner's Suche/Gesuchte Wohnung lives in the free-text `#viewad-description-text`**, not in
  any structured list — a plain sentence like "Wir suchen eine 4-Raum-Wohnung in Potsdam bis max. 900€
  Kaltmiete." Always read the description for Side 2 of the swap match. *Why:* the spec `list` only
  carries THEIR flat (Wohnfläche/Zimmer/Wohnungstyp); the Suche is prose-only.
  - **Sometimes the Suche is ONLY in the title** ("TAUSCHWOHNUNG Suche bezahlbare 4 Zimmerwohnung in
    Babelsberg-Nord") and the description describes only the OFFERED flat + platform boilerplate.
    Read BOTH; the title states what they seek, the description/spec-list what they offer — the
    search-result metadata (m²/rooms/price) refers to the OFFERED flat despite the "Suche…" title.
    *Why:* on #317 the hint said "4 rooms" (their Suche) while the offered flat was 3,5 Zi.
- These swap ads often carry **0 gallery images** (imgs count 0) → Block D capped at 3,0, and the
  page price heading is usually the **Kaltmiete** while the Warmmiete is only in the description text.

## Triage
- "Nachmieter gesucht" / "Suche Nachmieter" titles are normal long-term rentals (the existing tenant
  is leaving) — NOT sublets. Score normally unless the text says befristet / Untermiete / auf Zeit.
- "Das könnte dich auch interessieren" sidebar is full of Tauschwohnung ads — ignore it; it is not
  the listing under evaluation.
