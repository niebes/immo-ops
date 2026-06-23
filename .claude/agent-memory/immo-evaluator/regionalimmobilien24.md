# Regionalimmobilien24 — page quirks
Portal match: "Regionalimmobilien24" · www.regionalimmobilien24.de

Bot-blocks headless; CiC (real browser) only.
1. **Consent**: TCF cookie dialog on first load — click "Ablehnen (Funktionseinschränkung)" (privacy-preserving). Remembered in the real browser afterwards, so later runs usually skip it.
2. **Lazy-load**: listing cards only render after scrolling — scroll to the bottom and wait ~3 s before reading; re-read if the result set is empty.
3. **Detail URL/id**: cards are `article#oid-{id}.list-immoitem`; the canonical detail URL is in `.shariff[data-url]`. The region segment in that URL (e.g. `/vogtland/`) may not match the property's town but still resolves by id.
4. **Numbers** on the card are mixed: price/m² German (`1.040,00` / `71,00`), room count dot-decimal (`3.5 Räume`).

Aggregator of the same source pool as Süddeutsche → heavy overlap (cross-portal dedup collapses twins).

## Detail page = thin re-list → resolve to source
The `imXXXXXXX/` detail page only carries title, location, Kaltmiete, m², rooms, description, often a single photo. NO Nebenkosten/Warmmiete/Kaution/Energieausweis/Baujahr/Anbieter/floor. Must go to the source for those.
- **Source link**: the visible "zum Objekt" / "Immobilie anfragen" are `<div>`s with no href; the real link is on a hidden `<span data-href="...">` — selector: `[...document.querySelectorAll('span')].map(e=>e.getAttribute('data-href'))`. For the immobilien.de pool it is `https://www.immobilien.de/wohnen/{id}` (same numeric id as `imXXXXXXX`).
- Gallery photo `<img>` src also reveals the source host (e.g. `immobilien.de/srv/obs/.../estate_attachments/{id}/...`).
- **Do NOT guess source URLs** (e.g. `/expose/{id}`) — a wrong navigate triggers a permission-denied prompt. Read the `data-href` first.

## Env caveat (2026-06): immobilien.de domain access-blocked
In the immo-ops Chrome env, navigation to `immobilien.de` succeeded but ALL subsequent tool reads (`javascript_tool`, `read_page`) on that domain returned "Permission denied by user" — could not extract from the source. When this happens, score from the aggregator's thin data, cap Block D at 3.0 (1 photo / condition unverified), mark missing fields "unverified, ask at contact", and note Warmmiete/Energieausweis/must-haves unverified. Not a scam signal — just a data gap.
- A bare query-string-touching JS filter (`a.href` containing `?`) also tripped a `[BLOCKED: Cookie/query string data]` guard — strip `?` with `.split('?')[0]` before returning hrefs.

**Why:** without consent+scroll the page returns 0 listings; the mixed number format breaks a single-locale parser; the detail page is too thin to score without the source, and the source resolves only via the hidden `data-href`.
