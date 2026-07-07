#!/usr/bin/env python3
"""One-time headful login to seed tmp/browser-state.json for invisible-playwright.

Opens the stealth Firefox VISIBLY, navigates to a portal (default ImmoScout24), and
waits for you to log in / accept cookies / solve any challenge. Press Enter in the
terminal to persist the session to IP_STORAGE_STATE. `scan.mjs --invisible` then reuses
that trusted session, which keeps bot defenses cleared under sustained scanning.

Usage:  npm run login:invisible            # ImmoScout24
        npm run login:invisible -- <url>   # some other portal
Requires a display (headful). All prompts print to stderr.
"""
import asyncio
import os
import sys
from pathlib import Path

from invisible_playwright.async_api import InvisiblePlaywright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://www.immobilienscout24.de/"
STATE = os.environ.get("IP_STORAGE_STATE", "tmp/browser-state.json")
LOCALE = os.environ.get("IP_LOCALE", "de-DE")
TIMEZONE = os.environ.get("IP_TIMEZONE", "Europe/Berlin")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


async def main():
    async with InvisiblePlaywright(headless=False, locale=LOCALE, timezone=TIMEZONE) as browser:
        st = Path(STATE)
        if st.exists():
            ctx = await browser.new_context(storage_state=str(st))
        else:
            ctx = await browser.new_context()
        page = await ctx.new_page()
        await page.goto(URL, wait_until="domcontentloaded")

        log("")
        log(f">>> A stealth Firefox window is open at {URL}")
        log(">>> Log in / accept cookies / solve any CAPTCHA in that window.")
        log(">>> When done, press Enter HERE to save the session…")
        await asyncio.get_running_loop().run_in_executor(None, sys.stdin.readline)

        st.parent.mkdir(parents=True, exist_ok=True)
        await ctx.storage_state(path=str(st))
        log(f">>> Saved session to {STATE}")


if __name__ == "__main__":
    asyncio.run(main())
