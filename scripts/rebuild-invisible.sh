#!/usr/bin/env bash
# Rebuild the vendored invisible_playwright stealth stack from the NEWEST upstream.
#
# WHY: the vendored wheel is invisible_playwright 0.1.2, which pins the patched Firefox
# binary "firefox-2". Upstream is now wrapper 0.3.1 pinning "firefox-13" (Firefox 150.0.1,
# 2026-06-24) — 11 binary revisions newer. The MCP Tier-2 driver crashes ("Connection
# closed while reading from the driver") mid-session; scan.mjs --invisible only survives
# because invisible-driver.py respawns (≤2/page). 0.3.1 also adds a virtual-display
# headless path (make_virtual_display) absent in 0.1.2 — a plausible direct fix.
#
# SAFE + REVERSIBLE: builds into an isolated venv and smoke-tests the new binary BEFORE
# touching anything the scan uses. The old 0.1.2 wheel is kept in vendor/ as a fallback,
# and the live venv (tmp/venv-ip) is only rebuilt after the smoke test passes.
#
# Needs network to github.com (git clone + ~112 MB release asset, SHA256-verified).
# Run from the repo root:  bash scripts/rebuild-invisible.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REF="${1:-main}"                       # upstream git ref to build (default: main = 0.3.1)
NEWV="tmp/venv-ip-new"                 # isolated build/test venv
WHEELDIR="tmp/wheelbuild"
REQ="scripts/invisible-playwright-requirements.txt"
SMOKE_URL="${SMOKE_URL:-https://example.com}"

echo "==> [1/6] Building invisible_playwright wheel from git ($REF) into $NEWV"
rm -rf "$NEWV" "$WHEELDIR"; mkdir -p "$WHEELDIR"
python3 -m venv "$NEWV"
"$NEWV/bin/python" -m pip install -q --upgrade pip wheel
"$NEWV/bin/pip" wheel -q --no-deps -w "$WHEELDIR" "git+https://github.com/feder-cr/invisible_playwright.git@${REF}"
WHEEL="$(ls -1 "$WHEELDIR"/invisible_playwright-*.whl | head -1)"
NEWVER="$(basename "$WHEEL" | sed -E 's/invisible_playwright-([0-9.]+)-.*/\1/')"
echo "    built: $WHEEL  (version $NEWVER)"

echo "==> [2/6] Installing wheel + pinned deps into the isolated venv"
"$NEWV/bin/pip" install -q "$WHEEL" \
  "playwright==1.60.0" "mcp==1.27.1" "platformdirs>=4" "requests>=2.31" "tqdm>=4.66"

echo "==> [3/6] Fetching the patched Firefox binary (~112 MB, SHA256-verified)"
"$NEWV/bin/python" -m invisible_playwright fetch
"$NEWV/bin/python" -m invisible_playwright version || true
"$NEWV/bin/python" -m invisible_playwright path

echo "==> [4/6] Smoke test: headless launch + navigate x3 (stability check)"
"$NEWV/bin/python" - "$SMOKE_URL" <<'PY'
import asyncio, sys
from invisible_playwright.async_api import InvisiblePlaywright
url = sys.argv[1]
async def main():
    ok = 0
    async with InvisiblePlaywright(headless=True, locale="de-DE") as browser:
        for i in range(3):
            ctx = await browser.new_context(bypass_csp=True)
            page = await ctx.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            title = await page.title()
            print(f"    run {i+1}: title={title!r}")
            await ctx.close()
            ok += 1
    print(f"    SMOKE OK ({ok}/3)")
asyncio.run(main())
PY

echo "==> [5/6] Smoke test passed — vendoring $NEWVER (keeping old wheel as fallback)"
mkdir -p vendor/_fallback
# move any existing non-matching wheels aside rather than deleting them
for w in vendor/invisible_playwright-*.whl; do
  [ -e "$w" ] || continue
  case "$w" in *"$NEWVER"*) : ;; *) mv -v "$w" vendor/_fallback/ ;; esac
done
cp -v "$WHEEL" vendor/
# bump the pin in requirements (portable in-place)
python3 - "$REQ" "$NEWVER" <<'PY'
import re, sys
p, ver = sys.argv[1], sys.argv[2]
s = open(p).read()
s2 = re.sub(r'^invisible-playwright==.*$', f'invisible-playwright=={ver}', s, flags=re.M)
open(p, "w").write(s2)
print(f"    pinned invisible-playwright=={ver} in {p}")
PY

echo "==> [6/6] Rebuilding the LIVE venv (tmp/venv-ip) from the new wheel"
rm -rf tmp/venv-ip
bash scripts/invisible-venv.sh -c "import invisible_playwright, sys; print('    live venv OK, wrapper', getattr(invisible_playwright,'__version__','?'))" 2>/dev/null \
  || bash scripts/invisible-venv.sh scripts/_noop_check.py 2>/dev/null || true
echo
echo "DONE. New stack: invisible_playwright $NEWVER + fetched Firefox binary."
echo "Old wheel preserved in vendor/_fallback/ — to roll back: restore it, re-pin, rm -rf tmp/venv-ip."
echo "Next: verify Tier 1  ->  node scripts/scan.mjs --invisible --group 'Potsdam flat rental' --portal ImmoScout24"
echo "      verify Tier 2  ->  reconnect the invisible-playwright MCP and navigate a page."
