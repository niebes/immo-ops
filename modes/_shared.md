# System Context -- immo-ops

<!-- ============================================================
     THIS FILE IS AUTO-UPDATABLE. Don't put personal data here.

     Your customizations go in modes/_profile.md (never auto-updated).
     This file contains scoring logic, global rules, tools, and
     scam detection that improve with each immo-ops release.
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| Profile | `config/profile.yml` | ALWAYS |
| User prefs | `modes/_profile.md` | ALWAYS (overrides this file) |
| Portals | `portals.yml` | Scan mode |

**RULE: Read config/profile.yml before evaluating.**
**RULE: Read modes/_profile.md AFTER this file. User customizations override defaults here.**

---

## Scoring System

8-block weighted evaluation. Each block scores 1.0–5.0. Global score = weighted average. Hard blockers cap the total.

### Block A — Price (Default weight: 20%)

For **rentals (Miete)**:
- At or below target Kaltmiete: 5.0
- Up to 10% above target: 4.0
- 10–20% above: 3.0
- 20–30% above: 2.0
- 30%+ above: 1.0
- Price per m² vs area Mietspiegel: bonus/penalty ±0.5
- Check Mietpreisbremse compliance: flag if exceeded
- **Use the ortsübliche Vergleichsmiete, NOT the portal "Mietspiegel" pages** — and always quote
  BOTH numbers (ortsüblich *and* Angebotsmarkt). Reference tables + the regulated-Gemeinde list:
  "Mietspiegel & Mietpreisbremse — regional reference data" below.

For **purchases (Kauf)**:
- At or below target Kaufpreis: 5.0
- Up to 10% above: 4.0
- 10–20% above: 3.0
- 20–30% above: 2.0
- 30%+ above: 1.0
- Include total cost: Kaufpreis + Grunderwerbsteuer + Notar + Makler
- Price per m² vs area average: bonus/penalty ±0.5

### Block B — Location (Default weight: 20%)

- Preferred area + commute under 20 min: 5.0
- Preferred area + commute under target max: 4.5
- Acceptable area + commute under target max: 4.0
- Any area + commute over target: 2.0 (scaled by overshoot)
- Excluded area: 1.0 (**hard blocker**)

Use commute destinations from `config/profile.yml`. Evaluate by configured mode (transit/bike/car).

### Block C — Size (Default weight: 15%)

- Within target range: 5.0
- Within 10% of range edges: 4.0
- Below minimum by 10–20%: 2.5
- Below minimum by 20%+: 1.0

### Block D — Condition (Default weight: 10%)

- Neubau / Erstbezug: 5.0
- Saniert / Renoviert: 4.0
- Gepflegt: 3.5
- Unrenoviert but usable: 2.5
- Sanierungsbedürftig: 1.5

Energieausweis adjustment:
- A+, A, B: +0.5
- C: +0.25
- D: neutral
- E: -0.25
- F: -0.5
- G, H: -1.0

Photo-evidence adjustment (condition can't be verified without real photos).
Detect via what's actually observable — do NOT attempt pixel-level "is this AI?" forensics:
- **No real photos** (count gallery images, excluding Grundriss/Lageplan = 0): **cap Block D at 3.0** for an *existing* flat — don't award Saniert/Renoviert on the listing's word alone; note "condition unverified, no photos."
- **Listing text labels the images as non-real** — keyword-scan the description for: Visualisierung, computergeneriert, gerendert, 3D, Symbolbild/Symbolfoto, Beispielbild, Musterwohnung, KI-/AI-generiert, "So könnte es aussehen", "ähnliche Wohnung". For an *existing* flat, treat these as no real photos (cap D at 3.0). Optionally note the "stock/example photos" scam medium-flag if combined with other red flags.
- **Neubau / Erstbezug exception:** renders/Visualisierungen are normal and expected pre-completion — do NOT penalize D; the rating comes from the new-build status itself, not the image.
- Block D penalty only — don't also dock E or H for the same gap (scam-check handles photo *fraud* separately).
- **Always surface it in the negative summary.** Whenever D is capped/penalized for this, add "no photos" (or "renders/example photos only") as an explicit ✗ con in the report Summary AND the email ✗ con line — never leave it implicit, since it both lowers the score and tells the user the listing is unverifiable.

### Block E — Amenities (Default weight: 10%)

- All must-haves + 3+ nice-to-haves: 5.0
- All must-haves + 1–2 nice-to-haves: 4.0
- All must-haves, no nice-to-haves: 3.5
- Missing 1 must-have: 2.0 (**hard penalty**)
- Missing 2+ must-haves: 1.0

### Block F — Availability (Default weight: 10%)

**If the user's move-in window is set** (earliest–latest are real dates):
- Available within user's move-in window: 5.0
- Available 1 month before/after window: 4.0
- Available 2+ months off: 2.0
- Sofort (immediate) when user can't move yet: 1.5 (risk of losing it)
- No date given: 3.0 (ask in contact)

**If the user's move-in window is flexible/unset** (`earliest_move_in`/`latest_move_in` is `flexible`, empty, or absent — the user has no fixed date):
- Any future availability date: 4.5 (no window constraint — timing is open)
- Sofort (immediate) availability: 3.5 (usable, but mild double-rent overlap if the user is still holding another flat)
- No date given on listing: 4.0 (ask in contact)

Do NOT flag a listing as "early"/"late" or penalize it for being "just past the move-in window" when the window is flexible — there is no window to miss.

### Block G — Rules (Default weight: 10%)

- All rules met: 5.0
- WBS required when user doesn't have: 1.0 (**hard blocker**)
- No pets when user has pets: 1.0 (**hard blocker**)
- Zwischenmiete when user wants permanent: 1.0 (**hard blocker**)
- Befristet (temporary): 2.0 (unless user accepts)
- Kaution > 3 Nettokaltmieten: 2.0 (illegal, flag prominently)

### Block H — Landlord (Default weight: 5%)

- Known good landlord/Hausverwaltung: 5.0
- Unknown (default for most): 3.5
- Known problematic (negative press, reviews): 2.0
- Missing/suspicious listing signals: 1.5
- Private landlord: note Eigenbedarf risk (rental only)

### Hard Blockers

These conditions cap the global score at ≤2.0 regardless of other blocks:
- Excluded area (Block B = 1.0)
- WBS required without WBS (Block G = 1.0)
- No pets when user has pets (Block G = 1.0)
- Zwischenmiete when wanting permanent (Block G = 1.0)
- Price 40%+ above target (Block A ≤ 1.5)

### Score Interpretation

- 4.5+ → Apply immediately, high priority
- 4.0–4.4 → Strong candidate, worth pursuing
- 3.5–3.9 → Decent but compromises exist
- 3.0–3.4 → Significant issues, pursue only if market is tight
- Below 3.0 → Not recommended

---

## Scam Detection

Run on EVERY evaluation. Score is separate from the 1–5 global score.

### Verdict thresholds (SSOT — count the checked signals below):
- **Legitimate** — 0 high AND ≤1 medium signals
- **Proceed with Caution** — 1 high OR 2+ medium signals
- **Likely Scam** — 2+ high signals OR 1 high + 2+ medium — strongly advise against engaging

(These counting rules previously lived only in `modes/scam-check.md`, which inline
evaluations never load — every run improvised its own cutoff. This table is now the
single source; `scam-check.md` refers here.)

### Red flag signals (weighted by reliability — the COMPLETE list):

| Signal | Reliability | Description |
|--------|-------------|-------------|
| Price >20% below Mietspiegel | High | Too-good-to-be-true pricing. **Only fires if an address-precise band confirms it** (e.g. IS24 `priceBar` below `minSimilarPrice`) — an Angebotsmieten anchor alone is biased upward and is not sufficient. See "Mietspiegel & Mietpreisbremse — regional reference data". |
| Advance payment before viewing | High | Kaution or "reservation fee" requested upfront |
| No in-person viewing offered | High | "I'm abroad, I'll send you the key" |
| Broken German + deposit narrative | High | Classic advance-fee scam pattern |
| Email address doesn't match portal profile | High | Contact mail ≠ the Anbieter the portal shows |
| Photos from different properties | Medium | Reverse image search or inconsistent interiors |
| Landlord claims to be abroad | Medium | Combined with other flags = strong signal |
| New portal account, single listing | Medium | No history on the platform |
| Listing reposted with different prices | Medium | Price changes without explanation |
| Contact only via WhatsApp / foreign number | Medium | Off-portal, hard-to-trace channel |
| Unusually detailed sob story | Medium | Emotional narrative engineering the deposit ask |
| Request for documents before contact | Low | Some legitimate landlords do this |
| Missing Energieausweis data | Low | Required by law but sometimes omitted legitimately |
| No exact address given | Low | Normal for many listings |
| Professional photos for a modest apartment | Low | Possible stolen marketing material |

### Scam detection output format:

```
**Scam Assessment:** {Legitimate | Proceed with Caution | Likely Scam}
**Signals:** {list of detected signals}
**Recommendation:** {action advice}
```

---

## German Real Estate Domain Rules

### Rental
- **Kaltmiete vs Warmmiete**: ALWAYS show both. Warmmiete = Kaltmiete + Nebenkosten (+ Heizkosten if applicable).
- **Mietpreisbremse**: In regulated areas, rent may not exceed 10% above the *ortsübliche Vergleichsmiete* (exceptions: § 556e higher Vormiete, § 556f Neubau/umfassende Modernisierung ab 01.10.2014). Flag violations. Which Gemeinden are regulated and which numbers to compare against: "Mietspiegel & Mietpreisbremse — regional reference data" below.
- **Kaution**: Maximum 3 Nettokaltmieten, payable in 3 installments. Anything above is illegal.
- **WBS**: Wohnberechtigungsschein required = social housing. Filter out by default.
- **Bestellerprinzip**: Tenant does NOT pay agent fees for rentals (since June 2015). Flag any listing charging Provision to tenant.
- **Indexmiete**: Rent tied to consumer price index — annual increases guaranteed. Flag in Block A as financial risk.
- **Staffelmiete**: Pre-agreed stepped rent increases. Flag schedule and total increase over lease term.
- **Mindestlaufzeit**: Minimum lease duration (e.g., 2 years). Locks tenant in — note in Block G.
- **Tauschwohnung**: Apartment swap listings. Handling is config-driven — discarded when swaps are off, or run through a two-sided swap match when `include_swaps: true` + a `swap_offer:` block exist (see evaluate.md step 4).
- **Eigenbedarf**: Private landlords can terminate for personal use. Note risk in Block H.

### Mietspiegel & Mietpreisbremse — regional reference data (SSOT)

**The trap that voids the whole check:** searching "Mietspiegel Potsdam" returns IS24 / immoportal /
miet-check / E&V pages quoting **12,60–13,50 EUR/m²**. That is the *Angebotsmiete* (what landlords
currently ask), NOT the *ortsübliche Vergleichsmiete*. For Plattenbau stock the qualified Mietspiegel
(§ 558d BGB) is roughly **half** of it — so using the portal number makes almost every Potsdam listing
look "at market" and silently kills the Mietpreisbremse check. Always report BOTH numbers; quoting
only the ortsübliche value makes a perfectly normal market price read like Wucher.

#### Potsdam — Grundmietentabelle 2026 (Nettokaltmiete EUR/m², Mittelwert (Spanne))

Official PDF: `https://www.potsdam.de/system/files/document/Mietspiegel_2026_A5_webdatei_neu.pdf`
(Mietspiegel **2026**, in Kraft seit 25.06.2026, ersetzt 2024; index `potsdam.de/de/mietspiegel-0`).
WebFetch **cannot parse it** ("corrupted/binary PDF") — but it *saves* the bytes and prints the path;
read that path with the **Read tool + `pages:`** (table = page 6, Spanneneinordnung = 8–9,
Begriffserläuterungen = 10–11). One WebFetch + one Read gets the whole table.

Columns by Wohnfläche: A ≤45 · B >45–60 · C >60–75 · D >75–90 · E >90
(Baualter ≤1948 uses A ≤45; the 1949–1970 row group shifts: A ≤40, B >40–60.)

| Baualter / EEK | A | B | C | D | E |
|---|---|---|---|---|---|
| bis 1948 · A+,A,B | 9,95 (8,28–11,64) | 9,78 (7,35–11,11) | 9,54 (7,76–10,65) | 11,11 (6,76–20,91) | ← D+E gemeinsam |
| bis 1948 · C,D,E | 9,18 (7,19–11,10) | 8,62 (6,90–10,62) | 8,82 (6,90–10,43) | 9,15 (6,90–11,49) | 8,87 (6,90–10,58) |
| bis 1948 · F,G,H | 7,22 (4,82–8,69) | 7,78 (6,12–9,04) | 7,08 (3,80–8,84) | 6,97 (4,19–9,56) | 6,97 (3,52–9,12) |
| bis 1948 · kein EA | 6,89 (6,16–7,97) | 7,03 (6,00–8,65) | 7,49 (5,72–9,19) | 7,83 (6,51–9,24) | 8,17 (5,90–9,40) |
| 1949–1970 · B,C | 8,66 (7,04–10,16) | 6,48 (5,85–7,06) | 6,50 (5,82–6,94) | 6,56 (6,00–7,06) | 7,49 (5,59–12,50) |
| 1949–1970 · D,E,F,G, kein EA | 7,93 (6,71–8,86) | 6,49 (5,85–7,21) | 6,46 (5,75–7,15) | 6,44 (5,40–7,17) | ← D+E gemeinsam |
| **1971–1990** (inkl. Wendebauten) · A,B | 7,53 (6,46–9,02) | 6,64 (5,85–7,86) | **6,06 (5,46–6,88)** | 5,87 (5,42–6,41) | 6,88 (5,69–7,77) |
| **1971–1990** · C,D | 7,07 (6,10–8,32) | 6,30 (5,76–6,87) | **5,82 (5,23–6,25)** | 5,63 (5,13–6,10) | 6,26 (5,37–7,43) |
| **1971–1990** · E,F | 6,67 (6,31–7,18) | 5,86 (5,29–6,39) | **5,69 (5,19–6,10)** | 5,55 (5,17–5,95) | – |
| 1991–2008 · A+,A,B,C | 9,27 (8,53–10,31) | 9,48 (8,93–10,34) | 9,28 (8,88–10,29) | 9,10 (8,43–10,18) | 9,91 (8,71–12,70) |
| 1991–2008 · D,E,F,G | 9,36 (8,86–10,12) | 9,24 (8,58–10,20) | 9,45 (8,20–11,51) | 9,01 (8,27–9,69) | 10,28 (7,91–13,71) |
| 2009–2012 · alle | 11,44 (11,32–11,66) | 10,92 (10,74–11,38) | 11,07 (9,38–11,88) | 11,43 (9,03–13,04) | 12,01 (10,30–13,84) |
| 2013–2020 · alle | 11,96 (11,69–12,15) | 11,66 (11,23–11,92) | 12,06 (11,23–12,74) | 12,34 (10,90–14,23) | 12,39 (10,31–14,00) |
| ab 2021 · alle | 15,28 (10,57–16,74) | 16,58 (14,70–19,50) | 15,72 (10,52–19,00) | 16,73 (14,88–19,64) | 15,14 (10,90–17,86) |

Wendebauten = Plattenbau Drewitz, begonnen vor 03.10.1990, fertig bis 1991. Baualter bleibt nach
Modernisierung maßgeblich (nur Sanierung auf Neubaustandard rückt die Klasse).

**How to use it:** field = Baualtersklasse × EEK-Zeile × m²-Spalte, start at the **Mittelwert** →
Spanneneinordnung (PDF p. 8–9: wohnwerterhöhende minus -mindernde Punkte = %-Satz toward the
Ober-/Unterwert; those are hard bounds) → zulässig = ortsüblich **+10 %**.

#### Brandenburg Umland — regulated since 01.01.2026

The Brandenburger Mietpreisbegrenzungs-/Kappungsgrenzenverordnung (Kabinett 25.11.2025) covers
**36 instead of 19 Gemeinden from 01.01.2026** — newly including **Falkensee**, Blankenfelde-Mahlow,
Eichwalde, Glienicke/Nordbahn. **In the Havelland there are exactly three: Falkensee,
Schönwalde-Glien (new), Brieselang (new)** — i.e. practically every Havelland rental that reaches
the scan. Only buildings **completed before 2014** are covered; zulässig = ortsüblich +10 %,
Kappungsgrenze 15 % in 3 years.

→ **Never write "Mietpreisbremse: not applicable" for a Speckgürtel/Havelland rental.** The intuitive
assumption "Brandenburg small town → no Mietpreisbremse" has been simply wrong since 2026.
These Gemeinden have **no qualified kommunaler Mietspiegel**, so the ortsübliche Vergleichsmiete is
only provable via Vergleichsobjekte → phrase it in the report as a **§ 556g Abs. 3 BGB
Auskunftshebel** (ask for Vormiete + Baujahr), never as an exclusion.

Market anchors 2026 (**Angebots**mieten only): Falkensee Häuser ~16,03 EUR/m², Wohnungen
13,50–15,70 · Schönwalde-Glien Gemeindeschnitt ~14,02 (12,69–15,48), Häuser 13,19 (150 m²)–14,55
(100 m²). Best address-precise source is the IS24 `PRICE_INFO.priceBar`
(`minSimilarPrice`–`maxSimilarPrice` + percentile) from the Mobile API.

**Never let an Angebots anchor alone fire the "price >20 % below Mietspiegel" High scam signal.**
Angebotsmieten are biased upward; the signal may only fire if the `priceBar` ALSO puts the offer
below `minSimilarPrice`.

Review cadence: Potsdam Mietspiegel is stable annual data, next edition expected 2028; the
Brandenburg ordinance is re-issued annually — re-check each January.

### Purchase
- **Kaufnebenkosten**: Grunderwerbsteuer (3.5–6.5% by state) + Notar (~1.5%) + Grundbuch (~0.5%) + optional Makler (typically 3.57% buyer share).
- **Berlin Grunderwerbsteuer**: 6%.
- **Hausgeld**: Monthly Eigentümergemeinschaft fee. Include in total cost.
- **Instandhaltungsrücklage**: Check the reserve fund — low reserves = future special assessments.
- **Teilungserklärung**: Review for usage restrictions.

### Bauland (Grundstück) — regional reference data (SSOT)

Use these before spending a WebSearch. They exist for the same reason as the Mietspiegel table
above: without them every plot evaluation re-runs a Bodenrichtwert hunt (search → Gutachterausschuss
PDF → `pdftotext`) and costs ~2× a flat.

**Bodenrichtwerte (BRW), erschlossenes Wohnbauland, Stand 01.01.2026:**

| Area | BRW EUR/m² | Source / note |
|---|---|---|
| Borkheide (Potsdam-Mittelmark) | 140 | Gutachterausschuss PM; corrects an older 160 figure |
| Damsdorf (Potsdam-Mittelmark) | 140 | was recorded as 160 before 2026 — do not reuse the old value |
| Paulinenaue (Havelland) | ~42 | Gemeindemittel |
| Premnitz (Havelland), EFH | 65–120 | price inside this band = market-conform, no scam signal |
| Westhavelland (district band) | 25–110 | 110 is the official ceiling — above it, justify or mark overpriced |

Refresh each January (Havelland publishes via a havelland.de press release rather than BORIS-BB).
⚠ **Aggregator sites are not a substitute and their error direction is NOT fixed**:
`bodenrichtwerte-deutschland.de` *under*states, because its mean blends all land uses including
Acker (~10 EUR/m²); other aggregators overstate. Prefer the Gutachterausschuss figure.

**Erschließung — five grades, best to worst.** The stated grade drives Block E and the all-in
cost, so read it off the exposé rather than assuming:
1. **Erschlossen, Anschlüsse im Grundstück** — ready to build.
2. **Anschlüsse in der Straße** — buyer pays the house connections, ~5.000–15.000 EUR.
3. **Medien liegen an, aber die Anliegerstraße ist unbefestigt** — the road itself is unbuilt, so
   a full Erschließungsbeitrag is still open, sized on **Grundstücksfläche** (20–60 EUR/m²).
4. **Unerschlossen.**
5. **Kein Abwasseranschluss at all** — Grube/Kleinkläranlage mandatory, plus running cost.

- **"Erschlossen" ≠ beitragsfrei (§ 133 Abs. 3 BauGB).** A levy can still be outstanding on a
  serviced plot; ask the Gemeinde in writing before making an offer.
- **The Erschließungsbeitrag is apportioned by area/use, NOT by frontage metres.** A 25 % shorter
  street frontage bought only ~6 % less exposure on #544. The corner-plot **Eckermäßigung** is the
  real lever, not frontage.
- Watch for the buyer contractually assuming *all future* Erschließungskosten (and, in wooded
  Brandenburg parcels, **Waldumwandlungsgebühren**) — unquantified five-figure exposure that can
  push an apparently 25 %-under-budget plot over the cap. Seen on #543/#544.

**Baurecht ladder** (strongest first): rechtskräftiger B-Plan → **Klarstellungs-/Ergänzungssatzung**
(binding Ortsrecht, e.g. Borkheide Satzung Nr. 3 of 27.10.2000) → § 34 with built neighbours on
both sides → § 34 asserted with unbuilt surroundings → nothing but the lister's claim.
`obj_buildingPerm: n` + no B-Plan + no Bauvoranfrage means the Baurecht is **asserted, not proven**.
Two recurring traps: a **"Teilungsgrundstück"** (area, boundaries and Grundbuchblatt not final, and
§ 34 development *in the second row* is the classic refusal case — faktische Bautiefe, Außenbereich
im Innenbereich, Baulast for access), and `obj_demolition: n` that contradicts the text/photos —
grep the description for `abgerissen|Abriss|Rückbau|Bauschutt` and look at the images before
crediting it (clearing costs 15.000–30.000 EUR).

**Always read the map/plan images and the photos before scoring C, E and G.** The Flurkarte gives
the Flurstücksnummer, the exact split and who the neighbours are (identify the parcel by Flurstück,
never by the exposé's nominal house number — an unbebautes Flurstück has none). The photos carry
encumbrances the text omits: overhead power pylons (easement + protective strip, #546), shafts,
worn paths — and whether a street, kerb or driveway is visible at all. Paid off on #529, #534,
#543, #544, #545, #546.

---

## Global Rules

### NEVER
1. Invent property details or measurements
2. Modify user data files without asking
3. Contact landlords without user approval
4. Submit documents automatically
5. Recommend listings with hard blockers without flagging
6. Share personal financial data outside Selbstauskunft generation

### ALWAYS
1. Verify listing is still active before user invests time
2. Show Kaltmiete AND Warmmiete (rentals) or full cost breakdown (purchases)
3. Check Mietpreisbremse compliance (rentals in regulated areas)
4. Run scam detection on every evaluation
5. Register in tracker after evaluating
6. English for system output; German domain terms where standard
7. Include `**URL:**` in every report header
8. Flag document expiry (SCHUFA > 3 months)
9. Write tracker additions as TSV in `batch/tracker-additions/` — NEVER edit `data/listings.md` directly for new entries

### Tools

| Tool | Use |
|------|-----|
| WebSearch | Market data, Mietspiegel, landlord reputation, area info |
| WebFetch | Extract listing details from static pages |
| Playwright | Headless scan via `npm run scan` (`scripts/scan.mjs`). **NEVER 2+ Playwright agents in parallel.** |
| invisible (stealth Firefox) | **DEFAULT** for bot-protected `scan_method: invisible-playwright` portals: `node scripts/scan.mjs --invisible` (self-contained; seed trust via `npm run login:invisible`). Tier 2 = the `mcp__invisible-playwright__*` tools. See `docs/invisible-playwright.md`. |
| debug-Chrome (CDP) | **LAST RESORT (Tier 3):** `npm run chrome:immo` + `node scripts/scan.mjs --debug-chrome` (legacy alias `--cic`). Only when both stealth tiers fail. See `docs/cic-cdp-scan.md`. |
| Read | profile.yml, _profile.md, portals.yml, listings.md |
| Write | Reports, tracker additions, research |
| Edit | Update tracker status |
| Bash | `node scripts/*.mjs` |

(Mirror of the Tools table in `CLAUDE.md`, which is authoritative — if they diverge,
trust CLAUDE.md and fix this copy. Tier ordering/doctrine SSOT: `modes/scan.md`.)
