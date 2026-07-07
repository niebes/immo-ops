#!/usr/bin/env bash
# Launch (idempotently) a DEDICATED Chrome profile with the DevTools debug port,
# for the `scan.mjs --debug-chrome` CDP scan path.
#
# WHY a dedicated profile (never your everyday one):
#   - Chrome (v136+) refuses --remote-debugging-port on the DEFAULT profile.
#   - An open CDP port lets any local process drive the browser AND read all its
#     cookies/logins, so it must live only on this low-value, single-login profile.
#
# Usage:
#   scripts/immo-chrome.sh            # start it if not already up; print status
#   scripts/immo-chrome.sh --status   # just report whether it's up (exit 0/1)
#
# ONE-TIME: after the first launch, log into ImmoScout24 (Amanda) in the window
# that opens. Trust (cookies + fingerprint history) then accrues to THIS profile,
# so later scans stop hitting the CAPTCHA — exactly like the main CiC browser.

set -euo pipefail
PORT="${IMMO_CDP_PORT:-9222}"
PROFILE="${IMMO_CHROME_PROFILE:-$HOME/.config/google-chrome-immo}"
CHROME="$(command -v google-chrome || command -v google-chrome-stable || echo /opt/google/chrome/chrome)"

up() { curl -s -m 2 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; }

if up; then
  echo "✓ immo Chrome already up on CDP :${PORT}  (profile: ${PROFILE})"
  exit 0
fi
if [ "${1:-}" = "--status" ]; then
  echo "✗ immo Chrome NOT running on :${PORT}"
  exit 1
fi

mkdir -p "$PROFILE"
echo "Starting immo Chrome → CDP :${PORT}, profile ${PROFILE}"
# --remote-allow-origins is required by newer Chrome for CDP websocket clients.
# The debug port binds to 127.0.0.1 only (Chrome default), so it is not exposed
# off-box; keep it that way (do NOT add --remote-debugging-address=0.0.0.0).
nohup "$CHROME" \
  --user-data-dir="$PROFILE" \
  --remote-debugging-port="$PORT" \
  --remote-allow-origins="*" \
  --no-first-run --no-default-browser-check \
  --restore-last-session \
  about:blank >/dev/null 2>&1 &

for _ in $(seq 1 20); do up && break; sleep 0.5; done
if up; then
  echo "✓ up on :${PORT}"
  echo "  If this is the first run: log into ImmoScout24 (Amanda) in the window, then it's trusted for scans."
else
  echo "✗ failed to bring up CDP on :${PORT}."
  echo "  Check: Chrome version (v136+ needs the non-default profile above — it is),"
  echo "         and that no other Chrome already locks ${PROFILE}."
  exit 1
fi
