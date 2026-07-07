# invisible-playwright — stealth scan (Tiers 1 & 2)

The **default** transport for bot-protected portals (`scan_method: cic`). A vendored,
self-contained anti-detect **Firefox** (patched stealth profile) that gets past defenses
which block headless Chromium — no external browser, no logged-in Chrome profile required.

Two ways to drive the same stealth engine:

- **Tier 1 — automated** (`node scripts/scan.mjs --invisible`): fully scripted; runs the
  existing `scripts/portals/{slug}-cic.js` snippets. This is the default scan pass.
- **Tier 2 — Claude-driven MCP** (`mcp__invisible-playwright__*`): the same browser driven
  by hand for portals the automated pass can't clear.

Only if **both** fail does the scan fall back to **Tier 3**, the CDP debug Chrome
([cic-cdp-scan.md](cic-cdp-scan.md)).

## Self-contained — nothing links outside this repo

| In-repo (committed) | Role |
|---------------------|------|
| `vendor/invisible_playwright-*.whl` | the package (NOT on PyPI), vendored as a wheel |
| `scripts/invisible-playwright-requirements.txt` | pinned deps (wheel via `--find-links vendor/`; rest from PyPI) |
| `scripts/invisible-venv.sh` | shared bootstrap — builds `tmp/venv-ip` from the wheel + reqs, then execs a target |
| `scripts/invisible-playwright-mcp.py` / `.sh` | the FastMCP server + its launcher (Tier 2) |
| `scripts/invisible-driver.py` | line-protocol browser driver used by `scan.mjs --invisible` (Tier 1) |
| `scripts/invisible-login.py` | one-time headful login to seed session trust |
| `.mcp.json` | registers the MCP server (relative paths only) |

Rebuilt-on-demand artifacts (gitignored, in `tmp/`): the venv `tmp/venv-ip` and the session
`tmp/browser-state.json`. The patched Firefox binary downloads once to a user cache
(`~/.local/share/...`, like Playwright's own browser cache) on first launch.

No absolute paths and no reference to any sibling repo — paths are derived at runtime.

## Setup & use

```
# one-time: seed session trust (opens a visible stealth Firefox; log in / accept cookies, then Enter)
npm run login:invisible

# scan all enabled scan_method: cic portals via the stealth Firefox (default pass)
npm run scan:invisible
node scripts/scan.mjs --invisible --portal ImmoScout24 --group "Potsdam flat rental" --dry-run
```

The venv builds itself on first run of either the MCP server or `--invisible` (via
`invisible-venv.sh`). Config via `IP_*` env (set in `.mcp.json` / passed by `scan.mjs`):
`IP_HEADLESS` (default true), `IP_LOCALE` (de-DE), `IP_TIMEZONE` (Europe/Berlin),
`IP_STORAGE_STATE` (`tmp/browser-state.json`).

## How Tier 1 wires into scan.mjs

`scan.mjs` shares one loop (`runSnippetScan`) across two backends: `makeCdpEvaluator()`
(Tier 3, CDP Chrome) and `makeInvisibleEvaluator()` (Tier 1). The invisible backend spawns
`invisible-driver.py` through `invisible-venv.sh` and speaks a newline-JSON protocol:

- `{"cmd":"eval","url":…,"snippet":…}` → navigate → dismiss consent → wait out the
  bot-block → scroll → `page.evaluate(snippet)` → retry once on a 0-count →
  `{"ok":true,"result":<compact {c,n,L} string>,"blocked":<bool>}`
- `{"cmd":"quit"}` → persist `storage_state` → exit.

Because the snippet contract is identical to the CDP path, **the same `*-cic.js` extractors
run unchanged** on either transport.

## Trust matters under load

A single light request to IS24 clears the bot-block logged-out, but sustained
pagination/multi-portal scanning leans on session trust — run `npm run login:invisible`
once so `tmp/browser-state.json` carries a warmed session into every `--invisible` run.
