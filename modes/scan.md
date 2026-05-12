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

Read `portals.yml` which contains:
- `scan_defaults`: Default search parameters (city, price, rooms, size)
- `portals`: List of portals with scan method, URL, rate limits
- `title_filter`: Positive/negative keyword filters

Read `config/profile.yml` for active searches (used to match scan results against criteria).

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
- If captcha detected: skip portal, note in scan summary

### Level 2 — WebSearch (DISCOVERY)

For each portal with `scan_method: websearch` and `enabled: true`:

1. Execute WebSearch with the `search_query`
2. Extract `{title, url, location}` from results
3. Results may be stale — verify with Playwright before adding to pipeline

**Priority:** Level 1 first, then Level 2. Results are merged and deduplicated.

## Workflow

1. **Read configuration**: `portals.yml`, `config/profile.yml`
2. **Read dedup sources**: `data/scan-history.tsv`, `data/listings.md`, `data/pipeline.md`

3. **Level 1 — Playwright scan** (sequential, one portal at a time):
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

5. **Filter by title** using `title_filter` from portals.yml:
   - If `positive` list is non-empty: at least 1 keyword must appear (case-insensitive)
   - 0 keywords from `negative` may appear
   
6. **Filter by criteria** from profile.yml:
   - Price within range (if extractable from search results)
   - Room count meets minimum
   - Area not in excluded list

7. **Deduplicate** against 3 sources:
   - `data/scan-history.tsv` → URL already seen
   - `data/listings.md` → URL already evaluated
   - `data/pipeline.md` → URL already in pending or processed

8. **For each new listing that passes filters**:
   a. Add to `data/pipeline.md` under "Pending": `- [ ] {url} | {portal} | {title}`
   b. Register in `data/scan-history.tsv`: `{url}\t{date}\t{portal}\t{title}\t{location}\t{price}\t{m2}\t{rooms}\tadded`

9. **Filtered listings**: register in scan-history.tsv with status:
   - `skipped_title` — failed title filter
   - `skipped_criteria` — failed price/size/area criteria
   - `skipped_dup` — duplicate
   - `skipped_expired` — listing no longer active (WebSearch results)

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

→ Run /immo-ops pipeline to evaluate the new listings.
```
