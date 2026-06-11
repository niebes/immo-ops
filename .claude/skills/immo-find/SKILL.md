---
name: immo-find
description: Discover new listings — scan portals, process pipeline inbox, batch discovery
user_invocable: true
args: mode
argument-hint: "[scan | pipeline | batch | auto | notify]"
---

# immo-find — Discover Listings

## Mode Routing

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` — Show command menu |
| `scan` | `scan` — Scan all configured portals |
| `pipeline` | `pipeline` — Process pending URLs from inbox |
| `batch` | `batch` — Batch process multiple listings (delegates to /immo-assess) |
| `auto` | `auto` — Full automated cycle: scan → triage → notify |
| `notify` | `notify` — Send email summary of current pipeline state |

---

## Discovery Mode (no arguments)

```
immo-find — Discover Listings

  /immo-find scan       → Scan configured portals for new listings
  /immo-find pipeline   → Process pending URLs from data/pipeline.md
  /immo-find batch      → Batch evaluate multiple pending listings
  /immo-find auto       → Full cycle: scan → triage → notify (for /loop)
  /immo-find notify     → Send email summary of current pipeline

  Automated: /loop 1h /immo-find auto
  Pipeline:  data/pipeline.md (add URLs manually or via scan)
  Script:    npm run scan (headless Playwright for non-CiC portals)
```

---

## Context Loading

### Scan mode:
Read `modes/scan.md`. Load `portals.yml` + `config/profile.yml` + `data/scan-history.tsv`.

**Two scan methods** (determined by `scan_method` in portals.yml):

#### 1. Playwright portals (`scan_method: playwright`)
Run headlessly via script: `node scripts/scan.mjs`
Can run in background, unattended. Handles Immowelt, Kleinanzeigen, Vonovia, etc.

#### 2. CiC portals (`scan_method: cic`)
Scanned interactively via Claude-in-Chrome using the user's real browser.
Required for portals with aggressive bot detection (ImmoScout24).

**CiC tab management:**
ALWAYS create a dedicated tab for CiC scanning via `tabs_create_mcp`. Never reuse existing tabs. When done, close only the tab(s) you created via `tabs_close_mcp` — never close tabs you didn't create.

**CiC scan workflow:**
1. Read `portals.yml` for all portals with `scan_method: cic` and `enabled: true`
2. **Create a new CiC tab** via `mcp__claude-in-chrome__tabs_create_mcp` — note the tabId
3. For each CiC portal:
   a. Navigate to `search_url` via `mcp__claude-in-chrome__navigate` (URL should include `&sorting=2` for newest first)
   b. If CAPTCHA appears ("Ich bin kein Roboter"): wait 5-10 seconds, then re-check — most CAPTCHAs auto-solve. Only ask user if still blocked after waiting.
   c. **Pagination loop** (up to 100 listings total):
      - Read the extraction snippet from `scripts/portals/{portal}-cic.js`
      - Run the snippet via `mcp__claude-in-chrome__javascript_tool` — returns `{count, total, hasNextPage, listings}`
      - Pipe the listings JSON to `node scripts/process-scan.mjs`
      - Check process-scan output: if most listings are duplicates (≥80% already seen), stop paginating
      - If `hasNextPage` is true and under 100 total: click "Nächste Seite" via `mcp__claude-in-chrome__find` or navigate to `search_url&pagenumber={N}`
      - Repeat
4. **Close the tab** you created via `mcp__claude-in-chrome__tabs_close_mcp` (only your tab)
5. Show scan summary

**Available CiC extraction snippets:**
- `scripts/portals/immoscout24-cic.js` — ImmoScout24 (`.listing-card` containers, returns pagination info)

**Combined scan order:**
1. First: run `node scripts/scan.mjs` for Playwright portals (can be backgrounded)
2. Then: scan CiC portals interactively
3. Show combined summary

### Pipeline mode:
Read `modes/_shared.md` + `modes/pipeline.md`.
If 3+ pending URLs: delegate to subagent.

### Batch mode:
Read `modes/_shared.md` + `modes/batch.md`.
Delegates individual evaluations to /immo-assess.

### Auto mode (for `/loop` usage):
Full automated cycle designed for `loop 1h /immo-find auto`. The purpose is to deliver scored, actionable recommendations — not raw links. Every step must complete before notifying.

**Step 1 — Playwright scan:**
```
node scripts/scan.mjs
```
Capture stdout. Note how many new listings were added.

**Step 2 — CiC scan (ImmoScout24 and other `scan_method: cic` portals):**
1. Read `portals.yml` for CiC portals
2. If any CiC portals enabled:
   a. Create a new CiC tab (note the tabId)
   b. For each CiC portal: navigate → extract via JS snippet → pipe to `process-scan.mjs` (paginate all pages, up to 100)
   c. Close your tab
3. Note how many new listings were added

**Step 3 — Pipeline triage (metadata-only discard):**
Read `data/pipeline.md`. For each pending `- [ ]` entry, check metadata against profile criteria:
- Rooms < min_rooms → mark as `DISCARDED`
- m² < min_m2 → mark as `DISCARDED`
- Price > max_kaltmiete × 1.2 → mark as `DISCARDED`
- Title contains Tauschwohnung keywords → mark as `DISCARDED`
- Location is wrong city → mark as `DISCARDED`
- Price suspiciously low (likely extraction error) → mark as `DISCARDED`
Update `data/pipeline.md` in place.

**Step 4 — Pipeline evaluation (ALL pending listings):**

First, check which pending URLs already have reports (cross-reference `data/pipeline.md` URLs against `reports/*.md`). Skip those — mark as processed with the existing score.

For EVERY remaining pending URL that has NO report yet, launch a dedicated Agent:

```
Agent(
  subagent_type="general-purpose",
  prompt="You are evaluating a real estate listing for immo-ops.

LISTING URL: {url}

Read these files for context:
- config/profile.yml — search criteria (max Kaltmiete 1500, min 60m², min 3 rooms, must-haves: balkon_or_terrasse + keller)
- modes/_shared.md — scoring system (8 blocks A-H, weighted average)
- modes/evaluate.md — full evaluation workflow and report format

STEPS:
1. Create a CiC tab via mcp__claude-in-chrome__tabs_create_mcp
2. Navigate to the listing URL
3. If CAPTCHA: report it and stop. If 'Angebot nicht gefunden': mark as EXPIRED and stop.
4. Extract ALL details via javascript_tool (use the extraction snippet pattern from the codebase)
5. Detect Tauschwohnung → if yes, mark as DISCARDED and stop
6. Score all 8 blocks (A-H) with numeric scores and one-line justification per block
7. Write report to reports/{NNN}-{location-slug}-{rooms}r-{date}.md
8. Write tracker TSV to batch/tracker-additions/{NNN}-{slug}.tsv
9. Close your CiC tab (only the tab you created)
10. Report back: {URL} | {score}/5 | {one-line summary}

Next listing number: {NNN}
",
  description="immo-assess {expose_id}"
)
```

Launch agents **one at a time** (CiC tabs can't run in parallel — each agent needs exclusive browser access). Wait for each agent to complete before launching the next.

After all agents complete: `node scripts/merge-tracker.mjs`

**Step 5 — Verification (MUST pass before notify):**
Before sending any notification, verify:
- [ ] All enabled portals have been scanned (no portal skipped without reason)
- [ ] Pipeline has 0 pending `- [ ]` entries (all evaluated or discarded)
- [ ] `node scripts/verify-pipeline.mjs` passes

If verification fails, DO NOT notify. Instead report the failure and stop.

**Step 6 — Notify:**
Only after verification passes:
1. **Push notification** via `PushNotification` — short summary (under 200 chars):
   `immo-ops: {N} new — {counts per target} (top: #{id} {score}/5)`
2. **Email draft** via Gmail MCP — HTML with sections per search target, tables with scored listings, pro/con, color-coded.

If no new listings were found in this cycle, skip both silently.

See **Notify mode** below for email format.

### Notify mode:
Two channels: push notification (instant, short) + email draft (detailed, for review).

**Config:** Read `searcher.notification_email` and all `searches[]` entries from `config/profile.yml`.

**When to send:**
- In auto mode: only if new listings were found in this scan cycle
- Standalone `/immo-find notify`: always send current state

**1. Push notification** (always, when there are results):
```
PushNotification({
  message: "immo-ops: {N} new — {counts per target, e.g. '3 Miete, 2 Haus, 1 Grundstück'} (top: #{id} {score}/5)",
  status: "proactive"
})
```
Under 200 chars. Lead with total count, break down by target, mention top pick.

**2. Email draft** (detailed):

**What to include:** Scored listings from `data/pipeline.md` with score ≥ 3.0 (max 50). Exclude DISCARDED, DUPE, and sub-3.0 entries — these are not actionable and waste the reader's attention. Sort by score descending within each section. Mention the count of excluded sub-3.0 listings in the footer.

**Enrichment from reports:** For each listing with a report in `reports/`, read the `## Summary` section and extract:
- The bold assessment phrase (e.g., "Strong candidate, worth pursuing")
- Key pro: first positive point from the summary
- Key con: first concern after "However:" or "Main concerns:" or "Key concern:"
Include these as a second row under each listing in the table (smaller font, gray text).

**Email structure — grouped by search target:**

Header block (before the sections):
- `<h1 style="border-bottom:2px solid #1a73e8;padding-bottom:8px">immo-ops scan results</h1>`
- Subtitle `<p style="color:#666">`: `{timestamp} • {N} new listings evaluated • {M} scoring 3.0+`
- Scan note `<p style="color:#888;font-size:12px">`: which portals were scanned (Playwright vs browser), which search groups are disabled, anything skipped (CAPTCHA etc.)

The email body is organized into sections, one per search target from `config/profile.yml`. Each section has a header and its own table.

**Section header:** `<h2 style="font-size:16px;border-bottom:2px solid #2e7d32;padding-bottom:4px">` with emoji, search name, and a gray count badge:
```html
<h2 ...>🏢 Berlin flat rental <span style="font-size:12px;color:#777;font-weight:normal">(Miete / Wohnung · {N} listings)</span></h2>
```
- `🏠` house purchase (Kauf/Haus), `🏢` flat rental (Miete/Wohnung), `🌳` plot purchase (Kauf/Grundstück)
- Active section with zero scored listings: show header with "(no listings yet)", skip the table
- **Disabled search groups: still show the header**, grayed out — border `#bbb`, `color:#888`, badge text `(disabled)` — so the reader sees the full search scope at a glance

**Matching listings to sections:** Use the search group tag from the pipeline entry (added during scan). For older pipeline entries without a tag, infer from listing type (miete/kauf) and property type (wohnung/haus/grundstück) based on the report or URL.

**Table format per section:** HTML with `htmlBody` parameter. Columns: #, Score, Listing (linked to portal URL), Price, Size, Rooms. The # column shows the listing number from the tracker. Score is `<b>{score}</b>` without "/5" (e.g. `<b>4.6</b>`). Header row: `#f0f0f0` background, all cells `border:1px solid #ddd`.

**Listing cell:** linked short descriptive title, portal name inline after the link in gray:
```html
<a href="{url}" target="_blank">{short title — area}</a> <span style="color:#777">({Portal})</span>
```

Color-code rows:
- Green background (`#e8f5e9`): score 3.5+ (worth pursuing)
- Yellow background (`#fff8e1`): score 3.0–3.4 (compromises)
- Red background (`#ffebee`): score below 3.0 (not recommended)
- White: no score yet

**CRITICAL — Gmail strips row-level styles in the draft composer.** Set the background on EVERY cell, not just the row, and use both the legacy attribute and inline style. The `bgcolor` attribute survives every email sanitizer:
```html
<tr bgcolor="#e8f5e9" style="background-color:#e8f5e9">
  <td bgcolor="#e8f5e9" style="padding:6px;border:1px solid #ddd;background-color:#e8f5e9">...</td>
  ...
</tr>
```
All styles inline on the elements — do not rely on a `<style>` block alone (stripped by Gmail).

**Price column adapts to type:**
- Miete: Kaltmiete and Warmmiete on two lines — `{KM} KM<br><span style="color:#777">~{WM} WM</span>`. If WM is estimated or a range, say so (`~1.830 WM est.`). Use German number format with `€` or bare numbers + KM/WM, never "EUR".
- Kauf/Haus: show Kaufpreis
- Kauf/Grundstück: show Kaufpreis + price/m²

Below each listing row, add a detail row (same `bgcolor`/background on the cell, `font-size:11px;color:#555`):
```
✓ {key pro}  ✗ {key con}
```
Only include the detail row if a report exists for that listing.

Subject: `immo-ops: {N} listing(s) — {summary, e.g. '5 Miete, 2 Haus, 1 Grundstück'} — {current date and time from system clock, NEVER guessed}`

**RULE: Always get the current timestamp from the system (e.g., `new Date().toISOString()` or `date` command) before composing the email. Never hardcode or guess the time.**

Footer (`<p style="margin-top:18px;font-size:12px;color:#777">`): excluded sub-3.0 listings with ID, score, and one-line reason (e.g. `#117 (2.5/5 — stale Bestandsmiete price fiction)`); discarded/duped counts per section; reports path (e.g. `reports/113–121-*.md`); link to immo-ops repo.

**Implementation:**
```
mcp__claude_ai_Gmail__create_draft({
  to: ["{notification_email}"],
  subject: "immo-ops: {N} listing(s) — {type breakdown} — {timestamp}",
  htmlBody: "{HTML with one section + table per search target}"
})
```
