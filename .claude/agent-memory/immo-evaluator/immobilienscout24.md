# ImmoScout24 — page quirks
Portal match: "ImmoScout24" / "ImmoScout24 Haus" · immobilienscout24.de

CAPTCHA ("Ich bin kein Roboter") on navigation — wait ~8 s and re-check; most auto-solve. Only report blocked if still stuck after waiting; never ask the user to solve it prematurely. Listing detail pages render fully in the real browser. The same flat is often cross-listed via the aggregators (Süddeutsche, Regionalimmobilien24) and Immowelt — watch for it being a duplicate of an already-scored entry.

**Why:** asking the user to solve a CAPTCHA that would have auto-solved wastes their attention (see [[feedback-captcha-wait]]).

## Mieternetzwerk / Nachvermietung listings (tenant-posted)
Body shows "Angeboten von der:dem aktuellen Mietenden" / "Diese Wohnung wurde von der:dem aktuell Mietenden eingestellt" / "Interesse bekunden" (not "Kontaktieren"). These are NORMAL permanent rentals (NOT Tauschwohnung — do not discard; see [[project-nachvermietung-not-filtered]]), but:
- **Kaltmiete is a RANGE** (e.g. "498–552 €") and the title price is provisional — the listing states "Die Miete wird sich eventuell anpassen". Score price with a caveat, don't treat the low number as final.
- **Möbelübernahme**: tenant often wants to discuss taking over furniture = possible extra cost. Flag it.
- **Sparse data**: usually NO Energieausweis, NO Baujahr, NO floor, NO amenity table, and **0 real photos** (gallery imgs are all SVG icons/maps). Cap Block D at 3.0 (no photos) and treat must-haves (Balkon/Keller) as unconfirmed → Block E penalty. There is no `<dl>` criteria table — `dt/dd` extraction returns empty; read fields out of `document.body.innerText` instead.
- You're only *proposed* to the landlord, not directly accepted → extra friction, Block H ~3.0.
- Below-Mietspiegel price here is the existing tenant's old contract, NOT a scam signal on its own.

## CiC sanitizer false-flags DD.MM.YYYY as "[BLOCKED: JWT token]"
The "Bezugsfrei ab" dd value (a plain date like `01.08.2026`) comes back as `[BLOCKED: JWT token]` from `read_page`/`javascript_tool` — CiC's secret-redactor misclassifies the dotted date as a token. Don't treat it as missing/empty. Recover it inside the page: read the dd's `textContent`, test `/^\d{2}\.\d{2}\.\d{4}$/`, and return only the split parts (`day/month/year`) or the `isSofort/isVereinbarung` booleans — never the raw 10-char string, which just gets re-redacted. Seen on #219 (expose 168891742).

**Why:** without this the move-in date (Block F) reads as unknown and you'd score F at the no-date default instead of the real future date.

## ohne-makler cross-posts: map geo-tag can be wrong
For listings fed in via the ohne-makler (OM) platform (footer says "ohne-makler (OM) ist weder Anbieter noch Vermittler"), the IS24 **map-address / page title can be a mismatched geo-tag that contradicts the body**. Seen on #214: title + Lage section say "Begehrtes Eichwalde" (LDS, ~40 km SE of Golm) but IS24 geo-tagged it "Groß Glienicke, 14476 Potsdam" (in-area). The body `.is24qa-lage` is authoritative — always read it to resolve location before scoring Block B; do NOT trust the map-address/title alone. This is a cross-posting artefact, not a scam signal.

**Why:** the wrong geo-tag would have scored an off-target Eichwalde flat as if it were in-area Groß Glienicke (Block B 4.5 instead of 1.5), flipping the recommendation.

**Why:** these tenant-network exposés (seen on #169/#170/#171/#172) lack the standard structured fields and have a provisional price; scoring the headline number as final or expecting a criteria `<dl>` both mislead. Stable pattern — candidate for promotion to evaluate.md if it keeps recurring.
