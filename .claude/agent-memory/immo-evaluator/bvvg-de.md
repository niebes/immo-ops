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
  **Größe** (in **ha**, not m² — convert: 6,7552 ha = 67.552 m²),
  **Orientierungswert (Kauf)** (often literally **"nach Gebot"** = no price at all),
  **Abgabe des Gebotes** ("Ausschreibung endet am DD.MM.YYYY, um HH:MM Uhr").
- Then `Objektbeschreibung` with structured ALL-CAPS sections: OBJEKT, LAGERSTÄTTE,
  **ÖFFENTLICHE PLANUNG** (the Baurecht verdict lives here), SCHUTZGEBIETE / BELASTUNGEN,
  INFRASTRUKTUR / ERSCHLIEßUNG, BESONDERHEITEN, Lage, Kontaktdaten.
- Contact person + downloads (Exposé, Flurstücksliste, Ausschreibungsbedingungen) at the end.
*Why:* the price/size fields are NOT where a normal portal puts them and the unit is hectares —
reading them as m² or expecting an EUR figure produces nonsense.

## Doctrine (extends the #407 sub-20-EUR/m² rule)
- Portfolio is **structurally agricultural/forestry in the Außenbereich** — the section is literally
  titled "Flächen im ländlichen Raum". Expect Acker/Grünland/Wald, never Bauland.
- The Baurecht sentence to grep for: **"Die Flächen liegen außerhalb eines Flächennutzungs-/
  Bebauungsplanes"** → § 35 BauGB, Block E floor (1,0). Check "Kommunale Planung" and
  "Regionalplanerische Einordnung" too — a Vorranggebiet/Abgrabungs-Widmung actively excludes
  housing, which is stronger than mere absence of Baurecht.
- **"Orientierungswert (Kauf): nach Gebot"** = sealed-bid tender, no price. Second reliable
  indicator (alongside sub-20-EUR/m²) that a plot listing is an agrarian/raw-material asset.
  Block A can't be scored on a real number — score the budget-fit *risk*, don't guess a price.
- Always note **GrdstVG-Genehmigungspflicht + siedlungsrechtliches Vorkaufsrecht**; for multi-ha
  lots sold to a Nichtlandwirt, § 9 GrdstVG refusal is a real (not theoretical) deal risk.
- Anbieter block H is effectively always ~5,0: bundeseigen, provisionsfrei, sourced documentation.
- Photos are **Lageskizzen/BKG map tiles only**, never object photos — don't treat as "no photos"
  scam signal; note condition as visually unverifiable.
