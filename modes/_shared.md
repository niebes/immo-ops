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

### Three tiers:
- **Legitimate** — No red flags detected
- **Proceed with Caution** — Some concerning signals
- **Likely Scam** — Multiple red flags, strongly advise against engaging

### Red flag signals (weighted by reliability):

| Signal | Reliability | Description |
|--------|-------------|-------------|
| Price >20% below Mietspiegel | High | Too-good-to-be-true pricing |
| Advance payment before viewing | High | Kaution or "reservation fee" requested upfront |
| No in-person viewing offered | High | "I'm abroad, I'll send you the key" |
| Broken German + deposit narrative | High | Classic advance-fee scam pattern |
| Photos from different properties | Medium | Reverse image search or inconsistent interiors |
| Landlord claims to be abroad | Medium | Combined with other flags = strong signal |
| New portal account, single listing | Medium | No history on the platform |
| Listing reposted with different prices | Medium | Price changes without explanation |
| Request for documents before contact | Low | Some legitimate landlords do this |
| Missing Energieausweis data | Low | Required by law but sometimes omitted legitimately |

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
- **Mietpreisbremse**: In regulated areas, rent may not exceed 10% above Mietspiegel (exceptions: Neubau, extensive modernization). Flag violations.
- **Kaution**: Maximum 3 Nettokaltmieten, payable in 3 installments. Anything above is illegal.
- **WBS**: Wohnberechtigungsschein required = social housing. Filter out by default.
- **Bestellerprinzip**: Tenant does NOT pay agent fees for rentals (since June 2015). Flag any listing charging Provision to tenant.
- **Indexmiete**: Rent tied to consumer price index — annual increases guaranteed. Flag in Block A as financial risk.
- **Staffelmiete**: Pre-agreed stepped rent increases. Flag schedule and total increase over lease term.
- **Mindestlaufzeit**: Minimum lease duration (e.g., 2 years). Locks tenant in — note in Block G.
- **Tauschwohnung**: Apartment swap listings are NOT real rentals. Detect and discard early (see evaluate.md step 4).
- **Eigenbedarf**: Private landlords can terminate for personal use. Note risk in Block H.
- **Staffelmiete / Indexmiete**: Pre-agreed rent increases. Note in price evaluation.

### Purchase
- **Kaufnebenkosten**: Grunderwerbsteuer (3.5–6.5% by state) + Notar (~1.5%) + Grundbuch (~0.5%) + optional Makler (typically 3.57% buyer share).
- **Berlin Grunderwerbsteuer**: 6%.
- **Hausgeld**: Monthly Eigentümergemeinschaft fee. Include in total cost.
- **Instandhaltungsrücklage**: Check the reserve fund — low reserves = future special assessments.
- **Teilungserklärung**: Review for usage restrictions.

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
| Playwright | Scan portals (browser_navigate + browser_snapshot). Cookie consent first. Rate limit. **NEVER 2+ agents with Playwright in parallel.** |
| Read | profile.yml, _profile.md, portals.yml, listings.md |
| Write | Reports, tracker additions, research |
| Edit | Update tracker status |
| Bash | `node scripts/*.mjs` |
