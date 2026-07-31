# immo-ops — AI Real Estate Search Command Center

Evaluate listings, score neighborhoods, scan portals, detect scams, generate documents, and track applications for the German real estate market.

## Architecture

Six skills mapped to the apartment hunting journey:

| Skill | Phase | Modes |
|-------|-------|-------|
| `/immo-find` | **Discover** | scan, pipeline, batch, auto, notify |
| `/immo-assess` | **Analyze** | evaluate, compare, scam-check, market, auto-pipeline |
| `/immo-apply` | **Act** | contact, selbstauskunft, documents |
| `/immo-track` | **Manage** | tracker, viewing, log |
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
| Inbox | `inbox/` | Email attachments the user drops in — Exposés, forms, applicant docs |

**RULE: Read config/profile.yml and modes/_profile.md before evaluating.**
**RULE: modes/_profile.md overrides defaults in _shared.md.**

## Inbox Folder (email attachments)

The user manually drops files that arrive by email into `inbox/`. **When the user references an email, an attachment, an Exposé, or a document "in the inbox", look in `inbox/` — do NOT try to pull bytes out of Gmail (the Gmail tools return attachment metadata only, and browser access to Gmail is refused).** Read PDFs/images directly with the Read tool.

Layout:
- `inbox/{Listing name}/` — per-listing attachments, e.g. `inbox/Reiherbergstr. 15b/Exposé.pdf`, plus the landlord's Selbstauskunft/Datenschutz forms. An official Exposé here is authoritative for price/Kaution/Baujahr/Energieausweis — reconcile the tracker row against it (search-portal data is often stale or wrong).
- `inbox/Mario-Niebes/` and `inbox/Amanda-Lamont/` — applicant documents for the Selbstauskunft (Schufa, Ausweis, Entgeltabrechnungen, Bewilligungsbescheid, Niederlassungserlaubnis). These are the source files `/immo-apply` documents mode assembles.

Treat `inbox/` as a user-layer source (never auto-delete or modify; it holds personal/financial data — handle per the "NEVER share financial data" rule).

## Data Contract

See `DATA_CONTRACT.md`. User-layer files are NEVER auto-updated. System-layer files can be replaced on upgrade.

## Scoring System

8-block weighted scoring. **Authoritative details — per-block scoring rules, exact weights, hard-blocker list, scam-signal reliability tiers — live in `modes/_shared.md` (the SSOT for scoring numbers); the tables here are orientation only.**

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

Hard blockers cap score at ≤2.0: excluded area, WBS required without WBS, no pets when user has pets, Zwischenmiete, price 40%+ above target (full list: `modes/_shared.md`).

## German Real Estate Domain Rules

### Rental (Miete)
- **Mietpreisbremse**: Flag listings exceeding area Mietspiegel. Berlin has strict rent caps.
- **Kaution**: Maximum 3 Nettokaltmieten. Flag anything above.
- **Kaltmiete vs Warmmiete**: ALWAYS show both. Warmmiete = Kaltmiete + Nebenkosten + Heizkosten.
- **WBS**: Wohnberechtigungsschein — social housing eligibility. Filter out by default unless user has one.
- **Bestellerprinzip**: Tenant does NOT pay agent fees for rentals (since June 2015). Flag violations.
- **Eigenbedarf**: Landlord eviction for personal use — risk with private landlords. Note in Block H.
- **Energieausweis**: Required by law. Classes A+ to H. Score in Block D.

### Purchase (Kauf)
- **Grunderwerbsteuer**: Varies by state (Berlin: 6%, Bayern: 3.5%).
- **Notarkosten / Grundbuch**: ~1.5–2% of purchase price.
- **Maklergebühren**: Split 50/50 buyer/seller since Dec 2020 for residential.
- **Vorkaufsrecht**: Municipal right of first refusal in some Berlin areas (Milieuschutzgebiete).
- **Hausgeld**: Monthly fee for apartment owners (Eigentümergemeinschaft). Show alongside mortgage.

### Scam Detection (ALWAYS run during evaluation)
Red flags — any of these should trigger a warning (authoritative signal list with reliability tiers: `modes/_shared.md`):
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
| Playwright | Headless scan via `npm run scan` (`scan_method: playwright` portals). **NEVER 2+ Playwright agents in parallel.** |
| invisible (stealth Firefox) | **DEFAULT for bot-protected `scan_method: invisible-playwright` portals.** `node scripts/scan.mjs --invisible` — vendored, self-contained anti-detect Firefox; seed trust once via `npm run login:invisible`. See `docs/invisible-playwright.md`. |
| invisible-playwright MCP | **Tier 2.** Same stealth Firefox driven by hand via `mcp__invisible-playwright__*` (navigate_page, evaluate_script) — for portals the automated `--invisible` pass couldn't clear. |
| debug-Chrome (CDP) | **LAST RESORT (Tier 3).** `npm run chrome:immo` (dedicated logged-in debug Chrome) + `node scripts/scan.mjs --debug-chrome`. Only when both stealth tiers fail. See `docs/cic-cdp-scan.md`. |
| CiC (Claude-in-Chrome) | Interactive real-Chrome scan — deepest fallback, only if even the debug Chrome is unavailable. |
| Read | profile.yml, _profile.md, portals.yml, listings.md |
| Write | Reports, tracker additions, research |
| Edit | Update tracker status |
| Bash | `node scripts/*.mjs` |

**CiC tab rule:** ALWAYS create a dedicated tab via `tabs_create_mcp` before CiC operations. Never reuse tabs from other agents/skills. When done, close only the tab(s) you created via `tabs_close_mcp` — never close tabs you didn't create.

## Listing Statuses

Canonical statuses (see `templates/states.yml`):
`New → Evaluated → Interested → Contacted → Viewing → Viewed → Applied → Accepted / Rejected / Discarded / Expired`

Swap listings branch after Evaluated: `Evaluated → Swap-candidate` (two-sided match passed; speculative until Vermieter consent — see the Tauschwohnung section below).

## Report Format

Reports go to `reports/{NNN}-{location}-{rooms}r-{date}.md` with blocks A–H plus summary and next steps. See `modes/evaluate.md` for full format.

## Tauschwohnung Detection & Two-Sided Matching

German portals (especially ImmoScout24, Immowelt) are full of apartment swap listings from tauschwohnung.com. A swap requires offering your own apartment in exchange, so it is only relevant if you HAVE a flat to put up.

**Detection signals:**
- Title contains: "Tauschwohnung", "Wohnungstausch", "Tausche", "gegen Wohnung"
- Anbieter is "Tauschwohnung GmbH"
- Description references tauschwohnung.com or swap mechanics
- Listed as "Wohnungstausch:" prefix

**Behaviour is config-driven** by `config/profile.yml`:
- **Swaps OFF** (no enabled search sets `include_swaps: true`, or no `swap_offer:` block): legacy behaviour — AI title triage discards swaps as `discarded_triage`; evaluation registers them `Discarded` without scoring.
- **Swaps ON** (`include_swaps: true` + a `swap_offer:` block): swaps are KEPT and evaluated with a **two-sided match**. A `Swap-candidate` requires BOTH: (1) THEIR flat scores ≥3.5 for us via blocks A–H, AND (2) one of OUR `swap_offer` flats plausibly satisfies THEIR *Suche/Gesuchte Wohnung*. Matching side 2 is **lenient / recall-favoring** (surface near-misses, surface an offer that sits just outside a narrowly-stated target area, surface when their Suche is unknown). Fails side 1 or clearly fails side 2 → `Discarded` ("swap-mismatch: {reason}"). See `modes/evaluate.md` step 4 and `modes/scan.md`.

The offered flat(s) come entirely from the `swap_offer:` block in `config/profile.yml` (user layer). A swap ultimately needs the **Vermieter's consent** to a Mieterwechsel (`swap_offer.landlord_consent`) — treat candidates as speculative until confirmed.

## Portal-Specific Notes

Scan methods (the `scan_method:` values in `portals.yml`): `playwright` (headless, `npm run scan`), `invisible-playwright` (bot-protected — scanned stealth-first in three tiers), and `websearch` (AI-executed). **Tier ordering, CAPTCHA doctrine, and escalation rules live in `modes/scan.md` (SSOT) — do not re-derive them here.** Short version: Tier 1 `scan.mjs --invisible` (default) → Tier 2 `mcp__invisible-playwright__*` → Tier 3 debug Chrome over CDP (LAST resort).

| Portal | Method | Notes |
|--------|--------|-------|
| ImmoScout24 | **invisible-playwright** | Blocks headless Playwright entirely. Stealth-first (`--invisible`); the bot-block usually auto-clears. Debug Chrome / real Chrome only as last resort. |
| Immowelt | playwright | Works headlessly. Redirect-heavy URLs — use canonical form. |
| Kleinanzeigen | **invisible-playwright** | Bot-blocks headless + Tailwind redesign. Extractor `kleinanzeigen-extract.js`. Known to crash the stealth driver (auto-restart handles it). |
| Vonovia | **invisible-playwright** | Angular SPA, XHR-only + Cookiebot wall. `search_url` points at its JSON API; extractor `vonovia-extract.js`. |

Portals are configured in `portals.yml` (user layer, gitignored). The template at `templates/portals.example.yml` has a starter set. Bot-block/CAPTCHA handling: `modes/scan.md`.

## First Run

On first invocation, check for `config/profile.yml`. If missing:
1. Copy `config/profile.example.yml` to `config/profile.yml`
2. Copy `modes/_profile.template.md` to `modes/_profile.md`
3. Copy `templates/portals.example.yml` to `portals.yml`
4. Copy `templates/data/*.md` to `data/`
5. Guide user through filling in their search criteria and portal URLs
