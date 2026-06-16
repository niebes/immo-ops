# Portal page quirks — how to reach the data per portal

Operational notes for opening listings. General policy (aggregators, CAPTCHA, consent, number format) is in `modes/evaluate.md`; this file holds the concrete per-portal steps/selectors that change more often. Consolidate — one entry per portal-family, merge don't append.

## Süddeutsche Immobilienmarkt (immobilienmarkt.sueddeutsche.de)
Aggregator. The detail page is thin and links out to the real source (Immowelt / OhneMakler / Engel & Völkers / regionalimmobilien24) — open the source and extract there. The aggregator cache goes stale: if the source says "Anzeige gelöscht" / deleted, mark EXPIRED (don't score the cached numbers). Usually no cookie wall blocking content.
**Why:** scoring the cached aggregator page gives wrong/expired data (cost: a false EXPIRED-vs-scored call).

## Regionalimmobilien24 (www.regionalimmobilien24.de)
Bot-blocks headless; CiC only. (1) TCF cookie-consent dialog on first load — click "Ablehnen (Funktionseinschränkung)" (privacy-preserving); remembered in the real browser afterwards. (2) Listing cards LAZY-LOAD — scroll to the bottom and wait ~3 s before reading; re-read if empty. Detail link/id: `article#oid-{id}.list-immoitem`; the canonical detail URL is in `.shariff[data-url]` (the on-page region segment, e.g. /vogtland/, may not match the property's town but still resolves by id). Mixed number format on the card: price/m² German, room count dot-decimal ("3.5 Räume"). Also an aggregator of the same source pool as Süddeutsche → heavy overlap.
**Why:** without consent+scroll the page returns 0 listings; without the source-follow the data is incomplete.

## ImmoScout24 (immobilienscout24.de)
CAPTCHA ("Ich bin kein Roboter") on navigation — wait ~8 s and re-check; most auto-solve. Listing detail pages render fully in the real browser. Same flat is often cross-listed via the aggregators above (and Immowelt) — watch for it being a duplicate of an already-scored entry.
**Why:** asking the user to solve a CAPTCHA that would have auto-solved wastes their attention.
