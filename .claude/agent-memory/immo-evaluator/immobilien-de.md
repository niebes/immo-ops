# immobilien.de (portal-family: immobilien.de)

Single-listing detail pages evaluate fine WITHOUT a browser — CiC navigation to
immobilien.de is permission-denied in this env (per portals.yml), but a plain
`curl -A <UA>` of `https://www.immobilien.de/wohnen/{id}` returns HTTP 200, full
HTML, no CAPTCHA/consent wall. Use curl + parse; don't burn a CiC tab.
**Why:** without this you'd try CiC, hit the permission denial, and stall.

## Where the data lives on the detail page
- **JSON-LD** `<script type="application/ld+json">` block `@type: RealEstateListing`
  gives: `name` (title), `description` (full text), `address` (street/locality/PLZ),
  `geo` lat/lng, `floorSize.value` (m²), `numberOfRooms`, `offers.price`.
  NOTE: `offers.price` is UNRELIABLE for Kalt-vs-Warm — it has been the Warmmiete on
  some listings and the **Kaltmiete** on others (e.g. 9710192: offers.price 1185 =
  Kaltmiete (netto)). Always cross-check the detail table (`Kaltmiete (netto)` +
  `Nebenkosten`) and compute Warmmiete yourself; never assume from offers.price.
  Also: JSON-LD `floorSize` can disagree with the free-text description (9710192:
  75 m² field vs "100m2" in the text) — trust the structured field, flag the gap.
- **Detail table** renders as label line immediately followed by its value line
  once tags are stripped (`<[^>]+>` → newline, then match label → take next line):
  `Kaltmiete (netto)` → `626,62 €`; `Nebenkosten` → `190 €`; `Heizkosten` → `175 €`;
  `Kaution` → value; `Baujahr` → year; `Verfügbar ab` → date;
  `Energieeffizienzklasse E · 142.00 kWh/(m²*a)` on one line.
- **Seller/landlord** is not in a clean field — infer from the estate-image filename
  `estate_attachments/{id}/0/{seller}_....jpg` (e.g. `gewobag_...` → Gewobag) and the
  provisionsfrei "im Auftrag der {X}" notice.
- **Photo count**: count distinct indices in `estate_attachments/{id}/{n}/...jpg`.
  Gewobag/municipal listings often have just 1 photo — condition stays unverified,
  cap Block D per _shared.md.

- **"Sonstige Informationen" free-text section is load-bearing**: Befristung
  ("wird zuerst für ein Jahr … vermietet"), rent composition (Grundmiete vs
  Möblierungszuschlag vs Stellplatz), and the true Nebenkosten total can appear
  ONLY there — never in the detail table or JSON-LD (seen on 9714930: table said
  NK 110 + HK 100, Sonstiges said "Betriebskostenvorauszahlung 210 €" and
  revealed the 1-year Befristung). Always read the whole stripped-text page,
  not just the table. **Why:** table-only parsing scores a furnished 1-year let
  as a normal unbefristet rental.

## Expiry / early-exit
Deleted listings would show "nicht gefunden"/"nicht mehr". The metadata price hint
(Kaltmiete) differs from JSON-LD price (Warmmiete) — that mismatch is normal, not
staleness.
