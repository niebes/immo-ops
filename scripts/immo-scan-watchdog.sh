#!/usr/bin/env bash
# Outcome watchdog for the daily scan.
#
# immo-scan-daily.sh verifies DELIVERY — that the prompt reached Claude. This
# verifies the OUTCOME, and that is the check worth having: it does not care
# whether the session was wedged behind a modal, the tmux socket was wrong,
# Chrome would not start, a portal bot-blocked, or Claude died at step 3. It asks
# the single question that actually matters — "did today's scan record anything?"
# — so failure modes nobody has thought of yet still get caught.
#
# History that motivated it: 2026-08-09..19 the daily script logged SKIP every
# morning (wrong tmux socket); 2026-08-20..21 it logged SENT every morning while
# a modal ate the prompt. Both were green-looking logs nobody read for days.
#
# Cron it twice a day: the first pass repairs, the second escalates.
#   0 11 * * *  .../immo-scan-watchdog.sh
#   0 15 * * *  .../immo-scan-watchdog.sh
set -uo pipefail

IMMO_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HISTORY="${IMMO_REPO}/data/scan-history.tsv"
LOG="${HOME}/.cache/immo-scan-daily.log"
STATE="${IMMO_REPO}/tmp/scan-watchdog.state"
# A healthy run appends ~350–750 rows. 25 is low enough never to false-alarm on a
# genuinely quiet market, high enough to catch a run that died after one portal.
MIN_ROWS="${IMMO_SCAN_MIN_ROWS:-25}"

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$(id -u)/bus}"

mkdir -p "$(dirname "$LOG")" "$(dirname "$STATE")"
ts() { date '+%Y-%m-%d %H:%M:%S'; }
today="$(date +%F)"

alert() {
  notify-send -u critical "$1" "$2" 2>/dev/null \
    || echo "[$(ts)] WARN — notify-send failed (nobody logged in at the desktop?)" >> "$LOG"
}

# Column 2 of scan-history.tsv is the scan date; row 1 is the header.
rows_today() {
  [ -r "$HISTORY" ] || { echo 0; return; }
  awk -F'\t' -v d="$today" 'NR>1 && $2==d {n++} END {print n+0}' "$HISTORY"
}

n="$(rows_today)"

if [ "$n" -ge "$MIN_ROWS" ]; then
  echo "[$(ts)] WATCHDOG ok — ${n} listings recorded for ${today}" >> "$LOG"
  rm -f "$STATE"
  exit 0
fi

# How many repair passes have already run today? State is one line: "<date> <count>".
attempts=0
if [ -r "$STATE" ]; then
  read -r sday scount < "$STATE" 2>/dev/null
  [ "${sday:-}" = "$today" ] && attempts="${scount:-0}"
fi

if [ "$attempts" -eq 0 ]; then
  echo "[$(ts)] WATCHDOG — only ${n} rows for ${today} (want ≥${MIN_ROWS}); re-running the daily script" >> "$LOG"
  echo "${today} 1" > "$STATE"
  # The daily script now self-heals: Escape, retry, and respawn if it must.
  "${IMMO_REPO}/scripts/immo-scan-daily.sh"
else
  echo "[$(ts)] WATCHDOG — still only ${n} rows for ${today} after ${attempts} repair pass(es)" >> "$LOG"
  echo "${today} $((attempts + 1))" > "$STATE"
  alert "immo-ops: no scan today" \
        "Only ${n} listings recorded for ${today}, after ${attempts} repair attempt(s). See ${LOG}."
fi
