#!/usr/bin/env bash
# Shared venv bootstrap for the vendored invisible-playwright stack.
#
# Ensures tmp/venv-ip exists (rebuilt from the vendored wheel in vendor/ + the pinned
# PyPI deps), then execs the given python script + args with the venv's python.
# Used by both the MCP server launcher (invisible-playwright-mcp.sh) and scan.mjs
# --invisible (which runs invisible-driver.py through this).
#
# No absolute paths are hardcoded — the repo root is derived from this script's own
# location. All bootstrap chatter goes to stderr; whatever the target writes to stdout
# is left untouched (the MCP server / driver use stdout as their protocol channel).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

VENV="$REPO_ROOT/tmp/venv-ip"
PY="$VENV/bin/python"
REQ="$SCRIPT_DIR/invisible-playwright-requirements.txt"

if [ ! -x "$PY" ]; then
  echo "[invisible-playwright] first run — building venv at tmp/venv-ip …" >&2
  python3 -m venv "$VENV" >&2
  "$PY" -m pip install --quiet --upgrade pip >&2
  # Two-step install (see requirements header): invisible-playwright 0.3.1 pins
  # invisible-core via a DIRECT git URL that pip won't reconcile with the vendored
  # core wheel. So install everything else first (incl. the invisible-core wheel via
  # --find-links), then invisible-playwright itself with --no-deps from the vendor wheel.
  "$PY" -m pip install --quiet --find-links "$REPO_ROOT/vendor" -r "$REQ" >&2
  IP_WHEEL="$(ls -1 "$REPO_ROOT"/vendor/invisible_playwright-*.whl 2>/dev/null | sort -V | tail -1)"
  if [ -z "$IP_WHEEL" ]; then
    echo "[invisible-playwright] ERROR: no invisible_playwright wheel in vendor/" >&2
    exit 1
  fi
  "$PY" -m pip install --quiet --no-deps "$IP_WHEEL" >&2
  echo "[invisible-playwright] venv ready ($(basename "$IP_WHEEL"))." >&2
fi

exec "$PY" "$@"
