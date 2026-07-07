#!/usr/bin/env bash
# Launcher for the invisible-playwright MCP server (referenced by .mcp.json).
# Thin wrapper: delegates venv bootstrap to invisible-venv.sh and execs the server.
# Kept as a stable, separate entrypoint so .mcp.json need not know about the venv.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/invisible-venv.sh" "$SCRIPT_DIR/invisible-playwright-mcp.py"
