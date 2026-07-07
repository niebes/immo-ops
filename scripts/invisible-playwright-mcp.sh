#!/usr/bin/env bash
# Self-contained launcher for the invisible-playwright stealth MCP server.
#
# Everything it needs lives inside THIS repo — no link to any sibling repo:
#   scripts/invisible-playwright-mcp.py            the FastMCP server
#   scripts/invisible-playwright-requirements.txt  pinned deps
#   vendor/invisible_playwright-*.whl              the (non-PyPI) package, vendored
#
# On first run it builds a local venv (tmp/venv-ip, gitignored) from the vendored
# wheel + PyPI deps, then execs the server. No absolute paths are hardcoded — the
# repo root is derived from this script's own location at runtime.
#
# NOTE: all bootstrap chatter goes to stderr — stdout is the MCP JSON-RPC channel
# and must stay clean.
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
  "$PY" -m pip install --quiet --find-links "$REPO_ROOT/vendor" -r "$REQ" >&2
  echo "[invisible-playwright] venv ready." >&2
fi

exec "$PY" "$SCRIPT_DIR/invisible-playwright-mcp.py"
