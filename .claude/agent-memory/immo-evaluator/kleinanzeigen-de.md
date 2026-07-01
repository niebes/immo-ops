# Kleinanzeigen (kleinanzeigen.de) — listing-page quirks

Matches: kleinanzeigen.de `/s-anzeige/{slug}/{id}-{cat}-{loc}` rental/immobilien pages.

## Getting the data
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

## Triage
- "Nachmieter gesucht" / "Suche Nachmieter" titles are normal long-term rentals (the existing tenant
  is leaving) — NOT sublets. Score normally unless the text says befristet / Untermiete / auf Zeit.
- "Das könnte dich auch interessieren" sidebar is full of Tauschwohnung ads — ignore it; it is not
  the listing under evaluation.
