# immobilien.de (portal-family: immobilien.de)

Single-listing detail pages evaluate fine WITHOUT a browser — CiC navigation to
immobilien.de is permission-denied in this env (per portals.yml), but a plain
`curl -A <UA>` of `https://www.immobilien.de/wohnen/{id}` returns HTTP 200, full
HTML, no CAPTCHA/consent wall. Use curl + parse; don't burn a CiC tab.
**Why:** without this you'd try CiC, hit the permission denial, and stall.

## Post-relaunch detail page (`/expose/{id}`, Next.js, since ~2026-09) — use this first
Plain `curl -sL -A <Firefox UA>` still works (HTTP 200, no wall). What changed vs. the old
`/wohnen/{id}` layout below:
- JSON-LD is ONE `@graph`: BreadcrumbList + ItemPage + `["RealEstateListing","Apartment"]`.
  The listing node has `datePosted`, `yearBuilt`, `floorLevel`, `numberOfBedrooms`,
  `amenityFeature` (Balkon/Keller/Außenstellplatz), and `additionalProperty` (EEK, Endenergiebedarf,
  Heizungsart). `description` is TRUNCATED (~150 chars), so read the full prose from the stripped text.
  `offers.priceSpecification.price` was the Kaltmiete on 10027851.
- Table labels are now `Nettokaltmiete` / `Nebenkosten` / `Heizkosten` / `Kaution` /
  `Außenstellplatz (Miete)` / `Verfügbar ab` (label line followed by value line). The old
  `Kaltmiete (netto)` label is gone.
- The `estate_attachments/...` image pattern is GONE. Images are now
  `immobilien-api.fly.dev/api/images/openimmo/{uuid}/{sourceId}/{n}-{origFilename}.jpg`.
  Count photos by distinct `{n}`. The original filenames are informative (e.g. `Grundriss Haus 6
  Wohnung 4` gives the unit id for dedup against sibling units in the same project).
- **OhneMakler-fed listings** ("Privat vom Eigentümer" + OhneMakler GmbH block): `{sourceId}` in
  the image path is the OM id, so `https://www.ohne-makler.net/immobilie/{sourceId}/` is the
  source exposé (see `ohne-makler-net.md`; it needs `--compressed`).
  **Why:** the source was otherwise not linked anywhere on the page; it is how you verify identity
  and read the fuller OM fields (Nebenkosten split, Stellplatz count, Lage-Check).

## Where the data lives on the detail page (old `/wohnen/{id}` layout)
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
- **Seller/landlord** (old layout) is not in a clean field — infer from the estate-image filename
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

## JSON-LD RealEstateListing can be ABSENT (only BreadcrumbList)
On some detail pages the only `application/ld+json` block is a `BreadcrumbList` — there is
NO `RealEstateListing` object, so `name/description/offers/floorSize` must come entirely
from the stripped-text table + description prose (seen 2026-07-16 on 9724059, Caputh Neubau).
Don't assume the structured listing block exists; always have the tag-strip fallback ready.

## Neubau/Erstbezug detection → "Beispielfotos" is NOT a D-cap
The description prose is the Neubau tell: "Das {Quartier} **entsteht**", KfW-Standard, "Erstbezug",
new-quarter marketing. When present, the "Bei den Bildern handelt es sich teilweise um
Beispielfotos" note + a single render photo fall under the **Neubau exception** (per _shared.md)
→ do NOT cap Block D; score D on the new-build status (Klasse A/KfW-55 → 5.0). Also expect the
table field "Energieausweis nicht vorhanden" to CONTRADICT a described class (e.g. "Energieausweis: A")
— for a Neubau the Bedarfsausweis is just not issued yet; trust the described target class, note the gap.
**Why:** without spotting "entsteht"/KfW you'd wrongly cap D at 3.0 on an in-budget Erstbezug for
"example photos", and read the missing Energieausweis field as a real class-A contradiction.

## `Nebenkosten 0 €` + a lone "Warmmiete" = **Pauschalmiete** = Wohnen auf Zeit
immobilien.de has no Pauschalmiete field, so an all-inclusive furnished let renders as
`Nebenkosten 0 €` / `Warmmiete {X} €` / "inkl. NK" and **no Kaltmiete row at all**. That
shape is the tell, not a data gap: a heating flat rate is effectively unlawful in an
ordinary multi-party tenancy (§ 2 HeizkostenV), so it only appears in **Wohnraum zum
vorübergehenden Gebrauch, § 549 Abs. 2 Nr. 1 BGB**. Confirm against the Anbieter's own
exposé, which *does* label the field `Pauschalmiete` (see `homecompany.md`).
Corollary: § 549 lets are **exempt from the Mietpreisbremse** — that exemption is the
whole reason such a flat can ask 2–3× the ortsübliche Miete. Write "not applicable *because
of* § 549", never a bare "not applicable", and still quote the overshoot.
**Why:** without this, `Nebenkosten 0 €` reads as sloppy data entry and a furnished
Zeitmietvertrag gets scored as a normal unbefristete Wohnung (seen #659; cf. #647).

## The PLZ can be wrong at Ortsteil granularity — and the geo won't catch it
JSON-LD `address.postalCode` is supplied by the Anbieter and is not validated against
`streetAddress`. Seen #659: `Ruhlaer Straße 1` tagged `14193` (Grunewald) when the Berlin
street directory / Kauperts put that street unambiguously in **14199 Schmargendorf** — and
the listing's own free text said "in Berlin-Schmargendorf". The JSON-LD `geo` does **not**
disambiguate: it was 52,4779/13,2844, a **centroid of the (wrong) PLZ**, ~1,3 km off the
real street. So: always cross-check `streetAddress` against a street directory when the
Ortsteil is load-bearing, and read the description prose — the Anbieter usually names the
Ortsteil correctly there even when the PLZ field is wrong.
**Why:** the PLZ is what routes a listing into a search group, so a wrong one silently
puts an out-of-area flat into an area-strict search and Block B scores the wrong place.

## Expiry / early-exit
Deleted listings would show "nicht gefunden"/"nicht mehr". The metadata price hint
(Kaltmiete) differs from JSON-LD price (Warmmiete) — that mismatch is normal, not
staleness.
