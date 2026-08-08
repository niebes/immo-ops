#!/usr/bin/env python3
"""Line-protocol browser driver over InvisiblePlaywright (patched stealth Firefox).

Used by `node scripts/scan.mjs --invisible` as the browser backend for the existing
CiC extractor snippets (scripts/portals/*-extract.js). Keeps ONE stealth browser open and
answers newline-delimited JSON commands on stdin, replying one JSON line per command
on stdout. stdout is the protocol channel — ALL diagnostics go to stderr.

This mirrors the CDP path in scan.mjs (runSnippetScan): the same snippet string is run
via page.evaluate and must return the compact {c,n,L} JSON. The difference is only the
browser: a stealth Firefox that gets past bot defenses which block headless Chromium,
instead of the persistent debug Chrome over CDP.

Protocol:
  → {"cmd":"eval","url":<str>,"snippet":<str>}
      navigate → dismiss consent → wait out a bot-block ("Ich bin kein Roboter") →
      scroll (lazy-load) → run snippet via page.evaluate → retry once on a 0-count.
    ← {"ok":true,"result":<str|null>,"blocked":<bool>}
  → {"cmd":"quit"}
    ← {"ok":true}   then persist storage_state and exit.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from invisible_playwright.async_api import InvisiblePlaywright

HEADLESS = os.environ.get("IP_HEADLESS", "true").lower() == "true"
LOCALE = os.environ.get("IP_LOCALE", "de-DE")
TIMEZONE = os.environ.get("IP_TIMEZONE", "Europe/Berlin")
STATE = os.environ.get("IP_STORAGE_STATE", "tmp/browser-state.json")

CAPTCHA_MARKERS = (
    "Ich bin kein Roboter", "Are you a robot", "captcha",
    "Please verify you are a human",
)
# Mirrors scripts/portals/base.mjs CONSENT_SELECTORS (kept in sync by hand).
CONSENT_SELECTORS = [
    'button:has-text("Alle akzeptieren")',
    'button:has-text("Alle Cookies akzeptieren")',
    'button:has-text("Akzeptieren")',
    'button:has-text("Zustimmen")',
    'button:has-text("Accept all")',
    'button:has-text("Alle Cookies zulassen")',
    '#onetrust-accept-btn-handler',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
]


def out(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def log(*a):
    print(*a, file=sys.stderr, flush=True)


async def dismiss_consent(page):
    for sel in CONSENT_SELECTORS:
        try:
            btn = page.locator(sel).first
            if await btn.is_visible(timeout=1200):
                await btn.click()
                await page.wait_for_timeout(800)
                return
        except Exception:
            pass


async def is_blocked(page):
    try:
        title = (await page.title()) or ""
        if any(m.lower() in title.lower() for m in CAPTCHA_MARKERS):
            return True
        body = (await page.inner_text("body"))[:4000]
        return any(m in body for m in CAPTCHA_MARKERS)
    except Exception:
        return False


async def do_eval(ctx, cmd):
    url = cmd["url"]
    snippet = cmd["snippet"]
    page = await ctx.new_page()
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(2500)
        await dismiss_consent(page)

        # Bot-block wait loop — the stealth profile usually clears it after a short
        # wait (this is exactly the auto-clear observed on IS24). Mirrors the CDP
        # path's CAPTCHA loop.
        blocked = await is_blocked(page)
        attempt = 0
        while blocked and attempt < 4:
            log(f"  … bot-block — waiting 8s ({attempt + 1}/4)")
            await page.wait_for_timeout(8000)
            try:
                await page.reload(wait_until="domcontentloaded")
            except Exception:
                pass
            await dismiss_consent(page)
            blocked = await is_blocked(page)
            attempt += 1
        if blocked:
            return {"ok": True, "result": None, "blocked": True}

        # Lazy-load nudge, then run the extractor snippet.
        # WHY the `() => (...)` wrap: on Firefox, page.evaluate of a STRING is executed
        # via in-page eval(), which a strict page CSP (e.g. Vonovia's JSON-API response)
        # blocks — "call to eval() blocked by CSP". Passing a FUNCTION instead routes
        # through Playwright's callFunction path, which is not subject to the page CSP
        # (this is what Chromium's CDP Runtime.evaluate does implicitly). The snippets
        # are IIFE expressions, so wrapping them in an arrow function is transparent.
        try:
            await page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
        except Exception:
            pass
        await page.wait_for_timeout(1500)

        try:
            result = await page.evaluate(f"() => ({snippet})")
        except Exception as e:
            log(f"  ⚠ evaluate error: {e}")
            return {"ok": True, "result": None, "blocked": False}

        # Retry once on a 0-count (lazy-load portals sometimes need a second pass).
        # Snippets return either the compact {c,n,L} wrapper or the older verbose
        # {count,hasNextPage,listings} form — read both, or a verbose snippet never
        # gets its lazy-load retry.
        try:
            parsed = json.loads(result) if result else {}
            count = parsed.get("c", parsed.get("count", 0))
            if result and count == 0:
                await page.wait_for_timeout(3000)
                result = await page.evaluate(f"() => ({snippet})")
        except Exception:
            pass

        return {"ok": True, "result": result, "blocked": False}
    finally:
        await page.close()


async def save_state(ctx):
    st = Path(STATE)
    try:
        st.parent.mkdir(parents=True, exist_ok=True)
        await ctx.storage_state(path=str(st))
    except Exception as e:
        log(f"  ⚠ could not save storage state: {e}")


async def main():
    # devtools.jsonview.enabled=False: when a portal's search_url IS a JSON API (Vonovia),
    # Firefox otherwise renders it in its built-in JSON viewer, which runs under a strict
    # BROWSER-internal CSP that blocks page.evaluate's eval ("call to eval() blocked by
    # CSP") — immune to bypass_csp and to stripping the response header. Disabling the
    # viewer makes Firefox show the raw JSON as a normal text document, so evaluate works.
    async with InvisiblePlaywright(headless=HEADLESS, locale=LOCALE, timezone=TIMEZONE,
                                   extra_prefs={"devtools.jsonview.enabled": False}) as browser:
        st = Path(STATE)
        if st.exists():
            ctx = await browser.new_context(storage_state=str(st), bypass_csp=True)
        else:
            ctx = await browser.new_context(bypass_csp=True)

        out({"ready": True})  # signals scan.mjs the browser is up

        loop = asyncio.get_running_loop()
        while True:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:  # stdin closed
                break
            line = line.strip()
            if not line:
                continue
            try:
                cmd = json.loads(line)
            except Exception as e:
                out({"ok": False, "error": f"bad json: {e}"})
                continue

            action = cmd.get("cmd")
            if action == "quit":
                await save_state(ctx)
                out({"ok": True})
                break
            elif action == "eval":
                try:
                    out(await do_eval(ctx, cmd))
                except Exception as e:
                    out({"ok": False, "error": str(e)})
            else:
                out({"ok": False, "error": f"unknown cmd: {action}"})


if __name__ == "__main__":
    asyncio.run(main())
