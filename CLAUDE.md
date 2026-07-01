# immo-ops — AI Real Estate Search Command Center

Evaluate listings, score neighborhoods, scan portals, detect scams, generate documents, and track applications for the German real estate market.

## Architecture

Six skills mapped to the apartment hunting journey:

| Skill | Phase | Modes |
|-------|-------|-------|
| `/immo-find` | **Discover** | scan, pipeline, batch |
| `/immo-assess` | **Analyze** | evaluate, compare, scam-check, market, auto-pipeline |
| `/immo-apply` | **Act** | contact, selbstauskunft, documents |
| `/immo-track` | **Manage** | tracker, viewing |
| `/immo-research` | **Deep-dive** | research (subagent) |
| `/immo-portal` | **Configure** | discover URL, build extractor, register, verify |

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
| Playwright | Headless scan via `npm run scan`. **NEVER 2+ Playwright agents in parallel.** |
| CiC (Claude-in-Chrome) | Interactive scan for bot-protected portals (ImmoScout24). Uses real Chrome. |
| Read | profile.yml, _profile.md, portals.yml, listings.md |
| Write | Reports, tracker additions, research |
| Edit | Update tracker status |
| Bash | `node scripts/*.mjs` |

**CiC tab rule:** ALWAYS create a dedicated tab via `tabs_create_mcp` before CiC operations. Never reuse tabs from other agents/skills. When done, close only the tab(s) you created via `tabs_close_mcp` — never close tabs you didn't create.

## Listing Statuses

Canonical statuses (see `templates/states.yml`):
`New → Evaluated → Interested → Contacted → Viewing → Viewed → Applied → Accepted / Rejected / Discarded / Expired`

## Report Format

Reports go to `reports/{NNN}-{location}-{rooms}r-{date}.md` with blocks A–H plus summary and next steps. See `modes/evaluate.md` for full format.

## Tauschwohnung Detection

German portals (especially ImmoScout24, Immowelt) are flooded with apartment swap listings from tauschwohnung.com. These are NOT real rentals — they require you to offer your own apartment in exchange.

**Detection signals:**
- Title contains: "Tauschwohnung", "Wohnungstausch", "Tausche", "gegen Wohnung"
- Anbieter is "Tauschwohnung GmbH"
- Description references tauschwohnung.com or swap mechanics
- Listed as "Wohnungstausch:" prefix

**Action:** The scan scripts do NOT keyword-filter titles — swaps are caught by the **AI title triage** step (see `modes/scan.md` / immo-find auto Step 3), which reads the title and discards swaps with a reason. During evaluation, detect early and register as `Discarded` without scoring.

## Portal-Specific Notes

Two scan methods: `playwright` (headless, `npm run scan`) and `cic` (Claude-in-Chrome, interactive).

| Portal | Method | Notes |
|--------|--------|-------|
| ImmoScout24 | **cic** | Blocks Playwright entirely. Use CiC with user's real Chrome. CAPTCHA may need manual solve. |
| Immowelt | playwright | Works headlessly. Redirect-heavy URLs — use canonical form. |
| Kleinanzeigen | playwright | Works headlessly. Location codes are city-specific (find via WebSearch). |
| Vonovia | playwright | SPA with dynamic loading. |

Portals are configured in `portals.yml` (user layer, gitignored). The template at `templates/portals.example.yml` has a starter set.

When a CiC portal shows a CAPTCHA:
1. Inform the user which portal is blocked
2. Ask user to solve CAPTCHA in the open browser tab
3. After user confirms, resume extraction
4. If user is unavailable, skip portal and note it in the scan summary

## First Run

On first invocation, check for `config/profile.yml`. If missing:
1. Copy `config/profile.example.yml` to `config/profile.yml`
2. Copy `modes/_profile.template.md` to `modes/_profile.md`
3. Copy `templates/portals.example.yml` to `portals.yml`
4. Copy `templates/data/*.md` to `data/`
5. Guide user through filling in their search criteria and portal URLs
