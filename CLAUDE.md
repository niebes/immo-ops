# immo-ops — AI Real Estate Search Command Center

Evaluate listings, score neighborhoods, scan portals, detect scams, generate documents, and track applications for the German real estate market.

## Architecture

Three skills with distinct responsibilities:

| Skill | Purpose |
|-------|---------|
| `/immo-ops` | Main router — evaluate, compare, track, contact, viewings, market analysis, scam check, documents, Selbstauskunft |
| `/immo-scan` | Portal scanning, filtering, dedup, ingestion into pipeline |
| `/immo-research` | Deep area/landlord/building research |

## Sources of Truth

| File | Path | When |
|------|------|------|
| Profile | `config/profile.yml` | ALWAYS (search criteria, identity, documents) |
| User prefs | `modes/_profile.md` | ALWAYS (scoring weight overrides) |
| Portals | `portals.yml` | For scan mode |
| Listings | `data/listings.md` | For tracker, evaluate, compare |
| Pipeline | `data/pipeline.md` | For pipeline, scan |
| Scan history | `data/scan-history.tsv` | For dedup |
| Viewings | `data/viewings.md` | For viewing mode |
| Documents | `data/documents.md` | For documents mode |

**RULE: Read config/profile.yml and modes/_profile.md before evaluating.**
**RULE: modes/_profile.md overrides defaults in _shared.md.**

## Data Contract

See `DATA_CONTRACT.md`. User-layer files are NEVER auto-updated. System-layer files can be replaced on upgrade.

## Scoring System

8-block weighted scoring (details in `modes/_shared.md`):

| Block | Dimension | Default Weight |
|-------|-----------|---------------|
| A | Price — Kaltmiete, Warmmiete, EUR/m², Mietspiegel | 20% |
| B | Location — area preference, commute, transit | 20% |
| C | Size — m², rooms vs requirements | 15% |
| D | Condition — age, renovation, Energieausweis | 10% |
| E | Amenities — must-haves + nice-to-haves | 10% |
| F | Availability — move-in date alignment | 10% |
| G | Rules — WBS, pets, Befristung, Kaution | 10% |
| H | Landlord — reputation, Eigenbedarf risk | 5% |

Score interpretation: 4.5+ apply immediately, 4.0–4.4 strong, 3.5–3.9 decent, 3.0–3.4 issues, <3.0 not recommended.

Hard blockers cap score at ≤2.0: excluded area, WBS required without WBS, no pets when user has pets, Zwischenmiete.

## German Real Estate Domain Rules

### Rental (Miete)
- **Mietpreisbremse**: Flag listings exceeding area Mietspiegel. Berlin has strict rent caps.
- **Kaution**: Maximum 3 Nettokaltmieten. Flag anything above.
- **Kaltmiete vs Warmmiete**: ALWAYS show both. Warmmiete = Kaltmiete + Nebenkosten + Heizkosten.
- **WBS**: Wohnberechtigungsschein — social housing eligibility. Filter out by default unless user has one.
- **Bestellerprinzip**: Tenant does NOT pay agent fees for rentals (since 2015). Flag violations.
- **Eigenbedarf**: Landlord eviction for personal use — risk with private landlords. Note in Block H.
- **Energieausweis**: Required by law. Classes A+ to H. Score in Block D.

### Purchase (Kauf)
- **Grunderwerbsteuer**: Varies by state (Berlin: 6%, Bayern: 3.5%).
- **Notarkosten / Grundbuch**: ~1.5–2% of purchase price.
- **Maklergebühren**: Split 50/50 buyer/seller since Dec 2020 for residential.
- **Vorkaufsrecht**: Municipal right of first refusal in some Berlin areas (Milieuschutzgebiete).
- **Hausgeld**: Monthly fee for apartment owners (Eigentümergemeinschaft). Show alongside mortgage.

### Scam Detection (ALWAYS run during evaluation)
Red flags — any of these should trigger a warning:
- Price >20% below Mietspiegel for the area
- Landlord claims to be abroad / "send key by mail"
- Advance payment / Kaution requested before viewing
- No in-person viewing offered
- Broken German with deposit narrative
- Stock photos or photos from different properties
- Listing reposted with different prices or agents
- New account on portal with single listing
- Request for personal documents before any contact

## NEVER

1. Contact landlords without user approval
2. Submit Selbstauskunft or documents automatically
3. Invent property details or measurements
4. Modify user data files (profile.yml, _profile.md, portals.yml) without asking
5. Recommend listings with hard blockers without flagging them prominently
6. Share personal financial data outside of Selbstauskunft generation

## ALWAYS

1. Verify listing is still active before user invests time
2. Show Kaltmiete AND Warmmiete (rentals) or full cost breakdown (purchases)
3. Check Mietpreisbremse compliance (rentals)
4. Run scam detection on every evaluation
5. Register in tracker after evaluating
6. English for all system output; German domain terms where standard (Kaltmiete, not "cold rent")
7. Include `**URL:**` in every report header
8. Flag document expiry (SCHUFA > 3 months old)
9. Write tracker additions as TSV in `batch/tracker-additions/` — NEVER edit `data/listings.md` directly for new entries

## Tools

| Tool | Use |
|------|-----|
| WebSearch | Market data, Mietspiegel, landlord reputation, area info |
| WebFetch | Extract listing details from static pages |
| Playwright | Scan portals (browser_navigate + browser_snapshot). Cookie consent first. Rate limit. **NEVER 2+ agents with Playwright in parallel.** |
| Read | profile.yml, _profile.md, portals.yml, listings.md |
| Write | Reports, tracker additions, research |
| Edit | Update tracker status |
| Bash | `node scripts/*.mjs` |

## Listing Statuses

Canonical statuses (see `templates/states.yml`):
`New → Evaluated → Interested → Contacted → Viewing → Viewed → Applied → Accepted / Rejected / Discarded / Expired`

## Report Format

Reports go to `reports/{NNN}-{location}-{rooms}r-{date}.md` with blocks A–H plus summary and next steps. See `modes/evaluate.md` for full format.

## First Run

On first invocation, check for `config/profile.yml`. If missing:
1. Copy `config/profile.example.yml` to `config/profile.yml`
2. Copy `modes/_profile.template.md` to `modes/_profile.md`
3. Copy `templates/portals.example.yml` to `portals.yml`
4. Guide user through filling in their search criteria
