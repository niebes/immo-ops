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
`href="/sixcms/media.php/9/{NAME}_Exposé.pdf"` (URL-encoded `Expos%C3%A9`).

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
