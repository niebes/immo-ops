#!/usr/bin/env bash
# Daily "find scan auto" prompt into the immo-ops Claude session.
# Driven by cron. Verifies the prompt actually landed, and repairs the session if not.
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
# notify-send needs the user's session bus, which cron also does not inherit.
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$(id -u)/bus}"

mkdir -p "$(dirname "$LOG")"
ts() { date '+%Y-%m-%d %H:%M:%S'; }

# Last resort only. Everything below repairs itself first; this fires when it could not.
alert() {
  notify-send -u critical "$1" "$2" 2>/dev/null \
    || echo "[$(ts)] WARN — notify-send failed (nobody logged in at the desktop?)" >> "$LOG"
}

# ---------------------------------------------------------------------------
# Prompt delivery — verified, self-healing.
#
# `claude-session.sh send` is send-keys -l + Enter. When the TUI has a modal up
# (the "Set up auto mode for your environment?" onboarding dialog is the one that
# bit us), the literal text is swallowed and Enter goes to the dialog's focused
# button: send exits 0, the log says SENT, and nothing runs. That is how both
# 2026-08-20 and 2026-08-21 were lost, immediately after the socket fix landed.
# So never trust the exit code — read the pane back, then repair.
# ---------------------------------------------------------------------------

pane() { tmux -L "$TMUX_SOCKET" capture-pane -p -t "claude-${SESSION}" 2>/dev/null; }

session_alive() { tmux -L "$TMUX_SOCKET" has-session -t "claude-${SESSION}" 2>/dev/null; }

# Claude is mid-turn: the footer offers the interrupt hint. Never Escape in this
# state — that would kill a run in progress rather than unblock a stuck one.
pane_busy() { pane | grep -qiE 'esc to interrupt'; }

# A modal or permission dialog owns the keyboard. These are the generic footers
# Claude Code's dialogs share; a false positive costs one harmless Escape.
pane_blocked() { pane | grep -qiE 'esc to cancel|to change usage|do you want to|❯ *[0-9]+\.'; }

# The prompt is sitting in the input box, never submitted. Checked only near the
# bottom of the pane so the echoed transcript copy of a *successful* send does not
# read as a failure.
prompt_unsubmitted() { pane | tail -8 | grep -qE "[>❯] ${PROMPT}"; }

send_prompt() { "${SESSION_REPO}/scripts/claude-session.sh" send "$SESSION" "$PROMPT" >> "$LOG" 2>&1; }

# One delivery attempt: clear whatever holds the keyboard, send, confirm it took.
try_deliver() {
  if pane_busy; then
    # A previous turn is still running. Typing queues behind it, which is what we
    # want — interrupting to make room would be worse than waiting.
    echo "[$(ts)] BUSY — session mid-turn, queueing the prompt behind it" >> "$LOG"
    send_prompt
    return 0
  fi
  if pane_blocked; then
    echo "[$(ts)] REPAIR — dialog on screen, sending Escape" >> "$LOG"
    tmux -L "$TMUX_SOCKET" send-keys -t "claude-${SESSION}" Escape
    sleep 2
  fi
  send_prompt
  sleep 5
  pane_busy && return 0          # Claude took it and started working
  pane_blocked && return 1
  prompt_unsubmitted && return 1
  return 0
}

# Nuclear option: a fresh session has no modal and no wedge, at the cost of the
# old session's context. Chosen deliberately — an unattended scan that runs beats
# a session whose history nobody reads.
respawn() {
  echo "[$(ts)] RESPAWN — replacing the session" >> "$LOG"
  "${SESSION_REPO}/scripts/claude-session.sh" kill "$SESSION" >> "$LOG" 2>&1
  sleep 3
  "${SESSION_REPO}/scripts/claude-session.sh" spawn "$SESSION" --dir "$IMMO_REPO" "$PROMPT" >> "$LOG" 2>&1
  # The spawn Enter can fire before the skill finishes loading, leaving the prompt
  # unsubmitted in the box (claude-session.md, "Enter can race startup").
  sleep 25
  if prompt_unsubmitted; then
    echo "[$(ts)] RESPAWN — initial prompt unsubmitted, pressing Enter" >> "$LOG"
    "${SESSION_REPO}/scripts/claude-session.sh" key "$SESSION" Enter >> "$LOG" 2>&1
    sleep 5
  fi
}

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

delivered=0
if session_alive; then
  if try_deliver; then
    delivered=1
    echo "[$(ts)] SENT — '${PROMPT}' delivered and accepted" >> "$LOG"
  else
    echo "[$(ts)] STUCK — prompt did not take; retrying" >> "$LOG"
    if try_deliver; then
      delivered=1
      echo "[$(ts)] SENT — '${PROMPT}' delivered on retry" >> "$LOG"
    fi
  fi
else
  echo "[$(ts)] SESSION MISSING — no session on socket ${TMUX_SOCKET}" >> "$LOG"
fi

if [ "$delivered" -eq 0 ]; then
  respawn
  if session_alive && ! prompt_unsubmitted; then
    echo "[$(ts)] SENT — '${PROMPT}' delivered via respawn" >> "$LOG"
  else
    echo "[$(ts)] FAIL — could not deliver '${PROMPT}' even after respawn" >> "$LOG"
    alert "immo-ops scan could not start" "Session wedged and the respawn did not take. See ${LOG}."
  fi
fi
