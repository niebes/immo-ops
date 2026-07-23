#!/usr/bin/env bash
# Rebuild the vendored invisible_playwright stealth stack from the NEWEST upstream.
#
# WHY: the MCP Tier-2 driver crashed ("Connection closed while reading from the driver")
# mid-session; scan.mjs --invisible only survived because invisible-driver.py respawns
# (≤2/page). Root cause was a very old patched-Firefox binary. Upgrading fixed it.
#
# HISTORY: 2026-07-23 upgraded 0.1.2 (binary "firefox-2") -> 0.3.1 (fetches "firefox-17",
# Firefox 150.0.1). 15 binary revisions newer. Verified crash-free: 5/5 smoke navigations
# + a real IS24 load with the seeded trust clearing the bot-block.
#
# WHAT 0.3.x CHANGED (why this script is not a one-line version bump):
#   * SPLIT the project — invisible_playwright (wrapper) now depends on a SECOND git-only
#     package, invisible-core. BOTH must be built and vendored.
#   * CAPS playwright at >=1.55,<1.56 (down from the old 1.60.0 pin; the patched Firefox
#     is built against 1.55).
#   * invisible-playwright pins invisible-core via a DIRECT git URL in its metadata, which
#     pip won't reconcile with a local wheel — so invisible-playwright is installed with
#     --no-deps AFTER its deps (incl. the vendored core wheel) are already satisfied.
#
# SAFE + REVERSIBLE: builds/tests in an isolated venv; only re-vendors + rebuilds the live
# venv after the smoke test passes. Old wheel(s) are moved to vendor/_fallback/, the live
# venv is moved to tmp/venv-ip.bak-* (not deleted). Rollback = restore both + re-pin.
#
# Needs network to github.com (git clone of BOTH repos + ~112 MB release asset,
# SHA256-verified). Run from the repo root:  bash scripts/rebuild-invisible.sh [git-ref]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REF="${1:-main}"                       # upstream git ref to build (default: main)
NEWV="tmp/venv-ip-new"                 # isolated build/test venv
WHEELDIR="tmp/wheelbuild"
REQ="scripts/invisible-playwright-requirements.txt"
SMOKE_URL="${SMOKE_URL:-https://example.com}"
IP_GIT="git+https://github.com/feder-cr/invisible_playwright.git@${REF}"
CORE_GIT="git+https://github.com/feder-cr/invisible_core.git@${REF}"

echo "==> [1/7] Building BOTH wheels from git ($REF) into $WHEELDIR"
rm -rf "$NEWV" "$WHEELDIR"; mkdir -p "$WHEELDIR"
python3 -m venv "$NEWV"
"$NEWV/bin/python" -m pip install -q --upgrade pip wheel
"$NEWV/bin/pip" wheel -q --no-deps -w "$WHEELDIR" "$IP_GIT"
"$NEWV/bin/pip" wheel -q --no-deps -w "$WHEELDIR" "$CORE_GIT"
IP_WHEEL="$(ls -1 "$WHEELDIR"/invisible_playwright-*.whl | sort -V | tail -1)"
CORE_WHEEL="$(ls -1 "$WHEELDIR"/invisible_core-*.whl | sort -V | tail -1)"
IP_VER="$(basename "$IP_WHEEL" | sed -E 's/invisible_playwright-([0-9.]+)-.*/\1/')"
CORE_VER="$(basename "$CORE_WHEEL" | sed -E 's/invisible_core-([0-9.]+)-.*/\1/')"
echo "    invisible_playwright $IP_VER + invisible_core $CORE_VER"

echo "==> [2/7] Installing into the isolated venv (core+deps first, wrapper --no-deps)"
"$NEWV/bin/pip" install -q "$CORE_WHEEL" \
  "playwright>=1.55,<1.56" "mcp==1.27.1" "platformdirs>=4" "requests[socks]>=2.31" \
  "tqdm>=4.66" "tzdata>=2024.1" "maxminddb>=2.2"
"$NEWV/bin/pip" install -q --no-deps "$IP_WHEEL"

echo "==> [3/7] Fetching the patched Firefox binary (SHA256-verified)"
"$NEWV/bin/python" -m invisible_playwright fetch
"$NEWV/bin/python" -m invisible_playwright version || true

echo "==> [4/7] Smoke test: headless launch + navigate x3 (stability check)"
"$NEWV/bin/python" - "$SMOKE_URL" <<'PY'
import asyncio, sys
from invisible_playwright.async_api import InvisiblePlaywright
url = sys.argv[1]
async def main():
    ok = 0
    async with InvisiblePlaywright(headless=True, humanize=True, locale="de-DE") as browser:
        ctx = await browser.new_context(bypass_csp=True)
        page = await ctx.new_page()
        for i in range(3):
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            print(f"    run {i+1}: title={(await page.title())[:55]!r}")
            ok += 1
    print(f"    SMOKE OK ({ok}/3)")
asyncio.run(main())
PY

echo "==> [5/7] Smoke passed — vendoring (keeping old wheels as fallback)"
mkdir -p vendor/_fallback
for w in vendor/invisible_playwright-*.whl vendor/invisible_core-*.whl; do
  [ -e "$w" ] || continue
  case "$w" in *"$IP_VER"*|*"$CORE_VER"*) : ;; *) mv -v "$w" vendor/_fallback/ ;; esac
done
cp -v "$IP_WHEEL" "$CORE_WHEEL" vendor/

echo "==> [6/7] Pinning invisible-core==$CORE_VER in $REQ (wrapper stays out — installed --no-deps)"
python3 - "$REQ" "$CORE_VER" <<'PY'
import re, sys
p, ver = sys.argv[1], sys.argv[2]
s = open(p).read()
s = re.sub(r'^invisible-core==.*$', f'invisible-core=={ver}', s, flags=re.M)
open(p, "w").write(s)
print(f"    pinned invisible-core=={ver}")
PY

echo "==> [7/7] Rebuilding the LIVE venv (tmp/venv-ip) from the vendored wheels"
[ -d tmp/venv-ip ] && mv tmp/venv-ip "tmp/venv-ip.bak-$(date +%s)"
bash scripts/invisible-venv.sh -c "import invisible_playwright, invisible_core; from invisible_playwright import constants as c; print('    live venv OK — binary', c.BINARY_VERSION, c.FIREFOX_UPSTREAM_VERSION)"

echo
echo "DONE. Stack: invisible_playwright $IP_VER + invisible_core $CORE_VER."
echo "Rollback: restore vendor/_fallback/*.whl, re-pin $REQ, mv a tmp/venv-ip.bak-* back."
echo "Verify Tier 1:  node scripts/scan.mjs --invisible --group 'Potsdam flat rental' --portal ImmoScout24"
echo "Verify Tier 2:  RECONNECT the invisible-playwright MCP (restart the session) so the"
echo "                harness respawns the server on the new venv, then navigate a page."
