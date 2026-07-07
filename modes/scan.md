# Mode: scan — Portal Scanner

Single source of truth for scan execution. Scans configured real estate portals, applies AI title triage and objective criteria gates, deduplicates against history, and adds new listings to the pipeline for evaluation.

## Configuration

Read `portals.yml`, which contains `search_groups` — one group per search target:
- Each group has a `name` matching a `searches[].name` in `config/profile.yml`
- `scan_defaults`: Default search parameters (city, price, rooms, size) for that target
- `portals`: List of portals with `scan_method`, `search_url` (or `search_query`), rate limits
- `title_filter`: Advisory keyword checklist for the AI triage (NOT a mechanical gate)

Read `config/profile.yml` for active searches (used to match scan results against criteria).

**Multi-target scanning:** Scan all groups, or a specific one if the user requests it. Each group's results are tagged with the search name and filtered independently using that group's defaults.

**Enabled flag:** Both search groups (in portals.yml) and searches (in profile.yml) support `enabled: false` to skip them during scans. Default is `true` if omitted.

## Scan Methods

Each portal's `scan_method` in `portals.yml` determines how it is scanned:

### `playwright` — headless script (primary)

```
node scripts/scan.mjs                # all enabled groups (npm run scan)
node scripts/scan.mjs --group "{group name}"
node scripts/scan.mjs --portal "{portal name}"
node scripts/scan.mjs --dry-run      # preview without writing
node scripts/scan.mjs --deep         # disable the ≥80%-seen early-stop, raise listing cap
```

The script handles navigation, cookie consent, extraction (via `scripts/portals/*.mjs` extractors), pagination, the numeric criteria gate, dedup, and pipeline/history writes. It can run unattended in the background.

### `cic` — bot-protected portals (three transports, stealth-first)

Portals with aggressive bot detection block a fresh/headless browser. Three transports, tried in THIS order. **CiC over the debug Chrome is the LAST resort** — reach for the stealth tiers first.

**Tier 1 — invisible (DEFAULT):**
```
npm run login:invisible      # ONE-TIME: seed session trust (headful stealth Firefox login)
node scripts/scan.mjs --invisible   # scan all enabled scan_method: cic portals
```
Fully scripted and self-contained: drives the vendored stealth Firefox (patched anti-detect profile, `scripts/invisible-driver.py`) — navigate → consent → wait out the bot-block → run the portal's `scripts/portals/{slug}-cic.js` snippet → pipe to `process-scan.mjs`. No external browser needed; session trust persists in `tmp/browser-state.json`. This is the default automated pass. Details: `docs/cic-cdp-scan.md`.

**Tier 2 — invisible-playwright MCP (Claude-driven stealth):** the SAME stealth Firefox, driven by hand via the `mcp__invisible-playwright__*` tools (navigate_page, evaluate_script, …). Use for portals the Tier-1 automated pass could NOT clear — an unexpected interstitial the fixed wait-loop can't handle, or a step needing judgement. Open the search URL, clear whatever blocks it, run the `{slug}-cic.js` snippet via `evaluate_script`, pipe the compact `{c,n,p,L}` to `process-scan.mjs`. Same stealth engine as Tier 1, just interactive.

**Tier 3 — CiC over CDP (LAST RESORT):**
```
npm run chrome:immo          # start the dedicated logged-in debug Chrome (idempotent)
node scripts/scan.mjs --cic  # scan the still-unprocessed scan_method: cic portals
```
The persistent, logged-in debug Chrome over CDP. Use ONLY when both stealth tiers fail for a portal (e.g. a defense that specifically trusts that browser's cookie/fingerprint history). Requires the debug browser up (`scripts/immo-chrome.sh --status`). Interactive Claude-in-Chrome (the user's real Chrome via `javascript_tool`, dedicated `tabs_create_mcp` tab) is a further fallback if even the debug Chrome is unavailable.

**Bot-block doctrine (stealth/trusted browser):** in the stealth (Tier 1/2) or trusted debug (Tier 3) browser most bot-blocks auto-clear — wait 5–10 s, then re-check (the scripted tiers retry this automatically; this is the auto-clear observed on IS24). Only involve the user if a portal is STILL blocked after all applicable tiers. If the user is unavailable, skip the portal and record it as a ⛔ coverage item. Never ask the user as the first step. (A fresh/headless browser has no stealth or trust and stays blocked — that is why these portals need the stealth engine or the persistent profile, not user intervention.)

### `websearch` — AI-executed discovery

`scan_method: websearch` portals are **not implemented in `scan.mjs`** — the agent runs them itself during the scan run:

1. Execute WebSearch with the portal's `search_query`
2. Extract `{title, url, location}` candidates from results
3. Results may be stale — verify each new candidate is still active (WebFetch or browser) before adding to the pipeline
4. Feed survivors through the same triage → criteria gate → dedup → pipeline steps below (pipe as JSON to `process-scan.mjs --portal "{name}" --group "{group}"` where practical)

Because no script covers these portals, they are the easiest to silently skip — **they MUST appear in the coverage report** (✅ scanned or ⛔ with blocker), every run.

## Failure Routing (`data/scan-failures.json`)

`scan.mjs` writes this file every run (empty `failures: []` on a clean run). It is the source of truth for what could NOT be processed. For each entry:
- `fallback: "cic"` (CAPTCHA, 403, bot-block, 0 cards extracted) → the site blocks headless. Rescan it in the CiC pass IF a `{slug}-cic.js` snippet exists; if not, it is a ⛔ coverage item — recommend building a snippet via `/immo-portal`.
- `fallback: "reconfigure"` (no search_url, login wall) → not transient. Surface as ⛔ and recommend `/immo-portal`; do not retry blindly.
- `fallback: "retry"` (transient timeout) → note it; it should clear next cycle.

## Workflow

1. **Read configuration**: `portals.yml`, `config/profile.yml`
2. **Read dedup sources**: `data/scan-history.tsv`, `data/listings.md`, `data/pipeline.md`
3. **Select search groups**: all `search_groups`, or a specific one if the user requests it.
4. **Playwright pass**: `node scripts/scan.mjs` (optionally `--group`). Then read `data/scan-failures.json` and route failures per the section above.
5. **Bot-protected pass** (stealth-first): all enabled `scan_method: cic` portals, plus `fallback: "cic"` portals from step 4 that have a snippet. Run **Tier 1** `node scripts/scan.mjs --invisible` first (the default); escalate any portal it could not clear to **Tier 2** (the `mcp__invisible-playwright__*` tools); use **Tier 3** `node scripts/scan.mjs --cic` (debug Chrome over CDP) only as a last resort. See the `cic` section above.
6. **Websearch pass**: for each enabled `scan_method: websearch` portal, run the AI-executed discovery above.
7. **AI title triage** (NOT a keyword filter):
   Title relevance is a judgement call — an apartment swap, a garage/parking space, a
   commercial unit, a WBS-required or time-limited sublet — and the AI reads each title
   to make it. Do **not** mechanically drop on keywords: a word like "Garage" is
   ambiguous (a house that HAS a garage vs. a garage for rent), so substring matching
   throws false negatives (e.g. expose 168836565, a real DHH, was wrongly dropped for
   the word "Garage"). The `title_filter` lists in portals.yml are an **advisory
   checklist** of things to look out for, not a gate. For each candidate, judge from the
   title (+ metadata) whether it is a real, on-target rental; discard the clear non-fits
   with a one-line reason and keep the rest. When unsure, keep it — later evaluation
   catches what triage misses (favour recall over precision, same as the area rule).
   **Swaps:** discard a swap listing here ONLY if no enabled search sets
   `include_swaps: true`. When swaps are enabled, keep them — the two-sided swap match
   at evaluation decides fit, not triage (see `modes/evaluate.md` step 4 for the
   detection signals and match procedure).
8. **Filter by criteria** (HARD GATE — objective numbers only, applied by the scripts):
   Using `scan_defaults` from portals.yml AND `searches` from profile.yml:
   - Rooms: REJECT if rooms < `rooms_min`. Non-negotiable.
   - Size: REJECT if m² < `size_min`. Non-negotiable.
   - Price: REJECT if price > `price_max` (max_kaltmiete from profile). Non-negotiable.
   - Area: REJECT if location matches an excluded area.
   - If a field could not be extracted from the search result snippet, log a warning but still add to pipeline (better to over-include than silently drop).
   - Price sanity check: if price is >30% below typical area Mietspiegel, flag as suspicious — likely a coop rent, extraction error, or scam. Still add to pipeline but prepend "⚠ LOW PRICE" to the title. Low price is a KEEP-and-flag signal, never an auto-discard.
   - NOTE: the scripts (`scan.mjs`, `process-scan.mjs`) apply ONLY these numeric gates + dedup — never a title keyword filter. Title relevance is the AI triage step above.
9. **Deduplicate** against 3 sources (URL-level, exact match — handled by the scripts):
   - `data/scan-history.tsv` → URL already seen. Check BEFORE appending — never write duplicate rows.
   - `data/listings.md` → URL already evaluated
   - `data/pipeline.md` → URL already in pending or processed
   A URL that already exists in ANY of these sources is a duplicate, regardless of which scan run or date it was first seen. Skip it entirely — do not re-append to scan-history.tsv.
10. **For each new listing that passes filters**:
    a. Add to `data/pipeline.md` under "Pending": `- [ ] {url} | {portal} | {search_group_name} | {title}`
    b. Register in `data/scan-history.tsv`: `{url}\t{date}\t{portal}\t{title}\t{location}\t{price}\t{m2}\t{rooms}\tadded`
11. **Filtered listings**: register in scan-history.tsv with status:
    - `skipped_criteria` — failed the objective price/size/area gate
    - `skipped_dup` — duplicate
    - `skipped_expired` — listing no longer active (websearch results)
    - `discarded_triage` — AI title triage judged it a non-fit (garage, commercial,
      WBS, sublet, wrong city, or a swap when `include_swaps` is off …); record the
      one-line reason in the row's title/status
    Nothing is dropped by keyword — there is no keyword-based skip status.
12. **Coverage report** (see below) — mandatory last step of every run.

## Pagination

Paginate every portal until one of:
- **≥80% already-seen early-stop**: if ≥80% of a page's listings are already in scan-history, stop — the rest is old inventory. (`--deep` disables this when history has been pruned.)
- No next page.
- The per-portal listing cap (script default 100; 600 with `--deep`).

There is NO fixed page cap. Respect each portal's `rate_limit` (seconds) between page navigations. Portals with `captcha_risk: high` are scanned last, so a block still leaves results from the other portals.

## Coverage Report (MANDATORY, every run)

Every scan run — full or partial — ENDS by accounting for EVERY *enabled* portal across ALL selected search groups in `portals.yml`, **all three methods: playwright, cic, AND websearch**. Disposition per portal:
- ✅ **scanned** (with new/seen count)
- ⛔ **not processed** — ALWAYS state the exact blocker: CAPTCHA, missing extractor snippet, 403/bot-block, timeout, navigation error, redirect failure, no `--group` match, websearch pass not run, etc.

Present as a per-group table (Portal · Method · Status · What stopped it). ⛔ rows are the priority — an enabled portal that yielded nothing because it was blocked is NOT the same as one that yielded nothing legitimately. Never silently omit a blocked or skipped portal — websearch portals in particular, since no script accounts for them.

## Scan History

`data/scan-history.tsv` tracks ALL URLs seen:

```
url	first_seen	portal	title	location	price	m2	rooms	status
https://...	2026-05-11	ImmoScout24	3-Zi Kreuzberg	Berlin-Kreuzberg	1200	72	3	added
https://...	2026-05-11	Immowelt	Studio Mitte	Berlin-Mitte	800	28	1	skipped_criteria
```

## Output Summary

```
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Portals scanned: {N} of {M} enabled
Listings found: {N} total
Filtered (criteria): {N}
Discarded (triage): {N}
Duplicates: {N} (already tracked or in pipeline)
Expired: {N} (websearch results no longer active)
New added to pipeline: {N}

  + {portal} | {title} | {location} | {price} EUR
  ...

Coverage:
  {Group} | {Portal} | {method} | ✅/⛔ | {blocker if ⛔}
  ...

→ Run /immo-find pipeline to evaluate the new listings.
```
