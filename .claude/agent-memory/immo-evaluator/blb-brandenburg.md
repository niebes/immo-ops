# BLB Brandenburg (blb.brandenburg.de) — how to read a listing
Applies to: **BLB Brandenburg** offers, i.e. Brandenburgischer Landesbetrieb für Liegenschaften und
Bauen, surplus property of the Land Brandenburg. `portals.yml` covers the *search* page (and its
"keine Immobilien im Angebot" empty state); this file covers the **detail/evaluation** path.
Sister sources: BVVG ([[bvvg-de]]), BBG ([[bvbi-de]]) — same state-seller doctrine.

## Plain `curl` is enough — no browser, no consent, no bot wall
`curl -sSL` on the detail URL returns HTTP 200 with the full record server-rendered. No cookie
banner blocks content, no CAPTCHA, no lazy-load. **Do not spend the browser slot on BLB.**
(Consistent with the `portals.yml` finding that the old ⛔ "bot_defense" was a misclassified empty
state — BLB is simply not protected.)

## Listings arrive as **Pressemitteilungen**, and the real data is in a linked Exposé PDF
The URL you get handed is usually `/blb/de/unternehmen/presse/pressemitteilungen/pressemitteilung/~{date}-immobilie-{slug}`.
The HTML page carries only a teaser: Adresse, Grundstücksgröße, Kaufpreisvorstellung, Gebotsfrist,
contact. **Everything that decides the score is in the PDF**, linked as
`href="/sixcms/media.php/9/{NAME}_Exposé.pdf"` or, by 09/2026, `/sixcms/media.php/9/Exposé.{id}.pdf`
(URL-encoded `Expos%C3%A9`). The `pdf|expose` grep catches both forms. Ignore the
`Internet-Organigramm_*.pdf` link that sits in the footer of every page.

Get it in two commands:
```
grep -o 'href="[^"]*"' page.html | grep -iE 'pdf|expose'      # find the media.php link
curl -sSL -o x.pdf "https://blb.brandenburg.de/sixcms/media.php/9/..." && pdftotext -layout x.pdf
```
`pdftotext -layout` renders the whole exposé cleanly (~450 lines), including the **Grundstücksdaten**
and **Nutzung** tables. Render the map pages with `pdftoppm -png -r 300 -f {p} -l {p}` and Read them —
the Flurkarte/Luftbild sit around pp. 6–8 and are the only way to see the Zuschnitt.

**Why:** the press page alone makes a parcel look like a normal cheap plot. The PDF is what reveals
Baurecht, Erschließung, Grundbuch and the encumbrance negatives — scoring off the HTML teaser would
be scoring blind.

## The exposé fields worth grepping for (they map straight onto blocks D/E/G)
`Baurecht` · `Medienerschließung` · `Bebauung` · `Kampfmittelbelastung` · `Baulasten` · `Altlasten` ·
`Denkmal` · `Lasten und Beschränkungen` (Grundbuch Abt. II/III) · `Nutzungsart` · `Derzeitige Nutzung`.
BLB states these as explicit **negative confirmations** ("Keine"), which is stronger evidence than a
commercial exposé's silence — it justifies not applying the no-photo Block-D cap even when the only
images are a Luftbild and Flurkarten.

## Built objects (Haus) — the exposé layout differs, and the numbers are estimates
House exposés (e.g. #835 Elstal) add **Liegenschaftsbeschreibung** (pp. 7–8), **Fotodokumentation**
(pp. 9–10, real photos) and **Grundrisse** with per-room m² (pp. 11–12). Render the Grundriss pages and
**add up the room areas yourself**. BLB often sells as **Fiskalerbe (§ 1936 BGB)**, so Baujahr and
Wohnfläche come in as "geschätzt", and a room shown on the plan may only be usable "nach Ausbau".
On #835 the claimed 85 m² was ~77 m² measured, and in practice there were 2,5 rooms. The
Energieausweis usually reads only "liegt zur Besichtigung vor", with no class given.
Also grep the description for **separate Flurstücke** (garden/garage on a different parcel, access
"nicht grundbuchlich gesichert"). That hits Block E/G and is invisible on the press page.
**Why:** scoring off BLB's estimated m² and the heading "Reihenmittelhaus" would overstate Block C.

## BLB scans land in the plot group even when the object is a house
The BLB search entry is scanned under the plot group, but its press releases include houses
(Reihenmittelhaus, DHH). Score a house against the **house-purchase** search and note the group
mismatch in the report.

## "Kaufpreisvorstellung" is neither a fixed price nor a Mindestgebot
The sale is an **öffentliche, für das Land unverbindliche Aufforderung zur Abgabe von Angeboten**:
bids may be any sum, must be written + include a **Finanzierungsnachweis and ID/Registerauszug**,
Gleitklauseln are inadmissible, **Nachgebote are excluded**, and the Land is bound to **no** bid
(highest included) while reserving Nachverhandlungen. Score Block A slightly below a true fixed
price for that uncertainty, and treat Block F as the **Gebotsfrist**, not a handover date.
It is **not** a Zwangsversteigerung — the `no_zwangsversteigerung` deal-breaker does not fire.
Bonus: 0 % Provision, and § 4 Nr. 1 GrdstVG exempts the sale (Land is a contracting party) → no
GrdstVG approval and no siedlungsrechtliches Vorkaufsrecht, the usual farmland-class risk.

## BLB cross-posts to ImmoScout24 — **dedupe before evaluating**
The same object appears on IS24 with its own expose ID. The stable join key is the **Objekt-Nr.
`{ORT} FE {nnnn}`** (e.g. `NAHM FE 1299`) plus Gemarkung/Flur/Flurstück — both appear in the exposé
and in the IS24 body. On #600 the BLB press release was the original of IS24 expose 169839709,
already scored as **#535**; the IS24 evaluation had *also* pulled this same PDF, so there was
literally nothing new to score. **Grep `data/pipeline.md` and `data/listings.md` for the
Flurstück/Objekt-Nr./area name before running a full BLB evaluation.**

## Contacts
Object contact is named per press release (e.g. Maren Fittler, +49 331 58181-252). Bids go to the
generic **liegenschaften-brb@blb.brandenburg.de** (or fax -199), Sophie-Alberti-Str. 4-6, 14478 Potsdam.
