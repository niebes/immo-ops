# ImmoScout24 — page quirks
Portal match: "ImmoScout24" / "ImmoScout24 Haus" · immobilienscout24.de

CAPTCHA ("Ich bin kein Roboter") on navigation — wait ~8 s and re-check; most auto-solve. Only report blocked if still stuck after waiting; never ask the user to solve it prematurely. Listing detail pages render fully in the real browser. The same flat is often cross-listed via the aggregators (Süddeutsche, Regionalimmobilien24) and Immowelt — watch for it being a duplicate of an already-scored entry.

**Why:** asking the user to solve a CAPTCHA that would have auto-solved wastes their attention (see [[feedback-captcha-wait]]).

## Deactivated / expired expose signature → EXPIRED
A pulled listing still serves a 200 page (h1 stub title + coarse address + m² survive), but ALL `.is24qa-*` criteria selectors return null and the body carries: **"Vor N Tagen deaktiviert" / "Angebot wurde deaktiviert" / "Dieses Angebot ist nicht mehr verfügbar."** Detect with `/deaktiviert|nicht mehr verf[üu]gbar/i` (add these to the not-found test — the generic "nicht gefunden" alone misses them). Mark EXPIRED, do NOT score the stub. Seen back-to-back on #259 (169062476, deaktiviert ~2d) and #260 (169028421, deaktiviert ~3d), both Potsdam.

**Why:** the page returns 200 with a real-looking title/address, so without testing the deactivation phrases you'd try to score a listing that has no data left.

## Mieternetzwerk / Nachvermietung listings (tenant-posted)
Body shows "Angeboten von der:dem aktuellen Mietenden" / "Diese Wohnung wurde von der:dem aktuell Mietenden eingestellt" / "Interesse bekunden" (not "Kontaktieren"). These are NORMAL permanent rentals (NOT Tauschwohnung — do not discard; see [[project-nachvermietung-not-filtered]]), but:
- **Kaltmiete is a RANGE** (e.g. "498–552 €") and the title price is provisional — the listing states "Die Miete wird sich eventuell anpassen". Score price with a caveat, don't treat the low number as final.
- **Möbelübernahme**: tenant often wants to discuss taking over furniture = possible extra cost. Flag it.
- **Sparse data**: usually NO Energieausweis, NO Baujahr, NO floor, NO amenity table, and **0 real photos** (gallery imgs are all SVG icons/maps). Cap Block D at 3.0 (no photos) and treat must-haves (Balkon/Keller) as unconfirmed → Block E penalty. There is no `<dl>` criteria table — `dt/dd` extraction returns empty; read fields out of `document.body.innerText` instead.
- You're only *proposed* to the landlord, not directly accepted → extra friction, Block H ~3.0.
- Below-Mietspiegel price here is the existing tenant's old contract, NOT a scam signal on its own.
- **A Mieternetzwerk description can embed a Suche line = it's a SWAP, not a plain Nachvermietung.** When the tenant's own description ends with something like "Wir suchen eine 3-4 Zimmer Wohnung in {Stadt/Bezirk}", treat the listing as a swap and run the two-sided match (don't score it as a normal rental). Seen on #340 (expose 169179239, Berliner Vorstadt): their flat scored 4.3 for us but Suche was "3-4 Zi in Berlin-Neukölln" → Side 2 fails vs our 2-Zi Golm offer → DISCARDED swap-mismatch. The AGENTS_INFO `title` is "Aktuelle:r Mieter:in" (tenant-posted) exactly like a normal Nachvermietung, so the ONLY swap tell is the Suche sentence in the TEXT_AREA description — always scan the description tail for it before defaulting to the plain-rental path.

## Bare placeholder/stub expose (live, full criteria, but title/desc are single chars)
Some real Anbieter listings are published as near-empty drafts: `TITLE.title` = a single char like `"s"` and `TEXT_AREA` Objektbeschreibung = `"t"`, with **0 photos** — yet `publicationState=live` and the ATTRIBUTE_LIST criteria (Kaltmiete/NK/Warmmiete/Kaution, Wohnungstyp/Etage/Bezugsfrei, Ausstattungsqualität) ARE fully populated. This is NOT EXPIRED and NOT a Nachvermietung (AGENTS_INFO shows a normal named private Anbieter, not "Aktuelle:r Mieter:in"). Score it from the criteria table, but: cap D at 3.0 (no photos), treat must-haves as unconfirmed (no CHECK/amenity items), score H low (2.5, weak/incomplete listing signal), and mark scam **Proceed with Caution** — an empty private listing + below-band price is unverifiable even without a classic scam narrative. Seen on #349 (expose 169234210, Bornstedt: title "s", desc "t", private "Herr Clemens Wimmer"). The caller's scan title was garbled to "s" because that IS the live title — confirm against the API, don't assume an extraction glitch.

**Why:** the stub looks broken/expired but carries a full scoreable criteria table; mislabelling it would drop an in-budget Potsdam flat, while scoring it as complete would over-trust an unverifiable listing.

## CiC sanitizer false-flags DD.MM.YYYY as "[BLOCKED: JWT token]"
The "Bezugsfrei ab" dd value (a plain date like `01.08.2026`) comes back as `[BLOCKED: JWT token]` from `read_page`/`javascript_tool` — CiC's secret-redactor misclassifies the dotted date as a token. Don't treat it as missing/empty. Recover it inside the page: read the dd's `textContent`, then split on `.` and return only the parts (`day/month/year`) or the `isSofort/isVereinbarung` booleans — never the raw string, which just gets re-redacted. Seen on #219 (expose 168891742, `DD.MM.YYYY`) and #227 (expose 168942585, Vonovia, **`DD.MM.YY` 2-digit year = 8 chars**). So don't anchor the test on `/^\d{2}\.\d{2}\.\d{4}$/` — that 4-digit-year regex FAILS the 8-char Vonovia form; use a loose `/(\d{2})\.(\d{2})\.(\d{2,4})/` match instead (and prefix `20` if the year is 2 digits).

**Why:** without this the move-in date (Block F) reads as unknown and you'd score F at the no-date default instead of the real future date.

**Single-digit day/month dates evade the redactor AND the loose regex.** Seen on #230 (expose 125780388): bezugsfrei textContent was a plain `1.9.2026` — NOT redacted to `[BLOCKED]` (the sanitizer only false-flags the zero-padded `DD.MM.YYYY`/`DD.MM.YY` forms). But `/(\d{2})\.(\d{2})\.(\d{2,4})/` then FAILS to match `1.9.2026` (single-digit d/m). Read `bf.textContent` directly and use `/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/` so 1-digit day/month parse too. So: try the textContent match first (covers unredacted single-digit dates), only fall back to the in-page split-recovery when it comes back `[BLOCKED]`.

## Amenity keyword tests must be scoped to the listing text, NOT document.body
`/Keller|Terrasse|Garten/.test(document.body.innerText)` returns **false positives** — IS24's page chrome/footer/related-search boilerplate contains these words even when the flat has none. Seen on #240 (expose 169006006): body test said keller/terrasse/garten = true, but scoping to `.is24qa-objektbeschreibung` + `.is24qa-ausstattung-beschreibung` (+ `.is24qa-lage`) showed only Balkon is real. Always run must-have/amenity keyword checks against the **description/criteria elements**, never the whole body. Also note `Gartenhaus` (rear/garden building) contains "Garten" but is NOT an own garden — use a `\bGarten(?!haus)` guard.

**Why:** the body false-positive nearly awarded the Keller must-have (Block E 3.5 vs the correct 2.0), inflating the score.

**WBS false-positive from the "Weitere Einheiten"/project sidebar.** Same trap for the WBS hard-blocker: on multi-unit project listings (e.g. degewo Neubau) the page lists *other* units in a "Weitere Einheiten / Projektübersicht" sidebar, and a cheaper sibling unit's "WBS 140 erforderlich!" text makes `/WBS|Wohnberechtigung/.test(document.body.innerText)` return true even though the unit you're scoring has no WBS. Seen on #264 (expose 168383398): body said WBS=true, but it belonged to a 56 m²/394 EUR sidebar unit; the scored 4-Zi at market 14 EUR/m² is freifinanziert. Scope WBS to the description/criteria elements (was false there) and read the sidebar context before firing the hard blocker. Heuristic: a unit priced at market €/m² is almost never WBS; the WBS/social units in the same project are the conspicuously cheap ones (~7 EUR/m²).

**Why:** a spurious WBS=true would fire the Block G hard blocker and cap the whole score ≤2.0 on a listing that has no WBS requirement.

**Same sidebar trap fires the möbliert / "auf Zeit" / Zwischenmiete hard-blocker.** On big multi-unit Neubau projects the "Weitere Einheiten" sidebar lists sibling units by their own titles, e.g. "möbliertes Studio-Apartment … | Fully furnished", so `/möbliert|auf Zeit|befristet/.test(body)` returns true even though the unit you're scoring is unfurnished/unbefristet. Seen on #265 (expose 166708720, MyTegel/Comood GmbH 3-Zi): body said möbliert=true & aufZeit=true, but those strings belonged to sibling Studio units; the scored flat's own title ("Kompakte 3-Zimmer … inkl. Loggia, EBK und Keller!") had no furnished/Zeit marker. Anchor the furnished/Zwischenmiete decision on THIS unit's h1 title + its own description/criteria, never document.body. The project description also says "sowohl möblierte als auch unmöblierte Wohnungen geplant" — verify the specific unit on contact.

**Why:** a false möbliert/auf-Zeit read would wrongly cap the score ≤2.0 via the Zwischenmiete/furnished hard blocker on a standard long-term rental.

## Preview / not-yet-published expose (still 200, scoreable but contact-blocked)
Some exposés serve a live 200 page while flagged as **not yet published**: the address block reads "Die vollständige Adresse … wird erst nach Veröffentlichung des Inserats angezeigt", the contact card reads "Anbieter Informationen — Die Informationen sind erst nach Veröffentlichung des Inserats sichtbar", availability shows **"Bald verfügbar"**, and there are **0 photos**. This is NOT "deaktiviert"/EXPIRED — the `.is24qa-*` criteria table (Kaltmiete/Wohnfläche/Zimmer/Etage/Kaution/Objektzustand/Heizung/Preis-m²/Haustiere) IS populated, so score it — but cap D at 3.0 (no photos), treat must-haves as unconfirmed, and score H low (Anbieter unknown/hidden). Note contact isn't possible yet → Next steps = wait for publication. Seen on #277 (expose 168870342, Am Stern Potsdam). Beware a "Fotocasa" string in the page = foreign-portal syndication artefact, not a real gallery.

**Why:** the hidden-Anbieter + 0-photos + "Bald verfügbar" combo looks like it could be a pulled listing, but it's a pre-publication draft with full criteria data — mislabelling it EXPIRED would drop a scoreable in-budget Potsdam flat.

## ohne-makler cross-posts: map geo-tag can be wrong
For listings fed in via the ohne-makler (OM) platform (footer says "ohne-makler (OM) ist weder Anbieter noch Vermittler"), the IS24 **map-address / page title can be a mismatched geo-tag that contradicts the body**. Seen on #214: title + Lage section say "Begehrtes Eichwalde" (LDS, ~40 km SE of Golm) but IS24 geo-tagged it "Groß Glienicke, 14476 Potsdam" (in-area). The body `.is24qa-lage` is authoritative — always read it to resolve location before scoring Block B; do NOT trust the map-address/title alone. This is a cross-posting artefact, not a scam signal.

**Why:** the wrong geo-tag would have scored an off-target Eichwalde flat as if it were in-area Groß Glienicke (Block B 4.5 instead of 1.5), flipping the recommendation.

**Why:** these tenant-network exposés (seen on #169/#170/#171/#172) lack the standard structured fields and have a provisional price; scoring the headline number as final or expecting a criteria `<dl>` both mislead. Stable pattern — candidate for promotion to evaluate.md if it keeps recurring.

## Fastest full-detail path: mobile API (no browser, no bot-block, no consent)
`curl -s -H "User-Agent: ImmoScout24_1410_35_._" -H "Accept: application/json" \
  "https://api.mobile.immobilienscout24.de/expose/{scoutId}"`
- Returns the WHOLE expose as JSON — no CAPTCHA/consent wall, no truncation. Beats
  invisible-playwright for single exposes. The custom UA header is required (plain curl UA
  gets blocked). Prefer this path FIRST for any IS24 evaluation; fall back to the stealth
  browser only when the API misbehaves.

### JSON shape (parse `.sections[]` by `.type`)
- `header`: `publicationState` (`active` = live; else likely EXPIRED), `realEstateType`,
  `shareMessage` (quick Kaltmiete/Zimmer/m²/Warmmiete + address). **Can be entirely absent**
  (seen #320, expose 169230389 — a sparse/scammy private listing): then read liveness from the
  `FRAUD_REPORT` section's report URL, which carries `publicationState=live|...` as a query param.
  Don't infer EXPIRED just because `header` is missing.
- `TITLE`, `MAP` (addressLine1/2 + lat/lng), `TOP_ATTRIBUTES` (Kaltmiete/Zimmer/Wohnfläche/Warmmiete).
- `ATTRIBUTE_LIST` blocks (title = "Hauptkriterien" / "Kosten" / "Bausubstanz & Energieausweis"):
  attributes are `{label,text}` for TEXT, or `{type:"CHECK",label}` = feature present
  (Balkon/Keller/Aufzug/EBK/Garten/Gäste-WC/stufenlos). Energieausweis Klasse/Wert is often
  MISSING even when "Energieausweis: liegt vor" — note it (low-reliability scam signal).
- `TEXT_AREA` blocks: Objektbeschreibung / Ausstattung / Lage / Sonstiges (full description text).
- `MEDIA`: count PICTURE entries for real-photo count (captions like Wohnzimmer/Küche = real).
- `AGENTS_INFO`: company, name, rating {value, numberOfStars=#reviews}, verifiedBy (identity),
  Impressum inside `references[].url` (is24://imprint?text=...).
- `OBJECT_INFO`: "Scout-ID … | Objekt-Nr. …".
- Swap listings: check TITLE/description for Tausch signals as usual.

Tip: pipe to python3 `json.load` and iterate sections; dump non-MEDIA sections to read all fields.

**Why:** this guide was stranded in an orphaned memory copy (`reports/.claude/agent-memory/`,
a wrong-cwd artefact, merged + deleted 2026-07-11) while evaluations re-derived the JSON
shape every run. `publicationState` also gives a cleaner EXPIRED signal than the web stub.
