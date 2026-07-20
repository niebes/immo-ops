# Portal: Zwangsversteigerung.de (UNIKA GmbH) — `www.zwangsversteigerung.de/detail/{ID}`

## Access
- **Plain server-rendered PHP. `curl --compressed` with a normal Firefox UA is enough.** No consent
  wall blocking content (the cookie panel is inline text, not an overlay), no JS, no lazy-load,
  no bot protection. Do NOT reach for invisible-playwright here — it is pure waste.
  *Why:* saves a browser session per listing on a portal that returns everything in one 75 KB GET.
- **Charset is ISO-8859-1/Windows-1252, NOT UTF-8.** Umlauts arrive mojibake'd through a naive
  UTF-8 read (`Waldgrundst?ck`, `Teltow-Fl?ming`). Decode as cp1252 (or accept the damage and
  reconstruct German words from context — the ASCII skeleton is intact).
  *Why:* without this, every extracted place name and Objektart is corrupted in the report.

## Where the data is
Strip `<script>/<style>`, then tags → text. The useful record sits between the string
`Das Wichtigste` and `Alle Angaben ohne Gewähr`, as label/value line pairs:
`Objektart`, `Verkehrswert`, `Wiederholungstermin`, `Grundstück` (m²), **`Weiteres`**, plus a
`Die Lage` block above it with `PLZ / Ort`, `Strasse`, `KFZ-Kennzeichen`, `Kreis`, `Bundesland`.
- **`Weiteres` is the single most load-bearing field and it is optional — always grep for it.**
  It is a one-sentence free text and on defective objects it states the **deal-killer verbatim**
  ("verfügt über **keine Zufahrt**", "**Überbauung bzw. Grenzbebauung**", Bestandsgebäude).
  *Why:* #415 looked fine on every structured field (Objektart `Grundstück`, 55 EUR/m², 2.251 m²,
  both profile caps passed) — the disqualifier existed only here. No numeric/Objektart filter can
  catch this class; only free-text keywords can. On listings with nothing to say it renders as a
  bare **`.`** (a single period) — that is "no description", not a parse failure; stop looking.
- `Strasse` may end in "Haus-Nr. siehe unten (Infobox)" → the house number is **also paywalled**,
  not just Termin/AG/Aktenzeichen. Don't hunt for it.
Also present: `UNIKA-ID` and `ObjektRank: n/10` (portal's own lage/preis/nachfrage score — a useful
cheap sanity signal; 3/10 flagged a genuinely marginal object).
The one-line object summary (which carries the ZVG *purpose*) appears twice, right above
`Jetzt Einzelausgabe bestellen`.

## The paywall — the thing that actually bites
`Termin` renders literally as **"siehe unten (Infobox)"** and the Infobox is **not in the HTML**.
**Versteigerungstermin, Amtsgericht and Aktenzeichen are ALL behind "Jetzt Einzelausgabe bestellen".**
Grepping for `Termin|Amtsgericht|Aktenzeichen|Uhr|20\d\d` returns only the explanatory glossary text,
never a date — do not keep digging, it is not there.
**Get them free from `zvg-portal.de`** (official federal justice portal) instead of buying the
Einzelausgabe. Same for the Verkehrswertgutachten (inspect at the Amtsgericht).
*Why:* I burned two greps looking for a date the page structurally never contains; Block F must be
scored as "termin unknown/paywalled", not left blank.

**Which Amtsgericht — do NOT guess from the Landkreis.** Brandenburg concentrated ZVG jurisdiction:
since 01.01.1994 the **Amtsgericht Potsdam** runs *all* Zwangsversteigerungsverfahren for the
AG-Bezirke **Potsdam, Brandenburg (Havel), Rathenow and Nauen** — i.e. Potsdam, Potsdam-Mittelmark
**and Havelland**. *Why:* in #413 I inferred "AG Nauen" from Landkreis Havelland and that was
**wrong**; the correct court is AG Potsdam. Other Brandenburg regions are similarly concentrated —
verify per LG-Bezirk rather than assuming the local AG.

## Domain notes for scoring (portal is 100 % forced-auction stock)
- **`Verkehrswert` is NEVER a purchase price.** It is the court-appointed appraised value; bidding is
  open-ended above it. Never write it into the tracker `price` column as if it were a Kaufpreis
  without saying so in the notes.
- **`Wiederholungstermin: Nein` = 1st Termin** → §85a ZVG 5/10 (no Zuschlag below 50 % VW) and §74a
  ZVG 7/10 (creditor may demand a new date below 70 %) both apply. So realistic minimum bid ≈
  50–70 % of VW. `Ja` = those floors are gone, can go lower. The page explains this inline — quote it.
- **Read the summary sentence for the auction *type*.** "zum Zwecke der **Aufhebung der Gemeinschaft**"
  = **Teilungsversteigerung** (§§180 ff. ZVG), not a creditor foreclosure: co-owners (heirs/divorce)
  usually bid themselves and push past VW, and the opponent can get the date suspended under
  §180 Abs. 2/3 ZVG. Materially different risk profile → belongs in Block G.
- Standing Block G checklist for this portal: no viewing right, no warranty (§56 S.3 ZVG),
  10 % Sicherheitsleistung due in the room by bank cheque (**cash refused**, §69 ZVG), senior
  Abt.-II rights survive on top of the Meistgebot, leases/Jagdpacht continue. No Makler, no Notar
  (Zuschlagsbeschluss replaces the contract) — the only two structural savings.
- **No photos, ever** (at least on plot listings). Block D has to be scored on absence of data.
- **Plain `Objektart: Grundstück` ≠ the Acker/Wald case — do NOT copy the §35 doctrine onto it.**
  Generic `Grundstück` at a Bauland-/Erholungs-level EUR/m² (i.e. 20–50× the ~1–3 EUR/m² Agrar-BRW)
  means the object *is* in the building/recreation class, so §35 BauGB is not the exclusion route.
  Such objects usually fail one legal step later, in **Bauordnungsrecht**: **§ 4 BbgBO** requires the
  plot to abut a befahrbare öffentliche Verkehrsfläche or hold a **rechtlich gesicherte Zufahrt
  (Baulast/Grunddienstbarkeit)**. No Zufahrt ⇒ no Bauantrag regardless of BauGB status, and a
  **Notweg (§ 917 BGB)** does *not* cure it (schuldrechtlich, rentenpflichtig, § 918 risk, and no
  Baulast). A **Garage on a plot with "keine Zufahrt"** is the tell that access ran informally over
  the neighbour and was never secured. Pair it with `Überbau §§ 912 ff. BGB` (must be tolerated,
  only a verjährbare Überbaurente) → the object is illiquid and unfinanceable. *Why:* #415 would
  have been mis-scored by mechanically reusing #407/#413.
- **`zum Zwecke der Aufhebung der Gemeinschaft` = Teilungsversteigerung — extra Block F risk too.**
  Beyond "co-owners outbid you" (already noted below): **§ 180 Abs. 2/3 ZVG** lets any co-owner get
  the Termin **einstweilig eingestellt** (up to 6 months, repeatable) *after* the 10 %
  Sicherheitsleistung has been paid. Score that in F, not only G.
  **And the rights position is worse than in a normal creditor auction:** the geringstes Gebot is
  developed from the *bestrangiger Miteigentumsanteil*, so **Abt. III (Grundpfandrechte) typically
  survives too** — not just Abt. II — and adds to the Meistgebot, including for Grunderwerbsteuer.
  So the standing "Abt. III erlischt regelmäßig" line below is **false for Teilungsversteigerungen**;
  the effective price can far exceed the bid. Terminsprotokoll/geringstes Gebot is the only source.
- **`Objektart` is a legal classification, not a description.** `Acker-/Grünland` / `Wald` ⇒
  Außenbereich §35 BauGB ⇒ no Baurecht, no Erschließung, and no legal Freizeit-Nutzung either
  (Gartenhaus/Carport/Zaun are bauliche Anlagen, §29 BauGB). Apply the #407 doctrine and score
  Block E ~1,0. Cross-check: VW/m² at ~4 % of the local Bauland-BRW *is* the proof of no
  Bauerwartung — quote the ratio rather than asserting it.
- **Quantitative Bauerwartungs-test — use this instead of hand-waving.** Bauerwartungsland is
  appraised at roughly **20–50 % of the local Bauland-BRW**. So compute VW/m² ÷ Bauland-BRW: land
  in that band = genuine Bauerwartung; **≤ ~5 % = the Gutachter positively denied it.** Sanity-check
  downward too against the Agrar-BRW (Gutachterausschuss PM, Berliner Umland: **Acker 1,30, Grünland
  1,00 EUR/m²** @ 01.01.2026; ~1,00–1,10 in the weiteres Metropolenumland). Werder (Havel) average
  Bauland-BRW **337 EUR/m²** @ 01.01.2025 (+12,7 %), range 140 (Bliesendorf) – 400 (Havelauen/Phöben).
- **A cheap plot at a *named residential street* in a real Ortsteil will tempt you into a
  Bauerwartung story — check who is asking for what.** #414 (Ziemensstr., Werder-Glindow) had full
  Erschließung at the street (Abwasserbau 2021/22) *and* a written **SPD-Fraktion request in the
  FNP-2040 Öffentlichkeitsbeteiligung** to designate exactly that street as Wohnbaufläche. All of it
  collapses on four checks: a Beteiligungs-*request* proves the **Vorentwurf does not contain it**;
  an FNP grants **no Baurecht** anyway (§ 5 BauGB — needs a B-Plan, 5–15 yrs, open outcome); the VW
  ratio (0,67 % of Bauland-BRW) settles it; and a **3-ha Feldblock is not the "Lückenschluss"** a
  street-frontage strip would be — and ZVG has **no Teilgebot**, you buy all of it.
  The only survivable angle is **§ 34 BauGB Innenbereich for a frontage strip** — free phone call to
  the Bauamt, and the right single Next Step. *Why:* the pro-Bauerwartung evidence here was the
  strongest of the series and still wrong; test it, don't dismiss it and don't believe it.
- **Scam-check: two ZVG features look like red flags and are NOT.** The 10 % Sicherheitsleistung is
  a statutory bid deposit to the Gerichtskasse (refunded on non-award), not advance payment; and
  "no viewing offered" is procedural (kein Besichtigungsrecht). Score both as Block G risk, never
  as scam signals. *Why:* a mechanical scam-table run flags both and wrongly taints a court sale.
- **Counter-intuitive, and easy to get wrong when copying #407:** GrdstVG-Genehmigungspflicht,
  the siedlungsrechtliche Vorkaufsrecht (RSiedlG) and the naturschutzrechtliche Vorkaufsrecht
  (§66 BNatSchG) **do NOT apply to a Zuschlag** — all three attach to a Rechtsgeschäft/Kaufvertrag,
  while the Zuschlag is a Hoheitsakt. The ZVG route removes exactly the hurdles that block ordinary
  agricultural purchases. State it as Rechtsauffassung.

## Second profile trap: scope of `no_zwangsversteigerung`
The deal-breaker is declared **per search**. In this profile it sits under
`Potsdam/Brandenburg house purchase` only; the **plot search has no `deal_breakers` block at all**,
so it does **not** fire on plot listings — score the ZVG structure down in Block G instead of
capping at 2,0. *Why:* capping a plot on a deal-breaker that belongs to a different search would
be a false hard blocker. Worth suggesting to the user that they add it to the plot search if they
reject auctions generally.

## Profile trap seen here
`acceptable_areas` lists **"Teltow"** = the town in Potsdam-Mittelmark. Listings from Landkreis
**"Teltow-Fläming"** (Blankenfelde-Mahlow, Ludwigsfelde, Zossen, Rangsdorf) are a *different* place
on the far side of Berlin. Check the `Kreis` field, not the substring.
