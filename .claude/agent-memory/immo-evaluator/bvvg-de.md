# BVVG (www.bvvg.de) — bundeseigene Verwertung ehem. volkseigener DDR-Flächen

## Access
Plain server-rendered WordPress. `curl -s --compressed -A "<Firefox UA>"` returns the full detail
page — no consent wall, no JS, no bot block. Never needs a browser.
*Why:* saves a browser session entirely; the whole record is in the static HTML.

## Extraction
Strip `<script|style|noscript|svg>`, then tag-strip `<body>` and split on newlines. Everything sits
in one flat label/value stream:
- **Objektdaten block** (labels then values on consecutive lines): Objekt-Nr., Bundesland, Kreis,
  Gemeinde, Gemarkung, **Objektart**, **Vermarktungsart** (e.g. "Bodenschätze-Ausschreibung"),
  **Größe** (usually **ha**, not m² — convert: 6,7552 ha = 67.552 m²; small Bauland lots show **m²**
  directly, e.g. "505 m²" — read the unit, don't assume), Flur + **Flurstück** (given explicitly),
  **Orientierungswert (Kauf)** (often literally **"nach Gebot"** = no price at all),
  **Abgabe des Gebotes** ("Ausschreibung endet am DD.MM.YYYY, um HH:MM Uhr").
- Then `Objektbeschreibung` with structured ALL-CAPS sections: OBJEKT, LAGERSTÄTTE,
  **ÖFFENTLICHE PLANUNG** (the Baurecht verdict lives here), SCHUTZGEBIETE / BELASTUNGEN,
  INFRASTRUKTUR / ERSCHLIEßUNG, BESONDERHEITEN, Lage, Kontaktdaten.
  Small Bauland lots use a DIFFERENT, shorter layout: plain-prose description + mixed-case headings
  "Weitere Informationen" (Grundbuch Abt. II/III status) / "Schutzgebiete" / "Kampfmittelverdacht" /
  "Haftungsausschluss" / "Lage" — no ÖFFENTLICHE PLANUNG block; the Baurecht sentence is inline
  ("laut Flächennutzungsplan gemischte Baufläche … links und rechts bebaut … keine Bauvoranfrage").
- Contact person + downloads (Exposé, Flurstücksliste, Ausschreibungsbedingungen) at the end.
  Attachment URLs: `wp-content/uploads/immomakler/attachments/{hash}/{objnr-lowercase}_expose.pdf`
  (`pdftotext -layout` works). Gallery `<img class="sp-image" src="">` is lazy/empty — take the
  `sp-thumbnail` URL and drop the `-147x110` suffix for the full-size JPG (Luftbild with parcel outline +
  Flurkarte overlay = the only way to see tree cover / neighbours / frontage).
*Why:* the price/size fields are NOT where a normal portal puts them and the unit is hectares —
reading them as m² or expecting an EUR figure produces nonsense.

## Doctrine (extends the #407 sub-20-EUR/m² rule)
- Portfolio is **mostly agricultural/forestry in the Außenbereich** — the section is literally
  titled "Flächen im ländlichen Raum". Expect Acker/Grünland/Wald — BUT check **Objektart** first:
  BVVG also tenders small **"Bauland"** Baulücken in village Ortslagen (#836 Oderin, 505 m², FNP
  gemischte Baufläche, both neighbours built). Those are real § 34 candidates and must be scored as
  building plots, not dismissed as agrarian. *Why:* the old "never Bauland" line would have mis-triaged #836.
- Every BVVG text carries a boilerplate "Kampfmittelverdacht" paragraph when applicable — treat it as
  a real Block-D/next-step item (Sondierung before earthworks), esp. around 1945 battlefields (Halbe).
- The Baurecht sentence to grep for: **"Die Flächen liegen außerhalb eines Flächennutzungs-/
  Bebauungsplanes"** → § 35 BauGB, Block E floor (1,0). Check "Kommunale Planung" and
  "Regionalplanerische Einordnung" too — a Vorranggebiet/Abgrabungs-Widmung actively excludes
  housing, which is stronger than mere absence of Baurecht.
- **"Orientierungswert (Kauf): nach Gebot"** = sealed-bid tender, no price. Common on agrarian lots,
  but ALSO used for Bauland (#836) — not a use-class indicator on its own; Objektart decides.
  Block A can't be scored on a real number — score the budget-fit *risk* via area × Gemeinde-BRW
  (avg and Höchstwert, `bodenrichtwerte-deutschland.de/bodenrichtwert/brandenburg/{gemeinde}` —
  NOT the `/{kreis}/{gemeinde}` path, which falls back to the state page), don't guess a price.
- Always note **GrdstVG-Genehmigungspflicht + siedlungsrechtliches Vorkaufsrecht**; for multi-ha
  lots sold to a Nichtlandwirt, § 9 GrdstVG refusal is a real (not theoretical) deal risk.
- Anbieter block H is effectively always ~5,0: bundeseigen, provisionsfrei, sourced documentation.
- Photos are **Lageskizzen/BKG map tiles only**, never object photos — don't treat as "no photos"
  scam signal; note condition as visually unverifiable.
