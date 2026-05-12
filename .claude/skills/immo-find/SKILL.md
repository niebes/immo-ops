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
   a. Navigate to `search_url` via `mcp__claude-in-chrome__navigate`
   b. If CAPTCHA appears, ask user to solve it, then continue
   c. Read the extraction snippet from `scripts/portals/{portal}-cic.js`
   d. Run the snippet via `mcp__claude-in-chrome__javascript_tool` — returns JSON array
   e. Pipe the JSON to `node scripts/process-scan.mjs` which handles filtering, dedup, and writing:
      ```
      echo '<JSON from step d>' | node scripts/process-scan.mjs
      ```
4. **Close the tab** you created via `mcp__claude-in-chrome__tabs_close_mcp` (only your tab)
5. Show scan summary

**Available CiC extraction snippets:**
- `scripts/portals/immoscout24-cic.js` — ImmoScout24 (`.listing-card` containers)

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
Full automated cycle designed for `loop 1h /immo-find auto`. Runs all steps sequentially:

**Step 1 — Playwright scan:**
```
node scripts/scan.mjs
```
Capture stdout. Note how many new listings were added.

**Step 2 — CiC scan (ImmoScout24 and other `scan_method: cic` portals):**
1. Read `portals.yml` for CiC portals
2. If any CiC portals enabled:
   a. Create a new CiC tab (note the tabId)
   b. For each CiC portal: navigate → extract via JS snippet → pipe to `process-scan.mjs`
   c. Close your tab
3. Note how many new listings were added

**Step 3 — Pipeline triage:**
Read `data/pipeline.md`. For each pending `- [ ]` entry, check metadata against profile criteria:
- Rooms < min_rooms → mark as `DISCARDED`
- m² < min_m2 → mark as `DISCARDED`
- Price > max_kaltmiete × 1.2 → mark as `DISCARDED`
- Title contains Tauschwohnung keywords → mark as `DISCARDED`
Update `data/pipeline.md` in place.

**Step 4 — Notify:**
If new actionable listings were found (passed triage):
1. **Push notification** via `PushNotification` — short summary (under 200 chars):
   `immo-ops: {N} new in {city} (top: #{id} {location} {score}/5, {price}€, {m²}m²)`
2. **Email draft** via Gmail MCP — full HTML table with all listings, pro/con, color-coded.

If nothing new, skip both silently.

See **Notify mode** below for email format.

### Notify mode:
Two channels: push notification (instant, short) + email draft (detailed, for review).

**Config:** Read `searcher.notification_email` and `searches[0].location.city` from `config/profile.yml`.

**When to send:**
- In auto mode: only if new listings were found in this scan cycle
- Standalone `/immo-find notify`: always send current state

**1. Push notification** (always, when there are results):
```
PushNotification({
  message: "immo-ops: {N} new in {city} (top: #{id} {location} {score}/5, {price}€, {m²}m²)",
  status: "proactive"
})
```
Under 200 chars. Lead with count and top pick.

**2. Email draft** (detailed):

**What to include:** All scored listings from `data/pipeline.md` (max 50). Exclude DISCARDED and DUPE entries. Sort by score descending.

**Enrichment from reports:** For each listing with a report in `reports/`, read the `## Summary` section and extract:
- The bold assessment phrase (e.g., "Strong candidate, worth pursuing")
- Key pro: first positive point from the summary
- Key con: first concern after "However:" or "Main concerns:" or "Key concern:"
Include these as a second row under each listing in the table (smaller font, gray text).

**Email format:** HTML with `htmlBody` parameter. Use a table with columns: Score, Listing (linked to portal URL), Price, Size, Rooms. Color-code rows:
- Green background (`#e8f5e9`): score 3.5+ (worth pursuing)
- Yellow background (`#fff8e1`): score 3.0–3.4 (compromises)
- Red background (`#ffebee`): score below 3.0 (not recommended)
- White: no score yet

Below each listing row, add a detail row (same background, smaller gray text):
```
✓ {key pro}  ✗ {key con}
```
Only include the detail row if a report exists for that listing.

Subject: `immo-ops: {N} listing(s) in {city} — {current date and time from system clock, NEVER guessed}`

**RULE: Always get the current timestamp from the system (e.g., `new Date().toISOString()` or `date` command) before composing the email. Never hardcode or guess the time.**

Footer: count of discarded/duped listings, link to immo-ops repo.

**Implementation:**
```
mcp__claude_ai_Gmail__create_draft({
  to: ["{notification_email}"],
  subject: "immo-ops: {N} listing(s) evaluated in {city}",
  htmlBody: "{HTML table with all scored listings}"
})
```
