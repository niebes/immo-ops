# Regionalimmobilien24 — page quirks
Portal match: "Regionalimmobilien24" · www.regionalimmobilien24.de

Bot-blocks headless; CiC (real browser) only.
1. **Consent**: TCF cookie dialog on first load — click "Ablehnen (Funktionseinschränkung)" (privacy-preserving). Remembered in the real browser afterwards, so later runs usually skip it.
2. **Lazy-load**: listing cards only render after scrolling — scroll to the bottom and wait ~3 s before reading; re-read if the result set is empty.
3. **Detail URL/id**: cards are `article#oid-{id}.list-immoitem`; the canonical detail URL is in `.shariff[data-url]`. The region segment in that URL (e.g. `/vogtland/`) may not match the property's town but still resolves by id.
4. **Numbers** on the card are mixed: price/m² German (`1.040,00` / `71,00`), room count dot-decimal (`3.5 Räume`).

Aggregator of the same source pool as Süddeutsche → heavy overlap (cross-portal dedup collapses twins).

**Why:** without consent+scroll the page returns 0 listings; the mixed number format breaks a single-locale parser.
