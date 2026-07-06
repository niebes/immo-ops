---
name: immo-portal
description: Set up a new portal source — discover URL, build extractor, register, verify
user_invocable: true
args: target
argument-hint: "[portal URL or name]"
---

# immo-portal — New Portal Setup

Sets up a new real estate portal for automated scanning. Takes a URL or portal name, discovers the correct search page, analyzes the DOM, generates a playwright extractor, registers it, and verifies it works.

## Input

- **URL**: Direct link to a portal's search/listing page
- **Portal name**: Name of a portal (e.g., "Wohnungsboerse.net") — skill will find the right search URL
- **Search group**: Which search group in `portals.yml` to add it to (default: ask user)

## Workflow

### Step 1 — Find the right URL

If the user provides a portal name without URL, search for it and find the listing/search page.

**URL requirements:**
- Must be a **search results page** showing listings, not a landing/marketing page
- Must be filtered for the correct property type (Grundstück, Wohnung, Haus) and location — use the target search group's location from `portals.yml` (`scan_defaults`) / `config/profile.yml`
- Must be **sorted by date (newest first)** — look for `sort=date`, `sortBy=createdAt`, `sorting=2` (newest), `sortingOptions[]=PUBLISHED_AT_DESC`, or equivalent URL parameter
- If the portal has no sort-by-date URL parameter, note this in the portal config

**How to find the URL:**
1. Navigate to the portal's homepage via CiC
2. Use the search/filter UI to set: location (the target search group's location), property type (Grundstück/Haus/Wohnung), sort by newest
3. Copy the resulting URL from the address bar — this is the `search_url`

### Step 2 — Verify page loads

1. Create a CiC tab via `tabs_create_mcp`
2. Navigate to the URL
3. Dismiss cookie consent if present
4. Verify the page shows listing results (prices, m², property cards)
5. If 404 or empty: try alternative URLs, check if the portal requires form submission or has a different URL structure

### Step 3 — Analyze DOM structure

Use CiC `read_page` and `find` to identify:

**Listing container:** What wraps each listing? Look for:
- `article` elements
- `a[href*="/expose/"]`, `a[href*="/detail/"]`, `a[href*="/immobilie/"]`
- `div` with classes like `card`, `listing`, `result`, `property`, `object`
- `data-testid` attributes
- Grid items with price + m² text

**Per-listing fields:**
| Field | What to look for |
|-------|-----------------|
| title | `h2`, `h3`, `h4`, `[class*=title]`, `img[alt]`, link text |
| url | `a[href]` pointing to detail/expose page |
| price | Text matching `\d+[\d.]*\s*€` or `\d+[\d.]*\s*EUR` |
| m2 | Text matching `\d+[\d,]*\s*m²` |
| rooms | Text matching `\d+\s*Zi` or `\d+\s*Zimmer` |
| location | Address text, PLZ, city name |

**Pagination:** How to get the next page?
- `a[rel="next"]`
- Button with "Nächste", "next", "»"
- URL parameter `page=N` or `paged=N`
- Infinite scroll (rare — note if found)

**Special behaviors:**
- Does the page require form submission before listings appear? (like BVVG)
- Does it need extra wait time for client-side rendering? (like Engel & Völkers)
- Is there a cookie/privacy overlay blocking interaction?

### Step 4 — Try generic extractor first

Before writing a custom extractor, test if the generic extractor works. Add a provisional `portals.yml` entry (Step 7) first, then:

```bash
node scripts/scan.mjs --portal "{Portal Name}" --group "{Search Group}" --dry-run
```

`--dry-run` writes nothing; it prints per-page extraction counts and the new listings found (title, price, m², rooms). Limitation: the "New listings" list only shows URLs NOT already in `scan-history.tsv` — if everything on the page has been seen before, you only get counts ("page 1: N listings (N already seen)"), which still confirms the extractor finds cards but not field quality. If the generic extractor finds listings with correct titles, prices, and URLs — skip to Step 6. No custom extractor needed.

### Step 5 — Generate custom extractor

Create `scripts/portals/{kebab-name}.mjs` with two exported functions:

```javascript
export async function extract(page) {
  // Optional: wait for dynamic content
  // await page.waitForSelector('...', { timeout: 10000 }).catch(() => {});

  // Optional: submit form if needed (like BVVG)
  // await page.evaluate(() => { document.querySelector('form').submit(); });
  // await page.waitForTimeout(5000);

  return page.evaluate(() => {
    const cards = document.querySelectorAll('{container_selector}');
    const seen = new Set();
    return Array.from(cards).map(card => {
      const link = card.querySelector('{link_selector}');
      if (!link || seen.has(link.href)) return null;
      seen.add(link.href);
      const text = card.textContent || '';
      const priceMatch = text.match(/([\d.]+)\s*€/);
      const m2Match = text.match(/([\d.,]+)\s*m²/);
      return {
        title: (card.querySelector('{title_selector}')?.textContent?.trim() || '').substring(0, 120),
        url: link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: '',
        portal: '{Portal Name}',
      };
    }).filter(Boolean);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('{next_selector}').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
```

**Rules for extractors:**
- All DOM access must be inside `page.evaluate()` — no Node.js APIs inside the browser context
- Never use `location` as a variable name (conflicts with browser global) — use `loc` instead
- Use `window.location.origin` (not `location.origin`) for URL resolution
- Deduplicate by URL with a `Set`
- Filter out null/empty entries with `.filter(Boolean)`
- Truncate titles to 120 chars
- Parse prices by removing `.` thousand separators, then `parseFloat`
- Parse m² by removing `.` thousands and replacing `,` with `.`
- Return `portal` field matching the portal name in `portals.yml`

### Step 6 — Register extractor

Add to `scripts/portals/index.mjs`:

1. Import statement at top (before `generic`):
   ```javascript
   import { extract as myPortal, nextPage as myPortalNext } from './{kebab-name}.mjs';
   ```

2. Entry in `PORTAL_MAP` array (before the closing `]`):
   ```javascript
   { pattern: '{match-pattern}', extract: myPortal, nextPage: myPortalNext },
   ```

The `pattern` is matched case-insensitively against the portal name in `portals.yml`.

### Step 7 — Add to portals.yml

Add entry under the correct search group's `portals:` list:

```yaml
- name: "{Portal Name}"
  enabled: true
  scan_method: playwright    # or cic
  search_url: "{url sorted by newest}"
  rate_limit: 3
  notes: "{one-line description of what was found during setup}"
```

For `scan_method`:
- `playwright` — works headlessly (most portals)
- `cic` — needs real browser (CAPTCHA, heavy SPAs that don't render headlessly)

### Step 8 — Verify

Run verification:
```bash
node scripts/scan.mjs --portal "{Portal Name}" --group "{Search Group}" --dry-run
```
(Writes nothing. See the Step 4 note: listings already in `scan-history.tsv` show up only as "already seen" counts, not as printed rows.)

Check:
- [ ] No ⛔ failure recorded for the portal (CAPTCHA / bot-block / extractor error)
- [ ] Listing count > 0 (per-page log: "page 1: N listings")
- [ ] Sample listing has: title (not empty, not "Details"), URL (absolute, to detail page), price (number or null if "auf Anfrage")
- [ ] Pagination works (if portal has multiple pages)

If verification fails, go back to Step 3 and re-analyze the DOM. Common issues:
- Cookie overlay blocking extraction → dismiss in extractor or add to `base.mjs` consent selectors
- SPA not rendered → add `waitForSelector` or increase wait time
- Wrong container selector → check with CiC `find` tool
- Price parsing wrong (e.g., `1113.00` becoming `111300`) → check if dots are thousands or decimals

### Step 9 — Cleanup

Close any CiC tabs created during setup.

## Tools Used

| Tool | When |
|------|------|
| CiC tabs_create/navigate/read_page/find | Steps 1-3: discover URL, analyze DOM |
| Write | Step 5: create extractor file |
| Edit | Step 6: register in index.mjs |
| Edit | Step 7: add to portals.yml |
| Bash | Step 8: run verification script |
| CiC tabs_close | Step 9: cleanup |

## Reference: Existing Extractors

Check `scripts/portals/` for examples of every pattern:
- **Simple cards**: `ohne-makler.mjs`, `blb.mjs`, `stadt-potsdam.mjs`
- **Table/row-based**: `zwangsversteigerung.mjs`, `dga.mjs`
- **SPA with data-testid**: `engel-voelkers.mjs`
- **Form submission required**: `bvvg.mjs`
- **Multi-link dedup**: `bvbi.mjs` (3 links per card, filter by text content)
- **Custom price format**: `ivd24.mjs` (dot as decimal in m²)

CiC snippets (for `scan_method: cic` portals — a `{portal-slug}-cic.js` returning `{count, hasNextPage, listings}`, NOT registered in `index.mjs`; the scan workflow derives the path from the portal name):
- **Structured per-card via data-testid**: `immoscout24-cic.js` (gallery-slide id cross-check guards URL↔metadata desync)
- **Label/value card rows**: `semmelhaack-cic.js`
- **`.s-card` marketplace**: `ebay-cic.js`
- **Consent + lazy-load + share-link URL**: `regionalimmobilien24-cic.js`

## CiC extractor-building gotchas (hard-won)

Read these before analyzing a CiC portal's DOM — they cost real time to rediscover:

- **The CiC tool truncates returned strings at ~1100 chars** and **blocks** any return value containing a query string, base64, or the words cookie/consent. So: during DOM analysis return only small, sanitized values (URL *pathnames*, counts, short samples) — never dump full hrefs-with-query or big blobs. To extract a full result set, stash it on `window.__scan` and pull it in batches of ~4, or compute IDs in-page and diff against `scan-history.tsv` before processing.
- **Pair every field with the URL from the SAME card-scoped element**, and cross-check the listing id from an unambiguous per-card token (e.g. a gallery-slide `data-testid`, an `article[id]`, a `.shariff[data-url]`). Regexing the whole card's `innerText` for price/m² while taking the URL from the first anchor causes the **URL↔metadata desync bug** (see `immoscout24-cic.js` header). Skip/flag cards where the two ids disagree.
- **Number format is per-site and sometimes per-field.** German (`1.443,87` / `80,5`) vs US (`1,443.87` / `80.5`), and a single card can mix them (Regionalimmobilien24: price German, rooms dot-decimal `3.5 Räume`). Parse locale-robustly; for room counts treat dot OR comma as decimal (never thousands).
- **Consent + lazy-load.** Many SPA portals render nothing until the TCF consent dialog is dismissed (click "Ablehnen" — privacy-preserving) AND the page is scrolled (cards lazy-load). In the real browser the consent choice is remembered across runs. Document both in the snippet header and `portals.yml notes:`.
- **Aggregators** (Süddeutsche, Regionalimmobilien24) carry the canonical source URL in a share element (`.shariff[data-url]`) or a slug link; the listing id is usually in an `article[id^="oid-"]`. The evaluator follows these to the source — extract the cleanest detail URL the page exposes.
- **Verification harness.** `node scripts/scan.mjs --portal "{name}" --group "{group}" --dry-run` works for any group. If you need to inspect full field values for already-seen listings (dry-run only prints NEW ones), write a ~15-line throwaway harness that mirrors `scan.mjs`: `import { getExtractor }`, `import { handleCookieConsent }`, launch chromium, goto, consent, `extract(page)`, print; then delete it.
- **"Premium"/promoted cards** may have no title in the SERP (empty heading, id-only URL). Don't drop a card that has a URL + price/size for a blank title — synthesize a placeholder title; the evaluator gets the real one from the detail page.
