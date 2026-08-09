#!/usr/bin/env python3
"""MCP server wrapping InvisiblePlaywright for stealth browser automation.

Exposes Playwright page actions as MCP tools compatible with chrome-devtools-mcp
naming. Configured via environment variables (see IP_* below).
"""

import asyncio
import base64
import json
import os
import sys
from pathlib import Path
from typing import Any, Optional

from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------

HEADLESS = os.environ.get("IP_HEADLESS", "true").lower() == "true"
SEED = int(os.environ.get("IP_SEED", "0")) or None
PROXY_URL = os.environ.get("IP_PROXY", "")
HUMANIZE: Any = os.environ.get("IP_HUMANIZE", "true")
if HUMANIZE.lower() == "false":
    HUMANIZE = False
elif HUMANIZE.lower() == "true":
    HUMANIZE = True
else:
    HUMANIZE = float(HUMANIZE)
LOCALE = os.environ.get("IP_LOCALE", "en-US")
TIMEZONE = os.environ.get("IP_TIMEZONE", "Europe/Berlin")
STORAGE_STATE_PATH = os.environ.get("IP_STORAGE_STATE", "tmp/browser-state.json")
# Per-action/navigation ceiling applied to the context (see _ensure_browser). Must stay
# well under the .mcp.json per-server "timeout" so a stall surfaces as a normal Playwright
# TimeoutError the agent can fall back from, rather than as an aborted MCP tool call.
DEFAULT_TIMEOUT_MS = int(os.environ.get("IP_TIMEOUT_MS", "30000"))

# ---------------------------------------------------------------------------
# Browser state
# ---------------------------------------------------------------------------

_browser = None
_context = None
_active_page = None
_pw_instance = None  # InvisiblePlaywright context manager instance


async def _ensure_browser():
    """Lazy-init: launch browser on first tool call."""
    global _browser, _context, _active_page, _pw_instance

    if _browser is not None:
        return

    from invisible_playwright.async_api import InvisiblePlaywright

    proxy = None
    if PROXY_URL:
        proxy = {"server": PROXY_URL}

    _pw_instance = InvisiblePlaywright(
        seed=SEED,
        headless=HEADLESS,
        proxy=proxy,
        humanize=HUMANIZE,
        locale=LOCALE,
        timezone=TIMEZONE,
        # Disable Firefox's built-in JSON viewer: it runs under a strict internal CSP
        # that blocks page.evaluate's eval() on JSON-API pages (e.g. Vonovia). Showing
        # raw JSON as a plain text document lets evaluate work.
        extra_prefs={"devtools.jsonview.enabled": False},
    )
    _browser = await _pw_instance.__aenter__()

    storage_path = Path(STORAGE_STATE_PATH)
    if storage_path.exists():
        _context = await _browser.new_context(storage_state=str(storage_path), bypass_csp=True)
    else:
        _context = await _browser.new_context(bypass_csp=True)

    # Bound every navigation/action so a stalled page can never hang the MCP call.
    # Without this, page.goto() and friends inherit Playwright's context default and a
    # wedged portal (seen repeatedly on Immowelt) blocks until Claude Code's stdio idle
    # timeout — 30 minutes by default — burning a whole evaluation slot on dead waiting.
    # The .mcp.json per-server "timeout" is the outer backstop; this is the inner one.
    _context.set_default_timeout(DEFAULT_TIMEOUT_MS)
    _context.set_default_navigation_timeout(DEFAULT_TIMEOUT_MS)

    _active_page = await _context.new_page()


async def _get_page() -> Any:
    await _ensure_browser()
    return _active_page


async def _save_storage_state():
    if _context is None:
        return
    path = Path(STORAGE_STATE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    await _context.storage_state(path=str(path))


def _page_info(page: Any) -> dict:
    return {"url": page.url, "title": ""}


async def _page_info_full(page: Any) -> dict:
    try:
        title = await page.title()
    except Exception:
        title = ""
    return {"url": page.url, "title": title}


# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------

mcp = FastMCP("invisible-playwright")


@mcp.tool()
async def navigate_page(url: str) -> str:
    """Navigate the active page to a URL. Returns the page title."""
    page = await _get_page()
    response = await page.goto(url, wait_until="domcontentloaded")
    status = response.status if response else "unknown"
    title = await page.title()
    return json.dumps({"url": page.url, "title": title, "status": status})


@mcp.tool()
async def click(selector: str) -> str:
    """Click an element matching the CSS selector."""
    page = await _get_page()
    await page.click(selector)
    return json.dumps({"clicked": selector})


@mcp.tool()
async def fill(selector: str, value: str) -> str:
    """Clear and fill a form field identified by CSS selector."""
    page = await _get_page()
    await page.fill(selector, value)
    return json.dumps({"filled": selector})


@mcp.tool()
async def type_text(selector: str, text: str, delay: int = 50) -> str:
    """Type text into an element character by character with optional delay (ms)."""
    page = await _get_page()
    await page.type(selector, text, delay=delay)
    return json.dumps({"typed_into": selector, "length": len(text)})


@mcp.tool()
async def press_key(key: str) -> str:
    """Press a keyboard key (e.g. 'Enter', 'Tab', 'ArrowDown')."""
    page = await _get_page()
    await page.keyboard.press(key)
    return json.dumps({"pressed": key})


@mcp.tool()
async def hover(selector: str) -> str:
    """Hover over an element matching the CSS selector."""
    page = await _get_page()
    await page.hover(selector)
    return json.dumps({"hovered": selector})


@mcp.tool()
async def take_screenshot(path: str = "", full_page: bool = False) -> str:
    """Take a screenshot. Returns base64-encoded PNG. Optionally saves to path."""
    page = await _get_page()
    kwargs: dict[str, Any] = {"full_page": full_page}
    if path:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        kwargs["path"] = str(p)
    buf = await page.screenshot(**kwargs)
    return json.dumps({
        "base64": base64.b64encode(buf).decode(),
        "saved_to": path or None,
    })


@mcp.tool()
async def take_snapshot(mode: str = "accessibility") -> str:
    """Get page content. mode='accessibility' returns the a11y tree (compact).
    mode='html' returns raw HTML."""
    page = await _get_page()
    if mode == "html":
        html = await page.content()
        return json.dumps({"html": html[:200000]})
    tree = await page.accessibility.snapshot()
    return json.dumps({"accessibility_tree": tree})


@mcp.tool()
async def evaluate_script(expression: str) -> str:
    """Evaluate a JavaScript expression in the page and return the result."""
    page = await _get_page()
    result = await page.evaluate(expression)
    return json.dumps({"result": result}, default=str)


@mcp.tool()
async def list_pages() -> str:
    """List all open pages with their URLs and titles."""
    await _ensure_browser()
    pages = []
    for ctx in _browser.contexts:
        for p in ctx.pages:
            info = await _page_info_full(p)
            info["is_active"] = (p == _active_page)
            pages.append(info)
    return json.dumps({"pages": pages})


@mcp.tool()
async def new_page(url: str = "") -> str:
    """Open a new page, optionally navigating to a URL. Makes it the active page."""
    global _active_page
    await _ensure_browser()
    _active_page = await _context.new_page()
    if url:
        await _active_page.goto(url, wait_until="domcontentloaded")
    title = await _active_page.title()
    return json.dumps({"url": _active_page.url, "title": title})


@mcp.tool()
async def close_page() -> str:
    """Close the active page. Switches to the last remaining page if any."""
    global _active_page
    await _ensure_browser()
    url = _active_page.url
    await _active_page.close()
    remaining = _context.pages
    if remaining:
        _active_page = remaining[-1]
    else:
        _active_page = await _context.new_page()
    return json.dumps({"closed": url, "active_now": _active_page.url})


@mcp.tool()
async def select_page(index: int = -1, url: str = "") -> str:
    """Switch the active page by index or URL substring match."""
    global _active_page
    await _ensure_browser()
    all_pages = []
    for ctx in _browser.contexts:
        all_pages.extend(ctx.pages)
    if url:
        for p in all_pages:
            if url in p.url:
                _active_page = p
                return json.dumps(await _page_info_full(_active_page))
        return json.dumps({"error": f"No page matching '{url}'"})
    if 0 <= index < len(all_pages):
        _active_page = all_pages[index]
        return json.dumps(await _page_info_full(_active_page))
    return json.dumps({"error": f"Index {index} out of range (have {len(all_pages)} pages)"})


@mcp.tool()
async def wait_for(selector: str, state: str = "visible", timeout: int = 30000) -> str:
    """Wait for an element matching the selector. state: 'visible', 'hidden', 'attached', 'detached'."""
    page = await _get_page()
    await page.wait_for_selector(selector, state=state, timeout=timeout)
    return json.dumps({"found": selector, "state": state})


@mcp.tool()
async def fill_form(fields: dict[str, str]) -> str:
    """Fill multiple form fields. fields is a dict of {selector: value}."""
    page = await _get_page()
    filled = []
    for selector, value in fields.items():
        await page.fill(selector, value)
        filled.append(selector)
    return json.dumps({"filled": filled})


@mcp.tool()
async def save_session() -> str:
    """Persist cookies and storage to disk for reuse across restarts."""
    await _save_storage_state()
    return json.dumps({"saved_to": STORAGE_STATE_PATH})


# ---------------------------------------------------------------------------
# Shutdown hook
# ---------------------------------------------------------------------------

async def _shutdown():
    global _browser, _context, _active_page, _pw_instance
    try:
        await _save_storage_state()
    except Exception:
        pass
    if _pw_instance is not None:
        try:
            await _pw_instance.__aexit__(None, None, None)
        except Exception:
            pass
    _browser = None
    _context = None
    _active_page = None
    _pw_instance = None


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import atexit
    import signal

    def _sync_shutdown():
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(_shutdown())
            else:
                loop.run_until_complete(_shutdown())
        except RuntimeError:
            pass

    atexit.register(_sync_shutdown)
    mcp.run(transport="stdio")
