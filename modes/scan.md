# Mode: scan — Portal Scanner

Scans configured real estate portals, filters by search criteria and title keywords, deduplicates against history, and adds new listings to the pipeline for evaluation.

## Recommended Execution

Run as subagent to avoid consuming main context:

```
Agent(
    subagent_type="general-purpose",
    prompt="[content of this file + portals.yml + profile.yml + scan-history.tsv]",
    description="immo-scan",
    run_in_background=True
)
```

## Configuration

Read `portals.yml` which contains `search_groups` — one group per search target:
- Each group has a `name` matching a `searches[].name` in `config/profile.yml`
- `scan_defaults`: Default search parameters (city, price, rooms, size) for that target
- `portals`: List of portals with scan method, URL, rate limits
- `title_filter`: Positive/negative keyword filters specific to that target

Read `config/profile.yml` for active searches (used to match scan results against criteria).

**Multi-target scanning:** When scanning, either scan all groups or a specific one (user can specify). Each group's results are tagged with the search name and filtered independently using that group's defaults and title_filter.

**Enabled flag:** Both search groups (in portals.yml) and searches (in profile.yml) support `enabled: false` to skip them during scans. Default is `true` if omitted.

## Scan Strategy (2 levels)

### Level 1 — Playwright (PRIMARY)

For each portal with `scan_method: playwright` and `enabled: true`:

1. `browser_navigate` to the `search_url`
2. Handle cookie consent: click "Akzeptieren" / "Alle akzeptieren" / "Alle Cookies akzeptieren" button
3. Wait for results to load (some SPAs need 2–3 seconds)
4. `browser_snapshot` to read all visible listings
5. For each listing extract: `{title, url, price, m2, rooms, location}`
6. If pagination exists, navigate additional pages (max 5 pages per portal)
7. Respect `rate_limit` between page navigations

**Cookie consent patterns by portal:**
- ImmoScout24: "Alle akzeptieren" button in consent overlay
- Immowelt: "Alle akzeptieren" button
- Kleinanzeigen: "Alle akzeptieren" button
- Others: look for German consent text ("Akzeptieren", "Zustimmen", "Alle Cookies")

**Bot detection mitigation:**
- Respect `rate_limit` (seconds between requests)
- Don't navigate more than 5 pages per portal per scan
- If CAPTCHA detected: ask user to solve it manually in the browser tab, then resume. If user is unavailable, skip portal and note in scan summary.
- Portals with `captcha_risk: high` (e.g., ImmoScout24) should be scanned last — if they block, we still have results from other portals.

**Tauschwohnung pre-filter:**
German portals (especially ImmoScout24, Immowelt) are flooded with swap listings from tauschwohnung.com. These are NOT real rentals. Filter them early:
- Check title for: "Tauschwohnung", "Wohnungstausch", "Tausche", "gegen Wohnung"
- Check Anbieter for: "Tauschwohnung GmbH"
- Register filtered swaps in scan-history.tsv with status `skipped_title`
- Do NOT add them to pipeline

### Level 2 — WebSearch (DISCOVERY)

For each portal with `scan_method: websearch` and `enabled: true`:

1. Execute WebSearch with the `search_query`
2. Extract `{title, url, location}` from results
3. Results may be stale — verify with Playwright before adding to pipeline

**Priority:** Level 1 first, then Level 2. Results are merged and deduplicated.

## Workflow

1. **Read configuration**: `portals.yml`, `config/profile.yml`
2. **Read dedup sources**: `data/scan-history.tsv`, `data/listings.md`, `data/pipeline.md`

3. **Select search groups**: Scan all `search_groups` from portals.yml, or a specific one if the user requests it. Process each group sequentially.

4. **For each search group**, run Level 1 then Level 2:

   **Level 1 — Playwright scan** (sequential, one portal at a time):
   For each enabled portal with `scan_method: playwright`:
   a. Navigate to search URL
   b. Handle cookie consent
   c. Extract listings from results
   d. Paginate if needed (max 5 pages)
   e. Accumulate candidates

4. **Level 2 — WebSearch** (parallel if possible):
   For each enabled portal with `scan_method: websearch`:
   a. Execute search query
   b. Extract listing candidates
   c. For each new candidate from WebSearch, verify with Playwright that listing is still active

5. **AI title triage** (NOT a keyword filter):
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

6. **Filter by criteria** (HARD GATE — objective numbers only, reject before pipeline ingestion):
   Using `scan_defaults` from portals.yml AND `searches` from profile.yml:
   - Rooms: REJECT if rooms < `rooms_min` (default: 3). Non-negotiable.
   - Size: REJECT if m² < `size_min` (default: 60). Non-negotiable.
   - Price: REJECT if price > `price_max` (default: max_kaltmiete from profile). Non-negotiable.
   - Area: REJECT if location matches an excluded area.
   - If a field could not be extracted from the search result snippet, log a warning but still add to pipeline (better to over-include than silently drop).
   - Price sanity check: if price is >30% below typical area Mietspiegel, flag as suspicious — likely a coop rent, extraction error, or scam. Still add to pipeline but prepend "⚠ LOW PRICE" to the title.
   - NOTE: the scripts (`scan.mjs`, `process-scan.mjs`) apply ONLY these numeric gates + dedup — never a title keyword filter. Title relevance is the AI triage step above.

7. **Deduplicate** against 3 sources (URL-level, exact match):
   - `data/scan-history.tsv` → URL already seen. Check BEFORE appending — never write duplicate rows.
   - `data/listings.md` → URL already evaluated
   - `data/pipeline.md` → URL already in pending or processed
   A URL that already exists in ANY of these sources is a duplicate, regardless of which scan run or date it was first seen. Skip it entirely — do not re-append to scan-history.tsv.

8. **For each new listing that passes filters**:
   a. Add to `data/pipeline.md` under "Pending": `- [ ] {url} | {portal} | {search_group_name} | {title}`
   b. Register in `data/scan-history.tsv`: `{url}\t{date}\t{portal}\t{title}\t{location}\t{price}\t{m2}\t{rooms}\tadded`

9. **Filtered listings**: register in scan-history.tsv with status:
   - `skipped_criteria` — failed the objective price/size/area gate
   - `skipped_dup` — duplicate
   - `skipped_expired` — listing no longer active (WebSearch results)
   - `discarded_triage` — AI title triage judged it a non-fit (swap, garage, commercial,
     WBS, sublet, wrong city …); record the one-line reason in the row's title/status
   (There is no `skipped_title` status anymore — nothing is dropped by keyword.)

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
Portals scanned: {N}
Listings found: {N} total
Filtered out: {N} (title: {N}, criteria: {N})
Duplicates: {N} (already tracked or in pipeline)
Expired: {N} (WebSearch results no longer active)
New added to pipeline: {N}

  + {portal} | {title} | {location} | {price} EUR
  ...

→ Run /immo-find pipeline to evaluate the new listings.
```
