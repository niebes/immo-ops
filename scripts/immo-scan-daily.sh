#!/usr/bin/env bash
# Daily "find scan auto" prompt into the immo-ops Claude session.
# Driven by cron. Logs each run; a dead session is logged, not silently dropped.
#
# Lives in the immo-ops repo (moved out of ai-knowledgebase 2026-08-19) because it is
# immo-specific. It still calls claude-session.sh from ai-knowledgebase, which is the
# generic session manager — override that location with CLAUDE_SESSION_REPO if it moves.
#
# Before prompting, it brings up the dedicated debug Chrome so the session's CDP pass
# can run automated (scan.mjs --debug-chrome). The Chrome is stopped again after a
# window so its debug port is not left open all day. If it cannot start (e.g. no X
# display when nobody is logged in), the session falls back to the stealth tiers.
set -uo pipefail

# ai-knowledgebase holds the generic session manager (claude-session.sh).
SESSION_REPO="${CLAUDE_SESSION_REPO:-/home/mniebes/workspace/github.com/niebes/ai-knowledgebase}"
# This repo — derived from the script's own location, so a checkout elsewhere still works.
IMMO_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="immo-ops"
PROMPT="find scan auto"
LOG="${HOME}/.cache/immo-scan-daily.log"
CHROME_TTL=1800   # stop the debug Chrome this many seconds after start (covers scan steps 1–2)

# claude-session.sh gives each session its OWN tmux server, on a socket named after the
# session (ai-knowledgebase 70ca839, 2026-08-08) — a single shared server was one failure
# domain. So every tmux call here MUST pass `-L <socket>`; a bare `tmux` talks to the
# default socket, finds nothing, and this script silently SKIPs. That is exactly what
# happened every morning from 2026-08-09 until this was fixed on 2026-08-19.
TMUX_SOCKET="claude-${SESSION}"

# cron has no GUI env — point Chrome at the user's X display so it can start headful
# (headful keeps the trusted fingerprint that clears the CAPTCHA). Harmless if unset.
export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

mkdir -p "$(dirname "$LOG")"
ts() { date '+%Y-%m-%d %H:%M:%S'; }

if ! tmux -L "$TMUX_SOCKET" has-session -t "claude-${SESSION}" 2>/dev/null; then
  echo "[$(ts)] SKIP — session claude-${SESSION} not running (socket ${TMUX_SOCKET})" >> "$LOG"
  exit 0
fi

# Bring up the dedicated debug Chrome for scan.mjs --debug-chrome.
# Only manage its lifecycle if WE start it: if it is already up (started manually or
# by an overlapping run) leave it — and its stop — to whoever owns it. This means a
# second run never double-starts Chrome (immo-chrome.sh is idempotent anyway) NOR
# schedules a second, racy stop-timer that could kill a Chrome still in use.
CDP_PORT="${IMMO_CDP_PORT:-9222}"
if curl -s -m 2 "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
  echo "[$(ts)] CHROME already up — leaving it (and its stop) to whoever started it" >> "$LOG"
elif "${IMMO_REPO}/scripts/immo-chrome.sh" >> "$LOG" 2>&1; then
  echo "[$(ts)] CHROME started — scheduling stop in ${CHROME_TTL}s" >> "$LOG"
  # Detached timed stop (survives this script exiting) so the debug port isn't left open.
  setsid bash -c "sleep ${CHROME_TTL}; pkill -f 'google-chrome-immo'; echo \"[\$(date '+%F %T')] CHROME stopped (ttl)\" >> '${LOG}'" >/dev/null 2>&1 &
else
  echo "[$(ts)] WARN — immo-chrome did not start; session falls back to the stealth tiers" >> "$LOG"
fi

if "${SESSION_REPO}/scripts/claude-session.sh" send "$SESSION" "$PROMPT" >> "$LOG" 2>&1; then
  echo "[$(ts)] SENT — '${PROMPT}' to claude-${SESSION}" >> "$LOG"
else
  echo "[$(ts)] FAIL — send returned non-zero" >> "$LOG"
fi
