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
  Script:    npm run scan (headless Playwright portals)
  First run: npm run login:invisible — seed stealth-browser trust ONCE, or the
             bot-protected portals (IS24, Kleinanzeigen, …) will stay blocked
```

---

## Context Loading

### Scan mode:
Read `modes/scan.md` — the **single source of truth** for scan execution: methods, CAPTCHA doctrine (wait 5–10 s in the trusted browser before involving the user), pagination (≥80%-seen early-stop, no page cap), failure routing via `data/scan-failures.json`, and the mandatory coverage report. Load `portals.yml` + `config/profile.yml` + `data/scan-history.tsv`.

**Routing by `scan_method`** (details in `modes/scan.md`):

#### 1. Playwright portals (`scan_method: playwright`)
Run headlessly via script: `node scripts/scan.mjs`. Can run in background, unattended.

#### 2. Bot-protected portals (`scan_method: invisible-playwright`) — stealth-first, three tiers
These portals block fresh/headless browsers. Try three transports **in this order — CiC over the debug Chrome is the LAST resort**:

**Tier 1 — invisible (DEFAULT, automated):**
```
npm run login:invisible             # ONE-TIME: seed session trust (headful stealth Firefox login)
node scripts/scan.mjs --invisible   # scan all enabled scan_method: invisible-playwright portals → process-scan
```
Vendored stealth Firefox, fully self-contained — no external browser needed. This is the default automated pass; it records a ⛔ failure in `data/scan-failures.json` for any portal it can't clear.

**Tier 2 — invisible-playwright MCP (Claude-driven stealth):** the SAME stealth Firefox driven by hand via `mcp__invisible-playwright__*` (navigate_page → clear whatever blocks it → run the portal's `{slug}-extract.js` snippet via `evaluate_script` → pipe the `{c,n,p,L}` to `process-scan.mjs`). Use for portals Tier 1 could not clear (unexpected interstitial, a step needing judgement).

**Tier 3 — CiC over CDP (LAST RESORT):**
```
npm run chrome:immo          # start the dedicated debug Chrome (idempotent)
node scripts/scan.mjs --debug-chrome  # scan the still-unprocessed scan_method: invisible-playwright portals
```
Only when BOTH stealth tiers fail for a portal. Interactive Claude-in-Chrome (the `javascript_tool`/tab workflow below) is a further fallback if even the debug Chrome is unavailable. Full flow + security notes: `docs/cic-cdp-scan.md`.

#### 3. Websearch portals (`scan_method: websearch`)
NOT implemented in `scan.mjs` — the agent runs these itself: WebSearch with the portal's `search_query`, verify candidates are still active, feed survivors through triage → `process-scan.mjs`. Procedure: `modes/scan.md` "websearch". Because no script accounts for them, they MUST appear in the coverage report every run.

**Interactive Claude-in-Chrome tab management (Tier 3 further fallback only):**
ALWAYS create a dedicated tab for this via `tabs_create_mcp`. Never reuse existing tabs. When done, close only the tab(s) you created via `tabs_close_mcp` — never close tabs you didn't create.

**Interactive Claude-in-Chrome workflow (Tier 3 further fallback — use only when both stealth tiers AND the debug Chrome are unavailable):**
1. Read `portals.yml` for all portals with `scan_method: invisible-playwright` and `enabled: true`
2. **Create a new CiC tab** via `mcp__claude-in-chrome__tabs_create_mcp` — note the tabId
3. For each CiC portal:
   a. Navigate to `search_url` via `mcp__claude-in-chrome__navigate` (URL should include `&sorting=2` for newest first)
   b. If CAPTCHA appears ("Ich bin kein Roboter"): wait 5-10 seconds, then re-check — most CAPTCHAs auto-solve. Only ask user if still blocked after waiting.
   c. **Pagination loop** (up to 100 listings total):
      - Read the extraction snippet from `scripts/portals/{portal}-extract.js`
      - Run the snippet via `mcp__claude-in-chrome__javascript_tool`. It returns a **compact wrapper** `{c, n, [total,] [p,] L}` — `c`=count, `n`=hasNextPage, `p`=url-prefix (present when field-0 is a bare id), `L`=positional rows `[idOrUrl, price, m2, rooms, title, location]`.
      - Pipe that same string to process-scan with the portal + prefix flags (process-scan unwraps `L` and rebuilds each URL from `p`):
        - IS24 / IS24 Haus: `node scripts/process-scan.mjs --portal "ImmoScout24" --url-prefix "https://www.immobilienscout24.de/expose/"` (use `--portal "ImmoScout24 Haus"` for houses — same snippet)
        - eBay: `--portal "eBay.de Grundstücke" --url-prefix "https://www.ebay.de/itm/"`
        - Regionalimmobilien24: `--portal "Regionalimmobilien24"` (no `--url-prefix` — field 0 is the full URL)
      - **Transport**: the compact form exists because the `javascript_tool` return display truncates ~1 KB; it cuts a 20-listing page ~2× so it crosses in 1–2 slices. If a page still overflows, pull `window.__J` in ≤900-char `.slice(a,b)` windows and reassemble (single-line JSON → index-exact concat; verify total length). Do NOT rely on Blob `<a download>`: Chrome drops every automatic download after the FIRST per browser session (allow-listing the origin did NOT fix it — see `[[reference-cic-download-block]]`). base64 output from `javascript_tool` is hard-blocked.
      - Check process-scan output: if most listings are duplicates (≥80% already seen), stop paginating
      - If `hasNextPage` (`n`) is true and under 100 total: click "Nächste Seite" via `mcp__claude-in-chrome__find` or navigate to `search_url&pagenumber={N}`
      - Repeat
4. **Close the tab** you created via `mcp__claude-in-chrome__tabs_close_mcp` (only your tab)
5. Show scan summary

**Available CiC extraction snippets:**
- `scripts/portals/immoscout24-extract.js` — ImmoScout24 (`.listing-card` containers, returns pagination info)
- `scripts/portals/ebay-extract.js` — eBay.de Grundstücke (`.s-card` containers; skips the "Shop on eBay" placeholder ad; single-page for the Brandenburg search). Returns pagination info.
- `scripts/portals/semmelhaack-extract.js` — Semmelhaack (`.objekt-single-data` cards, `.label`/`.value` rows; single-page, ~53 nationwide listings). CiC fallback for when Playwright hits the CAPTCHA.

**Combined scan order:**
1. First: run `node scripts/scan.mjs` for Playwright portals (can be backgrounded)
2. Read `data/scan-failures.json` — route Playwright failures: `fallback: "invisible-playwright"` portals join the bot-protected (stealth) pass below (if a snippet exists); everything else becomes a ⛔ coverage item (see the Coverage report RULE).
3. Then: scan bot-protected portals (registered CiC portals + bot-defense fallbacks from step 2), stealth-first: **Tier 1** `node scripts/scan.mjs --invisible` (default); escalate portals it couldn't clear to **Tier 2** (`mcp__invisible-playwright__*`); use **Tier 3** `node scripts/scan.mjs --debug-chrome` (debug Chrome) only as a last resort.
4. Then: run the AI-executed pass for every enabled `scan_method: websearch` portal (see the routing section above / `modes/scan.md`).
5. Show combined summary, including the coverage report accounting for EVERY enabled portal of ALL three methods — playwright, cic, and websearch — with the exact blocker for each ⛔ entry

### Pipeline mode:
Read `modes/_shared.md` + `modes/pipeline.md`.
If 3+ pending URLs: delegate to subagent.

### Batch mode:
Read `modes/_shared.md` + `modes/batch.md`.
Delegates individual evaluations to /immo-assess.

### Auto mode (for `/loop` usage):
Full automated cycle designed for `loop 1h /immo-find auto`. The purpose is to deliver scored, actionable recommendations — not raw links. Every step must complete before notifying.

**RULE — `scan auto` ALWAYS runs the FULL scan (Playwright Step 1, the bot-protected stealth pass Step 2, AND the websearch pass Step 2b), every time, unless the user explicitly scopes it down in their request.** The bot-protected pass — every enabled `scan_method: invisible-playwright` portal in `portals.yml`, plus any `fallback: "invisible-playwright"` portals from Step 1b — is NOT optional and NOT deferrable; the same goes for enabled `scan_method: websearch` portals. "I'll flag the bot-protected portals and run them next time" is a FAILURE, not an acceptable outcome — a coverage gap is something you CLOSE by doing the run, not something you merely report. The only acceptable reasons to skip the bot-protected pass are: (a) the user explicitly asked for Playwright-only / a named subset, or (b) session-mode is remote and CiC is disabled (then surface it as ⛔ and stop before notifying). Mid-cycle interruptions (config edits, adding a portal, answering a question) do NOT cancel the remaining steps — resume and finish the full run before notifying.

**Step 1 — Playwright scan:**
```
node scripts/scan.mjs
```
Capture stdout. Note how many new listings were added.

**Step 1b — Read the failure-routing signal (`data/scan-failures.json`):**
`scan.mjs` writes this file every run (empty `failures: []` on a clean run). It is the source of truth for what Playwright could NOT process and what to do about it. For each entry:
- `fallback: "invisible-playwright"` (e.g. CAPTCHA, 403, bot-block) → the site is reachable but blocks headless. **Add this portal to the bot-protected (stealth) pass for Step 2** IF a CiC extractor snippet exists for it. If `action` says no snippet exists → it is a ⛔ coverage item: report it and recommend building one via `/immo-portal`. Do NOT silently drop it.
- `fallback: "reconfigure"` (e.g. no search_url, login wall) → not transient. Surface as ⛔ and recommend `/immo-portal`; do not retry blindly.
- `fallback: "retry"` (transient timeout) → note it; it should clear next cycle.

**Step 2 — Bot-protected scan (MANDATORY — every enabled `scan_method: invisible-playwright` portal, plus Playwright bot-defense fallbacks from Step 1b):**
This step always runs when any such portal is enabled. Do not skip, defer, or substitute "flag for next time" (see the FULL-scan RULE above).
1. Read `portals.yml` for `scan_method: invisible-playwright` portals; add any `fallback: "invisible-playwright"` portals from Step 1b that have a snippet.
2. Scan them **stealth-first** per the three-tier section above: **Tier 1** `node scripts/scan.mjs --invisible` (default) → **Tier 2** `mcp__invisible-playwright__*` for portals it couldn't clear → **Tier 3** `node scripts/scan.mjs --debug-chrome` (debug Chrome) as last resort. Do not re-derive the selection here.
3. Note how many new listings were added. Any `fallback: "invisible-playwright"` portal WITHOUT a snippet remains a ⛔ coverage item.

**Step 2b — Websearch portals (part of the FULL scan):**
For every enabled `scan_method: websearch` portal, run the AI-executed pass (see routing section 3 above / `modes/scan.md`). These portals count toward coverage exactly like the scripted ones — an unrun websearch portal is a ⛔ coverage item, never a silent omission.

**Step 2c — Route re-lists of already-decided flats (`node scripts/route-decided.mjs`):**
Run this BEFORE triage. The same physical flat re-lists constantly across portals under
new IDs/prices, and URL dedup can't see it. This script matches each pending entry against
`data/listings.md` tracker rows the user has already DECIDED on and auto-routes the match by
its status (`lib/decided-index.mjs`):
- `Rejected` / `Discarded` / `Accepted` → **auto-skip** (moved to Processed as `DUPE of #N`,
  never evaluated — a re-list must not undo a viewing decision).
- `Interested` / `Swap-candidate` / `Contacted` / `Viewing` / `Viewed` / `Applied` →
  **auto-attach** to that live lead (`DUPE of #N`); the lead's follow-through in
  `next-actions.mjs` handles it (e.g. "contacted, awaiting reply → overdue").
- `Expired` is deliberately NOT routed — a re-list of an expired flat means it is back on the
  market and SHOULD be re-evaluated.
- **Identity folds:** when the twin is only `Evaluated` but the evidence is *identity* — the same
  unit code (`H4-00-02`-style, printed in new-build titles) or a title already folded into that
  row as `DUPE of #N` — and the price is unchanged (Δ ≤ 2 %), the entry is folded as
  `DUPE of #N (… already scored; unit|title match)` instead of being re-evaluated. A different
  unit code is a hard veto, so sibling units of one building never weld onto each other. A price
  move keeps the entry pending (a price cut deserves a fresh score).
It also appends the candidate URL to the tracker row's Notes as a "re-list seen" alias so URL
dedup catches that URL next time. What it still leaves pending ("Best match is a non-decided
row") is numeric-only evidence — judge those in triage. This is why per-listing state belongs in the **tracker
status**, never in memory: mark a flat once, and every future re-appearance folds in here.
Matching reuses the `dedup-core` thresholds (price Δ<5% + m² Δ≤3, rooms-equal when the
Ortsteil is unknown, hard veto on KNOWN-different neighbourhoods) but — unlike batch dedup —
allows same-portal matches (a flat re-lists on the same portal too). Note what it routed in
the coverage summary.

**CAUTION — false auto-skip of a NEW swap.** Route-decided can wrongly `SKIP (DUPE of #N
[Discarded])` a genuinely new **Tauschwohnung** when #N is an OLD swap discarded *before*
`include_swaps: true` was enabled (2026-07-05) — i.e. discarded only because swaps were off
then. It misfires because Kleinanzeigen swap entries often carry only `PLZ + Potsdam` in the
location field (the Ortsteil lives in the TITLE), so the "known-different-neighbourhood" veto
can't fire and a numeric match wins across different Ortsteile. **After running route-decided,
eyeball any `SKIP … DUPE of #N [Discarded]` where the candidate is a swap**: read the TITLE's
Ortsteil vs #N's, and if they differ or #N's discard reason is legacy "Wohnungstausch
required"/pre-2026-07-05, **override** — flip the pipeline line back to `- [ ]`, evaluate it as
a swap (two-sided match), and strip the bogus `[re-list seen …]` alias route-decided appended
to #N's Notes. (Seen 2026-07-31: a Golm swap wrongly skipped as dupe of the Bornstedt #004.)

**CAUTION — false ATTACH to the wrong live lead (structural, hits every cycle).** Route-decided
only considers rows whose status is DECIDED; `Evaluated` is deliberately not routable. So when a
re-list's true twin is an `Evaluated` row, route-decided does not stop — it attaches the entry to
the next-best *decided* row that happens to clear the numeric thresholds. The result is worse
than no routing: a re-list gets welded onto an unrelated **Applied/Contacted** lead and an alias
is appended to that lead's Notes. **After running route-decided, sanity-check every
`ATTACH (numeric)` against the candidate's TITLE, not just its numbers** — compare it to the
target report's `# Evaluation:` heading. If a different (Evaluated) listing matches the title
exactly, override: re-point the pipeline line at that listing and strip the bogus
`[re-list seen …]` alias from the wrongly-attached row's Notes.
(Seen 2026-08-03: an Ab-ins-Zuhause re-list of #502 "Willkommen Zuhause: großzügige
3-Zimmer-Wohnung" — price Δ 0,01 %, m² Δ 0,28 — was attached to the **Applied** #216 instead,
because #502 is only `Evaluated`. #216 differs by 3,4 % price and 2,5 m², inside the thresholds.)

**Step 3 — Pipeline triage (AI judgement, not keyword matching):**
The scan scripts apply ONLY objective numeric gates + dedup — they never drop by title.
So this triage is where title relevance is decided, by reading each entry. Read
`data/pipeline.md`; for each pending `- [ ]` entry, judge title + metadata and mark
`DISCARDED` (with a one-line reason) when it is clearly not a real, on-target rental:
- Rooms < min_rooms, or m² < min_m2, or Price > max_kaltmiete × 1.1 (objective — same grace band the scripts apply; ONE threshold everywhere)
- Apartment **swap** — only when NO enabled search sets `include_swaps: true`. When
  swaps are enabled they are KEPT for the two-sided match, with one exception: the
  **swap direction prefilter** (discard when the listing's *stated* Suche asks for more
  rooms/m² than any enabled `swap_offer` flat has). That prefilter is AI judgement over
  numbers the lister wrote down — **never keyword matching** — and silence or vagueness
  means KEEP. Full rule + guardrails: `modes/scan.md` step 7 (SSOT); do not restate them
  here.
- **Time-limited** sublet — "Zwischenmiete / befristet / auf Zeit" (open-ended Untermiete
  is fine)
- **WBS-required** without the user holding a WBS
- A **garage/parking space or commercial unit** that is the object itself — judge from the
  title, do NOT discard a home that merely HAS a garage/Stellplatz ("DHH mit … Garage" is
  a house). This is exactly the ambiguity keyword filters got wrong (expose 168836565).
- Wrong city, or price so low it's an extraction error
When unsure, KEEP it — evaluation catches what triage misses (favour recall). The
`title_filter` lists in portals.yml are an advisory checklist for this step, not a gate.
Update `data/pipeline.md` in place.

**Step 4 — Pipeline evaluation (ALL pending listings):**

First, check which pending URLs already have reports (cross-reference `data/pipeline.md` URLs against `reports/*.md`). Skip those — mark as processed with the existing score.

For EVERY remaining pending URL that has NO report yet, launch the dedicated **`immo-evaluator`** subagent. It is the specialist: it carries the full evaluation procedure, the report format, and — via its own memory (`.claude/agent-memory/immo-evaluator/`) — the per-portal page quirks, so it does NOT need to be re-taught them. Keep the prompt THIN — pass only the per-listing variables:

```
Agent(
  subagent_type="immo-evaluator",
  description="immo-assess {expose_id}",
  prompt="LISTING URL: {url}
Portal: {portal}
Next report number: {NNN}
Work dir: tmp/eval/{NNN}/
Parallel: {yes|no}
Search-result metadata: {title, price, m², rooms from the pipeline entry}

Evaluate per your standing instructions; write report #{NNN}, tracker TSV, and the staged pipeline update; reply in your Return format (≤ 4 lines)."
)
```

Assign every report number before launching anything. Each worker then owns exactly `#{NNN}`, `tmp/eval/{NNN}/` and its `{NNN}`-named output files, so no two workers ever share a path.

Pass the search-result metadata as an unverified **hint only** — it can be stale (listers edit titles). Do NOT assert a consequential label (e.g. "Untermiete", "möbliert", "Zwischenmiete", "sublet") in the prompt as fact; let the evaluator read the live page and decide. (A stale "Untermiete" title once produced a bogus sublet report — see `modes/evaluate.md` "Trust the LIVE listing".)

Do NOT restate the steps, file paths, scoring rules, number format, or portal quirks in the prompt — they live in the agent definition, `modes/evaluate.md`, and the agent's memory. (If `immo-evaluator` is unavailable, fall back to `general-purpose` and inline the `modes/evaluate.md` Browser & portal quirks + workflow.)

**Concurrency — serialize only what actually needs a browser.** The constraint is the shared browser (CiC tabs and the single stealth-Firefox context can't be driven by two agents at once), NOT evaluation itself. Most evaluations no longer touch a browser: ImmoScout24 answers fully on `api.mobile.immobilienscout24.de/expose/{id}` and Kleinanzeigen detail pages render server-side, so both are plain `curl` (6 of 10 evaluations in the 2026-08-09 cycle needed no browser at all). So:

- **Curl-only portals — ImmoScout24 (incl. ImmoScout24 Haus) and Kleinanzeigen — and driver-script portals — Immowelt: launch in parallel** with `Parallel: yes`, several agents in one message. `Parallel: yes` tells the worker it gets no shared browser and no direct memory edits; Immowelt workers each spawn their own read-only stealth-driver process (`IP_SAVE_STATE=false`). Keep at most **3 Immowelt workers** running at once (one site, one IP). A worker that finds it genuinely needs a browser returns `NEEDS-BROWSER` without writing output; re-run that listing later with `Parallel: no` (same `{NNN}`).
- **Browser-bound portals — Vonovia, aggregators that redirect to a source page (Süddeutsche, Regionalimmobilien24, Ab ins Zuhause), eBay, anything unknown: strictly one at a time**, with `Parallel: no`. Wait for each to finish before launching the next, and do not overlap one with a parallel batch.
- **Workers share no writable file.** Each writes only its own report, `batch/tracker-additions/{NNN}-*.tsv`, `batch/pipeline-updates/{NNN}.json`, `tmp/eval/{NNN}/` and (in parallel mode) `batch/memory-inbox/{NNN}-*.md`. Nobody but the orchestrator's serial steps below writes `data/listings.md`, `data/pipeline.md` or the evaluator memory. Keep it that way: if you ever need a new shared output, stage it per-`{NNN}` and merge it serially. Don't let workers edit one file together.

After all agents complete, run these serially:
1. `node scripts/merge-tracker.mjs`: merges the tracker TSVs AND applies the staged pipeline updates. A file it keeps with a warning needs fixing.
2. If `batch/memory-inbox/` holds notes, OR `node scripts/verify-pipeline.mjs` warns that an evaluator memory file is over 60 KB: launch ONE `immo-evaluator` with the prompt `MEMORY CONSOLIDATION` (add "compact {files} to ≤ 60 KB, split by topic if needed" when the size warning fired), and wait for it. It's the only memory writer during that pass. The consolidation is not on the notify path — it may run in the background while you build the email, but never alongside evaluators.

**Step 5 — Verification (MUST pass before notify):**
Before sending any notification, verify:
- [ ] **Every enabled portal — Playwright, CiC, AND websearch — was actually scanned this cycle.** An enabled CiC or websearch portal that was not run is a verification FAILURE, not a reportable gap. Do NOT proceed to notify by "flagging it for next time" — go back and run Step 2 / Step 2b. The only pass-through exceptions are a portal genuinely blocked this run (CAPTCHA after retry, login wall, remote session-mode disabling CiC) — those, and only those, become ⛔ coverage items.
- [ ] `data/scan-failures.json` reviewed: every `fallback: "invisible-playwright"` portal WITH a snippet was actually scanned in the bot-protected pass (Step 2); every remaining failure (no snippet / reconfigure / retry) is accounted for in the coverage report
- [ ] Pipeline has 0 pending `- [ ]` entries (all evaluated or discarded)
- [ ] `node scripts/verify-pipeline.mjs` passes

If verification fails, DO NOT notify. Complete the missing work (e.g. run the bot-protected pass) and re-verify; only stop-and-report if something is genuinely blocked and cannot be completed this run.

**Step 5b — Follow-through (the act-phase watchdog):**
The scan finds flats; this step makes sure found flats don't rot. It exists because a fully-prepared application (#216) once sat unsubmitted for 6 days after an "apply same day" viewing and nothing noticed.
1. Run `node scripts/next-actions.mjs --json --fix > tmp/next-actions.json` (stdout is pure JSON; the human report goes to stderr — `build-email.mjs --actions` reads this file). `--fix` applies the only mechanically safe advance — `Viewing → Viewed` once a Confirmed viewing's date has passed. Everything else is recommend-only; notably it NEVER marks anything `Applied` (an unsubmitted application is exactly the failure this step exists to catch).
2. Keep the JSON's `overdue`/`dueSoon` items for Step 6 — overdue items go at the TOP of the email and lead the push message.
3. Run `node scripts/prune-pipeline.mjs` (pipeline section hygiene + bounded growth; add `--history` on the first run of a month).

**Do NOT run a liveness sweep.** The JSON's `livenessQueue` (and the `--mark-verified` mechanism) is deliberately ignored: re-checking old `Evaluated` exposés nobody is actively pursuing is wasted work (~10 browser navigations/cycle) — those listings age out on their own and nobody cares whether a months-old `Evaluated` link is still live. Only listings on a live action path (`overdue`/`dueSoon` in the JSON, i.e. Contacted/Viewing/Applied leads) matter, and those are handled in step 2 above. Removed 2026-07-29 per user.

**RULE — Coverage report (ALWAYS, every scan/auto run):**
Walk EVERY *enabled* portal across ALL search groups in `portals.yml` — **all three methods: playwright, cic, and websearch** — and account for each one. Websearch portals are the easiest to silently skip (no script runs them), so they get explicit rows like everything else. The chat summary and the email scan-note MUST explicitly list every enabled-but-not-processed entry and the exact blocker. Never silently omit a blocked portal. Disposition categories (ignore `enabled: false` portals — do NOT list disabled rows):
- ✅ **scanned** (with new/seen count)
- ⛔ **not processed** — an enabled portal that did not get scanned. ALWAYS state the blocker: CAPTCHA, missing extractor snippet, 403/bot-block, timeout, navigation error, redirect failure, no `--group` match, etc.
Present the account as a per-group coverage table (Portal · Method · Status · What stopped it). The ⛔ rows are the priority — surface them prominently; an enabled portal that yielded nothing because it was blocked is NOT the same as one that yielded nothing legitimately.

**Step 6 — Notify:**
Only after verification passes. **The push comes LAST — only after the email draft exists** (user rule 2026-07-15: the push says "results are ready", so the deliverable it points at must already be in place; a push before the draft is a false "done" signal):
1. **Email draft** via Gmail MCP — HTML with sections per search target, tables with scored listings, pro/con, color-coded. When Step 5b produced overdue items, open with a red-bordered `⚠ Overdue actions` section ABOVE all listing sections: one row per item — #, action, days overdue, evidence (e.g. `#216 · send the application · 6d · docs prepared, none submitted`).
2. **Push notification** via `PushNotification` (AFTER the draft is created) — short summary (under 200 chars). With overdue follow-through items, they LEAD:
   `immo-ops: {K} OVERDUE — {top action} · {N} new (top: #{id} {score}/5)`
   Without overdue items: `immo-ops: {N} new — {counts per target} (top: #{id} {score}/5)`
   If the `PushNotification` tool is unavailable in the session, skip the push and rely on the email.

**Skip rule:** skip both channels only if there are NO new listings AND NO overdue follow-through items. An overdue action alone justifies the notification — a silently rotting application is the exact hole this rule closes.

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
Under 200 chars. Lead with total count, break down by target, mention top pick. If the `PushNotification` tool is unavailable in the session, skip the push and rely on the email.

**2. Email draft** (detailed) — **generated by `scripts/build-email.mjs`; never hand-type the HTML** (hand-typed HTML drifted, 2026-09-28). Full format spec: `docs/notification-email.md`. The user rules the script enforces — keep them when touching it:
- Listings with score ≥ 3.0 only; DISCARDED / DUPE / sub-3.0 go to the footer (count + one-line reason).
- One section per search target (disabled targets shown greyed); rows colour-coded, background on EVERY cell (Gmail strips row styles).
- **Every listing gets a ✓/✗ detail row carrying ALL pros, cons and the next action** from the report summary — completeness beats brevity (user rule 2026-07-15).
- **Swap candidates:** 🔄 SWAP prefix + the partner's Suche as a ✓/✗ checklist line (from the report's `**Suche-Check:**`), or `Suche: unbekannt — verify on contact`.
- Overdue follow-through items open the email in a red block; subject timestamp from the system clock.

**Implementation:**
1. Write the coverage note (every enabled portal's disposition, ⛔ blockers first) as plain text to `tmp/scan-note.txt`.
2. Build the email for this cycle's tracker range (the report numbers you assigned in Step 4):
```
node scripts/build-email.mjs --from {first NNN} --to {last NNN} \
  --actions tmp/next-actions.json --scan-note-file tmp/scan-note.txt --out tmp/email.html
```
   stdout is one JSON line: `{subject, out, count, breakdown, top, overdue, excluded, discarded}`. Sections are assigned config-driven (portal → groups in `portals.yml`, narrowed by miete/kauf, city, and the report's `**Type:**`). Spot-check the section placement of any Kauf listing.
3. Pass the file's contents and the printed subject to Gmail:
```
mcp__claude_ai_Gmail__create_draft({
  to: ["{notification_email}"],
  subject: "{subject from build-email}",
  htmlBody: "{contents of tmp/email.html}"
})
```
4. The push message can use `count`, `breakdown` and `top` from the same JSON line.
