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
  - **The price heading and the "Warmmiete" detail field can carry the SAME number** when the poster
    left Nebenkosten empty (#356: heading 1.950 € and Warmmiete 1.950 €, no NK field at all). Don't
    silently treat the heading as Kaltmiete then — report the ambiguity, score conservatively with the
    figure as Kaltmiete, and put "Kalt/Warm klären" in next steps. *Why:* otherwise you invent a
    Nebenkosten split that the ad never stated.
  - **0 gallery images happens on ordinary private ads too**, not just Tauschwohnung ads — check
    `grep -o 'data-imgsrc="' | wc -l` on every listing and cap Block D at 3,0 when it's 0.
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
- **Second, distinct swap variant: the private DIY swap** — no Tauschwohnung GmbH, just a private
  tenant with a "[TAUSCH]" title. Tell-tale is the spec-list field **"Tauschangebot" → "Nur Tausch"**
  (vs "Kein Tausch" on ordinary rentals). These read like normal quality ads: 18 real photos, long
  ortskundige prose, account active for years — so none of the GmbH-swap heuristics (0 images,
  boilerplate opener, gewerblicher Nutzer) fire. *Why:* on #357 only the "Nur Tausch" field and the
  title bracket distinguished a swap from a regular rental; scoring it as rentable would have been wrong.
  On these, the Suche is a proper "Wir suchen …" paragraph under a "TAUSCHWOHNUNG" heading in the
  description, and the price heading = **Warmmiete** (the detail list confirms it) with Kaltmiete/NK
  never stated → Mietpreisbremse not checkable, say so instead of splitting an invented NK.
- **The partner's Suche/Gesuchte Wohnung lives in the free-text `#viewad-description-text`**, not in
  any structured list — a plain sentence like "Wir suchen eine 4-Raum-Wohnung in Potsdam bis max. 900€
  Kaltmiete." Always read the description for Side 2 of the swap match. *Why:* the spec `list` only
  carries THEIR flat (Wohnfläche/Zimmer/Wohnungstyp); the Suche is prose-only.
  - **Sometimes the Suche is ONLY in the title** ("TAUSCHWOHNUNG Suche bezahlbare 4 Zimmerwohnung in
    Babelsberg-Nord") and the description describes only the OFFERED flat + platform boilerplate.
    Read BOTH; the title states what they seek, the description/spec-list what they offer — the
    search-result metadata (m²/rooms/price) refers to the OFFERED flat despite the "Suche…" title.
    *Why:* on #317 the hint said "4 rooms" (their Suche) while the offered flat was 3,5 Zi.
  - **Title and description can each hold a DIFFERENT half of the Suche**: the title states the
    *motive* — a structural, non-negotiable criterion ("Tausch in eine höhere Etage") — while the
    description states the *numeric* criteria (Zimmer, Ortsteil, Ausstattung). Merge both into one
    Suche. A title-motive can be a categorical side-2 fail even when every number fits.
    *Why:* on #360 rooms/price/city all matched, but title+desc together demanded höhere Etage +
    Balkon and our Golm offer is EG without Balkon — reading only the description would have
    scored that as a lenient near-miss instead of the categorical mismatch it is.
- These swap ads often (not always) carry **0 gallery images** → Block D capped at 3,0. Count with
  `grep -o 'data-imgsrc="' | wc -l` on the curl'd HTML; #355 had 2, #358 had 16 real photos — do NOT
  assume image-poor just because the Anbieter is Tauschwohnung GmbH. The page price heading is usually
  the **Kaltmiete** while the Warmmiete is only in the description text (or NK in the spec list).
- **Tauschwohnung-GmbH ads frequently ship NO cost/legal fields at all** — no Nebenkosten, no
  Warmmiete, no Kaution, no Baujahr, no Energieausweis anywhere in the page (#358). Report these as
  "nicht angegeben" and say Mietpreisbremse isn't checkable; don't hunt for a second list that isn't
  there. *Why:* wasted greps + risk of inventing an NK split.
- **`#viewad-locality` on these ads is useless for the Ortsteil** — it renders as "{PLZ} Brandenburg -
  Potsdam" (Bundesland, not Bezirk). The real Ortsteil is only in the description prose ("liegt im
  schönen Bornstedt"). *Why:* Block B would otherwise be scored blind on the PLZ alone.
- The Suche is often not a "Wir suchen …" sentence but an **intent clause buried mid-description**
  ("Wir möchten uns vergrößern und möchten im waldstadt 1 oder 2 bleiben" = bigger flat + stay in
  that Ortsteil). Read the whole description as the Suche, not just sentences starting with "Suche".
  *Why:* on #355 a keyword grep for "suche" would have found nothing and mislabelled the Suche unknown.
- **The Suche can be a bare comparative with zero numbers** — "Wir tauschen mit einer ähnliche{n} Wohnung."
  (#359). Then the yardstick for side 2 is THEIR OWN flat's figures (m², Zimmer, Kaltmiete, Ortsteil,
  Ausstattung) — score our offer against those, don't record the Suche as "unknown". *Why:* "unknown Suche"
  would push a categorical fail into lenient/near-miss territory.
- **Side-2 shortcut for cheap Altvertrag swaps:** our Golm offer is 1.025,25 EUR kalt / 54,19 m² / 2 Zi /
  kein Keller. Any swap partner whose own flat is under ~800 EUR kalt or ≥3 Zi and who seeks "ähnlich"
  fails side 2 on affordability alone, however lenient the matching. Still score side 1 for the record.
- On GmbH-swap ads **Nebenkosten can sit in the MAIN `#viewad-details` list with no Warmmiete field at
  all** (#359: price heading 598 € = Kaltmiete, NK 112 € in the details list, Warmmiete only derivable).
  There is then no second list — compute Warmmiete yourself and say so.
- Tauschwohnung spec lists are frequently **self-contradictory** (e.g. "Etage 3" + Wohnungstyp
  "Erdgeschosswohnung"). Report both, don't pick one — these are tenant-entered fields.

## Kauf / Haus listings + ohne-makler cross-posts
- **Haus/Kauf ads carry a different `#viewad-details` set** than rentals: Wohnfläche, Zimmer,
  Schlafzimmer, Badezimmer, **Grundstücksfläche**, Haustyp (Doppelhaushälfte…), Etagen, Baujahr,
  Provision. Feature checktags (`li.checktag*`) hold Terrasse/Badewanne/Keller/Garage-Stellplatz/
  Garten. Price heading = Kaufpreis. #448 (Neu Fahrland DHH) all-curl.
- **ohne-makler.net cross-posts:** Anbieter block reads "OM Ohne Makler – Privat vom Eigentümer",
  Gewerblicher Nutzer, thousands of ads (the platform account, not the owner) — NOT a scam signal;
  it's a legit FSBO Direktverkauf. Objektzustand / Verfügbar ab / **Energieausweis (Energiebedarfs-
  ausweis, Endenergiebedarf kWh/m²a, Energieträger)** live in the `#viewad-description-text` prose
  under "# Weitere Angaben" / "# Energie", not in the structured lists. The expose PDF link
  (ohne-makler.net/immobilie/file/{id}.pdf) is in the description too. *Why:* Energieausweis/Objekt-
  zustand aren't in any spec `list` on these — grep the description or you'll report "no energy data".

## Bauträger / Fertighaus lead-gen ads (Kauf)
- **allkauf haus GmbH** (and similar Fertighaus brands: Town&Country, Massa, Bien-Zenker) post generic
  build-to-order ads via a "HD Handelsvertreter …" gewerblich account with 1000s of Anzeigen. Anbieter-
  Objekt-ID like "3801-313-kw28-…" and a "# Sonstiges" allkauf sales boilerplate in the description are
  the tell. These are **NOT specific existing properties** — no real address, boilerplate "# Lagebeschreibung",
  no secured plot. Price heading is the **house/Ausbauhaus package price**, land + Grunderwerbsteuer often
  NOT included. Watch for "Ausbauhaus"/"HEIMWERKER-Paket"/Eigenleistung (buyer finishes Trockenbau/Estrich).
  Score as a real Kauf listing but flag prominently as aspirational: cap B (~3,5, unverifiable location),
  dock A for the package/land ambiguity, H ~3,0 (mass lead-gen). Legit, not a scam. *Why:* #466 — without
  flagging it you'd score a phantom "house in Golm" as a concrete buy. Their spec-list Grundstücksfläche
  frequently contradicts the description (e.g. 1.052 m² vs "152 m²") — report both, don't pick one.
- **Even more aspirational variant — the bespoke architect build "auf Ihrem Grundstück"** (#474,
  SCHOSS INGENIEUR GmbH / Falk Schoß, gewerblich, active since 2009). No package price at all (price
  heading = bare **"VB"**, no number), no plot, no address, no Baujahr, no Energieausweis, no rooms —
  just Wohnfläche + Haustyp "Villa" + "Provision: keine". The description is a services pitch that also
  solicits "Wir suchen ... Baugrundstücke". You bring the land; they design/build. Score as Kauf but
  flag hard: A≈1,0 (no price + a 245 m² Reformarchitektur villa build busts a 500k budget), B≈2,5
  (no site), C penalised (245 m² over the 150 m² cap). Legit firm, not a scam. *Why:* the locality
  "14469 Potsdam" is decorative — nothing concrete is for sale.

## Triage
- "Nachmieter gesucht" / "Suche Nachmieter" titles are normal long-term rentals (the existing tenant
  is leaving) — NOT sublets. Score normally unless the text says befristet / Untermiete / auf Zeit.
- "Das könnte dich auch interessieren" sidebar is full of Tauschwohnung ads — ignore it; it is not
  the listing under evaluation.
- **"Verfügbar ab {Monat}" is a START-only field and hides Befristung.** A spec-list "Verfügbar ab
  August 2026" can actually be a 1-Monats-Zwischenmiete — the end date + "möbliert / untervermieten /
  01.08.–31.08." only appear in `#viewad-description-text`. Always read the description before deciding
  Zwischenmiete vs Dauermiete; the structured field never shows the end. *Why:* on #452 the field said
  only "August 2026" (looked like a normal move-in start) while the prose revealed a single-month
  furnished sublet → Zwischenmiete hard-blocker.
