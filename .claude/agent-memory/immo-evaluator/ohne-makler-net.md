# ohne-makler.net (portal-family: ohne-makler.net)

Detail pages are plain server-rendered HTML. A single
`curl -sL -A "<desktop UA>" https://www.ohne-makler.net/immobilie/{id}/`
returns HTTP 200 with the complete exposé — **no consent wall, no CAPTCHA, no
lazy-load, no JS needed**. Never burn a browser tab here.
**Why:** the page is ~270 KB of Alpine.js-heavy markup, so a browser looks
necessary at a glance; it isn't, and curl is far cheaper.

### curl MUST pass `--compressed`
The body comes back **gzipped regardless of Accept-Encoding**. Without
`--compressed` you get binary and the parse dies with
`UnicodeDecodeError: 'utf-8' codec can't decode byte 0x8b` (0x8b = gzip magic).
**Why:** that failure looks like a bot-block, and you'd wrongly escalate to
invisible-playwright for a page that curls fine. Correct call:
```
curl -sL --compressed -A "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" \
  "https://www.ohne-makler.net/immobilie/{id}/" -o om-{id}.html
```

## Extraction
There is **no JSON-LD** block. Strip `<script|style|svg|noscript>`, then strip all
tags, unescape entities, and read the resulting **flat line sequence** — the exposé
data appears as consecutive label/value line pairs:

```
{title} / {PLZ Ort} / ({Ortsteil}) / {price or "auf Anfrage"} / {m²} /
Grundstücksfläche / Privatangebot|Anbieter / Objektart / Objekttyp
… then: Objekt-Nr (OM-{id}) · Objektart · Objekttyp · Übernahme ab ·
"Kaufpreis & Nebenkosten" → Kaufpreis · Einzelheiten (Erschließungszustand,
Infrastruktur) · Lage (free text) · Lage-Check · Sonstiges (free text) ·
"Angebot von:" → {seller name}
```

Beware: Alpine `x-data` attribute bodies survive tag-stripping and inject JS
noise between real lines — filter or just index past them. A useful trick is to
grep line indices for `Kaufpreis|Grundst|Objektart|Angebot von|Lage` first, then
print that window.

## Quirks that change scoring
- **`Kaufpreis: auf Anfrage` is common.** The price is genuinely absent from the
  page (not hidden behind a login) — anchor Block A on Bodenrichtwert × Fläche as
  a floor and say so explicitly, rather than treating the listing as unscorable.
- **`Privatangebot`** marker + `Angebot von: {Klarname}` → private seller, no
  agency; the site is by construction provisionsfrei ("Keine Maklercourtage"),
  so provisionsfrei is NOT a differentiator here and shouldn't inflate Block G.
- Watch the **Sonstiges** block for deal-structure landmines that appear nowhere
  else (e.g. "Verkauf als Share Deal bis zu 100 % der KG-Anteile") — that belongs
  in Block G, not the description dump.
- **Commercial sellers put a full Impressum in `Sonstiges`**: company, address,
  **HRB + Registergericht, Geschäftsführer, USt-ID**. Block H is verifiable from
  the page alone, and anonymous-seller scam signals are rare on this portal.
  The trailing `Makleranfragen unerwünscht!` is OM boilerplate — never read it as
  a seller-specific signal.
- **`Kaufnebenkosten` / `Gesamtkosten` are pre-computed by OM and run light.**
  On 462090 OM showed 10.673 € (8,24 %) where Brandenburg GrESt 6,5 % + Notar/
  Grundbuch ~2 % ≈ 11.008 €. Recompute from the Bundesland's GrESt rate; don't
  quote OM's figure as fact.

## Photo count
Gallery images are `.../immobilie/{id}/picture/{n}/medium.jpg` — count distinct
`{n}` with `grep -oE 'picture/[0-9]+'`. Only index 0 = single photo.
**Do not keyword-grep the whole HTML for render terms** (`3D`, `Visualisierung`):
the site chrome advertises `OM-360° Immobilien-Scan` and OM's service menu, which
produces false positives. Only count render keywords inside the description/Lage text.

## Attachments & contact are both dead ends on-page
- A **`PDF`** section names attachments (Exposé, Amtsblatt, Grundriss) but **no `href` to them
  exists in the HTML** — they're gated behind the contact form. Don't hunt for the URL; record them
  as "gated behind contact form" and request them in Next Steps.
- **No seller phone or email is ever published**, even for commercial sellers without an Impressum.
  Contact is a modal form with an arithmetic `Sicherheitsabfrage` captcha. So Block H can never rely
  on an independently verifiable contact channel here.

## Corroborating a private seller: use the Gemeinde's Bauleitplanung PDFs
For **plot / Neubaugebiet** listings from private sellers (no Impressum, no rating, no HRB), the
municipal planning file is the best — often the only — way to verify the exposé's claims, and it is
free and greppable:
```
{gemeinde}.de/fileadmin/user_upload/Bauleitplanung/aktuelle_Planungen/*.pdf
{gemeinde}.de/fileadmin/user_upload/Sitzungsdienst/Beschlussvorlagen_{year}/BV-Nr.{nnn}-{yy}-01.pdf
```
Fetch with the same `curl --compressed`, then `pdftotext -layout`. On #408 (Zossen "Südlicher
Planweg") this verified the B-Plan Festsetzungen (WA §4 BauNVO, GRZ 0,3, 2 Geschosse, 10 m,
Einzel-/Doppelhaus), Altlasten- und Denkmalfreiheit, the Ausgleichsmaßnahmen, the Artenschutz result,
*and* the seller's Eigentümergemeinschaft — turning an anonymous private seller into a
well-substantiated one and enabling a confident "Legitimate" scam call.
**Why:** on this portal the exposé alone gives almost nothing checkable; without the Gemeinde file
Block H and the scam verdict are guesswork.

**While in that PDF, always grep for `13b`.** A B-Plan initiated under **§ 13b BauGB** is a
potential deal-breaker: BVerwG 18.07.2023 (4 CN 3.22) held it EU-law-incompatible, so such plans are
**unwirksam unless healed**, and a void plan drops the land back to § 35 BauGB Außenbereich —
**not buildable at all**. Evidence of a cure = a later Offenlage carrying a full **`Umweltbericht
nach § 2 Abs. 4 BauGB`** plus § 3(2)/§ 4(2) participation. If the Begründung says § 13b and you can't
retrieve the final Satzungsbeschluss/Amtsblatt, flag it as the top Next Step, don't assume validity.

## Liveness / expiry
A live listing always renders the `Objekt-Nr` → `OM-{id}` line; deleted ones show
"nicht gefunden". Use that line's presence as the expiry check.

## Promotion note
This portal has no `notes:` entry yet in portals.yml beyond the basics. If the
curl-works behaviour holds for a few more evaluations, it's a candidate for
promotion to `portals.yml notes:` / `modes/evaluate.md`.
