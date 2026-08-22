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
    - **BUT before declaring it ambiguous, grep the description for a self-declaring price sentence.**
      Private posters often close the text with one line that settles it outright — #575:
      "**Der angegebene Preis ist die aktuelle Warmmiete.**" Patterns to grep:
      `angegebene[nr]? Preis|Preis ist|Miete ist|alles inklusive|warm pro Monat|inkl\. NK|zzgl\.`.
      **Second, very common form: a labelled bullet inside an "Eckdaten:" list** — `* Warmmiete:
      1.442,67 €` (#580). Grep `Warmmiete\s*:` / `Kaltmiete\s*:` in the description, not just prose
      sentences; the bullet is more precise than the heading (cents vs rounded euro) and confirms
      which figure the heading is. *Why:* on #580 the heading/detail field both said "1.443 €" with
      no NK field — the #356 ambiguity rule would have applied, but the Eckdaten bullet settles it
      outright as Warmmiete.
      When present it OVERRIDES the conservative default: score the figure as Warmmiete, say the
      Kaltmiete/NK are unstated, and estimate the split (Potsdam Neubau w/ Fußbodenheizung+Aufzug+TG
      ≈ 3,00–3,50 EUR/m² NK incl. heating) instead of treating the number as Kaltmiete.
      *Why:* on #575 the default reading would have inflated €/m² from ~14,4 to 17,66 and swung the
      Mietpreisbremse verdict, on an ad that states the answer in plain German.
  - **All three price fields can be present AND not add up**: heading (Kaltmiete) + spec-list
    "Nebenkosten" ≠ spec-list "Warmmiete" (#520: 1.300 + 450 = 1.750 vs stated Warmmiete 1.717 →
    derived NK 417). Always do the arithmetic; report both the stated and the derived NK and put
    "NK klären" in next steps. *Why:* silently trusting the NK field overstates the monthly cost by
    the delta, and trusting the Warmmiete hides that one of the poster's numbers is wrong.
  - **Third price variant — heading == "Warmmiete" field WHILE NK *and* a separate "Heizkosten" field
    are both filled** (#522: heading 898 €, Warmmiete 898 €, Nebenkosten 125 €, Heizkosten 125 €).
    Unlike #356 (NK empty) the ad gives you enough to derive the other reading, so present BOTH as a
    two-row table — (a) heading = Kaltmiete → warm 1.148, (b) heading = Warmmiete → kalt 648 — score
    the conservative (a), and put "Kalt/Warm klären" first in next steps. Note the spec list has a
    **separate `Heizkosten` field** next to `Nebenkosten`; Warmmiete = Kalt + NK + Heiz, so forgetting
    Heizkosten under-states warm by a whole line. *Why:* on #522 the €/m² swings 10,45 ↔ 14,48 and the
    Mietpreisbremse verdict flips with it — picking one silently would fabricate the answer.
  - **Fourth price variant — heading == "Warmmiete" field, NK filled, NO Heizkosten field** (#540:
    heading 1.692 €, Warmmiete 1.692 €, Nebenkosten 305 €). Unlike #356 (NK empty) and #522 (extra
    Heizkosten field) the arithmetic closes cleanly in exactly one direction, so you can *rank* the
    two readings instead of calling it a coin flip: (b) heading = Warmmiete → kalt = heading − NK is
    the plausible one whenever (a) heading = Kaltmiete would push **warm EUR/m² past ~25 EUR/m² for
    Potsdam**. Present both readings as a two-row table, score the conservative (a), but say in prose
    which one the arithmetic + market level favour, and put "Kalt/Warm klären" first in next steps.
    *Why:* on #540 (a) implied 26,6 EUR/m² warm — impossible for Potsdam; declaring it a pure tie
    would have thrown away decidable evidence.
  - **Sixth price variant — the CLEAN one, and it still hides a trap: heading ≠ Warmmiete field, NO
    Nebenkosten field, and the prose names the total** (#593: heading 1.250 €, Warmmiete 1.600 €, kein
    NK-Feld; Beschreibung: "Die Gesamtmiete für die Wohnung **inkl. Stellplatz** und Betriebskosten-
    vorauszahlungen beträgt 1.600,00 €"). Two different numbers ⇒ no #356-style ambiguity: heading =
    Kaltmiete, derive NK = warm − kalt and say it's derived. **The trap is the "inkl. Stellplatz":** a
    separately-let Stellplatz is NOT Wohnraummiete, so if the heading already contains it the true
    Wohnungs-Kaltmiete (and thus EUR/m² and the whole Mietpreisbremse rechnung) is lower. Always ask
    which side of the 1.250 the Stellplatz sits on and put it in next steps. *Why:* silently treating
    the heading as pure Wohnraummiete over-states EUR/m² by ~0,5 EUR and hands away a real negotiating
    lever the ad itself created.
  - Posting date + view count: `#viewad-extra-info` (e.g. "14.08.2026") and the counter right after it
    ("6" Aufrufe). Useful for "how fresh / how contested is this ad" in next steps — there is no
    "Anzeige online seit N Tagen" string to grep.
  - **The exact street address is NOT in any `ul.addetailslist`** — it sits in a separate
    **"Standort"** block (and once more right under the price heading) and is only reachable by
    dumping the *visible text* of the own-ad region, e.g. `Tiroler Damm 16b, 14478 Brandenburg -
    Potsdam` (#607). So: after parsing the spec lists, always also strip-tag the region
    `title … sidebar` and read it — `#viewad-locality` alone gives you "{PLZ} Brandenburg -
    {Stadt}" and nothing more. A house-number-precise address is the single highest-value field on
    a Mieterinserat: it unlocks Baujahr/Bauvorhaben via one WebSearch (see below).
  - **The PLZ/Ort field can be flat-out WRONG — a different Gemeinde 55 km away — and `og:latitude/
    og:longitude` inherit the error, so the map is not a second opinion.** #640 rendered
    `#viewad-locality` "14473 Brandenburg - Potsdam" + geo `52,386116 / 13,072902` (= Potsdam
    Südliche Innenstadt) on an ad whose title AND description say **Grünheide (Mark)** (Oder-Spree).
    The poster simply typed their own PLZ. Resolution recipe, in order of strength:
    1. **Triangulate the description's distance claims.** #640 gave three ("Tesla Gigafactory ca.
       10 Min. mit dem Auto", "Müggelsee ca. 10 km", "BER ca. 35 km"); only Grünheide satisfies all
       three, Potsdam satisfies one. Two independent distance claims that agree beat any single field.
    2. **Pull the poster's other ads: `curl "https://www.kleinanzeigen.de/s-bestandsliste.html?
       userId={id}"`** — the id sits in the `href` inside `#viewad-contact`. Plain-curl accessible,
       and each row yields title + `aditem-main--top--left` (PLZ/Ort) + price + description snippet
       via `data-href`. On #640 the sibling ad (Leipzig-Gohlis) carried the *correct* PLZ, which
       proved the Grünheide ad's PLZ was the outlier rather than the title.
    3. **Compare the two ads' `data-imgsrc` UUID sets** while you're there — same UUIDs across two
       "different" flats would be the Medium "photos from different properties" signal. On #640 the
       sets were disjoint, so it did NOT fire.
    *Why:* the ad only reached the pipeline because the PLZ said Potsdam; scoring the field instead of
    the text would have produced a Potsdam report for an Oder-Spree flat — and would have fired the
    High "price >20 % below Mietspiegel" signal (10,62 EUR/m² is cheap for Potsdam, ordinary for
    Grünheide). Whenever title-Ort ≠ field-Ort, settle it before scoring anything else.
  - **Vermieter name + exact address ⇒ settle Baujahr AND the kalt/warm reading with ONE WebSearch.**
    On #607 the ad gave only "1.200 €" (heading == `Warmmiete` field, no NK field ⇒ the #356
    ambiguity) plus "Der Vermieter ist die Pro Potsdam" and the Standort address. A single search
    on `"{Straße}" {Stadt} {Vermieter} Neubau` returned the Bauvorhaben (Tiroler Damm 16 A–E,
    ProPotsdam, fertig Q2/2019, 95 WE, 75 % belegungsgebunden) → Baujahr for the Mietspiegel field,
    *and* it decided the price reading: 1.200 as Kaltmiete = 15,97 EUR/m² is impossible for a
    kommunale Gesellschaft, as Warmmiete it lands on the Mietspiegel-Mittelwert. Do this BEFORE
    falling back to the "score the conservative reading" default — it converts a coin flip into a
    decided case. *Why:* the photo-based Baualter-Gegenprobe (see [[potsdam-mietspiegel]]) is
    unavailable on a 0-photo ad; the address+Vermieter route is the replacement and is harder evidence.
  - **Sixth price variant — heading reads "Zu verschenken" on a RENTAL** (#594). This is NOT a
    giveaway and NOT a Verschenk-Anzeige: the raw markup carries `<meta itemprop="price" content=""/>`
    (empty) and Kleinanzeigen renders its free-of-charge fallback for an empty price field. The h1 also
    gets `data-soldlabel="Verschenkt"` instead of the usual "Nicht mehr verfügbar" — do NOT read that
    as sold/expired either. Recovery: the only stated cost is the `Warmmiete` field in `#viewad-details`
    (repeated in the description), and **Kaltmiete = `Kaution / 3`** whenever the Kaution field is an
    exact multiple of a plausible rent (#594: Kaution 2.625 = 3 × 875 → kalt 875, NK = warm − kalt =
    210 = 2,96 EUR/m², plausible). Sanity-check the other direction: a 2-NKM reading would put the
    Kaltmiete *above* the Warmmiete → impossible, which is what makes the 3-NKM derivation safe. Say
    "derived" in the report, and note the circularity — if the true Kaltmiete is lower, the Kaution
    would be illegal (>3 NKM), so it doubles as a contact question. *Why:* the heading looks like a
    data-entry joke and the obvious move (treat the heading as the price) yields "0 EUR"; without the
    Kaution ÷ 3 route the ad has no Kaltmiete at all and the whole Mietspiegel/Mietpreisbremse check
    is unrunnable on an otherwise 4,1/5 flat.
  - **The Ablöse is often NOT called "Ablöse".** #540 used "**Abschlagszahlung** von 1500€" for a
    tenant-installed Geschirrspüler + Kochinsel; a grep for `Ablöse` returns 0 hits. Grep for
    `Abschlag|Ablös|Abstand|übernehmen|Übernahme` when checking a Nachmieter ad for the
    outgoing-tenant demand. Note the sub-case: when the Ablöse covers **equipment the tenant owns and
    installed themselves** (not the landlord's fitted kitchen), taking the landlord channel removes
    the payment *and* the appliances — say so instead of framing the landlord channel as pure saving.
    *Why:* a keyword-blind read reports "no Ablöse" on an ad that has one.
  - **Private Nachmieter ads:** price heading is often the **Warmmiete** and the only proof is one prose
    line ("Miete: ca. 1.370 € warm pro Monat"); Nebenkosten/Kaution/Baujahr/Energieausweis/Adresse are
    usually absent entirely, and the Zimmerzahl runs half a room high (HWR/Abstellraum counted). Before
    scoring such an ad, look for the **landlord-channel twin** (Semmelhaack/Hausverwaltung/IS24) and
    dedupe on an **exact Warmmiete + m² + Etage** match — the tenant ad typically adds an Ablöse
    ("Küche muss übernommen werden") and a hard move-in date the landlord listing doesn't have.
    *Why:* on #521 that match turned a would-be full evaluation into a DUPE of #516 and revealed the
    Ablöse as avoidable.
  - **Read the WHOLE gallery, not the first 3–4 images — the Grundriss is often the LAST one.**
    #609 had it at position 7 of 8, and it was the only source for: the maisonette split
    (untere Ebene 2 Zimmer + Bad + Küche, obere Ebene = **offene Galerie** as the "3rd room" →
    Block C caveat), Balkon *and* Terrasse as two distinct Freisitze (text said only "2 Balkone"),
    and the unit id "WE 13". The captioned slides ("Grundriss unten (Zimmer 1 und 2)") show the
    poster built their own mini-Exposé — a screenshot-looking image with white margins + a German
    room caption is self-made material, **not** the re-captured foreign-Exposé pattern, so do NOT
    fire the "photos from different properties" Medium signal on it. Also use the photos to date the
    building when Baujahr is absent (verputzte Fassade + Dachflächenfenster + Rollläden + Glasbaustein
    + Wendeltreppe ⇒ Nachwende-Neubau 1990er/2000er, i.e. Mietspiegel-Feld 1991–2008).
    *Why:* stopping at image 4 would have missed both the layout caveat and the Baualtersklasse.
  - **0 gallery images happens on ordinary private ads too**, not just Tauschwohnung ads — cap Block D
    at 3,0 when it's 0.
  - **Counting photos: DEDUPE the `data-imgsrc` URLs — the raw grep count is 2× the real photo count.**
    Each gallery photo is emitted twice, once as `…?rule=$_59.AUTO` (thumb strip) and once as
    `…?rule=$_57.AUTO` (main slide), same image UUID. So count *unique* UUIDs:
    `grep -o 'data-imgsrc="[^"]*"' f.html | sed 's/?rule.*//' | sort -u | wc -l`. Also restrict to the
    part of the HTML **before `id="viewad-title"`** — everything after belongs to the "Das könnte dich
    auch interessieren" sidebar. *Why:* on #505 a plain grep said 8 images for an ad that actually has 4
    (Block D photo-evidence judgement was about to be made on a doubled number).
    - **Do not substitute a whole-page grep on the bare CDN path** (`img.kleinanzeigen.de/api/v1/
      prod-ads/images/…`) for that recipe: each sidebar ad emits its own `<script type="application/
      ld+json">` **ImageObject** with a `contentUrl`, so the page carries ~10 foreign UUIDs on top of
      the ad's own. On #608 that read **11 images for a 1-photo ad** — an 11× overcount, far worse than
      the 2× duplication above, and exactly the range where the 0-/1-photo Block-D cap is decided.
      Those JSON-LD blocks are also *not* a counting route: there is only **one per ad**
      (`representativeOfPage: true`), so they identify the ad's lead photo, never its gallery size.
      Useful side effect: each sidebar ImageObject carries the neighbour ad's full `title` +
      `description`, which is why keyword greps for "Tauschangebot" false-positive (see below).
  - Kaution field may read **"Kaution / Genoss.-Anteile"** → for a Genossenschaftswohnung this is
    refundable cooperative shares, NOT a deposit and NOT an advance-fee scam signal; the low rent is
    the coop structure, not too-good-to-be-true. *Why:* otherwise you'd wrongly flag scam + illegal Kaution.
  - Feature `list`: Terrasse/Balkon, Einbauküche, Badewanne, Keller, Aufzug, Haustiere erlaubt, etc.
    - **An ad can carry ZERO checktags** (`li.checktag*` returns nothing at all, #594) — then the
      must-haves are undecidable from structured data and you must **download the gallery images and
      Read them**. It is cheap and decisive: `curl "{data-imgsrc base}?rule=\$_57.JPG"` per deduped
      UUID, then Read the files. On #594 photo 1 was the **Grundriss**, which alone gave the exact
      Wohnfläche (71,50 m² vs "71" in the spec list), the unit number ("Whg. 1.07" — the only
      identifier in the whole ad), and a **confirmed Balkon**; further photos confirmed an
      unadvertised Einbauküche and a bodengleiche Dusche (⇒ no Badewanne). Also cross-check the
      photo-derived Baualter against the Mietspiegel field (see [[potsdam-mietspiegel]]) — an ad with
      no Baujahr and no Energieausweis is otherwise unscoreable on A and D.
      *Why:* judging E from the empty checktag list would have recorded "Balkon missing" and fired the
      missing-must-have penalty on a flat whose floor plan plainly shows one.
  - Anbieter block: name + "Privater Nutzer" + "Aktiv seit {date}" (account age = scam signal).
    - **Positive-feedback badges are load-bearing in the other direction**: "TOP Zufriedenheit" /
      "Besonders freundlich" / "Besonders zuverlässig" come from real transaction feedback, so the
      "new account, single listing" Medium scam signal does **not** fire even on an otherwise
      anonymous private poster (#594: no name, no address, no phone, but active since 09/2024 with
      all three badges).
  - Photo count: gallery shows "/13" style counter.
  - **Photos can be phone SCREENSHOTS of another listing's gallery** — tell-tales: black bars down the
    left/right of most images (phone screen capture) and, on at least one, baked-in app chrome such as
    a "**12 Fotos**" overlay badge and greyed UI text below the picture. The images are still real
    photos of one consistent property (so Block D is NOT capped), but the material was re-captured
    from a parent Exposé that exists elsewhere. Fire the **Medium** "photos from different properties /
    re-used marketing material" scam signal, dock **Block H** (provenance, ~2,5), and make "who is
    letting, and which Exposé are these from" the first contact question. Frequent companions on the
    same ad: a content-free machine-generated-sounding description that only paraphrases the spec
    fields, no address, no Baujahr, no Energieausweis. *Why:* on #594 this was the only reason to
    doubt an otherwise clean 4,1/5 ad — and none of it is visible unless you actually Read the images.

## EXPIRED / deleted detection (important)
- A deleted or reserved ad still renders the FULL cached listing — it does NOT 404 or show
  "nicht gefunden". Instead the status appears as badges in the gallery `article` AND prepended to
  the page `heading`: e.g. heading reads "Reserviert • Gelöscht • {title}". Generic refs
  "Gelöscht" / "Reserviert" sit right above the title.
- **"Gelöscht" = deleted → EXPIRED. Do NOT score the still-visible cached numbers.** *Why:* the page
  looks fully populated, so without checking the heading/badges you'd wrongly produce a full score for
  an ad the Anbieter has already taken down (typically because a Nachmieter was found).
- **Third state, between active and gone: the SOFT-CLOSED ad.** Title/description shout
  "**Nicht mehr Schreiben!**" / "BITTE KEINE ANFRAGEN MEHR SENDEN!!! Die bisherigen Anfragen werden
  sortiert und dann Termine vergeben" (#609), while the page carries **no** "Gelöscht"/"Reserviert"
  badge and the flat is still free. This is **NOT EXPIRED** — the *applicant channel* is closed, not
  the tenancy. Score it normally and put the closed channel in the Summary + Next Steps (one short
  "falls jemand abspringt" message + hunt for the landlord-channel twin), never as an early exit.
  *Why:* the phrase reads like "gone" and would have thrown away a 4,3/5 flat; conversely, scoring it
  without flagging the closed channel would send the user into a stack that is no longer being read.
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
- **A GmbH swap can carry NO `Tauschangebot` field in `#viewad-details` at all** (#524 had the full
  Wohnfläche/Zimmer/Etage/NK list and none of "Nur Tausch"/"Kein Tausch"). The structured proof is then
  the `#viewad-contact` Anbieter name ("Tauschwohnung GmbH … Gewerblicher Nutzer, aktiv seit …, N Anzeigen")
  **plus** the boilerplate opener inside `#viewad-description-text` — both are ad-own DOM, unlike the
  sidebar hits. *Why:* demanding the `Tauschangebot` field as the only structured confirmation would have
  read #524 as a plain rental.
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
    - **Title sub-pattern "Biete X – Suche Y"** ("TAUSCHWOHNUNG **Biete 4** – **Suche 3 Zimmer mit
      Altbau-Deckenhöhe für Hochbett**", #579): same both-sides-in-one-title shape as "gg"/"gegen"
      below — first number = OFFERED, number after "Suche" = the Suche — and the description held
      nothing but Tauschwohnung boilerplate + `# Weitere Angaben`. Two consequences: (a) the
      **search-result hint copies the Suche's room count** (hint said "3 Zi", spec list said
      **Zimmer 4**) — always take rooms from `#viewad-details`, never from the hint on a swap;
      (b) the clause AFTER the room number is a real Suche criterion, not decoration —
      "mit Altbau-Deckenhöhe für Hochbett" is a categorical side-2 fail (see `tauschwohnung.md`).
      *Why:* on #579 reading the hint would have logged a 3-Zi flat, and stopping the Suche parse at
      the room count would have made a physically impossible swap look like a one-room near-miss.
    - **Title sub-pattern "X gg Y" / "X gegen Y"** ("Tauschen **3 Raum** Wohnung **gg 4 Raum**", #541):
      one title carries BOTH sides — the first number is the OFFERED flat, the number after
      `gg`/`gegen`/`→` is the **Suche**. Parse it that way and the Suche is a hard, structural
      criterion (rooms) even when the description says nothing about what they seek; an
      *upsize* direction (offered < sought) is a categorical side-2 fail against our 2-Zi Golm
      offer, not a lenient near-miss. *Why:* on #541 the description held zero Suche and the
      search hint said "3 Zi" — reading only those would have recorded "Suche unknown" and
      surfaced a Swap-candidate the partner can never accept.
  - **Title and description can each hold a DIFFERENT half of the Suche**: the title states the
    *motive* — a structural, non-negotiable criterion ("Tausch in eine höhere Etage") — while the
    description states the *numeric* criteria (Zimmer, Ortsteil, Ausstattung). Merge both into one
    Suche. A title-motive can be a categorical side-2 fail even when every number fits.
    *Why:* on #360 rooms/price/city all matched, but title+desc together demanded höhere Etage +
    Balkon and our Golm offer is EG without Balkon — reading only the description would have
    scored that as a lenient near-miss instead of the categorical mismatch it is.
- These swap ads often (not always) carry **0 gallery images** → Block D capped at 3,0. Count with the
  deduped-UUID method above (#355 had 2, #358 had 16, #505 had 4 real photos) — do NOT assume image-poor
  just because the Anbieter is Tauschwohnung GmbH. The page price heading is usually the **Kaltmiete**
  while the Warmmiete is only in the description text (or NK in the spec list) — and the prose form is
  often "**Die Miete beträgt 1600 € mit Nebenkosten**" (= Warmmiete; derive NK = warm − heading, and say
  it's derived, #505).
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
  - **The Suche can be MISSING ENTIRELY** — title is just "TAUSCHWOHNUNG {flat description}" with no
    Suche clause, and the description covers only the offered flat + platform boilerplate + "# Weitere
    Angaben" (#524). From Kleinanzeigen there is **no recovery route**: these ads carry no twg.click /
    "Original-Exposé" link, and `tauschwohnung.com/wohnung/{Anbieter-Objekt-ID}` soft-404s ("Seite nicht
    vorhanden") because the Anbieter-Objekt-ID is NOT a housing id. Don't burn calls on it — record
    "Suche unknown", use their own flat as the fallback yardstick, and apply the lenient rule
    (surface as Swap-candidate, "verify on contact"). *Why:* #524 spent 3 fetches proving the route
    doesn't exist.
  - **The Suche can be a NEGATIVE area filter plus a one-word direction, both typo'd.** #578:
    "**Wie** wollen uns vergrößern" (sic — "Wir") + "Wir sind für alle Bereiche in Potsdam offen
    **außer Stern, Schlaatz oder Drewitz**". Two consequences: (a) grep the description
    typo-tolerantly — `vergrößer|vergroesser|größer|verkleiner|mehr Platz|mehr Raum` catches the
    direction whatever the subject pronoun says, a grep for `Wir suchen|Wir wollen` does not;
    (b) an "alle Bereiche in X außer A, B, C" clause is a **pass** for side-2 area as long as our
    offer's Ortsteil isn't on the exclusion list — don't record it as "Suche unknown / no target area".
    Bonus inference: the excluded Ortsteile are usually the poster's OWN neighbourhood (they want out),
    which is the only way to narrow the Ortsteil when `#viewad-locality` shows just "{PLZ} Brandenburg -
    Potsdam". *Why:* the pronoun typo makes the decisive upsize clause invisible to the obvious grep,
    and an exclusion list looks like "no area stated" if you only scan for a named target.
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
  - **The contradiction that actually costs points is the ZIMMER count.** #606: `Zimmer 3` in
    `#viewad-details` vs. the poster's own description "Zwei Zimmer / **Wohnküche** mit Balkon / ein
    Bad / kleine Abstellkammer" — i.e. 2 Zi + Wohnküche, the eat-in kitchen counted as the third
    room. Always diff the spec-list room count against the room-by-room enumeration in the
    description (`Wohnküche|Abstellkammer|Kammer|Diele|halbes Zimmer`) before scoring Block C
    against `min_rooms`. *Why:* the structured "3" satisfies min_rooms: 3 on paper while the flat
    has no third separable room — worth ~1,0 on C and belongs in the Summary as an explicit con.

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
- **Dedupe on the AD-ID, not the URL.** A poster can re-title an ad; Kleinanzeigen then serves it under a
  brand-new slug (`/s-anzeige/{new-slug}/{same-id}-203-7966`) while the numeric ad-ID before `-203-` stays
  constant. Price and title in the search hint change too, so URL-based dedup lets the same ad re-enter the
  pipeline as "new". **First action on any Kleinanzeigen eval: `grep -rn "{ad-id}" data/`** — if
  `pipeline.md` / `scan-history.tsv` already carry it, say so and re-apply the earlier verdict.
  *Why:* #547 ("WG für zwei in Golm", 1.500 EUR) was ad-ID 3464538575 = the ad already discarded
  2026-07-22 as "WG Zimmer in Potsdam-Golm oder Verkauf von Eigentumswohnung" (610 EUR) — a full
  re-evaluation that the ID check would have short-circuited. **Same ID came back a THIRD time**
  (#595, 2026-08-15, "WG in der Nähe vom Unicampus Potsdam Golm", 650 EUR) with the description text
  **wordfor-word identical** to #547 — only title, slug and price heading changed. So: a re-list is
  not a one-off, the same ad can cycle indefinitely, and comparing the **description text** against
  the earlier report is the fastest confirmation once the ID matches.
  - **It cuts the other way too — use the ad-ID to REFUTE a wrong dupe-skip.** Grab the ad-ID from
    the earlier report's `**URL:**` line and compare. #575 was auto-skipped as a re-list of #357;
    the IDs (3481658144 vs 3461620807) plus `Tauschangebot: Kein Tausch` vs `Nur Tausch` proved two
    distinct ads, and the "dupe" was a genuine 4,4/5 rental. Similar-looking Potsdam ads cluster hard
    (89 m² / 3 Zi / Bornstedt-Volkspark alone covers #351, #360 and #575) — **m² + rooms + Ortsteil
    never identify a flat; Etage + exact rent + ad-ID do.** *Why:* a same-numbers heuristic silently
    drops live listings.
- **Monteur-/Projektwohnungen sit in the ordinary `c203 "Wohnung mieten"` category and never use the
  words "auf Zeit", "Zwischenmiete" or "befristet".** The category is no guarantee of a long-term let.
  Tells, all from `#viewad-description-text`: "komplett möbliert" + **hotel-style inventory**
  ("Handtücher und Bettwäsche sind vorhanden", "Waschmaschine steht kostenlos zur Verfügung",
  Kaffeemaschine/Wasserkocher/Mikrowelle aufgezählt) + an **employer-shaped target audience**
  ("Top für Berufstätige oder Mitarbeiter der {Werk}", "Expats", "Projektmitarbeiter") + car/airport
  distances instead of Schule/Kita/Nahversorgung. Corroborating structure: `#viewad-details` carries
  **`Schlafzimmer` + `Badezimmer` counts** (a Ferienwohnungs-style field set) while **Nebenkosten,
  Warmmiete, Kaution, Etage, Baujahr and Energieausweis are ALL absent** — the ad describes a product,
  not a Mietvertrag. Two consequences: (a) fire the furnished/auf-Zeit hard blocker per `evaluate.md`
  even without the keyword; (b) **the price may be per bed, not per flat** — count the beds in the
  photos (#640: 2 Einzelbetten im Schlafzimmer + 1 im Wohnraum, no Doppelbett ⇒ 3 Schlafplätze, so
  690 € could mean ~2.070 € for the unit). Say the price scope is undefined instead of assuming.
  *Why:* on #640 keyword-grepping for "auf Zeit"/"befristet" returned zero hits on a textbook
  Monteurwohnung, and the unqualified 690 € looked like a bargain.
- **WG / room-share ads look like whole-flat rentals in the spec list.** `#viewad-details` shows the FULL
  flat (81 m², 3,5 Zi, Etage, Balkon) and the search hint copies it, so the ad reads like a 3,5-Zi
  Wohnung. Only `#viewad-description-text` reveals it's per-room ("Die beiden Schlafzimmer kosten jeweils
  600 oder 650 Euro", "Wohnzimmer und der Balkon dürfen **mitbenutzt** werden"). Fifth price variant:
  heading (1.500 €) ≠ Warmmiete field (1.250 €) and the **per-room sum in the prose decides** which is
  real (600+650 = 1.250). Also check the `Möbliert/Teilmöbliert` checktag + a prose "befristet" — WG ads
  are usually both → two hard blockers. *Why:* on #547 the structured data alone scored a 3,4 whole-flat
  rental; the prose turned it into a furnished, befristete Zimmervermietung.
  - **Sixth price variant, and the one that fakes a scam: the heading can be a PER-ROOM price while
    the m² belongs to the whole flat.** #595 (same ad-ID re-listed): heading 650 € == "Warmmiete"
    field 650 €, spec list 81 m² / 3,5 Zi → 8 EUR/m², which reads as ">30 % below Mietspiegel" i.e.
    the classic bait profile. It is not: the prose says "Die beiden Schlafzimmer kosten jeweils 600
    oder 650 Euro", so 650 € buys ONE bedroom and the flat as a whole is 1.250 € warm = 15,43 EUR/m²
    — *above* market. **Rule: before firing the "price >20 % below Mietspiegel" High scam signal on a
    Kleinanzeigen ad whose title or description contains WG / Zimmer / Mitbewohner, check whether the
    heading is a per-room price; divide the per-room sum, not the heading, by the m².** *Why:* on
    #595 the naive EUR/m² would have produced a "Likely Scam" verdict on an honest 4-year-old
    private account with 6 real photos — and, in the other direction, would have hidden that the
    flat is actually expensive.
- "Nachmieter gesucht" / "Suche Nachmieter" titles are normal long-term rentals (the existing tenant
  is leaving) — NOT sublets. Score normally unless the text says befristet / Untermiete / auf Zeit.
- "Das könnte dich auch interessieren" sidebar is full of Tauschwohnung ads — ignore it; it is not
  the listing under evaluation. **Concretely: a raw-HTML grep for "Tauschangebot" / "TAUSCHWOHNUNG" /
  "Es handelt es sich hierbei um ein Tauschangebot" false-positives on almost EVERY Potsdam rental page**
  — those strings live in the sidebar's JSON-LD + `.aditem-main--middle--description` blocks (#522 had
  5 such hits on a plain rental). Decide swap-vs-rental ONLY from (a) the `Tauschangebot` entry inside
  `#viewad-details` ("Nur Tausch" / "Kein Tausch"; **absent entirely on ordinary ads**), (b) the title,
  and (c) the `#viewad-contact` Anbieter name. *Why:* on #522 a keyword grep said "swap" while the ad
  was a plain Nachmieter rental — a bogus two-sided swap match was one step away.
  - **The same sidebar poisons EVERY consequential keyword, not just Tausch** — `befristet`,
    `möbliert`, `Untermiete`, `Eigenbedarf`, `WBS`. #580 had 10 raw-HTML hits for "befristet", all
    from one sidebar ad ("3-Zimmer Wohnung in Teltow, auf 2 Jahre befristet"), on an unbefristete
    Anzeige. Cheap guard: record `ti = html.find('id="viewad-title"')` once and print each match's
    offset — anything at a higher offset is sidebar. *Why:* a bare `grep -c befristet` would have
    fired the Zwischenmiete/Befristung hard blocker on a normal rental.
- **Feature checktags carry a `Neubau` flag with no year attached.** It is a poster-ticked box, not
  portal-verified, and routinely contradicts the location's building stock (#522: "Neubau" on a
  Potsdam-Waldstadt Plattenbau-Ortsteil). Never let it set the Mietspiegel Baualtersklasse — run BOTH
  fields (the Ortsteil's plausible Baualter and "ab 2021") and say the Mietpreisbremse verdict hinges on
  the unstated Baujahr. *Why:* on #522 the two fields give 5,82 vs 15,72 EUR/m² ortsüblich — the tag
  alone would have turned a +149 % overshoot into "compliant".
- **Wohnen auf Zeit can hide with ZERO Befristung keywords — the tell is the all-inclusive
  Pauschalmiete, not the word "möbliert".** #599: no "befristet", no Mindest-/Höchstmietdauer, no
  end date anywhere, and the ad is filed under the ordinary rental category — yet it is plainly a
  serviced let. The three structured tells, in order of strength:
  1. **`Nebenkosten 0 €` AND `Heizkosten 0 €` in `#viewad-details` while `Warmmiete` == the price
     heading**, plus a prose line listing what the Pauschale covers. When that list includes
     **Strom, WLAN/WiFi and Rundfunkbeitrag/GEZ**, it is Wohnen auf Zeit: no landlord on an
     open-ended Wohnraummietvertrag pays the tenant's electricity and GEZ. (Distinguish from the
     #356 "NK empty" ambiguity — here NK is *explicitly* 0, not blank, so there is no kalt/warm
     coin flip to report.)
  2. The ad's **own self-description**: "Ihr **Zuhause auf Zeit**" / "Your **Home Away from Home**"
     / "for a comfortable **stay**". Bilingual DE/EN copy + "Online-Besichtigung: Möglich" is the
     corporate-let / relocation profile. This is the ad's word, not an inference from "möbliert" —
     quote it and let the Zwischenmiete hard blocker fire on it.
  3. **The real category is in the gaTagging JSON, not the breadcrumb**: grep
     `selected_category_name` (e.g. `"Wohnung_mieten"`, cat 203) vs Kleinanzeigen's separate
     "Auf Zeit & WG" category. A cat-203 filing is *weak counter-evidence only* — posters use the
     bigger category for reach. Say so, cap anyway, and make "unbefristeter Wohnraummietvertrag
     nach § 535 BGB, oder § 549 Abs. 2 Nr. 1 vorübergehender Gebrauch?" the first contact question.
  Pricing consequence worth writing out: on a Pauschale, **the headline EUR/m² is not comparable to
  any other listing** — subtract services (Betriebskosten+Heizung ~3,20 EUR/m², Strom ~65, WLAN ~35,
  GEZ 18,36, Stellplatz ~55) and the Möblierungszuschlag (BGH VIII ZR 44/18: Zeitwert ÷
  Restnutzungsdauer + ~2 % Verzinsung ≈ 120–180 EUR for a full 70-m² furnishing) to get the
  unmöblierte Vergleichsmiete before touching the Mietspiegel. #599: 25,00 → ~17,10 EUR/m². And the
  Mietpreisbremse is **doubly inapplicable** — § 549 Abs. 2 Nr. 1 BGB exempts vorübergehenden
  Gebrauch, and the Potsdam Mietspiegel does not cover möblierten Wohnraum at all → no § 556g Rüge.
  *Why:* a keyword search for befristet/Zwischenmiete/Untermiete returns nothing on these ads, so
  the blocker is invisible unless you read the Pauschale composition; and scoring the raw 25 EUR/m²
  against the Mietspiegel would report a 170 % overshoot on a flat whose Wohnraummiete is at market.
- **The description is repeated ~N times BEFORE `viewad-title`, once per gallery image** (14 photos
  → 14 copies, #599). So a raw match count in the "own ad" region is inflated by the photo count —
  "30 hits for 'auf Zeit'" was 2 real mentions × 14 (+ meta tags). The `ti = html.find('id="viewad-title"')`
  offset guard still correctly separates own-ad from sidebar; just never report the *count* as a
  measure of emphasis, and dedupe contexts before reading them.
  - **On a 0-image ad the `offset < ti` form of that guard is WRONG and hides the description.**
    With no gallery there are no pre-title copies at all, so the only copy of
    `#viewad-description-text` sits *after* the title (#607: title @76.000, description @81.900) and a
    "own-ad = everything before `viewad-title`" filter reports **zero** hits for WBS/befristet/möbliert
    on an ad whose description contains them. Correct guard in both shapes: own-ad region =
    `html[ti : html.find('interessieren')]` (the "Das könnte dich auch interessieren" sidebar is the
    real boundary; `#viewad-contact` sits inside it and is fine). Sanity-check by printing the offsets
    of `viewad-title`, `viewad-description-text` and `interessieren` once per page.
    *Why:* on #607 the pre-title filter said "WBS: own-ad-region=0" while the description literally
    reads "Die Wohnung ist keine WBS Wohnung" — the guard would have flipped a decisive hard-blocker field.
- **"Verfügbar ab {Monat}" is a START-only field and hides Befristung.** A spec-list "Verfügbar ab
  August 2026" can actually be a 1-Monats-Zwischenmiete — the end date + "möbliert / untervermieten /
  01.08.–31.08." only appear in `#viewad-description-text`. Always read the description before deciding
  Zwischenmiete vs Dauermiete; the structured field never shows the end. *Why:* on #452 the field said
  only "August 2026" (looked like a normal move-in start) while the prose revealed a single-month
  furnished sublet → Zwischenmiete hard-blocker.
