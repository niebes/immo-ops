# bvbi.de — Volksbank Berlin Immobilien GmbH

Matches: `bvbi.de/immobilien/details/{id}` (BVBI Volksbank).

## Access
- **Plain `curl -sL --compressed` with a desktop UA works.** Laravel/Livewire + Alpine.js, but the
  detail page is **server-rendered** — no JS shell, no consent wall, no bot check. ~226 KB HTML.
  Do NOT reach for invisible-playwright/CiC here; it wastes a browser session.
- Strip `<script>/<style>` before text extraction: the Alpine `x-data` gallery blob sits inline in
  the markup and otherwise floods the output with JS between the header and the real content.

## Where the data is
- Eckdaten block (Objekt-Nr., Objekttyp, PLZ, Ort, Grundstücksfläche, Kaufpreis) renders as flat
  label/value text right after the gallery — readable straight from the stripped text.
- Long fields appear **twice**: once truncated with "Mehr anzeigen", once in full ending in
  "Weniger anzeigen". Take the second copy. Sections: `Lagebeschreibung`, `Objektbeschreibung`,
  `Austattung` (sic — misspelled in the portal's own markup, don't grep for "Ausstattung").
- `Provision` and `Energieausweis` are their own short sections after Austattung.
- Photos are lazy-loaded via `/api/estate/image/{id}`; count `class="lazy-load"` occurrences for
  the gallery size instead of trying to resolve URLs.
- No contact-person block on the page — only an "Exposé anfordern" lead form. Anbieter is always
  BVBI itself.

## Data-quality quirk (seen on #416)
- **The structured Eckdaten `Grundstücksfläche` can disagree with the m² stated in the
  Objektbeschreibung** (#416: 669,00 m² vs. "ca. 621 m²", and the text's own arithmetic
  1.269 − 650 = 619 confirmed the text). Always cross-check the two and report both — on a plot the
  m² drives the entire EUR/m² verdict (here it moved the price from +38 % to +49 % over the limit).

## Domain note for BVBI plot listings
- BVBI sells plots with **7,14 % buyer-side Provision**. That is legal: the §656c/d BGB 50/50 split
  covers only Einfamilienhäuser and Eigentumswohnungen, **not unbebaute Grundstücke**. Do not flag it
  as a Bestellerprinzip/split violation — but do carry it into the total-cost calculation.
