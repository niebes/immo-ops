# Debug-Chrome-over-CDP scan (`scan.mjs --debug-chrome`, legacy alias `--cic`)

> **⚠ This is the LAST-RESORT (Tier 3) transport.** Bot-protected portals are now scanned
> **stealth-first**: **Tier 1 (default)** `node scripts/scan.mjs --invisible` — the vendored,
> self-contained stealth Firefox (see [invisible-playwright.md](invisible-playwright.md));
> **Tier 2** the `mcp__invisible-playwright__*` tools for portals Tier 1 couldn't clear;
> **Tier 3 (this doc)** the CDP debug Chrome, only when both stealth tiers fail. The stealth
> tiers need no external browser and no `~/.config/google-chrome-immo` profile. Reach here
> only when a portal's defense specifically trusts the established debug-Chrome fingerprint.

Scans the bot-protected portals (`scan_method: invisible-playwright` — ImmoScout24, Regionalimmobilien24,
eBay Grundstücke) **automatically**, by driving a persistent, logged-in Chrome over the
DevTools protocol. It replaces the manual Claude-in-Chrome pass (navigate → paste snippet →
pull the JSON out in ~900-char slices) with one hands-off command.

## Why this exists

- ImmoScout24 & co. CAPTCHA-block any **fresh/headless** browser — trust (cookies +
  fingerprint history) accrues to an *established* browser, not a new one. So we cannot use
  a throwaway Chrome; we must reuse a persistent, logged-in one.
- The real everyday Chrome (what interactive CiC drives) has **no CDP debug port** and can't
  get one at runtime; Chrome also refuses `--remote-debugging-port` on the default profile.
- Solution: a **dedicated** Chrome profile, launched with the debug port, logged into IS24
  once. It's trusted enough to clear the CAPTCHA, and its debug port only ever exposes this
  low-value single-login profile (blast radius contained — never your main browser).

## One-time setup

1. Start the dedicated debug Chrome (idempotent — safe to run before every scan):
   ```
   npm run chrome:immo        # = scripts/immo-chrome.sh
   ```
   Profile: `~/.config/google-chrome-immo` · CDP: `http://127.0.0.1:9222` (127.0.0.1-only).
   Override with `IMMO_CHROME_PROFILE` / `IMMO_CDP_PORT`.
2. In the window that opens, **log into ImmoScout24** (the Amanda account). Do a search once
   so it warms up. Trust persists in this profile, so future runs won't re-prompt.

## Run

```
npm run chrome:immo         # ensure the debug browser is up (no-op if already running)
npm run scan:debug-chrome   # scan all enabled scan_method: invisible-playwright portals
# or narrow it:
node scripts/scan.mjs --debug-chrome --group "<your search name from config/profile.yml>"
node scripts/scan.mjs --debug-chrome --portal "ImmoScout24" --dry-run
node scripts/scan.mjs --debug-chrome --cdp http://127.0.0.1:9333
```

⚠ `--group` must EXACTLY match a `searches[].name` in `config/profile.yml` (which is
also the group `name` in `portals.yml`). If it doesn't match, the profile lookup falls
back to the first enabled search — criteria filtering is effectively bypassed and URL
placeholders resolve against the wrong search.

Each portal: navigate → dismiss consent → (wait out CAPTCHA on the trusted profile) →
run its `scripts/portals/{slug}-extract.js` snippet via `page.evaluate()` (a string → CDP
`Runtime.evaluate`, **not** subject to page CSP) → pipe the compact `{c,n,p,L}` to
`process-scan.mjs` (dedup + criteria + pipeline/history). IS24 paginates via `&pagenumber=N`
and stops at ≥80% already-seen; single-page portals stop after page 1.

## How it fits the workflow

- `scan auto` Step 1 stays `node scripts/scan.mjs` (Playwright portals).
- Step 2 (the bot-protected pass) runs the stealth tiers FIRST; `node scripts/scan.mjs
  --debug-chrome` is the Tier-3 escalation — **only if** the stealth tiers failed for a
  portal AND the dedicated debug Chrome is up and IS24-trusted.
- If `--debug-chrome` can't connect, it exits with a clear message; fall back to the interactive CiC
  pass. Blocked portals are still recorded in `data/scan-failures.json` as ⛔.

## Status

**Validated June 2026; demoted to LAST RESORT (Tier 3) July 2026** when the vendored
stealth Firefox (`docs/invisible-playwright.md`, Tiers 1–2) became the default transport for
`scan_method: invisible-playwright` portals. Use this CDP path only for portals both stealth
tiers could not clear. The dedicated profile does earn IS24's trust after the one-time
login, and scans then run hands-off without CAPTCHA on that profile.

Remaining caveats:
- Trust lives in the profile directory (`~/.config/google-chrome-immo`). Deleting or
  recreating it means logging into IS24 again and re-earning trust.
- A CAPTCHA can still appear occasionally (e.g. after long idle periods or aggressive
  scanning); it auto-solves only in the trusted profile — give it 5–10 s, otherwise
  solve it once manually in the debug Chrome window.
- If `--debug-chrome` can't connect (debug Chrome not running) or IS24 blocks despite trust,
  fall back to the interactive CiC pass; blocked portals land in
  `data/scan-failures.json`.

## Security notes

- The debug port binds to **127.0.0.1 only** — do not add `--remote-debugging-address`.
- Keep this profile **single-purpose** (IS24 login only). Anything logged in here is readable
  by any local process via CDP while Chrome runs.
- `--remote-allow-origins=*` is required for the CDP websocket handshake; acceptable because
  the port is loopback-bound.
