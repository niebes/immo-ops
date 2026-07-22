# ImmoScout24 — page quirks
Portal match: "ImmoScout24" / "ImmoScout24 Haus" · immobilienscout24.de

CAPTCHA ("Ich bin kein Roboter") on navigation — wait ~8 s and re-check; most auto-solve. Only report blocked if still stuck after waiting; never ask the user to solve it prematurely. Listing detail pages render fully in the real browser. The same flat is often cross-listed via the aggregators (Süddeutsche, Regionalimmobilien24) and Immowelt — watch for it being a duplicate of an already-scored entry.

**Why:** asking the user to solve a CAPTCHA that would have auto-solved wastes their attention (see [[feedback-captcha-wait]]).

## Mobile-API **404 `ERROR_RESOURCE_NOT_FOUND`** = removed exposé → EXPIRED (distinct from "deaktiviert")
A 404 from `api.mobile.immobilienscout24.de/expose/{id}` returns a JSON `{"error": "... Request failed
with 404 ... ERROR_RESOURCE_NOT_FOUND"}` — the record is **gone entirely**, not merely deactivated (the
deactivation case still serves a 200 web stub, see below). Mark EXPIRED. **Before you do, run a control
curl against a known-live exposé** (e.g. 166248960 / 164714919) with the same UA: it proves the API path,
the UA header and the housebuy exposé class all still work, so the 404 is listing-specific and not a
transport/UA regression. Both UA variants (`ImmoScout24_1410_30_._`, `_35_._`) behave identically — the
minor version doesn't matter. Seen on #371 (expose 166999630, Eiche/Potsdam Hauskauf).
**Why:** without the control test you can't distinguish "this listing is dead" from "IS24 changed the API
and every evaluation in this batch is about to be mislabelled EXPIRED".

### Don't run the deaktiviert/expired regex against the bot-wall page
Plain curl to the web exposé returns **HTTP 401 + the "Ich bin kein Roboter" page**, whose *own* text
contains "…hast du die Cookies für unsere Seite **deaktiviert**" and "JavaScript deaktiviert". So
`/deaktiviert|nicht mehr verfügbar/i` matches the CAPTCHA page and fakes an expired-listing signature.
Gate the expired test on a 200 status AND the absence of "Ich bin kein Roboter" before trusting it.
**Why:** the false match would confirm EXPIRED for the wrong reason and hide a still-live listing behind
a mere bot block.

## Deactivated / expired expose signature → EXPIRED
A pulled listing still serves a 200 page (h1 stub title + coarse address + m² survive), but ALL `.is24qa-*` criteria selectors return null and the body carries: **"Vor N Tagen deaktiviert" / "Angebot wurde deaktiviert" / "Dieses Angebot ist nicht mehr verfügbar."** Detect with `/deaktiviert|nicht mehr verf[üu]gbar/i` (add these to the not-found test — the generic "nicht gefunden" alone misses them). Mark EXPIRED, do NOT score the stub. Seen back-to-back on #259 (169062476, deaktiviert ~2d) and #260 (169028421, deaktiviert ~3d), both Potsdam.

**Why:** the page returns 200 with a real-looking title/address, so without testing the deactivation phrases you'd try to score a listing that has no data left.

## Mieternetzwerk / Nachvermietung listings (tenant-posted)
**Detect from the mobile API in one step:** a `TAG_LIST` section with `tags[].id == "TENANT_NETWORK"`
(the `tag` text carries the move-in hint, e.g. "Nachvermietung ab Oktober" — often the ONLY
availability data, since there's no `Bezugsfrei ab` attribute). Corroborators: `AGENTS_INFO.title`
= "Aktuelle:r Mieter:in", `TEXT_AREA.subtitle` = "Objektbeschreibung von der:dem Mieter:in", and a
`TEXT_AREA.notice` spelling out the vorgeschlagen/Mietanpassung/Möbelübernahme trio. Also expect NO
`ATTRIBUTE_LIST` section at all — Kaltmiete/Warmmiete come only from `TOP_ATTRIBUTES` as **ranges**
("498–552 €" / "712–788 €"), and `PRICE_INFO.priceBar` gives the EUR/m² + local comparison band
(`minSimilarPrice`–`maxSimilarPrice`), which is the cleanest Mietspiegel/scam-price check available
for these. Seen on #362 (expose 169397785, Waldstadt II).
**Why:** the TAG_LIST id identifies the listing class before you go looking for a criteria table
that doesn't exist, and priceBar substitutes for the missing Mietspiegel data.

On the web page, body shows "Angeboten von der:dem aktuellen Mietenden" / "Diese Wohnung wurde von der:dem aktuell Mietenden eingestellt" / "Interesse bekunden" (not "Kontaktieren"). These are NORMAL permanent rentals (NOT Tauschwohnung — do not discard; see [[project-nachvermietung-not-filtered]]), but:
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

## Geo-tag can name a DIFFERENT MUNICIPALITY than the text — and the Telekom leak may back the wrong one
Generalises the ohne-makler note below: it is not only a cross-posting artefact. On ordinary
Makler exposés the geo-tag is set to the **more marketable neighbouring Ortsteil**, which is how
out-of-area houses enter an area-filtered scan. #389 (expose 167279144) is geo-tagged
`obj_regio2 Potsdam / obj_regio3 Nördliche_Ortsteile / obj_regio4 Fahrland` + "14476 Fahrland,
Potsdam", while BOTH TEXT_AREAs say **"Wustermark OT Buchow-Karpzow"** (Landkreis Havelland) —
a different *Gemeinde*, not just a different quarter. The Objektbeschreibung's very first
sentence was the tell: *"Das Objekt ist in Wustermark OT Buchow-Karpzow, Grenze zu Kartzow."*
**So: read the first line of Objektbeschreibung AND the Lage text before trusting the search
metadata's Ort — on every Kauf exposé, not just ohne-makler ones.**
- **The `obj_telekomInternetUrlAddition` base64 address can corroborate the WRONG location.**
  The section below sells it as the address leak; here it decoded to `Kartzower Dorfstr. 28,
  14476 Potsdam` — i.e. it matched the *geo-tag*, not the text. It is the broadband check-point
  the Anbieter typed, so on a boundary property it can sit in the neighbouring municipality.
  Treat it as a hint that **loses to the TEXT_AREAs** when they conflict, never as a tie-breaker.
- Consequence to score: check the named Gemeinde against `preferred_areas`/`acceptable_areas`
  **and** `excluded_areas`. An unlisted-but-not-excluded municipality is **no hard blocker** —
  score Block B down (#389: 2,5) and make the Gemeindezugehörigkeit Next-step #1. Say explicitly
  what the score would have been at the advertised location (#389: 3,9 actual vs ~4,3 if it
  really were Fahrland) so the user can decide the area question on its own merits.
- Disclosing the true Ort in sentence 1 is **exculpatory in the scam check** — the geo-tag is
  reach optimisation, not concealment. Don't log it as a signal.
**Why:** the whole listing (Bj. 2003, Klasse A, new Wärmepumpe, in budget, 13 real photos) scores
~4,3 as a Fahrland house; taking the search metadata's "Fahrland, Potsdam" at face value would
have recommended a house in a different Landkreis that the profile never asked for.

## ohne-makler cross-posts: map geo-tag can be wrong
For listings fed in via the ohne-makler (OM) platform (footer says "ohne-makler (OM) ist weder Anbieter noch Vermittler"), the IS24 **map-address / page title can be a mismatched geo-tag that contradicts the body**. Seen on #214: title + Lage section say "Begehrtes Eichwalde" (LDS, ~40 km SE of Golm) but IS24 geo-tagged it "Groß Glienicke, 14476 Potsdam" (in-area). The body `.is24qa-lage` is authoritative — always read it to resolve location before scoring Block B; do NOT trust the map-address/title alone. This is a cross-posting artefact, not a scam signal.

**Why:** the wrong geo-tag would have scored an off-target Eichwalde flat as if it were in-area Groß Glienicke (Block B 4.5 instead of 1.5), flipping the recommendation.

**Why:** these tenant-network exposés (seen on #169/#170/#171/#172) lack the standard structured fields and have a provisional price; scoring the headline number as final or expecting a criteria `<dl>` both mislead. Stable pattern — candidate for promotion to evaluate.md if it keeps recurring.

## `realEstateType: housebuy` + "Bauphase: Haus in Planung" = catalog new-build, NOT an existing house
Some Kauf/Haus exposés are a **Bauträger/Fertighaus-Katalogangebot**: a plot plus a turnkey build
contract for a standard house type (e.g. Town & Country "Flair 148"). Tells, all from the mobile API:
`ATTRIBUTE_LIST "Bausubstanz & Energieausweis"` has **`Bauphase: Haus in Planung`** + Baujahr in the
future + `Objektzustand: Erstbezug`; `Bezugsfrei ab` is a bare **year** ("2027"); `MEDIA` captions are
house-type/catalog names repeated across images (`Mitwachshaus-Flair-148-Wohnzim`, `Flair 148 Grundriss OG`)
mixed with a few plot photos (`Blick aufs Grundstück`); AGENTS_INFO company is a "…Franchise-Partner*in".
Handle it as:
- **The headline Kaufpreis is NOT the cost.** Always read the `TEXT_AREA "Sonstiges"` block — that is where
  the builder discloses the extra Bau-/Erwerbsnebenkosten (here: "von 120-150T€", explicitly *including*
  IS24's own `FINANCE_COSTS.additionalCosts`). `FINANCE_COSTS` alone understates the true total badly.
  Score Block A against **Kaufpreis + that disclosed range**, and say so (#364: 490.500 EUR headline →
  610–640 T EUR real = 22–28 % over a 500 T EUR budget, while IS24 showed only 549.703 EUR).
- **Photos:** catalog/Musterhaus renders are the Neubau exception in `_shared.md` → do NOT cap D. But still
  list "keine Fotos des Objekts" as a ✗ con — nothing about *this* house is verifiable.
- **Amenities:** "Bodenplatte" in the Ausstattung inclusion list means **no Keller**; Garage/Stellplatz is
  almost never included. Don't infer either from the house being a Neubau.
- **Block G legal risks specific to this class:** plot often "nach der Realteilung" (subdivision not yet
  completed → buildability pending), Festpreisgarantie usually only 12 months, and it is two contracts
  (Grundstückskauf + Werkvertrag). Provision may be "nur auf das Grundstück" — legal and cheaper than it looks.
Seen on #364 (expose 166248960, Marquardt/Potsdam).
**Why:** scored naively this reads as a 490.500 EUR / 2.955 EUR-m² in-budget house with A+ energy class —
Block A would come out 5,0 instead of 2,0 and the report would recommend a purchase the user cannot finance.

- **A silent "Sonstiges" does NOT mean there are no extra costs.** #364 disclosed its 120–150 T EUR;
  #369 (expose 162318927, ScanHaus Marlow Bungalow SH 113 B, Fahrland) has a Sonstiges block that
  says only "Das angegebene Grundstück hat eine Größe von gut 616qm". When Sonstiges is silent,
  hunt the **Objektbeschreibung for Eigenleistung carve-outs** — here "Schlüsselfertig … (Wand- und
  Bodenbeläge sind Eigenleistung)", i.e. *schlüsselfertig ≠ bezugsfertig*, ~15–25 T EUR extra for
  105 m² — and state an explicit *estimated* range (build Nebenkosten 40–70 T: Erschließung,
  Hausanschlüsse, Bodengutachten, Vermessung, Baugenehmigung, Außenanlagen), labelled as YOUR
  estimate, not an Anbieter figure. Missing disclosure is *worse* transparency, not a cheaper house.
- **Cross-check `FINANCE_COSTS.footer` / the financingCalculator `funds=` param against the profile's
  equity.** IS24 quotes its monthly rate assuming ~20 % Eigenkapital (#369: `funds=95620` vs the
  profile's 50.000 EUR), so the advertised "Finanziere ab X €/Monat" is unreachable — say so in Block A.
- These catalog listings are largely **company advertising** (ScanHaus: "Warum ScanHaus? Weil wir
  besonders sind!", >100 Haustypen, Musterhäuser); the object-specific content can be two sentences.
  Also common: the Lage text refuses to give plot data before a sales meeting ("keine Grundstücksdaten
  ohne persönliches Gespräch") — a lead-gen mechanism, NOT a scam signal, but it means Erschließung,
  Bebaubarkeit and even the plot's continued availability are all unverified → score Block G ~3,0
  and put "don't sign / no reservation fee at the first meeting" in Next steps.
- `adTargetingParameters.obj_cellar: "n"` is the fastest Keller check on Kauf exposés (a Bungalow is
  never unterkellert by default); `obj_newlyConst` can say `n` even with `Objektzustand: Erstbezug`.

#### Benign sub-variant: **Deutsche Reihenhaus AG "Haus in Bau"** — schlüsselfertig, plot ALWAYS included, no back-calc
Distinct from every "Haus in Planung" catalog case above: `Bauphase: Haus in Bau` (actively under
construction, not a fictitious geo-tag), and `AGENTS_INFO.company = "Deutsche Reihenhaus AG"` — a large,
established serial-builder of turnkey **Reihenhäuser**. The €/m² (TOP_ATTRIBUTES `Kaufpreis X €/m²`) is
computed on the REAL delivered plot (`Grundstück` size is genuine), the house is **schlüsselfertig, NOT an
Ausbauhaus** (Ausstattung describes a finished home: EH40, Wärmepumpe+PV, 3-Scheibenverglasung), and it is
**provisionsfrei with a MaBV `Zahlungsplan nach Baufortschritt`** (removes prepayment/insolvency risk — a
Block G plus, same family as "Erst BAUEN – dann ZAHLEN"). So: NO Bodenrichtwert back-calculation needed,
score Block A on the headline as an all-in house+plot price; Block D full (Neubau Klasse A); Block G ~4,0
(reputable builder, MaBV plan). `obj_cellar: n` = **no Keller** (slab construction is the norm — HWR +
Abstellräume instead). The Garten must-have is met by the private plot; Terrasse + Stellplatz (Stellplatz
is a **separate +~13 T EUR line**, E-Lade-vorbereitet) are the nice-to-haves. MEDIA are catalog renders of
the house *model* (e.g. "120 m² Wohntraum"), not this unit — Neubau exception blocks the D cap but note
"no photos of this specific house". Seen on #420 (expose 146668576, Wohnpark "Am Schloss Caputh",
Schwielowsee-Caputh): 469.990 EUR / 3.917 EUR-m² all-in, plot incl, scored 4,1 (dragged down only by
out-of-area Caputh location, not the price/build).
**Why:** the earlier `housebuy` rules all assume a lead-gen catalog offer where the plot/Ausbaustufe is
undisclosed and needs back-calculation; a Deutsche Reihenhaus "Haus in Bau" is a genuine turnkey house+plot
package — running the plot inference on it would waste the report and could wrongly discount an in-budget house.

#### Benign sub-variant: **plot IS included** — decide it from `TEXT_AREA "Ausstattung"`, not Lage
Mirror image of the allkauf/#367 case. On massa haus offers the inclusion is stated in the
**Ausstattung** list, not in Lage: *"Auch mit großer Preissenkung sind im Leistungsumfang inkludiert:
**Baugrundstück**, Niedrigenergiehaus mit Bodenplatte und Technikpaket, Architektenleistung,
Bodengutachten…"*, and Lage then describes a *concrete* plot ("ruhige Seitenstraße… verkehrsmäßig
erschlossen") instead of "ein Grundstück nach Ihrer Wahl". So: **read BOTH Ausstattung and Lage before
declaring a plot carve-out** — the exclusion lives in Lage, the inclusion lives in Ausstattung.
Here the carve-out is a different one: **massa haus is primarily an Ausbauhaus brand.** The inclusion
list names Bodenplatte/Technikpaket/Wärmepumpe/Elektropaket/Rollläden/Treppe but **no Innenausbau**
(Estrich, Putz, Boden-/Wandbeläge, Sanitärobjekte, Innentüren) — 40–70 T EUR of Eigenleistung on
~145 m², undisclosed anywhere in Sonstiges. Same "silent Sonstiges ≠ no extra costs" rule as #369:
estimate and label it as your own figure. Seen on #374 (expose 169317682, Brieselang).
**Why:** treating every `Bauphase: Haus in Planung` listing as the #367 no-plot variant would wrongly
zero Block B/E and fail the Garten must-have on an offer that does deliver 503 m² of land.

#### Third case: BOTH Lage and Ausstattung are SILENT on the plot — decide it from the €/m² band
#367 states the exclusion in Lage; #374 states the inclusion in Ausstattung. #377 (expose 169283556,
allkauf "Pro Time" Ausbauhaus, Uetz-Paaren) says **neither** — Lage is pure boilerplate with no place
name, no street, no plot feature, while Hauptkriterien/header still advertise `Grundstück ca.: 751 m²`.
Three tie-breakers, in order of strength:
1. **Is the inclusion list exhaustive?** These `TEXT_AREA "Sonstiges"` blocks enumerate the Leistungsumfang
   down to *Steckdosen*, *Zargen*, *Tapeten*. If a list that granular never says **Baugrundstück**, the
   plot is out. (massa/#374 named it explicitly; allkauf/#377 did not.)
2. **Compare €/m² against the same brand's known house-only quotes.** #377 at 3.953 EUR/m² sits in the
   allkauf house-only band established by #367 (3.586 EUR/m², plot exclusion proven from Lage text).
   A genuinely plot-inclusive package would have to imply an implausibly cheap house.
3. **A boilerplate Lage with no place name at all is itself the tell** — where a concrete plot exists,
   the Lage text describes *that* plot.
Corroborators: `MAP` "Adresse erhältst du vom Anbieter", `obj_street: no_information`, `TRAVELTIME.isBlocked`.
**allkauf "Pro Time" house-only €/m² band — mind the storey count.** #367 3.586 + #377 3.953 are both single-storey **bungalows**; #422 (expose 169283494, Uetz-Paaren, 2-storey EFH 136 m², 3.013 EUR/m²) shows the band runs **DOWN to ~3.000 for multi-storey** (roof/Bodenplatte amortised over two floors). So don't read a sub-3.586 allkauf figure as "plot excluded / implausibly cheap house" on a Mehrgeschosser — 3.013 is normal house-only there. The plot-inclusion residual test still settles it: 3.013 − (752 m² × 200–300 EUR/m² BRW) leaves 1.355–1.908 EUR/m² house-only = below the 2.000–2.450 Ausbauhaus band ⇒ plot OUT, even more clearly than #377. Note #422's charitable plot-included reading (513–585 T EUR, 3–17 % over) sat *closer* to budget than #377's because its headline was lower — so the two scenarios straddle the 40 % blocker; carry the two-row table + yes/no email as Next-step 1 (like #381), don't average.
**Score it both ways and say so.** When inference (not disclosure) drives the call, run Block A under BOTH
scenarios; on #377 the no-plot reading gave 755–915 T EUR (51–83 % over) and even the charitable
plot-included reading gave 604–671 T EUR (21–34 % over), so the budget verdict held either way and the
uncertainty didn't have to be resolved to reach a recommendation. Make the plot question Next-step #1
(one written yes/no email) instead of guessing confidently.
**Why:** with no explicit statement in either direction, the previous two rules give no answer, and
defaulting to "plot included" would score an out-of-reach lead-gen ad as an in-budget 3.953 EUR/m² house.

#### Fourth case: both silent AND there is **no Leistungsumfang list at all** → back-calculate €/m² *within the brand*
#377's tie-breaker 1 ("is the inclusion list exhaustive?") assumes there IS a list. Some Bauträger
exposés have none — #381 (expose 168777293, ScanHaus Marlow SH 131 C, Marquardt) has four short
marketing paragraphs: Objektbeschreibung, an `Ausstattung` that is pure prose about the house type,
a 3-line `Lage` naming only the Ortsteil, and a `Sonstiges` that is advertising + a mobile number.
Nothing is enumerated, so tie-breaker 1 yields nothing. What works instead:
- **Subtract the local Bodenrichtwert from the headline price and check whether the residual is a
  plausible house price *for that brand*.** #381: 466.000 − (600 m² × 300–350 EUR/m² Marquardt)
  ≈ 256–286 T EUR for 129 m² = 2.000–2.200 EUR/m² schlüsselfertig — normal for ScanHaus. The
  house-only reading would mean 3.612 EUR/m² for a budget Fertighaus, i.e. ~2× the brand's level →
  plot is almost certainly INCLUDED. This is the mirror of the #377 test (there the residual made
  the *plot-included* reading implausible). Anchor on a same-brand datapoint: #369 (ScanHaus,
  Fahrland, plot proven included in Sonstiges) = **4.553 EUR/m² all-in**.
- **A Lage text that names a specific Ortsteil *differing from the IS24 geo-tag* is evidence FOR a
  real plot** — #381 is geo-tagged "14467 Nördliche Innenstadt, Potsdam" while Lage says "Ortsteil
  Marquardt" (14476). A seller offering only a house has no reason to name an Ortsteil at all; the
  divergence means someone typed a real location over a placeholder. (Same lesson as the ohne-makler
  geo-tag note: the `TEXT_AREA "Lage"` wins over MAP/header.)
- **When the two scenarios straddle the 40 % hard blocker, say so explicitly and score the likely
  one.** Unlike #377 (where both readings were over budget and the verdict held either way), #381
  came out 3,7 with plot vs ≤2,0 without — so the report must carry a two-row scenario table, and
  Next step #1 is the single yes/no question. Don't average the scenarios into a mushy middle score.
**Why:** with no list to test and both text blocks silent, the previous three rules give no answer;
defaulting either way on a 129 m²/5-Zi/preferred-area listing flips the recommendation between
"strongest catalog offer seen" and "hard-blocked at +49–69 % over budget".

- **Brand €/m² all-in band for the back-calculation (ScanHaus Marlow, same Anbieter Juliane Rau):**
  #369 Fahrland 4.553, #381 Marquardt 4.101→ (466.000/129), #383 Marquardt SH 122 A3 **4.101 EUR/m²
  all-in** — all three consistent with *plot included*, all three back-calculating to
  **2.000–2.450 EUR/m² house-only** after subtracting 300–350 EUR/m² Bodenrichtwert (Marquardt/Fahrland).
  A ScanHaus offer landing at ~4.100–4.600 EUR/m² all-in ⇒ plot in; ~2.000–2.400 ⇒ house only.
  **Why:** with three datapoints the band is now a usable one-step test instead of a per-listing
  re-derivation, and it settles the plot question these exposés never state.
- **Bauträger galleries pad with brand Gütesiegel, not just logo tiles / stock shots** (extension of
  traps 7 & 9): #383's 9 PICTUREs were 1 catalog render + 2 Grundrisse + **6 marketing tiles**
  (`Erst Bauen - Dann Zahlen`, `Logo mit EB DZ`, `Bundes-Gütegemeinschaft Montag…`,
  `Qualität aus Deutschland`, `Siegel_FOMO_Fertighausanbieter`, `Weblogo_…_Kossow`). Add
  award/seal/slogan captions to the caption filter. Neubau exception still means no D cap, but the
  real evidence count is "1 render + 2 floor plans", not 9.
- **"Erst BAUEN – dann ZAHLEN" (payment only on completion) is a genuine Block-G plus** — it removes
  the standard Bauträger-insolvency/prepayment risk (MaBV-Ratenplan). Rare enough to credit explicitly;
  ask for it in writing since it appears only in the marketing text, never as a structured attribute.
- **`Heizungsart: Fußbodenheizung` is NOT a heat source** — it's the distribution system. On #381 it
  was the only heating datum: no Wärmepumpe, no KfW standard, no Energiekennwert. Don't read it as a
  modern-heating plus (contrast #364/#369, which named Wärmepumpe + KfW 40 explicitly); score D down
  and make the Wärmeerzeugung an explicit question — it drives both Betriebskosten and KfW/BEG eligibility.

- **Boilerplate Lage text can be factually FALSE about the advertised Ortsteil — check it.** #377's Lage
  promised "Schulen, Einkaufsmöglichkeiten und öffentliche Verkehrsmittel in unmittelbarer Nähe" for
  Uetz-Paaren, a few-hundred-inhabitant village with no school, no supermarket and bus-only service.
  Verify the claim against the actual Ortsteil before granting Block B any infrastructure credit.
- **allkauf "Pro Time" = Trockenbau + Estrich are the buyer's own labour** (allkauf installs only
  Sanitär/Heizung/Elektro). Materials — Bodenbeläge, Fliesen, Tapeten, Sanitärobjekte, Innentüren — ARE
  supplied, so the inclusion list reads generously; the *labour* to lay them is not. Budget 20–40 T EUR
  on ~125 m² if vergeben, plus the Gewährleistung split at the Eigen-/Unternehmerleistung interfaces
  (Block G). Same "silent Sonstiges ≠ no extra costs" family as #369/#374.
- **`obj_barrierFree` can contradict the ad copy**: #377's Objektbeschreibung sold "garantiert
  barrierefreies Wohnen" (ebenerdiger Bungalow) while `adTargetingParameters.obj_barrierFree = n`.
  Trust the structured flag.
- **Grunderwerbsteuer on a two-contract build is not settled** — if Grundstückskauf + Werkvertrag are
  judged an *einheitliches Vertragswerk*, the 6,5 % (BB) applies to the TOTAL, not just the plot.
  Worth >20 T EUR; flag it as a question, don't assume the cheaper reading.
- Also seen here: an "Echtholztreppe" in the standard inclusion list of a **single-storey bungalow**
  (`Etagenzahl: 1`) — catalog-package boilerplate, not evidence of a second floor. Don't infer floors
  from the Ausstattung list.

#### Fifth case — CHECK THIS FIRST: the **Provisionsbezug in Sonstiges often names the plot price**
Before running any back-calculation, grep `TEXT_AREA "Sonstiges"` for the sentence explaining what the
`Provision für Käufer` refers to. On commission-bearing Bauträger offers it routinely reads:
*"Die ausgewiesene Provision bezieht sich auf den im Gesamtangebotspreis **enthaltenen
Grundstückspreis in Höhe von € 130.000,00**."* (#386, expose 168903548, Fahrland). That single clause
settles the plot question **and** hands you the exact house/plot split — no Bodenrichtwert estimate,
no brand-band inference. Corroborate against the Objektbeschreibung, which on these lists the package
contents outright ("Das Angebot beinhaltet: – Grundstückspreis – Erdarbeiten – schlüsselfertige
Ausführung (ohne Maler- und Bodenbelagsarbeiten) – KfW 40-Standard …").
Order of attack on the plot question is therefore: **(0) Provisionsbezug + "Das Angebot beinhaltet"
list in Objektbeschreibung/Sonstiges → (1) Ausstattung inclusion list (#374) → (2) Lage exclusion
text (#367) → (3) exhaustive-list test (#377) → (4) Bodenrichtwert back-calculation (#381/#383).**
Use the disclosed split as a *check* on the brand band: #386 gave 261.131 / 112 m² = 2.331 EUR/m²
house-only and 250 EUR/m² for the Fahrland plot — both land inside the bands derived by inference
elsewhere, which validates the back-calculation method for the cases that stay silent.
**Why:** three of the last six evaluations spent the whole report on an inference the exposé had
already answered in one sentence under the commission note — and a `Provision für Käufer` that looks
like a negative is actually the field that makes the offer *more* transparent.

**The plot-disclosure sentence also appears on PROVISIONSFREIE offers — grep the phrase, not the
Provision field.** #387 (expose 167944465, LivingHaus SUNSHINE 142, Fahrland) has
`brokerCommission: 0 €` and no `Provision für Käufer` attribute at all, yet Sonstiges opens with
*"Das **Grundstück ist im Kaufpreis enthalten** und wird **ohne zusätzliche Provision** einem
LivingHaus-Bauherren bereitgestellt; **zusätzliche Baunebenkosten können entstehen**"*. So the
step-0 test is a grep of `TEXT_AREA "Sonstiges"` for `Grundstück … im Kaufpreis enthalten` /
`Das Angebot beinhaltet`, **not** "is there a Provisionsbezug clause" — gating on the commission
would have skipped the answer here and sent you into the Bodenrichtwert back-calculation.
Note the same sentence usually carries the *negative* too ("zusätzliche Baunebenkosten können
entstehen"): an explicit-but-unbeziffert admission. Better transparency than #369/#374's silence,
still your own 40–70 T estimate for Erschließung/Hausanschlüsse/Bodengutachten/Vermessung/
Baugenehmigung/Außenanlagen.

#### Sixth case — the plot sentence lives in **Lage**, and the €/m² band answers the WRONG question
Step 0 above says "grep `TEXT_AREA "Sonstiges"`". Widen it: **grep every TEXT_AREA**. #391
(expose 162361917, ScanHaus Marlow 1,5-Geschosser, Teltower Vorstadt) has **no Sonstiges block
at all** and states the inclusion *plus the amount* in **Lage**: *"Das angegebene Grundstück hat
eine Größe von gut 500qm. **Die Kosten hierfür betragen 340.000 EUR und sind im Preis
enthalten.**"* Note this is #369's exact ScanHaus sentence template ("…hat eine Größe von gut
616qm") **extended with the price** — so on any ScanHaus exposé, read that sentence to its end
before concluding the plot data is missing.
- **The decisive carve-out is disclosed in Objektbeschreibung sentence 1, not in a Leistungsumfang
  list:** *"Es handelt sich hier um ein **Ausbauhaus**, welches wir Ihnen für **99.900 EUR**
  anbieten. Elemente wie die **Bodenplatte**, oder **technische Ausstattung**, sind nicht im Preis
  enthalten."* With both numbers stated, the split is complete without any inference:
  340.000 plot + 99.900 house = the 439.900 headline.
- **Once you have the house-only price, test it against the schlüsselfertig band, not the all-in
  band.** 99.900 / 104 m² = **960 EUR/m²** ≈ 40 % of the 2.000–2.450 EUR/m² ScanHaus
  schlüsselfertig level ⇒ ~130–200 T EUR of missing build, plus 40–70 T Baunebenkosten.
- **The all-in brand band (4.100–4.600 EUR/m²) is a plot test ONLY — it does not certify the
  Ausbaustufe.** #391 sits at 4.230 EUR/m² all-in, squarely inside the band, and the band's
  "plot included" verdict is correct — but the band was built from *schlüsselfertig* offers
  (#369/#381/#383), so reading "in band ⇒ complete house" would have hidden a 130–200 T EUR gap.
  When the band matches but the text says **Ausbauhaus**, the plot must be unusually expensive
  (here 680 EUR/m² central Potsdam) — that is what pulls a bare shell up into the band. Always
  confirm the Ausbaustufe from the text before letting the band settle Block A.
- **Sub-variant of #391 — Lage states the plot price but is SILENT on inclusion → let the residual
  decide.** #437 (expose 166370850, ScanHaus "Aktionshaus 3", Anbieter **Butros Yacoub** — a
  different Franchise-Vertriebler than Juliane Rau, Marquardt/Potsdam) has #391's exact Lage
  template *"Das angegebene Grundstück hat eine Größe von gut 480qm. Die Kosten hierfür betragen
  199.000€."* — extended with the price but **WITHOUT** #391's "…und sind im Preis enthalten"
  clause. Don't read the bare "Die Kosten hierfür betragen X" as plot-on-top: run the residual.
  459.000 headline − 199.000 plot = **260.000 = 2.131 EUR/m² house-only = squarely in the
  2.000–2.450 schlüsselfertig band ⇒ plot INCLUDED in the headline**; the on-top reading would
  make the house 3.762 EUR/m² (above band) → implausible. IS24 FINANCE_COSTS also applies GrESt to
  the full 459.000, i.e. treats it as one Kaufpreis. Result: a **budget-feasible** ScanHaus
  (459.000 all-in < 500 T, 3.762 < 4.000 EUR/m²) → scored **3,9** — the mirror of #435 (same
  Ortsteil/brand but that Sonstiges sold the plot as a separate service ⇒ excluded ⇒ ~30 % over).
  So: #435 and #437 are a Marquardt contrast pair — read the plot sentence to its end AND run the
  residual before deciding the polarity. **Marquardt disclosed plot anchor:** 199.000/480 = **414
  EUR/m²**, above the 300–350 BRW anchor but a real Potsdam-Bauland transaction datapoint.
- **Ausbaustufe ladder observed so far, worst-first:** #391 (ScanHaus Ausbauhaus) excludes
  **Bodenplatte + komplette Haustechnik**; #374 (massa) excludes the Innenausbau; #377 (allkauf
  Pro Time) excludes Trockenbau + Estrich *labour*; #369 (ScanHaus schlüsselfertig) excludes only
  Wand-/Bodenbeläge. Place a new offer on this ladder to size the Eigenleistung fast.
- **`Bauphase: Haus in Planung` + no Bodenplatte ⇒ the Gewährleistung splits at the foundation** —
  the manufacturer erects its shell on a slab the buyer procured. Settlement/damp/dimension defects
  become a finger-pointing exercise at the single most consequential interface. Score Block G down
  (#391: 2,5) beyond the usual two-contract risks.
- **A "werksseitig nach KfW 40" claim does NOT survive a Haustechnik carve-out.** KfW 40 needs
  envelope *and* Anlagentechnik (Wärmepumpe, Lüftung mit WRG). When the technik is the buyer's,
  the as-built standard is unassured and **KfW 297/298 eligibility is open** — say so in Block D
  and make it a Next step. (Contrast #386, where Wärmepumpe + zentrale Lüftung were named as
  delivered, a genuine D plus.)
- Corroborating structured fields here: `obj_cellar: n` (no Keller — consistent, the slab isn't
  even sold), `obj_newlyConst: n` despite Planung, `obj_barrierFree: n`, and the only
  "Bausubstanz & Energieausweis" attribute is `Bauphase:` — no Baujahr, no Kennwert.
- **Watch the PLZ against the named Ortsteil** as a cheap geo-tag sanity check: #391 is tagged
  `14478 Teltower Vorstadt` but Teltower Vorstadt is **14482**, and the `MAP.zipCodeShapes`
  outline (52,35–52,38 N / 13,07–13,12 O) covers Am Stern/Waldstadt/Drewitz. With Lage naming no
  place at all, that leaves the Ort unverifiable — Block B caveat, not a scam signal.
**Why:** the memory's step-0 grep was scoped to Sonstiges, which does not exist on this exposé,
and the brand band would have confirmed "plot included" while silently endorsing a shell as a
finished house — Block A would have come out ~4,0 (in budget at 4.230 EUR/m²) instead of 1,0
against a realistic 624–757 T EUR total.

- **Michendorf (Potsdam-Mittelmark, ~15 km S Potsdam) BRW anchor: ~304 EUR/m² Durchschnitt**
  (Gutachterausschuss Stichtag 01.01.2025, −4,7 % ggü. Vorjahr; Michendorf-**West 330**, einfache
  Lagen **252**). Seen on #438 (expose 168457520, Blue Sheep Immobilien, 537 m² livingbuysite):
  asking 373 EUR/m² = +86 % über dem 200-EUR/m²-Plot-Cap but only ~13–23 % over local BRW → the
  cap-miss was a **budget-fit** problem (Michendorf is structurally pricier than the 200-EUR/m²
  search), NOT overpricing/scam. On such a case score Block A low (the €/m² cap is the binding metric,
  1,5) but say explicitly the price is marktnah — don't fire the ≤2,0 price hard-blocker when the
  absolute Kaufpreis is at the budget cap AND the €/m² sits near local BRW. Michendorf is out of the
  plot search's acceptable_areas but borders Nuthetal (acceptable) → no hard blocker, Block B ~2,5.
- **Fahrland Bodenrichtwert anchor: 250 EUR/m²** (disclosed outright on #386). Reusable for every
  Fahrland back-calculation — #387's residual came to 2.531 EUR/m² house-only on it.

- **`PRICE_INFO` percentile is DIRECTIONAL corroboration for the plot question — use it, but only in
  the direction the residual already points.** The #422 report rightly flags the percentile as
  *misleading* when plot is EXCLUDED (it compares the house-only headline against Bestandshäuser
  *inkl. Grundstück*, so a low percentile fakes "cheap complete house"). The mirror is also true and
  useful: when the €/m²-band + residual point to plot INCLUDED, a low percentile among full-house comps
  *confirms* it — a genuine house-only price would be absurdly underpriced vs those comps. So the rule
  is: run band+residual FIRST; then read `PRICE_INFO.priceBar` percentile as a same-direction check,
  never as the deciding test. Seen on #423 (expose 167787403, Marquardt bungalow "Haus in Planung",
  4.143 EUR/m² all-in, 435 T EUR at the 25th percentile of 293–747 T EUR Marquardt/Satzkorn houses →
  all three agree plot INCLUDED, scored 3,6 budget-feasible; contrast #422 where residual said plot OUT
  and the same percentile was discounted as noise). **Why:** the earlier memory only recorded the
  "percentile misleads" half, which would have you throw away a valid corroborating datapoint on the
  plot-included cases.
- **Marquardt (Nördliche Ortsteile Potsdam) Bodenrichtwert anchor: ~300–350 EUR/m²** — used on #423's
  residual (600 m² × 300–350 = 180–210 T EUR plot ⇒ 240 T EUR / 2.286 EUR/m² house-only, in the
  schlüsselfertig band ⇒ plot included).

- **Gollwitz (Ortsteil of Brandenburg an der Havel) Bodenrichtwert anchor: ~150 EUR/m²** for
  erschlossenes Bauland (rural band 30–100). Seen on #424 (expose 165307682, ScanHaus Marlow SH 122 S
  Stadtvilla, Juliane Rau). Two reusable points: **(1)** Another geo-tag mismatch instance of the #389
  family — obj_regio4 = **Fahrland / 14476 Potsdam** and the share-blob says "14476 Fahrland, Potsdam",
  but Lage-Satz 1 says *"Ortsteil Gollwitz der Stadt Brandenburg an der Havel"* (~30 km W of Golm,
  **outside** the house search's preferred/acceptable list; Brandenburg a.d.H. is only in the
  Freizeitgrundstück search). Not excluded → no hard blocker, Block B 2,0, counterfactual "≈4,0 if it
  really were Fahrland". So on ScanHaus Fahrland-tagged exposés, ALWAYS read Lage-Satz 1 — the plot can
  sit 30 km away. **(2)** ScanHaus all-in band's LOWER edge tracks the local land price: #424 all-in was
  **3.667 EUR/m²** (below the normal Fahrland range) precisely because Gollwitz land is cheaper than
  Fahrland — residual @150 BRW = 1.090 m² × 150 = 163.500, house-only 287.600/122 = **2.357 EUR/m²
  schlüsselfertig, mid-band ⇒ plot INCLUDED**. Confirms: don't read a low all-in €/m² as "plot excluded"
  on cheap-land Ortsteile; run the residual with the LOCAL BRW, not Fahrland's 250.

#### Two more step-0 phrases that settle the plot question without a Sonstiges disclosure
Both found on #390 (expose 160615702, ScanHaus Marlow "Aktionshaus 1" Bungalow, Fahrland), whose
Sonstiges says only *"ohne ein persönliches Gespräch … keine Grundstücksdaten"* and whose Ausstattung
is pure brand prose — i.e. steps 0–3 all yield nothing and you'd go straight to back-calculation:
- **The Objektbeschreibung often quotes the HOUSE-only Aktionspreis outright.** Grep the description
  tail for `ab \d+\.\d+ ?€\*` — #390: *"Durch die aktuelle Aktion erhalten Sie das Haus zu einem
  unschlagbaren Preis **ab 184.900€***"*. That is the builder's own house/plot split: 184.900 (house)
  + 743 m² × 250 (Fahrland BRW) = 370.650 vs a 416.900 headline, residual ~46 T for Bodenplatte/
  Erdarbeiten/upgrades ⇒ **plot INCLUDED**, confirmed by the seller's own number rather than inference.
  The `*` never has a footnote anywhere in the exposé — log it as advertising, not a scam signal.
- **A decoded `obj_telekomInternetUrlAddition` is itself plot-inclusion evidence, not just an address.**
  A house-only catalog quote has no Standortadresse to run a broadband check against. #390 decoded to
  `Ketziner Str. 23, 14476 Potsdam` — the **same street as #369** (Ketziner Str. 8), another ScanHaus
  Fahrland plot with inclusion proven from text. Same-street repeats across one brand = a real plot
  pipeline. Caveat from #389 still holds: the leak loses to a conflicting TEXT_AREA; here nothing
  conflicted (Lage was a generic 14476 PLZ-lexicon article), so it **verified** the Ort instead.
- Corollary for the #377 tie-breaker 3: a boilerplate Lage with no plot description is only *weak*
  evidence against a plot — it lost to both of the above on #390. Don't let it outrank arithmetic.
**Why:** without these two the report spends itself on a Bodenrichtwert inference the exposé already
answered twice, and would have scored the Ort as unverified on a listing where it was confirmable.

- **"Tag der offenen Tür" (TDOT) relistings = DUPES of an existing catalog listing.** ScanHaus republishes
  the same house+plot under a fresh expose ID for open-house events: title "…Tag der offenen Tür in Potsdam
  von 10–16 Uhr", scan metadata prefixed "(1/3)"/"(1/4)", `OBJECT_INFO` Objekt-Nr = **`TDOT NN`**. The decisive
  dupe test is the **telekom-leak street address** — #436 (expose 168551593) decoded to the SAME Ketziner
  Str. 23 as #390 (expose 160615702), same Stefanie Rau, same 416.900/115/4/743 m² → genuine DUPE, mark DUPE,
  do NOT re-score. Always decode the leak + compare Anbieter+plot before treating a same-spec ScanHaus
  relisting as a new parcel. **Why:** identical specs alone don't prove same plot (twin Realteilung halves
  look identical too — see #364/#388); the street-address match does.
- **ScanHaus €/m² all-in band extends DOWN to ~3.600 for the budget/Bungalow lines.** #390 is
  3.625 EUR/m² all-in *with* plot — below the 4.100–4.600 band derived from #369/#381/#383. Cause:
  "Aktionshaus" is the discount line and a single-storey Bungalow is cheaper per m². So a ScanHaus
  offer at 3.600–4.600 all-in ⇒ plot in; only ~2.000–2.450 ⇒ house only. Do **not** read a
  sub-4.100 figure as "plot excluded" — check the residual instead.
  Note a residual at the **bottom** of the house-only band (#390: 2.010 EUR/m²) is itself a hint at a
  leaner Ausbaustufe ⇒ expect the #369 Wand-/Bodenbeläge-Eigenleistung carve-out and say so.
- **ScanHaus Marlow has ≥2 Potsdam reps — don't merge them.** #369/#381/#383 are *Juliane* Rau;
  #390 is *Stefanie* Rau (Rudolf-Moos-Str. 9a, 14482 Potsdam). Same brand and same Impressum
  (R. Kossow & Levermann GmbH, HRB 2613 AG Stralsund), different Handelsvertreterin and separate
  Anbieterprofile/ratings — score Block H per person, not per brand. **Now ≥3 reps at the same
  Rudolf-Moos-Str. 9a office:** #426 (expose 166987619, Fahrland) is *Butros Yacoub* — same address as
  Stefanie Rau, different verifizierter Anbieter. Keep scoring H per person.

- **Lage-text names a DIFFERENT town than the header PLZ/geoCode → boilerplate copy-paste, plot is a placeholder.**
  #435 (expose 168554058, Juliane Rau, SH 122 S Var. C, "(1/4)" catalog series) has header/geoCode/Financing
  postalCode all = 14476 (Potsdam-**Marquardt**, a preferred Ortsteil), but the `Lage` block describes
  *"Ortsteil Marquardt der Stadt **Brandenburg an der Havel**"* + Gollwitz + B1/A2 — a pasted text for the
  wrong Marquardt (Brandenburg a.d.H. is out of scope). Trust the PLZ/geoCode for the nominal location, but
  the mismatch is itself the tell that no real plot is secured (score B for preferred-but-speculative). Here
  `Sonstiges` also confirmed plot-EXCLUDED via the "Grundstücksservice" phrasing ("Detaillierte Informationen
  zu den Grundstücken erhalten Sie exklusiv als unser Kunde… auf Ihrem bereits vorhandenen Grundstück… Sollten
  Sie noch auf der Suche nach einem passenden Grundstück sein"). **Why:** without this, a Potsdam-Marquardt
  header could be scored as a firm preferred-area plot when the offer is really house-only lead-gen.

#### Sub-case: **Generationenhaus / "eine von zwei Wohnungen"** — the Lage plot figure is the FULL two-unit plot
#426 (expose 166987619, ScanHaus SH 244 "Generationenhaus", Fahrland) opens the Objektbeschreibung with
*"Es handelt sich hier um **eine von zwei Wohnungen**"* — you buy **one unit of a two-dwelling
(Mehrgenerationen-) house**, and the header m²/€/plot are for the **half-unit** (122 m², 500 m² plot,
379.000 €). This resolves a contradiction that otherwise looks like a data error: the **Lage plot
sentence describes the WHOLE two-unit plot** — *"Das angegebene Grundstück hat eine Größe von gut
1.000 qm. Die Kosten hierfür betragen 300.000 €."* (twice the 500 m² header, and it **omits** the
#391/#369 "…und sind im Preis enthalten" clause). So on a two-dwelling ScanHaus offer:
- **Do NOT take the Lage's plot € as this unit's plot cost** — it's the full plot (here 1.000 m² @
  300 €/m² ≈ Fahrland level; this unit's share ≈ 500 m²). Taken literally it fakes a +48 % over-budget
  hard blocker (Scenario B); the residual+band+percentile were the correct arbiter (see below).
- **Residual test still works on the half-unit:** 379.000 − (500 m² × 250 Fahrland BRW = 125.000) =
  254.000 / 122 = **2.082 €/m² house-only** (bottom of the 2.000–2.450 schlüsselfertig band) ⇒ plot
  INCLUDED; priceBar 27th percentile of 271–603 T full-house comps confirms same direction. Scored
  Scenario A (in-budget ~470–500 T after Wand-/Bodenbeläge Eigenleistung + 40–70 T build-Nebenkosten)
  = 3,9, with a two-row table and "get plot price/inclusion in writing" as Next-step #1.
- **Block G/E extra:** shared building → Teilungserklärung/WEG, shared walls/roof, common obligations
  with the neighbouring unit. `obj_cellar: n` (slab, no Keller); Garten met via the plot.
- **Ketziner Str. pipeline now has a 3rd node:** telekom leak = **Ketziner Str. 133, 14476** (after
  #369 Str. 8, #390 Str. 23) — same Fahrland ScanHaus plot pipeline; regio4=Fahrland while the MAP text
  said "14467" (central-Potsdam placeholder anomaly, not a real location conflict — the 14476 leak wins).
**Why:** without knowing the Lage € is the full two-unit plot, a literal read hard-blocks an in-budget
Fahrland offer; and the "one of two dwellings" line is the Block-G/E shared-building tell that's easy to miss.
- **"Erst BAUEN – dann ZAHLEN" can appear ONLY as a gallery tile caption** (`Erst Bauen - Dann Zahlen`,
  `Logo mit EB DZ`) with no mention in any TEXT_AREA. Still credit it in Block G (removes the
  MaBV-prepayment/insolvency risk) but make "schriftlich bestätigen lassen" a Next step — a caption
  is not a contractual term. Reinforces the gallery-padding rule: check seal/logo captions for
  *substantive* claims before dismissing them as padding.
- **A residual ABOVE the local schlüsselfertig band (2.000–2.450 EUR/m²) is itself evidence about
  the Ausbaustufe.** LivingHaus (Living Fertighaus GmbH, Bien-Zenker group) is primarily an
  **Ausbauhaus** brand, so a bare Eigenleistungs-Preis should land *below* the band; #387 landing
  above it (2.531) argues the price is the more complete variant — explained by an unusually rich
  package (Einbauküche, PV, Batteriespeicher, Komfortlüftung mit WRG, DGNB). Use the residual to
  test the *Ausbaustufe*, not only the plot question — but don't call it settled: the Ausstattung
  text hedges both ways ("Ob du selbst mit anpacken willst oder alles fix und fertig übergeben
  bekommst - du entscheidest"), so score Block A across BOTH Ausbau scenarios like #377/#381.
- **Marketing-slogan captions are a third gallery-padding form** (after logo tiles and Gütesiegel):
  #387's 13 PICTUREs were captioned "Dein neues Zuhause", "Deine 5* Küche", "Work-Life Balance",
  "Bestens Beraten", "Jetzt Starten!" — **zero Grundrisse**, zero object photos. When even the
  floor plans are missing on a 142 m² house type, say so as an explicit ✗ con; the Neubau exception
  still blocks the D cap but the evidence count is zero. Corroborating tell in the same exposé:
  Sonstiges warns *"Die abgebildeten Bilder … könnten Sonderausstattungen zeigen, welche nicht im
  angegebenen Kaufpreis enthalten sind."*
- **`Bezugsfrei ab` = a bare year that has already begun, on `Bauphase: Haus in Planung`, is not a
  date.** #387 says "2026" while still in planning (realistic 2027/2028). Don't score Block F on it
  as a real availability figure — mild deduction off the flexible-window 4,5, and put the
  Bauzeitenplan in the questions list.

- **Weaker but still decisive form: `Provisionshinweis: "Nur auf das Grundstück. Das Haus ist
  provisionsfrei."` names NO amount.** It still settles step (0) — a commission *on the plot*
  can only exist if the plot is part of the deal ⇒ **plot INCLUDED**, no Bodenrichtwert
  back-calculation needed. What you do NOT get is the house/plot split, so the real Provision
  stays unquantifiable (IS24's `FINANCE_COSTS.brokerCommission` computes 3,57 % on the FULL price
  and therefore **overstates** it — say so, it's a point in the listing's favour). Make "Grundstückspreis
  beziffern" Next step #1. Seen on #388 (expose 167710349, Town & Country, Marquardt).
- **`Sonstiges` extra-cost figures are often INCLUSIVE of IS24's Kaufnebenkosten — read the
  parenthetical before adding.** T&C's wording is "Bau- und Erwerbsnebenkosten (**inkl. der von
  Immoscout oben angegeben Kosten**) von 120-150T€". So the real total is
  `Kaufpreis + 120–150 T`, **not** `FINANCE_COSTS.totalCosts + 120–150 T` — double-counting the
  54 T EUR Nebenkosten would inflate the overshoot by ~11 pp and can push a listing across the
  40 % hard blocker that shouldn't fire. Same builder/Anbieter as #364, identical sentence.
- **Town & Country "Hausbau-Schutzbrief" is a real Block-G plus** (same family as ScanHaus's
  "Erst BAUEN – dann ZAHLEN"): 4-fache Baufertigstellungs-Bürgschaft + 75.000 EUR
  Baugewährleistungs-Bürgschaft + TÜV-geprüfte Vorschriften — it covers the Bauträger-insolvency
  risk these catalog offers otherwise carry. Credit it; but note Festpreisgarantie is only
  **12 months** against a 2027 Bezug, i.e. it expires before completion.
- **MEDIA captions can name a DIFFERENT house type than the one being sold** — #388 offers 118 m²
  while every interior caption reads `Flair_110_Küche` / `flair110-schlafen-lifestyle` /
  `Einfamilienhaus-Flair-110-Stra`. Neubau exception still means no D cap, but score D down and
  log it as a ✗ con: the rooms shown belong to another variant, so even the catalog imagery isn't
  evidence for *this* configuration. Also watch for **two EG Grundrisse** ("Grundriss EG 4 Zimmer"
  + "…5 Zimmer") — the advertised room count can be the optional upgrade, price unclear (Block C caveat).
- **Neighbouring-plot twins from one Realteilung get listed as separate exposés** — #364
  (Eschenweg 13, 166 m², 490.500 EUR) and #388 (Eschenweg 11a, 118 m², 449.180 EUR) are the two
  ~480 m² halves of one parcel, same Anbieter, same Sonstiges sentence. Cross-reference them in the
  report: the smaller variant was literally #364's own "kleineren Haustyp durchrechnen" next step,
  and comparing them turns two isolated 3,5–3,9 scores into a rankable group.
  - **The exposé:plot mapping is NOT 1:1 — key the cross-reference on the STREET ADDRESS.** #395
    (expose 166249603) is a *third* T&C exposé on the same Realteilung and carries **the same
    address as #364, Eschenweg 13** — i.e. two competing house types (118 m² @ 449.200 vs 166 m²
    @ 490.500) offered on ONE half-parcel, while #388 (Eschenweg 11a) is the other half with the
    identical 118 m² Flair. So the group is 3 exposés / 2 plots. Consequences: (a) #395 and #364
    are mutually exclusive, not additive options — say so, or the comparison table implies three
    buyable houses; (b) it *worsens* Block G — the Kaufgegenstand is unfixed in both surveying
    *and* configuration; (c) Next step #1 is ONE combined enquiry to the single Anbieter asking
    which parcel is still free, not three separate contacts.
  - **Near-identical twins are separated by MEDIA completeness — count the real photos.** #388 and
    #395 are the same house type at the same price (20 EUR apart), same TEXT_AREAs verbatim; the
    only scoring difference is the gallery. #388: 13 PICTUREs incl. 4 genuine plot/street shots
    ("Blick aufs Grundstück 1/2", "Eschenweg", "Eschenweg 2") → D 4,5. #395: 9 PICTUREs = 3
    Grundrisse + 6 `Flair_110_*` catalog renders, **zero object evidence** → D 4,0, final 3,8 vs
    3,9. Neubau exception still blocks the D cap, but the photo audit is what makes twins rankable
    at all — and "Fotos des Grundstücks anfordern" becomes a listing-specific next step.
  **Why:** without the address key you'd report #395 as a fourth independent plot and rank it
  alongside #364 as a parallel option; without the photo audit two exposés with identical text and
  price come out at the same score and the user has no basis to pick one.
**Why:** all five points changed the score or the verdict text on #388, and none were derivable
from the four earlier plot-question rules.

- **A Bauträger exposé with a Provision is usually sold by a MAKLER, not the builder — and the
  bauausführende Firma is then often never named.** #386's only trace of it was a `MEDIA` caption
  "Schaum-Logo"; AGENTS_INFO is a small Berlin Einzelmakler. Score it in Block G (Bonität /
  Insolvenzrisiko of the actual builder unverifiable) and make "Bauunternehmen benennen lassen +
  Fertigstellungsbürgschaft §650m BGB" a Next step. Don't assume the AGENTS_INFO company builds.
- **Mine the `TEXT_AREA "Lage"` tail for cost- and title-defects, not just the location.** #386's
  Lage carried three separate score-drivers no structured field shows: *"Das Grundstück ist
  **teilerschlossen**; die weitere Erschließung erfolgt durch den Käufer"* (open, unbezifferte cost),
  *"(Teilfläche, **Realteilung erforderlich**)"* + "ursprünglich … circa 1039 m²" (the parcel does not
  legally exist yet — same defect family as #364), and *"**Gemeinsame Zufahrt** von der Straße"*
  (needs a Geh-/Fahrtrecht in Abt. II or the access depends on a neighbour's goodwill). All three are
  Block G, and the first is Block A. Read Lage to the last sentence on every Bauträger listing.
- **`Energieausweistyp: Verbrauchsausweis` on a `Bauphase: Haus in Planung` listing is impossible**
  — a consumption certificate needs 3 years of occupancy, so it can only be a Bedarfsausweis. Treat
  the Kennwert (#386: 44 kWh/(m²·a), Klasse A) as a **planning value**, note the data error, and make
  the KfW-Standard confirmation a Next step (it drives KfW 297/298 eligibility). Contrast with the
  #381 case where `Heizungsart: Fußbodenheizung` was the *only* heating datum: here Objektbeschreibung
  + Ausstattung name Wärmepumpe AND zentrale Lüftung mit Wärmerückgewinnung explicitly, which is a
  genuine D plus — so always read the two TEXT_AREAs before scoring heating off the attribute.
- **"Mit Ihrer Angebotsanfrage stimmen Sie zu, dass Sie automatisch über unseren Newsletter …
  informiert werden"** in Sonstiges: a contact request creates an advertising subscription. Not a
  scam signal, but put "dem Newsletter bei der Anfrage ausdrücklich widersprechen" in Next steps.

## Withheld street address leaks in the Telekom base64 param
When MAP says "Die vollständige Adresse der Immobilie erhältst du vom Anbieter" and
`adTargetingParameters.obj_street` is `no_information`, the exact address is still present, base64'd,
in `adTargetingParameters.obj_telekomInternetUrlAddition`:
`echo "$val" | python3 -c "import sys,base64,urllib.parse;print(base64.b64decode(urllib.parse.unquote(sys.stdin.read().strip())).decode('latin-1'))"`
→ `{"ort":"Potsdam Fahrland","strasse":"Ketziner Str.","hausnummer":"8","plz":"14476", ...}` (#369).
**Decode as `latin-1`, NOT utf-8** — street names with umlauts are latin-1 encoded and a plain
`.decode()` raises `UnicodeDecodeError: 0xfc` mid-string (#376: `Obstzüchterstr.` 20, Werder).
Also note the value is often **truncated** in `adTargetingParameters` (cut mid-base64), so decode
what you can and corroborate against the `MEDIA[].caption` / attached-PDF file names, which carry
the same street as an abbreviation (#376: `Landscape_OZS_20`, `OZS020_Energieausweis…` = ObstZüchterStr. 20).
Report it as an unconfirmed-but-Anbieter-entered hint, never as a verified address.
**Why:** it turns an unlocatable "14476 Fahrland" listing into a specific plot the user can look at on
a map before spending a sales appointment on it — decisive for Block B on address-withholding Bauträger ads.

#### Worse sub-variant: **house-only quote, NO plot included** (allkauf haus, Bien-Zenker-style)
Same `Bauphase: Haus in Planung` tells, but here even the **Grundstück is not part of the offer** —
the listing is a pure catalog quote hung on a fictitious geo-tag. Decide this from `TEXT_AREA "Lage"`:
when it says *"Das Haus wird auf einem Baugrundstück **nach Ihrer Wahl** geplant. Das Grundstück
erwerben Sie **zusätzlich zum Hauspreis** … ohne persönliches Gespräch keine Grundstücksdaten"*,
then:
- **`Grundstück ca.: X m²` in Hauptkriterien and the whole address are PLACEHOLDERS.** TOP_ATTRIBUTES
  still shows a plot size (#367: 451,32 m²) and MAP shows a real Ortsteil — none of it is delivered.
  Always read the Lage text before trusting either. Block B cannot be scored on the advertised
  Ortsteil's merits (score ~2,0: no location at all), and **must-have Garten auto-fails Block E**.
- Block A must add an estimated plot cost at the local Bodenrichtwert (#367: 451 m² × 600–900 EUR/m²
  in Potsdam-Babelsberg ≈ 270–406 T EUR) → 487.999 EUR headline became ca. 800–940 T EUR real.
- `MEDIA` is a handful of renders captioned as bare numeric IDs (`1555066-131917-1-g`) — NOT
  camera-original `IMG_*`. Numeric-ID captions on a Planung listing = catalog renders.
- The Anbieter is a regional Handelsvertreter (`verifiedBy: []`, no ratings) fronting a national
  Fertighaus brand; the Impressum address differs from the AGENTS_INFO address. Not a scam
  signal — but the withheld plot data makes the listing a lead-generation funnel; say so in Next steps.
- Festpreisgarantie here was 15 months (vs T&C's 12) and `Ausstattung` "Bodenplatte …" again = **kein Keller**.
Seen on #367 (expose 165586624, "Aktionshaus Step 3", geo-tagged 14482 Babelsberg Süd).
**Why:** unlike #364 (plot included, extras disclosed in Sonstiges) this variant discloses nothing in
Sonstiges at all — the plot exclusion lives ONLY in the Lage block. Miss it and you score a
3.586 EUR/m² in-budget Babelsberg house with a garden, when the buyer actually gets neither land
nor garden and pays ~1,7× the headline.

## Fastest full-detail path: mobile API (no browser, no bot-block, no consent)
`curl -s -H "User-Agent: ImmoScout24_1410_35_._" -H "Accept: application/json" \
  "https://api.mobile.immobilienscout24.de/expose/{scoutId}"`
- Returns the WHOLE expose as JSON — no CAPTCHA/consent wall, no truncation. Beats
  invisible-playwright for single exposes. The custom UA header is required (plain curl UA
  gets blocked). Prefer this path FIRST for any IS24 evaluation; fall back to the stealth
  browser only when the API misbehaves.
- **A wrong/missing UA fails as `HTTP 200` + a ZERO-BYTE body, not as an error status.** Don't read
  the 200 as success — always `wc -c` the output. (An iOS-style UA like `ImmoScout24_2.0_iOS` also
  yields the empty 200; only the `ImmoScout24_1410_35_._` Android form returns JSON.) Seen on #377.
  **Why:** a `-w "%{http_code}"` check alone says 200 and looks like the listing has no data.

### Always curl to an expose-ID-specific filename — the scratchpad is SHARED
Write to `expose-{scoutId}.json`, never a generic `e.json`/`expose.json`. Parallel evaluator
agents in the same batch share one scratchpad dir, and a sibling agent silently overwrote the
file between two reads mid-evaluation (#365: the second read returned a completely different
Babelsberg expose, 165446870, under the Marquardt filename). Symptom is subtle — valid JSON,
plausible German listing, wrong property. If two reads of the same file disagree, assume
collision and re-curl to a unique name rather than trusting either read.
**Why:** an undetected overwrite means scoring one listing's blocks against another listing's
data, producing a confidently wrong report with no error anywhere.

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

### Also check the "Weitere Dokumente" REFERENCE_LIST before judging D / scam
A second `REFERENCE_LIST` (title "Weitere Dokumente") carries attached PDFs — commonly the
**Energieausweis** and the Anbieter's **own Mieterselbstauskunft form**. When `ATTRIBUTE_LIST`
says only "Energieausweis: liegt zur Besichtigung vor" (no Klasse/Wert), check this list: an
attached Ausweis PDF means the data exists but isn't exposed in the API → keep D's
Energieausweis adjustment neutral and treat the missing-Energieausweis scam signal as Low/benign,
not as an omission. An attached Selbstauskunft PDF also changes the Next-steps advice (apply on
THEIR form, not the IS24 Bewerbermappe). Seen on #361 (expose 169253644, talyo.).
**Why:** without checking it you'd log "Energieausweis fehlt" as a real gap and point the user at
the wrong application route.

### Kauf exposés (`realEstateType: housebuy`) — three traps
Seen on #366 (expose 165446870, Babelsberg Nord Denkmal-Weberhaus).
1. **`Kaufpreis: "Auf Anfrage"`** — both `header.shareMessage` and the "Kosten" `ATTRIBUTE_LIST`
   carry the literal string instead of a number, and `FINANCE_CALCULATOR`/`is24://financingCalculator`
   URLs show `price=0`. This is NOT a parse failure and NOT expired. Score Block A from the area
   EUR/m² market band vs the profile's `max_price_per_m2` and say the budget check is impossible.
   Beware: the Sonstiges text often makes the **Maklervertrag in Textform a precondition for
   getting the price / any Unterlagen / a Besichtigung** — Next steps must tell the user to ask
   for the price WITHOUT confirming the Provisionshinweis.
   **The Maklervertrag clause also lives in the `Provisionshinweis:` attribute itself, not only in
   Sonstiges** — #384 (Paegel Real Estate): *"Durch Ihre digitale Erklärung, ein Exposé abrufen zu
   wollen, kommt ein Maklervertrag … mit uns zustande."* i.e. the mere exposé request is claimed to
   form the contract. Read the full `Provisionshinweis` text on every housebuy exposé, and check
   whether the **hälftige Teilung nach § 656c BGB** is confirmed anywhere (it usually is not) —
   Block G deduction + an explicit Next-step to demand it in writing.
   **"Auf Anfrage" does NOT imply a sparse or discretion-only listing.** #366/#380 were both
   photo-poor, which invites the assumption that a withheld price goes with withheld everything.
   #384 is the counterexample: price "Auf Anfrage" yet 60 real photos + both Grundrisse + a full
   Energieausweis (class E, 141,3 kWh) + a verified agent with 16 reviews. Score D/H on what is
   actually there; only Block A is crippled by the missing price.
   **Why:** treating "Auf Anfrage" as a proxy for "unverifiable listing" would wrongly cap D at 3,0
   on the best-documented object in the batch.
   **Detect it structurally in one field:** `adTargetingParameters.obj_purchasePrice == "0"` (mirrored
   in `tracking.parameters.obj_purchasePrice` and the `price=0` of every financingCalculator URL).
   Faster and more robust than string-matching "Auf Anfrage", and it also explains how such a listing
   slipped past a price-filtered search URL at all — these exposés bypass IS24's own Kaufpreis filter,
   so expect them in any Hauskauf scan regardless of the configured max price (#380: a 620-m²
   Griebnitzsee villa arrived in a ≤500 T EUR search).
   **"Auf Anfrage" does NOT excuse you from a budget verdict.** When the object class makes the band
   unambiguous, anchor Block A on the *land* value alone (Grundstück m² × local Bodenrichtwert) — a
   hard floor no negotiation can undercut, and on a Wasserlage-Anwesen it already settles the question
   (#380: 5.000 m² Seegrundstück ≈ 4,5–7,5 Mio. EUR floor vs a 500 T EUR budget). Label the
   Bodenrichtwert as YOUR estimate, do NOT formally fire the 40 %-over hard blocker on an inferred
   number — say it would fire on disclosure and let the weighted average stand as the headline score.
2. **`Wohnfläche` in header/TOP_ATTRIBUTES can be Wohn- + Nutzfläche summed.** Here structured
   data said 160 m² while the Objektbeschreibung said "ca. 117 m² Wohnfläche + ca. 44 m²
   Nutzfläche (Remise)" — and Hauptkriterien confirmed `Nutzfläche ca.: 43,94 m²` (117+43,94=160,94).
   Always cross-check TOP_ATTRIBUTES Wohnfläche against `Nutzfläche` + the description before
   scoring Block C; the inflated number can fake compliance with the profile's size range.
   Same for `Zimmer: 4` on an **entkernt** house — Hauptkriterien showed only 1 Schlaf-/1 Badezimmer;
   the room count is a planning figure, not an as-is state.
3. **`Energieausweis: "laut Gesetz nicht erforderlich"` + `Denkmalschutzobjekt:` CHECK** = the
   §79 GEG exemption for Baudenkmale. Treat as legally correct, NOT as the "Missing Energieausweis"
   scam signal and NOT as a Block D omission — but DO score Denkmalschutz itself down in Block G
   (every Sanierungsmaßnahme is genehmigungspflichtig, materials prescribed, costs well above a
   free renovation) while noting the §§7i/10f EStG Denkmal-AfA upside in Block A.
   **The exemption only holds WITH the Denkmalschutz CHECK — always verify it is actually set.**
   The same string appears on plain non-Denkmal houses where it is simply wrong: #372 (expose
   169346586, Reihenendhaus Bj. 1964, 100 m², Berlin-Nikolassee) had no Denkmal attribute, no
   Energieausweis PDF in any REFERENCE_LIST, and 100 m² > the 50-m²-Kleinstgebäude carve-out —
   i.e. §80 Abs. 3 GEG vorlagepflichtig. Score it as a real gap: no Block D value adjustment
   (nothing known), but a Block G deduction + an explicit ✗ con + "Energieausweis vorab
   anfordern und die Begründung hinterfragen" in Next steps.
   **Why:** the Denkmal rule above, applied blindly, exculpates a listing that is actually
   withholding legally required energy data on a 62-year-old gas-heated house — exactly the case
   where the class (realistically G–H) drives the renovation budget.

6. **`Etagenzahl: 1` can contradict the Grundriss set — trust the MEDIA captions.** On #372 the
   Hauptkriterien said `Etagenzahl: 1` while MEDIA carried Grundrisse for *Erdgeschoss*,
   *Obergeschoss* AND *Kellergeschoss* and the description sold "außergewöhnlicher Grundriss auf
   verschiedenen Ebenen" / "Deckenhöhen im 1. Obergeschoss" — a split-level house mis-keyed by the
   Anbieter. Count floors from the Grundriss captions, not the attribute.
   **Why:** a "1 Etage / 100 m²" reading makes a multi-level house look like a bungalow and hides
   the Möblierbarkeit/Barrierefreiheit downside worth flagging.

**Why:** without (1) you'd log a price of 0 or call the listing broken; without (2) you'd score a
117 m² house as a 160 m² one; without (3) you'd fire a scam signal on a lawful exemption.

4. **`{"type":"CHECK","label":"Vermietet:"}` in Hauptkriterien = the house is SOLD TENANTED.**
   Easy to skim past — it sits between Garage and Internet as just another CHECK like Gäste-WC,
   but it is the single most score-relevant field on a Kauf exposé for an owner-occupier. The
   description usually confirms it in the last line ("aktuell an 2 Parteien vermietet"), and
   Sonstiges says something evasive like "Ein Eigenbedarf **kann** angemeldet werden, sofern
   selbst genutzt werden soll" — that is NOT a bezugsfrei guarantee. Consequences to score:
   §566 BGB (Kauf bricht nicht Miete) → buyer inherits the tenancies; owner-occupation needs a
   valid Eigenbedarfskündigung per unit (3–9 mo. notice by tenancy length + §574 Widerspruch +
   possible Räumungsklage) → **Block F ~2,0** (no move-in date and none obtainable) and
   **Block G ~2,5** (Mietverträge/Mietdauer/Kündigungsausschluss/Bestandsmieten/Kautionen are
   never disclosed in the exposé). Besichtigung is usually restricted to 2 fixed weekly slots.
   **Mieteinnahmen:** #368 omitted them entirely, but #373 (expose 168467251, Dallgow-Döberitz)
   carries `Mieteinnahmen pro Monat:` as a TEXT attribute in the **"Kosten" ATTRIBUTE_LIST** —
   check there before logging it as a missing figure. When present, still verify what it
   *contains*: #373's Ausstattung text is recycled from a rental ad ("für die kalten Nebenkosten
   sind monatlich 300,00 € an den Vermieter zu zahlen", "Garage 35,00 €"), so 1.103,63 € could be
   Kaltmiete (10,12 €/m²) or the gross payment (→ 7,05 €/m² Bestandsmiete). That ambiguity swings
   the whole yield calc — make it an explicit question, don't pick one.
   **Also compute the owner's carrying cost**, which the Kaufpreis hides: on a WEG-aufgeteiltes
   Reihenhaus the `TEXT_AREA "Sonstiges"` gives Wohngeld + Instandhaltungsrücklage separately
   (#373: 458,04 + 60,00 = 518,04 €/mo), turning a 3,32 % gross yield into ~1,76 % net.
   A **Reihenhaus "aufgeteilt nach WEG"** is its own Block-G risk cluster: gemeinschaftliche
   Gas-Zentralheizung (GEG-Tausch decided by Mehrheitsbeschluss, not the owner), Garten/Garage
   only via Sondernutzungsrecht, and the headline `Grundstück ca.:` is then the **WEG total**
   (#373: 819 m² for a Reihenmittelhaus), not this house's land.

7. **Tenanted exposés often have ZERO interior photos — and the MEDIA count is padded with
   company logos.** #373 showed 8 media, but 3 were captioned with the Makler's own name
   ("Böttger & Scheffler Immobilien") = logo/branding tiles, and the remaining 5 were all
   exteriors ("Blick auf die Häuserreihe", "Blick von der Straße", "seitliche Ansicht",
   "ruhige Anliegerstraße"). So **read the captions, don't count entries**: exclude logo tiles
   (caption == the AGENTS_INFO company/name) and `type:"AD"` before judging photo evidence.
   No interior shot at all → the `_shared.md` no-real-photos cap **does apply** (D ≤ 3,0), unlike
   the trap-5 "digital bearbeitete Fotos" case where real rooms are merely retouched.
   **Why:** an unfiltered count of 8 reads as a well-documented listing and would skip the D cap
   on a property whose interior is completely unverifiable.
   **A price near the bottom of the PRICE_INFO band (`priceIndicatorPositionInPercent` ~0.14) is
   EXPLAINED by the tenanted state — do NOT fire the "price far below market" scam signal.**
   Tenanted properties trade at a 15–30 % discount. Seen on #368 (expose 164714919, Grube).

6. **"Verkauf mit Nießbrauch" / Leibrente = de-facto HARD BLOCKER for an owner-occupier.**
   Third and worst variant of the "you can't move in" family (after trap 4 *Vermietet* and the
   Bauträger-Katalog cases). Tells: the word **Nießbrauch/Leibrente in `TITLE.title`**, a
   `TEXT_AREA "Sonstiges"` headed "WAS BEDEUTET NIESSBRAUCH?", and a `PRICE_INFO`
   `priceIndicatorPositionInPercent` near 0 (#370: 0.06). Unlike *Vermietet* there is no CHECK
   attribute — the ONLY structured trace is the title, so read it. What it means to score:
   - Nießbrauch is entered **Abt. II, erster Rangstelle**, ends only with the beneficiary's death
     (§ 1061 BGB). The exposé states the beneficiary's age — convert to a horizon (65 → ~18–22 y).
     **Block F = 1,0** (no move-in ever obtainable), **Block G ~1,5**, cap the total at 2,0.
   - Buyer gets **no use AND no rent** (nießbraucher keeps the Fruchtziehung) — this is not a
     tenanted-yield investment, it's a zero-cashflow bet on the beneficiary's death.
   - **"Eine Objektfinanzierung durch eine Bank ist in der Regel nicht möglich"** is standard text
     in these — the first-rank Nießbrauch sits ahead of any Grundschuld. So `FINANCE_CALCULATOR`'s
     "Finanziere ab X €/Monat" is not merely optimistic (as in the Bauträger cases) but
     **inapplicable**; say so in Block A.
   - The seller's "die Eigentümer tragen weiterhin alle laufenden Kosten" is **legally overstated**:
     § 1041 BGB binds the Nießbraucher only to *gewöhnliche* Unterhaltung — roof/heating/windows
     fall to the buyer. Score it as a Block D/G risk and put it in the questions list.
   - Ask **how many** Nießbraucher get entered: these exposés slip between "der Eigentümer ist 65"
     and "die jetzigen Eigentümer" (plural) — two beneficiaries means the *longer* life counts.
   - The huge discount vs the claimed Verkehrswert (#370: 259.000 vs "lt. Gutachten 600.000 EUR")
     is the capitalised Nießbrauch, **not** a scam signal — and these listings disclose the
     encumbrance openly in the title, which is exculpatory. Scam = Legitimate.
   - Watch for a **Kaufpreis mismatch between structured data and the description** (#370:
     259.000 € everywhere structured vs 295.000 € twice in the Objektbeschreibung) and for
     `Provision für Käufer:` whose text is a *Verkäufer*courtage "auf den **Marktwert**" — a
     3,57 % on 600.000 € is 21.420 €, not the 9.246 € IS24's FINANCE_COSTS computes off the price.
   Seen on #370 (expose 148465630, Marquardt, giv GmbH München).
   **Why:** all other signals on this listing (2.571 EUR/m², Energieklasse C, Garten, Garage,
   Baujahr 2006, 12 real photos) score it around 4,0 — a textbook match for the profile. Without
   reading the title/Sonstiges you'd recommend a house the user can neither finance nor ever
   live in.

8. **"Verkauf mit eingetragenem Wohnrecht" + Ausgleichszahlung — fourth "you can't move in"
   variant, and the best-hidden one.** Unlike Nießbrauch (trap 6) it is **NOT in the title** and
   unlike *Vermietet* (trap 4) the CHECK alone understates it. On #378 (expose 168980705,
   Berliner Vorstadt Potsdam) the whole disclosure was **three bullets at the very tail of the
   `TEXT_AREA "Ausstattung"` list**, after 40 lines of Ausstattung marketing:
   *"Verkauf mit eingetragenem Wohnrecht der aktuellen Eigentümer / Verkauf erfolgt unter
   eingetragener Vormerkung / Bei Freimachung ist eine Ausgleichszahlung von 333.333 € an die
   Eigentümer zu leisten."* → **always read the Ausstattung list to its last line on housebuy
   exposés**; the Objektbeschreibung sold the house as a family home with no hint of it.
   - §1093 BGB Wohnrecht ends only with the beneficiary's death and — decisively — there is
     **no Eigenbedarfskündigung against a dinglich right** (that route exists only for the
     trap-4 tenancy). So F = 1,0 and G ≈ 1,5, harder than the tenanted case.
   - **Score Block A against Kaufpreis + Ausgleichszahlung + Kaufnebenkosten**, exactly like the
     Bauträger extra-cost rule: 500.000 + 333.333 + 60.350 ≈ 893.683 EUR, i.e. a listing that
     shows 2.564 EUR/m² in the result list is really 4.273 EUR/m² and +78,7 % over budget →
     fires the 40 %-over hard blocker. The headline price IS the price of the encumbrance.
   - **Worse than Nießbrauch on cashflow:** a Wohnrecht is unentgeltlich, so there is no rent
     either — check whether the co-set `Vermietet:` CHECK means an *additional* tenancy or just
     mirrors the Wohnrecht status; the exposé usually never says, so make it a question.
   - `priceIndicatorPositionInPercent` ~0.08 with the price far below `minSimilarPrice` is
     **explained by the encumbrance → not a scam signal** (same logic as trap 4), and openly
     disclosing it is exculpatory.
   - Companion red flag: **"Verkauf erfolgt unter eingetragener Vormerkung"** = an Auflassungs-
     vormerkung (§883 BGB) already secures a third party's claim — the object may not even be
     freely sellable. Never skim past this phrase.
   - Also ask whether the Ausgleichszahlung triggers Grunderwerbsteuer a second time.
   **Why:** every other signal (Wunschlage am Tiefen See, 1.464 m² Garten, Keller, Stellplatz,
   Bj. 1996 gepflegt, Energieklasse D, 2.564 EUR/m²) scores this ~4,0 — a textbook profile match.
   Miss the three tail bullets and the report recommends a house that costs nearly double and
   can never be occupied.

5. **"Aufgrund der Privatsphäre der Mieter wurden digital bearbeitete Fotos erstellt."**
   Companion of trap 4. These are real room photos with furniture/personal items edited out — NOT
   Visualisierung/Symbolbild, so do **not** apply the `_shared.md` no-real-photos D cap (3,0).
   Apply a small −0,25 (surface condition only partly verifiable) and list it as an explicit ✗ con.
   Proactive disclosure like this is exculpatory in the scam check, not a signal.

   **Opposite sub-variant — "Bei den dargestellten Bildern handelt es sich um Bilder des
   MUSTERHAUSES." (last line of Objektbeschreibung) → the D cap DOES apply.** Trap 5 is the only
   photo disclaimer that *spares* the cap; this one is its mirror image and is easy to confuse
   with it because both appear as one tail sentence on a tenanted exposé. Musterhaus = a different,
   merely baugleiche building, i.e. the `_shared.md` Musterwohnung/Symbolbild keyword ⇒ zero real
   photos of *this* object ⇒ **D ≤ 3,0** on an existing house. Crucially the disclaimer is
   **blanket**: it retro-covers even the captions that look object-specific (#394's two
   `Außenansicht` shots), so don't rescue them. Seen on #394 (expose 166430412, Fahrland, THE
   GROUNDS AG): 11 MEDIA = 2 Außenansicht + 2 explicit Musterhaus interiors + 1 Vogelperspektive
   + **5 city/area marketing tiles** (`Supermarkt_Apotheke_Bäcker`, `Holländerviertel`,
   `Stadtschloss`, `Barberini`, `Haus kaufen-Potsdam-Brandenbur` — the trap-9 Ortsnamen filter)
   + 1 Grundriss ⇒ real evidence = a floor plan and nothing else. Still **exculpatory in the
   scam check** (openly declared) — it is a Block-D problem, never the "photos from a different
   property" signal.
   **Why:** read as trap 5 it costs only −0,25 and the report would call a 28-year-old *occupied*
   house "gepflegt" on the seller's word, with its post-tenancy interior wholly unseen.

11. **`Vermietet:` CHECK with NO Mieteinnahmen ANYWHERE is a real gap, not a lookup failure.**
   Trap 4 says to check the "Kosten" ATTRIBUTE_LIST before logging Mieteinnahmen as missing —
   on #394 they are genuinely absent from every section (Kosten carries only Kaufpreis, Preis/m²,
   Provision) *while the Lage text markets the house as "langfristiges Investment zur
   Kapitalanlage"*. Say plainly that the one number the advertised purpose depends on is not
   disclosed, and make it question #1 — do not silently fall back to a Bestandsmiete estimate.
   Also absent on these: Grundsteuer, Mietdauer, Mietvertragsbeginn, Kündigungsausschluss.

13. **Portfolio sell-off tell: `OBJECT_INFO` "Objekt-Nr.: {PLZ}-{NN}" + an AGENTS_INFO `name`
   that is a place-team ("Team Fahrland-Werder") ⇒ a developer is unloading a whole local stock
   unit by unit.** #394 was `14476-19` from THE GROUNDS Real Estate Development AG (listed AG,
   HRB 191556 Berlin), sold tenanted. Two consequences worth a Next step:
   - **Sister units very likely exist (14476-01…-18), and some may be BEZUGSFREI.** On any
     tenanted-house dead end (trap 4), asking for a vacant baugleiche unit from the same
     portfolio is the highest-leverage question available — it converts an unbuyable listing
     into a possibly buyable one instead of just discarding it.
   - It also **explains the Musterhaus photo set** (one shoot amortised across many identical
     units) and the object-ignorant boilerplate — #394's description misstates its own house
     ("ein/zwei Dachfenster") and is riddled with typos from a professional AG. Score H down for
     sloppiness (3,0) but check the *seller's* Bonität/Jahresabschluss too: a corporate serial
     seller's solvency matters before any Notartermin.
   **Why:** without the portfolio reading, a `Vermietet` listing is just a dead end; with it,
   the single best follow-up question falls out of the Objekt-Nr.

**Why (4/5):** scored without them, a tenanted 2.484 EUR/m² house reads as a bargain in-budget
EFH at ~4,3 and the report would tell the user to apply — when they cannot move in for 6–24
months and might litigate to get there.

8. **`Bezugsfrei ab: "spätestens {date}"` = occupied/let NOW, with no `Vermietet:` CHECK.**
   The soft fourth member of the "you can't move in yet" family. A future *guaranteed* date reads
   as a plus under a flexible move-in window (F 4,5), but the word **spätestens** only makes sense
   if someone is living there — and these exposés carry no `Vermietet:` CHECK and only a werbliche
   hint in the description ("begeistern Mieter wie auch Selbstnutzer"). Score F on the date, but
   make the report demand a **Räumungs-/Bezugsfreiheitszusicherung in the Kaufvertrag**: without
   it §566 BGB applies and the date is a mere Absichtserklärung → F would drop to ~2,0. Seen on
   #376 (expose 168977487, Werder/Obstzüchterstr.).
   **Why:** scored naively, "bezugsfrei spätestens 27.02.2027" looks like a planned handover date
   rather than a tenancy the buyer may inherit.

12. **A MEDIA entry can be a caption-only PLACEHOLDER — read the caption as a sentence.** Beyond logo
   tiles / AD / stock shots, discretion-marketed exposés pad the gallery with an image whose caption is
   an *offer to send the document*, e.g. `"Grundriss gerne auf Anfrage"` (#380). That is not a Grundriss
   and not a photo. So a "2 Fotos" count was really **1 exterior shot, zero interiors, no floor plan** →
   the `_shared.md` D cap (3,0) applies and "Grundriss: nicht verfügbar" belongs in Block C.
   **Why:** counted naively it reads as a documented listing with a floor plan, skipping the D cap on a
   Bestandsobjekt from 1884 whose interior is entirely unverifiable.

9. **MEDIA padded with tourist/city stock shots, not just logo tiles.** Extension of trap 7:
   on a 14-image gallery, 6 captions were bare place names (`Werder`, `Werderpark`, `Potsdam` ×4,
   `Werder Nachbarschaft`) = area marketing stock, plus 1 company logo and 3 captioned
   "Unverbindliche Visualisierung". Real object photos: 3 exteriors, **zero interiors**. So the
   caption filter must drop (a) logo tiles, (b) `type:"AD"`, (c) **bare Ortsnamen/Sehenswürdigkeit
   captions**, and (d) Visualisierung/render captions, before judging photo evidence. Existing
   house + no interior shot → the `_shared.md` D cap (3,0) applies. Seen on #376.
   **Why:** an unfiltered "14 photos" reads as a richly documented listing and skips the D cap on
   a Bestandsobjekt whose interior is entirely unverifiable.

10. **A WEG-aufgeteiltes Reihenhaus is often only detectable from one sentence in the
   Objektbeschreibung.** #376 had no WEG attribute anywhere structured — the only trace was
   "Die Fläche des WEG-Grundstückes beträgt 2.658 m²" in the last line of the description, while
   `Grundstück ca.: 165 m²` in TOP_ATTRIBUTES/Hauptkriterien is just this unit's share. Once
   found, it opens the whole #373 Block-G cluster (Hausgeld/Wohngeld + Instandhaltungsrücklage
   usually **not disclosed at all** on these — that is a real gap, not an oversight; Garten and
   Carport typically only via Sondernutzungsrecht; a gemeinschaftliche Gasheizung means the
   GEG-Austausch is a Mehrheitsbeschluss, not the owner's call). Always grep the description tail
   for `WEG`/`Teilungserklärung`/`Sondernutzung` on any Reihenhaus before scoring G.
   **Why:** without it a Reihenhaus scores as freehold with 165 m² of own land and no monthly
   carrying cost — G comes out ~4,5 instead of 3,0 and the report omits the decisive document list.

11. **Always cross-check `FINANCE_CALCULATOR`'s `funds=` against `buyer.equity_available`.**
   Not just a Bauträger issue (the #369 note) — it bites on ordinary Bestandsobjekte too. #376:
   IS24 quoted "ab 1.363 €/Monat" on `funds=85000` while the profile has 50.000 EUR; the
   36.125 EUR Kaufnebenkosten must come out of equity first, leaving ~13.875 EUR → ca. 96,7 %
   Beleihung, a rate nearer 1.600–1.800 EUR and a loan many banks won't write at all. On any
   Kauf exposé, compute (equity − Kaufnebenkosten) ÷ Kaufpreis and say so in Block A.
   **Why:** the binding constraint on this profile is financeability, not the headline price —
   an in-budget 425.000 EUR house can still be unbuyable.

### Kauf: the Bauträger extra-cost rule applies to SANIERUNGSBEDÜRFTIGE Bestandsobjekte too
The "score Block A against Kaufpreis + the real extra cost" doctrine was written for Bauträger
catalog listings, but the same distortion hits ordinary old houses. Trigger combo, all structured:
`Objektzustand`/description says **sanierungsbedürftig** + `Energieeffizienzklasse` **G/H** + a
`Letzte Modernisierung` year whose Ausstattung list names one trivial item.
**Reading the energy class:** the `ATTRIBUTE_LIST` entry is an `IMAGE` whose `url` ends
`.../energy-efficiency-labels/H.png` — but the one-step check is
**`adTargetingParameters.obj_energyEfficiencyClass` ("H"), a plain text field** (corrected on #385;
an earlier note here claimed no text field exists). Companion: `obj_energyType`
(`energy_required` = Bedarfsausweis). Note the kWh/(m²·a) value is often absent from the API even
when the class is present (#385) — then say so rather than inferring a number.
#382: Bj. 1932, class H (296,49 kWh/m²a Gas), "2010" = *Fenster im DG* only. Handle as:
- Estimate the Sanierung (150–250 T EUR for ~90 m² Bestand: Dach/Fassade/Kellerdecke, Fenster,
  Heizungstausch, Elektro, Bad), **label it as YOUR estimate**, and run Block A on
  Kaufpreis + Kaufnebenkosten + that range. #382: 465 T headline → 615–715 T real = +23–43 %.
  Don't formally fire the 40 % hard blocker on an inferred number; say it *would* fire.
- **§47 GEG Nachrüstpflicht** (oberste Geschossdecke + Wärmeverteilleitungen, within 2 years of
  Eigentumsübergang) is mandatory on any pre-1949 house — a Block G item, not optional upside.
- A historic *Siedlung* named in the Lage text (#382: "Am Stadtrand", Reinhold Mohr 1932–36) means
  Ensembleschutz/Erhaltungssatzung must be checked — it constrains exactly the façade/window/roof
  work the Sanierung needs. Make it a Next-step question to the Untere Denkmalschutzbehörde.
- Sanity-check that the price isn't actually crazy: subtract Grundstück m² × Bodenrichtwert. #382's
  724 m² ≈ 215–290 T of the 415 T → you're buying land, and `priceIndicatorPositionInPercent` 0.35
  confirms it's mid-band → **not** a scam signal.
**Why:** the headline 415.000 EUR sits under a 500 T budget and every amenity matches, so Block A
naively scores 4,5–5,0 on a house that is unbuyable for this profile — the equity check
(50.000 EUR vs 50.091 EUR Kaufnebenkosten alone, see the `funds=` rule above) is what settles it.

#### The doctrine cuts BOTH ways — run the arithmetic, don't reflex-discard the cheap ruin
#382 (415 T headline) blew the budget once Sanierung was added; #385 (expose 168153286, Uetz-Paaren
DHH, 170 T, class H, Bj. 1920) did **not**: 170.000 + 14.450 Nebenkosten + 140–220 T Sanierung =
**324–404 T EUR, i.e. 19–35 % UNDER** the 500 T budget, and 50.000 EUR equity − 14.450 Nebenkosten
left 35.550 → **~79 % Beleihung on the purchase**, the first financeable case in the batch. So a
`sanierungsbedürftig` + class-H combo is not automatically a reject; it is automatically a
*calculation*. Two things make the cheap case work and are worth checking explicitly:
- **Kaufnebenkosten scale with the price.** At 170 T with `Provision für Käufer: Nein` they are only
  14.450 EUR — the equity-exhaustion failure mode that killed #382/#376 simply doesn't fire.
- **Ausbaureserve fixes the all-in €/m².** Score the effective €/m² as
  (Kaufpreis + Nebenkosten + Sanierung) ÷ Wohnfläche and say where it lands vs `max_price_per_m2`
  (#385: 3.716–4.632, straddling the 4.000 limit) — then re-run it with `Nutzfläche` converted
  (unausgebautes DG → +40 m² for 50–80 T EUR), which dropped it to 2.950–3.810. Report both rows.
Block D still bottoms out at **1,0** here (sanierungsbedürftig 1,5 − 1,0 for class H, clamped), so a
strong A/C/E can still carry the total to ~3,8. Don't let the D floor pre-decide the verdict.
**Why:** applied one-directionally, the #382 doctrine reads "sanierungsbedürftig + H ⇒ unaffordable"
and would have discarded the only house in the batch the profile can actually finance.

- **`obj_telekomInternetAvailable: false` is a real Block-B con, not boilerplate.** Fastest broadband
  check on any exposé; on rural Ortsteile (#385 Uetz-Paaren) it flips "ruhige Lage" into a home-office
  blocker for this profile. Pair it with the `Internet:` LINK attribute (which is only an ad).
- **Bodenrichtwert datapoint — Uetz-Paaren / nördliche Ortsteile Potsdam: ca. 200–300 EUR/m²**
  (used on #377 and #385). At #385's 520 m² that is 104–156 T of the 170 T price, i.e. the house
  residual is 14–66 T — which *explains* a `priceIndicatorPositionInPercent` of 0,09 and neutralises
  the "far below market" scam signal. Same land-residual sanity check as #382.
- **A rural Lage text that honestly says shops/schools are "in den umliegenden Ortsteilen … in
  wenigen Fahrminuten" is credible** — contrast #377's boilerplate, which falsely claimed them "in
  unmittelbarer Nähe" for the same village. Reward the honest one (B ~3,5), don't apply the #377
  false-claim deduction indiscriminately to every Uetz-Paaren listing.

#### What flips the #385 arithmetic from "affordable ruin" to "unaffordable ruin": the Provision
#385 worked (all-in 19–35 % UNDER budget) and #392 (expose 166597538, Bornim DHH Bj. 1958, class H,
387 kWh/(m²·a), 330 T) failed (+10–30 % OVER) on the *same* condition profile. The whole delta is
the entry price driving Kaufnebenkosten: #385 had `Provision für Käufer: Nein` → 14.450 EUR NK and
35.550 EUR of equity left (~79 % Beleihung); #392's 3,57 % Provision (11.781 EUR) pushed NK to
39.831 EUR → **10.169 EUR left, 96,9 % Beleihung, and the whole Sanierung unfunded on top.**
So on any sanierungsbedürftig Bestandsobjekt run this order: (1) all-in = Kaufpreis + NK +
Sanierung estimate, (2) effective EUR/m² all-in vs `max_price_per_m2` — it breaches far earlier
than the budget does (#392: 4.953–5.854 vs a 4.000 limit, i.e. over in EVERY scenario while the
budget was only over in the mid/upper one), (3) equity − NK. **Report a two-row scenario table
plus an explicit #385-vs-this comparison table** — the contrast is what makes the verdict legible,
since both listings look identical at the attribute level.
- **Sanierung cost anchor: ~1.600–2.500 EUR/m² for a Kernsanierung** of a pre-1960 house at class
  H (Heizung+Öltank-Rückbau, Fassade+Dach, Fenster, Elektro komplett, Sanitär/Bäder, Innenausbau,
  Kellerabdichtung/Schadstoffe). #392: 111 m² → 180–280 T. Label it as YOUR estimate.
- **Make KfW 261 / BAFA-BEG the top-of-list Next step, not an afterthought.** On a class-H object
  the Tilgungszuschuss is the one unknown that can move the verdict back into budget — and an
  Energieberater is mandatory for the funding anyway, so it merges with the "get a Sanierungs-
  gutachten" step. Say explicitly in the report that this is the decisive open number.

**`Baujahr laut Energieausweis` ≠ `Baujahr` — it dates the last substantial measure AND usually
the heating.** #392: `Baujahr: 1958` but `Baujahr laut Energieausweis: 1995`. That single field
(a) dates the last modernization to 31 years ago, (b) implies the Ölkessel is from 1995 →
**§ 72 GEG Betriebsverbot for >30-year-old Konstanttemperaturkessel, whose owner-occupier
exemption ENDS at Eigentümerwechsel (new owner has 2 years)**, and (c) proves the 1995 work was
not energetic, since the class is still H. Chain it: § 72 forces the swap → § 71 GEG 65-%-EE
applies → at 387 kWh/(m²·a) a Wärmepumpe is uneconomic before the Hülle is done ⇒ the Sanierung
*order* (envelope first) is legally forced, which is what makes the cost floor high. Companion
Block-G items on any pre-1978 house with an oil tank: Öltank-Stilllegung/Entsorgung 2–5 T EUR
**plus Altlasten-/Bodenverunreinigungsrisiko** (query the municipal Altlastenkataster), and
Asbest/KMF/Blei/PAK → Schadstoffgutachten before the Kaufvertrag.
**Why:** read as a mere "modernized 1995" plus, this field hides a statutory heating-replacement
deadline that is the single largest driver of the Sanierung estimate in Block A.

#### MEDIA caption class: **"… Virtual Staging"** = real room, digitally furnished — NOT a D cap
Distinct from trap 5 (`digital bearbeitete Fotos` = furniture removed) and from Visualisierung/
render captions. #392 carried 3 such captions (Küche / Schlafzimmer / Badezimmer Virtual Staging)
**alongside the unstaged originals of the same rooms** ("Küche", "Badezimmer P1/P2"). Where the
original is also present, this is a marketing aid with a built-in control — do **not** apply the
`_shared.md` no-real-photos cap, do **not** log a scam signal, and treat the labelling as
*exculpatory*. Only if the staged image is the ONLY version of a room does the trap-5 −0,25
"surface only partly verifiable" deduction apply.
- Same exposé shows the transparency pattern worth crediting in Block H: Sanierungsbedarf in the
  **first sentence** of Objektbeschreibung, Virtual Staging labelled, **Weitwinkel disclosed**
  ("alle Fotos im Weitwinkelformat aufgenommen" → tell the user to measure rooms on site),
  Energieausweis attached as PDF, 360°-Rundgang in the "Weitere Links" REFERENCE_LIST, and
  Grundrisse for **all four levels in both 2D and 3D**. A Bestandsobjekt CAN be lavishly
  documented — 38 PICTUREs here, incl. Keller/Heizraum/Tankraum, i.e. exactly the rooms a seller
  hiding a Sanierungsstau omits. Score D on the object's condition, H on the disclosure quality;
  don't let a low D drag H down.
- **A `TEXT_AREA` set that is three paragraphs of contentless marketing prose is still a real
  Block-H deduction** even when the gallery is excellent: #392 names nothing about Fenster, Dach,
  Elektrik, Bäder or Stellplatz. Consequence for Block E: amenities that are simply *never
  mentioned* (Terrasse, Garage/Stellplatz on #392) count as **absent, not unknown** — don't infer
  a Stellplatz from a 508 m² plot.

- **Bodenrichtwert anchor — Potsdam-Nord / Bornim: ca. 400–500 EUR/m²** (my estimate, used on
  #392: 508 m² ≈ 203–254 T of a 330 T price ⇒ house residual only 76–127 T ⇒ a
  `priceIndicatorPositionInPercent` of 0,12 is explained by the Sanierungsstau, **not** a scam
  signal). Sits well above the Uetz-Paaren/nördliche-Ortsteile 200–300 and the Fahrland 250
  anchors — Bornim is an established inner Potsdam Ortsteil, so don't reuse the rural numbers.
- **Bornim (`obj_regio3 = Potsdam_Nord`, `obj_regio4 = Bornim`) is a genuine Potsdam Ortsteil =
  `preferred_area`**, ca. 3–4 km from Golm — the profile's best possible location match. After a
  long run of Fahrland/Marquardt/Wustermark listings that only *look* like Potsdam, verify the
  geo-tag against the Lage text as usual (#392: text and tag agreed, and the decoded Telekom
  address corroborated), then score B 4,5+ without hedging.

- **`Zimmer` in header/TOP_ATTRIBUTES can contradict the description** (#382: structured `6`, both
  Objektbeschreibung and Ausstattung say "fünf Zimmer"). Same family as the Wohnfläche/Nutzfläche
  trap — reconcile before scoring Block C, and report the discrepancy as a question.

### Kauf: two attribute fields that read better than they are
- **`Letzte Modernisierung/ Sanierung: {year}` is NOT a renovation state** — it is the year of the
  most recent *single* measure, however trivial. Always reconcile it against the `TEXT_AREA
  "Ausstattung"` bullet list, which dates each item. #375 (expose 169267450, Falkensee-Finkenkrug)
  showed "2025" while the list read "ca. 2025 **ein Dachflächenfenster** erneuert"; the substance
  (Heizung, Tür) was ca. 2010. Score D off the Ausstattung dates, not the headline year.
- **A Keller CHECK on housebuy exposés is OPTIONAL, not absent** — corrected on #382 (expose
  168705300, Waldstadt I), whose Hauptkriterien *does* carry `{"type":"CHECK","label":"Keller:"}`
  next to Garage/Bezugsfrei. So: CHECK present = Keller confirmed; CHECK absent proves nothing
  (many housebuy exposés omit the attribute entirely). Where it's absent, decide it from the
  Objektbeschreibung's floor enumeration ("teilt sich in Erdgeschoss, Obergeschoss und
  Dachgeschoss auf" = kein Keller) plus the Ausstattung list. `adTargetingParameters.obj_cellar`
  is the faster check when present.
**Why:** both fields silently inflate Blocks D and E — a "2025 saniert" 5-Zimmer house with an
assumed Keller scores ~0,4 higher than the same house read correctly.

### Kauf: MEDIA captions can leak the exact street address
When `MAP.addressLine1` says "Die vollständige Adresse … erhältst du vom Anbieter", check the
`MEDIA[].caption` list anyway — Grundriss scans are often captioned with the file name from the
Makler's own system, which includes the street ("Schmidtshof 3 Grundriss EG"). Gives you the
address for Bodenrichtwert/Milieuschutz research and neutralises the "no exact address" low
scam signal. Seen on #368.

### Two parsing gotchas when iterating `.sections[]`
- **At least one section has NO `type` key** (an empty `{}` between FINANCE_COSTS and
  PREMIUM_ADDITIONAL_INFO). `s['type']` raises KeyError mid-loop and truncates your dump — always
  use `s.get('type')`.
- **`AGENTS_INFO.rating` can be entirely absent** (not `null`, just missing) = the Anbieter has no
  reviews at all. That's H ≈ 3,5 (unknown), not a negative. Seen on #368 (Patria Immobilien).

### Real-vs-render photo call from MEDIA captions alone
`MEDIA[].caption` of camera-original filenames (`IMG_0652`, `IMG_0754`, …) = real photos → do NOT
apply the no-photos D cap. Renders/stock instead caption as Visualisierung/Symbolbild or room
names on Neubau projects. Note the trailing `type:"AD"` entry ("Gesponsert") is not a photo —
exclude it from the count (#361: 16 media = 15 photos + 1 ad).
**Why:** lets you settle the Block D photo-evidence adjustment from the JSON without opening the gallery.

**Why:** this guide was stranded in an orphaned memory copy (`reports/.claude/agent-memory/`,
a wrong-cwd artefact, merged + deleted 2026-07-11) while evaluations re-derived the JSON
shape every run. `publicationState` also gives a cleaner EXPIRED signal than the web stub.

## Fast discriminator: catalog Bauträger vs. REAL existing house (run before the plot-grep chain)
The whole plot-question ladder above (#364–#391) only applies to `Bauphase: Haus in Planung`
offers. Fahrland/Marquardt Kauf results are so dominated by Bauträger ads that it's easy to start
the Bodenrichtwert back-calculation on a listing that never needed it. Three JSON fields settle
it in one look, before reading any TEXT_AREA:
`obj_constructionPhase` (`no_information` = existing) + `obj_newlyConst: n` + a **past `Baujahr`**
in "Bausubstanz & Energieausweis". Corroborator: `MEDIA` captions are **room names**
(`Wohnzimmer`, `Küche Souterrain`, `Badezimmer`, `Flur`) rather than house-type/catalog/Gütesiegel
names — room captions on a Kauf exposé mean a real, photographable house. When it's an existing
house, the headline Kaufpreis IS the price: no hidden Baunebenkosten estimate, no plot question,
and `FINANCE_COSTS.totalCosts` is trustworthy as-is. Seen on #393 (expose 166500556, Fahrland,
Bj. 1983, Evernest).
**Why:** three of the last ten Fahrland evaluations were catalog offers, and defaulting into that
frame on a real house would have invented a 40–70 T EUR Baunebenkosten range that does not exist.

- **`obj_condition: no_information` + "potential for development" / "solidly built" = UNSANIERT.**
  On existing-house exposés the Anbieter simply omits `Objektzustand` when there is nothing good
  to declare; the marketing text then substitutes development-potential language for a
  renovation claim. Cross-check `Baujahr laut Energieausweis` — when it **equals** `Baujahr`, no
  energetically relevant modernisation is documented either. Score D off "unrenoviert but usable"
  (2,5) adjusted for the Ausweis class, not off the flattering prose. (#393: both 1983 → D = 3,0.)
- **Gasheizung + pre-1995 Baujahr on a KAUF listing is a Block-G legal item, not just a D note.**
  §47 GEG imposes on the *new owner*, within 2 years of purchase: 30-year-old-Kessel replacement,
  oberste-Geschossdecke/Dach insulation, and pipe insulation. In Potsdam (>100k EW, kommunale
  Wärmeplanung deadline 30.06.2026 passed) the replacement must meet the **65 % EE** rule → a
  Wärmepumpe, 25–40 T EUR, not a cheap new Gastherme. The exposé never states the boiler's age,
  so make it the highest-value written question before any viewing. Score G ~3,5.
- **`Provision für Käufer` on a Wohnimmobilien-Kauf is legal ONLY with the mirror clause**
  (§656c/656d BGB: the seller must owe at least the same amount). Exposés state the buyer's %
  and stay silent on the seller's → don't log it as a violation, log it as "Spiegelklausel
  schriftlich bestätigen lassen"; without it the buyer's commission is unenforceable.
- **English/German twin exposés are one object listed twice by the same agent**, not a reposting
  scam signal — verify by comparing price + Objekt-Nr./AGENTS_INFO. Same Kaufpreis ⇒ benign
  bilingual marketing; put "only contact once" in Next steps. (#393 EN 166500556 ↔ DE 166458277.)
- **Grundstück size can differ between the structured field and the description prose**
  (#393: `TOP_ATTRIBUTES`/header 930 m² vs. Objektbeschreibung "approximately 963 m²"). Report
  the structured value, flag the delta, make the Katasterauszug a Next step — it moves the
  Bodenwert back-calculation by a five-figure amount.
- **`obj_barrierFree: n` beats an "elevator"/barrier-free claim in the prose** (same rule as
  #377). On #393 the description advertised an elevator in a 1983 EFH while the flag said `n` and
  no `Aufzug` attribute existed — trust the flag, list it as a viewing question.

## `realEstateType: livingbuysite` — bare Baugrundstück exposés (a different attribute set)
Not a Bauträger/catalog listing (no `Bauphase`, no house, no Leistungsumfang) — it's raw land.
`obj_immotype: grundstueck_wohnen_kauf`. The whole Hauptkriterien table is plot-specific and IS the
Block E evidence: `Erschließung: Erschlossen` (+ `obj_development: developed`), `Kurzfristig
bebaubar` as a bare CHECK (`obj_shortTermBuild: y`), `Bebaubar nach: wie Nachbarbebauung`
(= § 34 BauGB, `obj_constAfter: neighbourconstruction`), `Empfohlene Nutzung:`, and
`obj_buildingPerm` (n = only a Vorbescheid, never assume a Baugenehmigung).
- **`Empfohlene Nutzung: Mehrfamilienhaus` = a developer parcel, not an Eigenheim plot.** Say so
  outright — it changes what the listing *is*, independent of price. Corroborated by
  `obj_recommendUtil: apartment_building` and a stated realisable Wohnfläche in the description.
- **"Kaufpreis: Auf Anfrage" is common here, and the seller often hands you the Bodenrichtwert in
  the `TEXT_AREA "Lage"`** ("Der Bodenrichtwert liegt bei 900 Euro/qm", #401). Grep Lage for
  `Bodenrichtwert` BEFORE reaching for an external BRW estimate — it makes the Block-A floor
  (BRW × m²) a seller-disclosed figure rather than your inference.
  Second anchor in the same family: sellers who are themselves developers quote **achieved
  Wohnungs-Verkaufspreise** ("Ich selbst habe in der Lage zwischen 8750 und 9200 Euro/qm verkauft").
  Residual-value the plot from it: realisable Wohnfläche × EUR/m² × 20–25 % Grundstücksanteil.
  On #401 that turned a 353.700 EUR BRW floor into a realistic 1,2–1,6 Mio — a two-order-of-magnitude
  difference in the verdict, from the exposé's own numbers.
- **Potsdam-Innenstadt BRW anchor: 900 EUR/m²** (Behlertstr./Nauener Vorstadt, disclosed on #401).
  Compare: Fahrland 250, Marquardt 300–350, Babelsberg 600–900.
- Block G on inner-Potsdam plots: Erhaltungssatzung/Denkmalbereich (UNESCO buffer) ⇒ gemeindliches
  **Vorkaufsrecht** + gestalterische Auflagen are realistic and never stated — score G down and make
  the Stadtplanungsamt enquiry a Next step. Also check Abt. II for the Wegerecht the text claims.
- "Unterlagen werden nicht rausgeschickt, erst bei einem persönlichen Gespräch mit Kaufabsicht" +
  no price = a medium scam/transparency signal on a plot, because the Vorbescheid/Lageplan ARE the
  entire value. Pair it with the AGENTS_INFO/Impressum consistency check: #401 had three divergent
  company identities (profile address ≠ Impressum address ≠ a *third* firm name in the Freemail
  contact `camulusgmbh@t-online.de`) plus a 2-of-6-star rating.
**Why:** the Bauträger plot-question machinery above (steps 0–4, brand €/m² bands) does not apply to
these at all, and without the Lage-text BRW grep an "Auf Anfrage" plot has no scoreable Block A.

## Bare PLOT exposés (`realEstateType: livingbuysite`) — a different field set from the Bauträger chain
The whole #364–#391 plot-question ladder above is about *house* listings where you must infer whether
land is included. A standalone Grundstück exposé needs none of it — the plot IS the object — but it
carries its own attribute set and its own defect-disclosure location. Read these instead:
- `ATTRIBUTE_LIST "Hauptkriterien"` gives the four fields that decide Blocks E/C:
  **`Erschließung:` (`obj_development: developed|partly|undeveloped`), `Bebaubar nach:`
  (`obj_constAfter`), `Empfohlene Nutzung:` (`obj_recommendUtil`), `Grundstück ca.:` (`obj_lotArea`)**,
  plus **`obj_buildingPerm: y|n`** (Baugenehmigung/Bauvorbescheid) which appears ONLY in
  adTargetingParameters, never as a visible attribute. `Bebaubar nach: wie Nachbarbebauung`
  = **§ 34 BauGB, no Bebauungsplan** ⇒ Art und Maß der Nutzung legally undetermined; combined with
  `obj_buildingPerm: n` the achievable Geschossfläche — the entire value basis — is the buyer's risk.
  Score Block E (= Erschließung/Baurecht on plots) on the *pair*: "Erschlossen" alone is not Baurecht.
- **`Empfohlene Nutzung: Mehrfamilienhaus` / `obj_recommendUtil: apartment_building` is the
  single fastest disqualifier for a private-buyer plot search.** It means the seller is marketing to
  Bauträger/Investoren; with `Kaufpreis: Auf Anfrage` such listings **bypass IS24's price filter**
  (same mechanism as #380) and land in a ≤200 T EUR search regardless. Check this field before
  anything else — #399 (expose 168960246) was 6–11× over budget.
- **`Empfohlene Nutzung` / `obj_recommendUtil` is often ABSENT — then the developer-parcel tell is the
  TITLE.** #402 (expose 168363340, Ketziner Str. 120 Fahrland) has neither the attribute nor
  `obj_recommendUtil`, but the title reads *"Baugrundstück in Potsdam **für Bauträger, Investoren,
  Firmen und Anleger** zu verkaufen"* — same disqualifier, different location. So the #399 one-field
  check must be a two-step: attribute first, then grep the TITLE for
  `Bauträger|Investor|Anleger|Projektentwickl|Firmen`. Corroborators when the field is missing:
  plot ≫ profile minimum (3.454 m² vs 500), Objektbeschreibung promising **mehrere Vollgeschosse +
  Tiefgarage** ("bis zu 3 Vollgeschosse … Parkplatz und Tiefgarage ebenfalls möglich"), and
  `Kaufpreis: Auf Anfrage`. Score C down for the same reason as #399 (the size IS the price problem)
  and check whether a **Teilfläche/Realteilung** is offered — if not, no budget path exists.
  **Why:** keying the check on `Empfohlene Nutzung` alone silently passes an investor parcel through
  as an ordinary Baugrundstück, and it is the field that decides whether the listing was ever
  addressable.
- **Commercial project-development variant of the investor disqualifier — and the price hides in
  `TEXT_AREA "Sonstiges"`.** #428 (expose 169421957, HausHirsch GmbH, Wilhelmstadt/Berlin-Spandau)
  is a `livingbuysite` whose TITLE reads *"Off-Market Investment Opportunity … für ca. 4.700 m² BGF"*
  and Objektbeschreibung *"Projektentwicklungsgrundstück … Boardinghouse-, Hotel-, Büro- oder
  gewerbliche Nutzung"*. Two things beyond the #399/#402 rules: (1) the disqualifier is **commercial
  (Gewerbe/BGF), not MFH/Wohnfläche** — the value is quoted in `EUR/m² BGF`, so add
  `BGF|Boardinghouse|Hotel|Büro|Gewerbe|Projektentwicklung` to the TITLE/description grep, not just
  the MFH terms. (2) `Kaufpreis: "Auf Anfrage"` in the structured "Kosten" list, but the **real asking
  price is disclosed inside `TEXT_AREA "Sonstiges"`** ("…beträgt 2.800.000 €, was … 610 € pro m² BGF
  entspricht"). So on an "Auf Anfrage" plot, grep **Sonstiges for `€`/`beträgt`** (not only Lage for
  `Bodenrichtwert`) before declaring the price unscoreable — here it made the price disclosed, so the
  40 %-over hard blocker fires legitimately (2,8 Mio vs 200 k budget). Berlin is out-of-area but the
  profile's `excluded_areas` is empty ⇒ no *area* hard blocker; the price blocker does the capping.
  Anbieter was verified (TNS badge, 4,3/352) with no scam signals — legit commercial off-market, just
  wrong fit. Scored 1,0.
  **Why:** the existing investor-parcel check greps MFH terms + Lage-for-BRW; a Gewerbe/BGF parcel
  with the price buried in Sonstiges would slip both and read as an unscoreable "Auf Anfrage" plot.
- **`obj_constAfter: no_information` + a positive Bauvoranfrage in the text is BETTER than
  `neighbourconstruction`, not worse.** #402's structured field says nothing while the
  Objektbeschreibung states *"positive Bauvoranfrage vorhanden, nach Paragraf 34 BauGB ist eine
  Bebauung mit einem Wohn- und/oder Geschäftshaus zulässig"* — i.e. the § 34 Zulässigkeit is already
  behördlich bestätigt, which is the strongest Block-E evidence available short of the #400 B-Plan.
  Same lesson as #400: the dropdown attribute loses to the text. Still cap E (~4,0): `obj_buildingPerm: n`
  means Vorbescheid ≠ Baugenehmigung, and the Vorbescheid document is never attached — its **date and
  remaining validity (usually 3 years)** are the question to ask, since an expired one is worthless.
- Minor field notes on `livingbuysite`: the availability date lands in **`obj_undevelArea`**
  (#402: "8.6.2026"), not in any obvious date field; `obj_privateOffer: true` + `obj_courtage: n`
  = provisionsfreier Privatverkauf (Block G plus, Block H minus — these sellers have
  `verifiedBy: []`, empty `address`, no ratings). Also: "erschlossen" ≠ beitragsfrei — ask for the
  **Erschließungsbeitragsbescheinigung (§ 133 BauGB)**, the open Beitrag is a five-figure Block-A item.
- **On plot exposés the legal defects live in `TEXT_AREA "Objektbeschreibung"`, not in Lage/Sonstiges.**
  #399's Objektbeschreibung was a structured defect list under its own sub-headings — *Bebaubarkeit /
  Wasserschutz / Denkmalschutz / Dienstbarkeiten* — disclosing: no B-Plan; **Wasserschutzzone II vs III**
  (Zone II = Tiefgarage/Versickerung "sehr eingeschränkt", and the exposé did NOT say which zone applies
  → decisive unanswered question); Denkmal-**Umgebungsschutz** + UNESCO-Pufferzone (not Denkmalschutz on
  the object itself, so no §79 GEG question, but every design is denkmalrechtlich gebunden); a
  **beschränkte persönliche Dienstbarkeit — Geh-, Fahr- und Betretungsrecht für die Allgemeinheit** zugunsten
  der Stadt (a *public* right of way, unnegotiable, permanently reduces the usable footprint); and a
  **Miteigentumsanteil x/100 an einem Nachbarflurstück** (permanent co-ownership dependency). All Block G.
  Read it to the last line — and note "u.a." before a Grundbuch entry means more entries undisclosed.
- **A retained `Fundament` of a demolished building is a liability, not the plus the seller frames it as**
  — former Speicher/industrial use + no Bodengutachten, no Altlastenauskunft, no Kampfmittelfreiheit ⇒
  score Block D down, don't credit "Nachnutzung als Gründungsbasis denkbar".
- **`Provision für Käufer` on an UNBEBAUTES Grundstück is NOT covered by the §§656c/d 50/50-Teilungsgebot**
  (which applies to Wohnungen/Einfamilienhäuser only). So the mirror-clause note further up does not
  apply here: the buyer legitimately bears the full rate (#399: 5,95 %). Don't log it as a violation,
  but do size it — at a seven-figure price it is a six-figure cost.
- **`Bebaubar nach: wie Nachbarbebauung` does NOT prove there is no B-Plan — check the
  Objektbeschreibung before scoring E down for § 34 uncertainty.** #400 (expose 168950945, "Magazin 6",
  sibling of #399) carries the identical `obj_constAfter: neighbourconstruction` while its
  Objektbeschreibung states a **rechtskräftigen Bebauungsplan Nr. 36-3 „Speicherstadt-Süd", WA, mit
  festgesetztem Baufeld (Baufenster)**. So the attribute is what the Anbieter picked from a dropdown,
  not a legal finding; the B-Plan citation in the text wins. A named B-Plan + festgesetztes Baufeld is
  the *strongest* Block-E evidence available on a plot (kein § 34-Ermessen, kein Bauvoranfrage-Risiko)
  and should lift E, even while `obj_buildingPerm: n` still means no Baugenehmigung. Grep the
  Objektbeschreibung for `Bebauungsplan|B-Plan|Geltungsbereich|Baufeld|Baufenster`.
  **Why:** taking the attribute at face value would score a fully plan-gesicherten Parzelle as § 34
  legal-uncertainty and understate Block E by ~1,5 points.
- **The `Erschließung:` row can be ABSENT ENTIRELY — check `obj_development`, don't assume the four
  Hauptkriterien fields are always served.** The list above says Hauptkriterien "gives the four fields";
  #404 (expose 169336740, Grünefeld/Schönwalde-Glien) served only `Vermarktungsart / Grundstück ca. /
  Kurzfristig bebaubar ✓ / Bebaubar nach / Empfohlene Nutzung / Verfügbar ab` — **no Erschließung row at
  all**, with `obj_development: no_information` in adTargetingParameters. On a plot this is the single
  most cost-relevant field: unknown Wasser/Abwasser (Kanal vs Kleinkläranlage — never assume Kanal in a
  rural Ortsteil)/Strom/Telekom, and unknown **Erschließungsbeiträge nach § 127 BauGB / BbgKAG**, which
  are levied against the owner *at the time of the levy* i.e. possibly the buyer years later. Size it at
  **15–40 T EUR** (my estimate) and re-run the budget with it — on #404 it was the difference between
  184.916 EUR all-in (in budget) and >200 T (over). Score E down for the unknown; make it question #1.
  Read the blank field as **sloppiness, not concealment** (a seller hiding it would tick "Erschlossen") —
  so it is not a scam signal.
- **`Kurzfristig bebaubar: ✓` is NOT Baurecht — read the § 34 sentence for the word *unverbindlich*.**
  #404 pairs `obj_shortTermBuild: y` with an Objektbeschreibung saying *"Laut **unverbindlicher Auskunft**
  der Gemeinde … nach § 34 BauGB (Nachbarschaftsbebauung) bebaubar"* and `obj_buildingPerm: n`. A
  telephone Auskunft binds nobody. Grep the Objektbeschreibung for `Bebauungsplan|B-Plan|Baufeld|
  Baufenster` first (the #400 override); when there is none, the § 34 reading stands and E is scored on
  the pair. Mitigation to name in Next steps: a **Bauvoranfrage / verbindlicher Bauvorbescheid nach
  § 74 BbgBO** — a few hundred EUR converts probable into secured, so make the purchase conditional on it.
  Note the § 34 case is *strong* when the plot sits in a gewachsene EFH-Siedlung and `Empfohlene Nutzung:
  Einfamilienhaus` — probable, just not secured. Score E ~2,5, not lower.
- **Brandenburg-specific Block-G items no structured field carries:** the **Baulastenverzeichnis** is
  SEPARATE from the Grundbuch (Baulasten never appear in Abt. II — check both), Brandenburg is a
  **Kampfmittel-Verdachtsland** (Sondierung usually the buyer's cost, low four figures), and buying a
  plot with a Bauträger/Fertighaus contract attached risks the Finanzamt treating them as an
  **einheitliches Vertragswerk** ⇒ 6,5 % GrESt on the COMBINED sum. Advise buying the plot standalone
  and commissioning the build demonstrably later — worth five figures.
- **`Empfohlene Nutzung: Einfamilienhaus` + a published price is the profile-matching combination** —
  the mirror of the `apartment_building` disqualifier. #404 is the first plot in the search where size,
  intended use and buyer type align; when this fires, the report's work shifts from "is it addressable
  at all" to Erschließung + Bodenrichtwert negotiation.
- **BRW anchors, Havelland/Berliner Umland (extends the Potsdam ladder):** Gemeinde **Schönwalde-Glien
  Durchschnitt ca. 120 EUR/m²** (Gutachterausschuss, Stichtag 01.01.2025, **−4,8 % gg. Vorjahr** — a
  usable negotiation argument). **Trap:** the widely-quoted **200–290 EUR/m²** band applies only to the
  *Einfamilienhaus-Siedlungen* of Schönwalde-Glien/Brieselang/Wustermark, i.e. the **Berlin-nahen**
  Ortsteile — NOT to rural far-end Ortsteile like **Grünefeld** (my estimate 100–160 EUR/m²). Don't let a
  Gemeinde-level band launder a rural Ortsteil's price. Free exact figures: **BORIS-BB**
  (`boris-brandenburg.de/boris-bb/`) or Gutachterausschuss Havelland, Nauen, **03321 403 6181** — cheap
  enough that "get the exact BRW" belongs in Next steps on every Brandenburg plot.
- **Ortsteil ≠ Gemeinde for the area match.** A Gemeinde can border an `acceptable_areas` town while the
  *offered Ortsteil* sits at its far end — #404's Schönwalde-Glien borders Falkensee (acceptable) but
  Grünefeld is ~12 km from it. Adjacency does not transfer; score B on the Ortsteil named in
  `TEXT_AREA "Lage"`, not on the Gemeinde in the geo-tag.
- **`obj_telekomInternetUrlAddition` is simply absent on some address-withholding exposés** (#404) —
  the address-leak trick has no fallback then. Say "the plot cannot be located on a map before
  contacting the Makler" as an explicit ✗ con rather than reporting the Gemeinde as if it were the site.
- **A seller conceding weaknesses is exculpatory in the scam check.** #404 disclosed the § 34 Auskunft as
  *unverbindlich* and admitted shops/doctors/schools are "in den umliegenden Orten" — admissions against
  interest. Contrast #377, whose boilerplate Lage falsely claimed both "in unmittelbarer Nähe". Also on
  plots: a price *above* the local BRW is the inverse of the below-market scam pattern — note it as clean.
- **`Provision für Käufer` of ~3,57 % on a plot is a PLUS, not a negative** — legally the buyer's in full
  (§§ 656c/d cover only Wohnungen/EFH) but well below the 5,95 % regional norm seen on #399/#400. Say so.
  Paired tell of a serious listing: exact payment terms ("zahlbar und fällig nach Beurkundung") rather
  than a vague "üblich".
- **`obj_demolition: n` + a "keine Bäume, kein Abriss" caption is a real Block-D credit**, not marketing:
  it removes Fällgenehmigung/Ersatzpflanzung under the Baumschutzsatzung and all Abbruch/Entsorgung cost.
  The mirror of #399's retained Fundament liability. An **aerial photo** ("Grundstück von oben") is the
  most valuable single image on a plot exposé — it lets the parcel and its § 34 reference neighbours be
  judged before travelling; count it separately when auditing the gallery.
**Why:** all of the above changed Block A/B/E or the verdict text on #404 and none were derivable from
the existing `livingbuysite` rules, which assumed a complete Hauptkriterien table, an urban Potsdam BRW
ladder, and a `Mehrfamilienhaus`-style disqualifier.

- **Two more Abt.-II encumbrance types on Speicherstadt parcels, both Block G:** an **`Unterbaurecht`**
  zugunsten der Stadt (they may build *under* your plot — constrains Tiefgarage/Gründung, distinct
  from #399's surface Geh-/Fahrrecht, and #400's Geh-/Fahrrecht is explicitly "-unterirdisch-"), and
  a plot that **grenzt an eine bestehende Tiefgarage, nach § 13 WEG in viele Miteigentumseinheiten
  aufgeteilt** ⇒ Unterfangung/Beweissicherung plus consent from dozens of co-owners. Neither shows up
  in any structured field.
- **Falkensteg Real Estate GmbH (Düsseldorf/Frankfurt/München, Boris Schulmann, 4,4★/8) is disposing of
  a PORTFOLIO of adjacent Südliche-Speicherstadt parcels as separate exposés** — #399 Magazin 12
  (1.828 m², Friedrich-Wilhelm-Bölke-Str. 12/14/16) and #400 Magazin 6 (1.092 m², Zur Königlichen
  Hofbrauerei 2-3): identical terms (Auf Anfrage, 5,95 %, Erschlossen, Empfohlene Nutzung MFH,
  sofort). Falkensteg is a restructuring/transaction advisory ⇒ read "Auf Anfrage" as a structured
  or distressed bid process sold as-is, not as discretion. Cross-reference siblings in one table and
  treat them as ONE seller contact; expect more parcels from the same disposal.
  **Why:** scored in isolation each reads as an independent opportunity, and the near-identical terms
  are only legible as a portfolio disposal when the two are put side by side.
- **Speicherstadt / Leipziger Str. / Brauhausberg BRW anchor: 1.200 EUR/m²** (Potsdam Gutachterausschuss,
  gemischte Baufläche — among the city's highest); Geschosswohnungsbau in guten bis sehr guten Potsdamer
  Lagen 600–1.750 EUR/m². Extends the anchor list (Innenstadt/Nauener Vorstadt 900, Babelsberg 600–900,
  Bornim 400–500, Marquardt 300–350, Fahrland 250). Practical consequence worth stating in any plot
  report: at a 200 EUR/m² profile cap, **all of inner Potsdam is arithmetically excluded** — plot search
  is only viable in the acceptable_areas and nördliche Ortsteile.
- **`obj_constAfter: constructionplan` = "Bebaubar nach: Bebauungsplan" — the structured field ITSELF
  confirms a B-Plan** (contrast #400 where the attribute said `neighbourconstruction`/§34 and only the
  text disclosed the B-Plan). This is the cleanest Block-E case: rechtsgültiger B-Plan + GRZ (`obj_GRZ`)
  + GFZ named in Objektbeschreibung ⇒ kein §34-Ermessen. `obj_buildingPerm: n` still means no
  Baugenehmigung (Käufer beantragt nach Kauf), and `obj_shortTermBuild: n` can coexist with a valid
  B-Plan without contradiction. `obj_recommendUtil: twinhouse:single_family_house` = "Doppelhaushälfte,
  Einfamilienhaus" = the profile-matching Eigenheim combo (mirror of the `apartment_building`
  disqualifier). Seen on #427 (expose 167924176, Treuenbrietzen, 812 m² @ 180 EUR/m², scored 3,9 —
  clean plot fundamentals, dragged down only by out-of-area location ~40–50 km SW of Golm).
  Second instance: #429 (expose 168436219, Schwanebeck/Nauen, 755 m² @ 152 EUR/m², scored 3,7) —
  same clean B-Plan/EFH profile, `obj_constAfter: constructionplan` + named B-Plan "41/01 Am Gutshaus
  Schwanebeck" + GRZ/GFZ 0,4 in the Objektbeschreibung; dragged down by out-of-area (~30 km NW) AND
  the Sammelgrube caveat below.
- **`obj_development: developed` + "voll erschlossen" text can STILL hide a missing Kanalanschluss —
  read the Objektbeschreibung Erschließung sentence for `Sammelgrube`/`Kleinkläranlage`.** #429's
  Hauptkriterien said `Erschlossen` and the text listed Trinkwasser/Strom/Erdgas/Telefon/Kabel-TV im
  Straßenland — but the next line was *"Die Abwasserentsorgung erfolgt über eine Sammelgrube"* (no
  public sewer). On a rural Brandenburg Ortsteil "erschlossen" routinely means everything-but-Abwasser;
  a Sammelgrube = recurring emptying cost OR a future Kanalanschlussbeitrag / Kleinkläranlage build
  (four-to-five-figure Block-A/D item). Never read `developed` as "sewer included" on a Dorfkern plot —
  grep the Erschließung sentence. Score E/D down a notch and make it a Next step. (Distinct from #403's
  `Teilerschlossen` and #404's blank Erschließung field — here the field says fully developed and only
  the prose reveals the gap.)
- **BRW anchor — Schwanebeck/Nauen (rural Havelland Dorfkern): ~100–160 EUR/m²** Wohnbauland (my
  estimate). A 152 EUR/m² erschlossenes B-Plan-Grundstück sits at the top of / slightly above that band
  — market-appropriate, a mild negotiation lever, and *above* BRW = clean (inverse of below-market
  scam). Extends the Havelland ladder (Schönwalde-Glien ~120, Grünefeld 100–160). Nauen town Bahnhof
  → Berlin City ~30 min RB, but the Ortsteil needs a bus to Nauen first; Nauen is NOT in the plot
  search's preferred/acceptable areas (it IS in the *Freizeitgrundstück* acceptable list, but a full
  Bauland-EFH plot belongs to the plot-purchase search) → Block B ~2,0, no hard blocker (excluded empty).
- **BRW anchor — Treuenbrietzen / rural Niederer Fläming (Potsdam-Mittelmark far SW): ~50–90 EUR/m²**
  for Wohnbauland (my estimate). A 180 EUR/m² asking there is a *premium* (erschlossen + B-Plan +
  220 m zum Supermarkt) and a negotiation lever — but a price *above* BRW is the inverse of the
  below-market scam pattern (clean). Treuenbrietzen is outside the house/plot search's preferred +
  acceptable areas (RB33 stündlich → Potsdam Hbf, ~40 km); not excluded → no hard blocker, Block B ~2,0.
- Blocks that have no meaning on a plot: D is condition-of-*land* (Altlasten, Topografie, photos), E is
  Erschließung/Baurecht, C is plot size. **Score C against the profile's *intent*, not just `min_m2`** —
  a plot 3–4× the stated minimum with `Empfohlene Nutzung: Mehrfamilienhaus` is not "oversized and fine",
  it is the reason the price is unreachable; #399 scored C 3,0 despite 1.828 m² vs a 500 m² minimum.
- **Bodenrichtwert anchor — Potsdam Südliche Innenstadt / Speicherstadt (Havel-Wasserlage): ca.
  700–1.200 EUR/m²** (my estimate). Tops the Potsdam ladder: Teltower Vorstadt 680 (#391) >
  Bornim 400–500 (#392) > Uetz-Paaren/nördliche Ortsteile 200–300 > Fahrland 250 (#386, disclosed).
  Caveat: developer parcels are priced per m² **Geschossfläche**, not per m² Grundstück, so a
  BRW×Fläche figure is a **floor**, not a midpoint — say so when using it as the Block-A anchor.
**Why:** the existing memory made every plot question a house-listing inference problem; on a bare
`livingbuysite` the answers are all present as structured fields plus one defect-listing TEXT_AREA,
and `Empfohlene Nutzung` alone settles in one field whether the listing was ever addressable at all.

### Two more plot fields: `Abriss:` (CHECK) and the `obj_shortTermBuild`/`obj_constAfter` pair
Extends the Hauptkriterien list above; both seen on #403 (expose 168208239, Marquardt, 394 m²).
- **`Abriss:` appears as a bare CHECK attribute (`obj_demolition: y`) = the plot is BUILT ON and the
  structure must come down.** The Objektbeschreibung corroborates in passing ("bebaut mit einem
  Bungalow"). Score it as a **Block D liability, never as a bonus** — and put the demolition cost in
  the Block A total (15–30 T EUR for a small bungalow incl. Entsorgung; add an Asbest/KMF surcharge
  suspicion for DDR-era Bungalows). Second-order effects: Abbruchanzeige/-genehmigung pushes Baubeginn
  out 3–6 months (Block F), and *who owes the Abriss* (seller or buyer) is never stated → Next-step question.
- **`Erschließung: Teilerschlossen` (`obj_development: developed_partially`) means open
  Erschließungsbeiträge nach §§ 127 ff. BauGB land on the BUYER** — unbeziffert, realistically
  10–25 T EUR. Same cost-hiding family as #386's "teilerschlossen" Lage sentence, but here it's the
  structured field. Always add it to the Block A total, never treat "teil-" as "nearly erschlossen".
- **The strongest Baurecht red flag is `obj_shortTermBuild: n` + `obj_constAfter: no_information`.**
  The memory above covers `neighbourconstruction` (§ 34) and the #400 case where a named B-Plan beats
  the attribute. `no_information` + *not* kurzfristig bebaubar is the floor: the seller asserts no
  legal basis at all. With `obj_buildingPerm: n` too, score Block E ~2,0. Partial mitigation worth
  stating: an existing building implies Bestandsschutz and an Innenlage, so § 34 is *plausible* — but
  nobody claims it, so it cannot be credited.
- **Plot geometry belongs in Block C, not just the m² number.** #403's `TEXT_AREA "Sonstiges"` was the
  single line "Grundstück 13 m x 30 m". A ≤14 m frontage is decisive: after BbgBO Abstandsflächen
  (0,4 H each side) a 13 m width leaves a ~5–7 m Baufenster = only a narrow single/Reihenendhaus.
  **Grep Sonstiges for a `\d+ ?m ?x ?\d+ ?m` dimension line** and reason about the buildable envelope —
  two plots of equal area are not equally buildable.
**Why:** without these, #403 scores as an under-budget in-preferred-area plot at the BRW floor
(118–138 T EUR); with Abriss + Resterschließung the real figure is 153–205 T EUR = 389–520 EUR/m²
effective, i.e. 1,9–2,6× the profile's per-m² cap.

### A `livingbuysite` under ~20 EUR/m² is almost never Bauland — it's Acker/Grünland/Wald/Wasser im Außenbereich
The BRW ladder above (Fahrland 250 … Speicherstadt 1.200) is a **Bauland** ladder. A plot exposé
priced at single-digit EUR/m² is a *different asset class* and the ladder does not apply. #407
(expose 168955984, Stahnsdorf/Güterfelde, 10.370 m² @ **4,73 EUR/m²**) is the reference case.
- **Field signature, all four together = no Baurecht at all:** `obj_buildingPerm: n` +
  `obj_shortTermBuild: n` + `obj_constAfter: no_information` + `obj_development: no_information`,
  **and the Hauptkriterien table collapses to three rows** (Vermarktungsart / Grundstück ca. /
  Verfügbar ab) — no Erschließung, no Bebaubar nach, **no `Empfohlene Nutzung`**. The missing
  `Empfohlene Nutzung` here does NOT mean "check the title for Bauträger/Investor" (#402); it means
  there is no recommended use because there is no permitted one. This is worse than #403's
  `no_information` floor, because the FNP actively contradicts Wohnbebauung.
- **The decisive evidence is the `TEXT_AREA "Objektbeschreibung"`, in three sentences:** the
  **Grundbuch-Nutzungsart** ("Landwirtschaftsfläche, Waldfläche und Wasserfläche"), the
  **FNP-Darstellung** ("Flächen für Biotopschutz/-pflege/-entwicklung sowie Grünfläche"), and an
  explicit **"nicht über eine Straße erschlossen"**. Grep the description for
  `Landwirtschaftsfläche|Waldfläche|Wasserfläche|Flächennutzungsplan|Biotop|Grünfläche|Außenbereich`
  **before** doing anything else on a cheap plot — it settles Block E at 1,0 in one read.
- **"Nach Auskunft der Naturschutzbehörde … extensive landwirtschaftliche Nutzung genehmigungsfähig"
  is a *negative*, not the consolation prize it reads as.** The authority quoted is the
  Naturschutz-, not the Bauaufsichtsbehörde — that substitution is itself the tell that no
  building authority was ever asked.
- **Score Block A against the agricultural BRW (ca. 1–3 EUR/m² Acker/Grünland, 0,5–1,5 Wald in BB),
  not against the profile's per-m² cap.** #407 at 4,73 is 2–4× the agri BRW while trivially passing
  a 200 EUR/m² cap — i.e. the profile filter is structurally blind to this class. A → ~3,5 (in
  budget, but overpriced for what it is), never 5,0.
- **Three Block-G risks unique to this class, none stated in any exposé:** (a) **GrdstVG** — sale of
  land-/forstwirtschaftliche Flächen in BB is genehmigungspflichtig and carries a
  **siedlungsrechtliches Vorkaufsrecht** (Landgesellschaft/BVVG); (b) **§ 66 BNatSchG /
  BbgNatSchAG naturschutzrechtliches Vorkaufsrecht**, triggered by Gewässer + Biotopschutz-Kulisse;
  (c) a **Wasserfläche** brings § 38 WHG Gewässerrandstreifen and a **Waldfläche** the
  LWaldG-Waldumwandlungsverbot. Two independent ways the purchase can simply fail. G ~1,5.
- **A "Zuwegung erfolgt über den {Weg}" sentence is not Erschließung** — ask whether it is secured
  by Grunddienstbarkeit (Abt. II) *or* Baulast (Brandenburg: separate Baulastenverzeichnis). Absent
  both, the parcel is not even legally reachable.
- Block C: score the *intent*, same as #399 — 10.370 m² at 20× the 500 m² minimum with no Teilfläche
  offered is a Bewirtschaftungslast (Verkehrssicherungspflicht, Grundsteuer A, Pflegeauflagen), not
  generous reserve. C ~2,5.
- **Full disclosure of the non-buildability is exculpatory in the scam check** (same family as #404):
  a price *above* the agri BRW plus admissions against interest ⇒ Legitimate, with the risk labelled
  as legal/nutzungsseitig rather than criminal. #407's Makler was verified, 4,7★/7, Impressum clean.
- Gallery note: a `B-Plan-Uebersicht…FNP…` caption is the **most valuable image on this class** —
  the seller supplying the planning map is a transparency plus. An aerial shot is still the one to
  ask for on a ≥1 ha parcel.
- Watch a **Titel-vs-Lage Ortsteil split** (#407: title "Güterfelde", Lage "Kienwerder / Am
  Wiesengrund") — within one Gemeinde it's not score-relevant, but resolve it before a viewing.
**Why:** every rule in this file's plot section assumes the object is Bauland and asks *how much*
Baurecht there is; here the answer is none, and reading the 4,73 EUR/m² through the Bauland BRW
ladder would have scored a Biotopschutz-Grünfläche as an extraordinary in-budget bargain
(A 5,0 / E ~2,5, final ~4,0) instead of 2,9.

### Plot exposé that CONTRADICTS ITSELF — the TITLE beats the `Erschließung:` dropdown
#406 (expose 158375845, Paaren im Glien/Schönwalde-Glien) has `Erschließung: Erschlossen` +
`obj_development: developed`, while its own **TITLE** reads *"…– **teilerschlossen** & sofort
verfügbar!"* and the Objektbeschreibung explains *"Strom, Wasser und Abwasser liegen **an der
Straße vor dem Grundstück**"*. The description is the operative text and it describes exactly what
*teilerschlossen* means: media at the street, **Hausanschlüsse (8–18 T EUR, my estimate) on the
buyer**, Erschließungsbeiträge status unstated. So on every plot: **cross-read TITLE + description
against the `Erschließung:` dropdown; the dropdown is the seller's optimistic pick.** Note also
which media are named — #406 lists only Strom/Wasser/Abwasser, i.e. **no Gas, no Telekom/Glasfaser**,
which in a rural Ortsteil cannot be assumed. The direction of the conflict is exculpatory in the
scam check (the *headline* is the pessimistic one — concealment would run the other way).
**Why:** trusting `obj_development: developed` reads the plot as fully erschlossen and drops a
five-figure Block-A item that the title states outright.
- **`obj_shortTermBuild: n` can contradict a rechtskräftigen B-Plan** — #406 pairs
  `obj_constAfter: constructionplan` + a described B-Plan (offene Bauweise, 2 Vollgeschosse,
  GFZ 0,20) with `obj_shortTermBuild: n`. Read as the same carelessness, not as a hidden defect,
  but make it an explicit question. Corollary to #403's rule: `shortTermBuild: n` is only the
  Baurecht floor **when `obj_constAfter` is also empty**.
- **`Bebaubar nach: Bebauungsplan` / `obj_constAfter: constructionplan` is the TOP of the Baurecht
  ladder** and the exposé usually hands over Bauweise + GFZ in the Objektbeschreibung. Ladder,
  best-first: B-Plan im Attribut + Text (#406) > B-Plan nur im Text gegen `neighbourconstruction`
  (#400) > positive Bauvoranfrage (#402) > § 34 laut *unverbindlicher* Gemeinde-Auskunft (#404) >
  `shortTermBuild: n` + `constAfter: no_information` (#403). Still cap E: `obj_buildingPerm: n`
  and the B-Plan's **GRZ, Baugrenzen, Firsthöhe, Dachform** are never in the exposé — pull the
  B-Plan from the Gemeinde/Brandenburgviewer yourself, it is a public document.
- **A `Geschossflächenzahl:` row (`obj_GFZ`) turns plot size into buildable size.** #406: GFZ 0,20
  on 1.000 m² = **max 200 m² Geschossfläche**. Say so in Block C — surplus area above what the GFZ
  can use buys **garden, not building rights**, so a big plot at a high EUR/m² is partly wasted spend.
- **An "optional auch mit X m² erwerbbar" sentence = the parcel boundary is NOT fixed** ⇒ a
  Vermessung/Teilung is pending (Block G: Kaufgegenstand, Vermessungskosten 2–4 T EUR) and it sits
  in tension with `Verfügbar ab: sofort` (Block F). #406 offers 1.000 **or** 1.170 m² (ca. 19 m ×
  60 m) — and the alternative's **price is never named**; at the same EUR/m² it silently breaks the
  budget. Also use the stated dimensions of the *option* to derive the offered parcel's Zuschnitt
  (same 60 m depth ⇒ ca. 16,7 m frontage ⇒ ~10–11 m Baufenster after BbgBO-Abstandsflächen).
- **A Scout-ID far below the current range dates the listing.** IS24 IDs run roughly sequentially:
  #406's **158.375.845** against a current batch of **168–169 million** ⇒ on the order of 1–2 years
  online. Report it as an inference (never as a date), score Block F down, and use it as the
  negotiation lever plus the "why hasn't it sold?" question. Fastest listing-age proxy available —
  there is no publication date in the mobile API.
- **Provision ladder on plots now spans 3,57 → 7,14 %.** #404 Böttger & Scheffler 3,57 %,
  #399/#400 Falkensteg 5,95 %, **#406 L&S 7,14 % = 13.495 EUR**. All lawful in full on unbebautem
  Land (§§ 656c/d cover only Wohnungen/EFH) — but at ~2× the regional norm the commission alone can
  push an in-budget Kaufpreis over the budget all-in (#406: 189.000 ✓ → 218.560 ✗). **Quantify the
  saving at the norm rate** ("at 3,57 % the all-in falls to 211.813") — it makes the commission the
  most concrete negotiating item in the report. Also check whether payment terms are stated; #404
  gave "zahlbar und fällig nach Beurkundung", #406 gives nothing.
- **`rating.numberOfStars` is the REVIEW COUNT, not a scale.** `{"value": 4.9, "numberOfStars": 10}`
  = 4,9 aus **10 Bewertungen** (cf. #401's 2 aus 6, #404's 4,9 aus 58). A high value on a thin base
  is weak evidence — score H accordingly instead of treating 4,9 as equal everywhere.
- **Havelland BRW, third anchor: Paaren im Glien ca. 130–180 EUR/m²** (my estimate) — the *middle*
  of the Gemeinde Schönwalde-Glien, between the rural far end (Grünefeld 100–160, #404) and the
  Berlin-nahe EFH-Siedlungen band (200–290). Driver is the **B5 corridor**: Berlin-Spandau ~30 min
  off-peak. Judge Ortsteile of this Gemeinde on B5/Falkensee proximity, not on the Gemeindeschnitt (~120).
- **A Berlin-facing commute is not a Potsdam-facing one.** #406's genuinely good B5 access points
  east to Spandau while the profile's centre of gravity is Potsdam/Golm — say this explicitly in
  Block B rather than crediting "hervorragende Anbindung" at face value. Same family as the
  #377 rule (verify the Lage text's infrastructure claims): here the claim is true but irrelevant.
  Also flag amenities the seller sells as pure positives that cut both ways — a **Messegelände**
  (MAFZ Erlebnispark) means event traffic/noise, a **Bundesstraße** means the commute *and* the noise;
  the exposé never states the distance to either.

### A **Rechtsanwalt as the private Anbieter** = Nachlass-/Insolvenz-/Teilungsversteigerungs-Verwertung
`obj_privateOffer: true` + an AGENTS_INFO `name` like "RA {Nachname}" with **empty `address`,
`verifiedBy: []`, no references** and a 3-sentence exposé with 0 photos (#403). Read it as a
**liquidation sale, not a scam** — that combination otherwise trips several transparency flags at once
(no price, no address, no photos, unverified seller). Consequences to score:
- Scam verdict **Proceed with Caution**, explicitly exculpated: none of the real patterns (Vorkasse,
  Auslandsnarrativ, Dokumente vorab, Schlüsselversand, auffälliger Unterpreis) are present, and the
  sparseness is explained by the seller type.
- Block G down: expect **Gewährleistungsausschluss "wie besichtigt"** plus consent from multiple
  Erben/Gläubiger.
- Block H ~2,5: a lawyer is a plausibly serious verwerter but has **no object knowledge and is not the
  decision-maker** — detailed questions go unanswered, so front-load one email with the 3–4 questions
  that actually gate the decision (Preis, Erschließungsbeiträge, Baurecht, Abrisspflicht).
**Why:** scored naively the "no price + no photos + no address + unverified private seller" stack reads
as a probable scam and would be discarded, when it is a routine and legitimate disposal pattern whose
real defects are legal/cost-side, not fraud.

### A third Baurecht tier: **Ortsgestaltungssatzung with quantified Festsetzungen** (between B-Plan and bare § 34)
Seen on #405 (expose 169242467, Mittelstraße 47, Fichtenwalde/Beelitz). The ladder so far was
B-Plan (#400, strongest) → bare § 34 "unverbindliche Auskunft" (#404) → `no_information` floor (#403).
#405 sits in between and the **structured fields read at the FLOOR while the text is solid**:
`obj_shortTermBuild: n` + `obj_constAfter: no_information` + `obj_buildingPerm: n` (the #403 red-flag
triple) — yet the Objektbeschreibung cites *"die Festsetzungen der **Ortsgestaltungssatzung
Fichtenwalde (2005, zuletzt geändert 2015)**"* plus § 34 BauGB and § 34 Abs. 5 S. 4 i.V.m. § 1a BauGB.
A *Satzung* is binding Ortsrecht, not a phone call — grep the Objektbeschreibung for
`Ortsgestaltungssatzung|Gestaltungssatzung|Satzung` alongside the existing `Bebauungsplan|B-Plan|
Baufeld|Baufenster` test, and confirm the absence of `unverbindlich` before scoring E at the floor. E ~3,5.
- **The decisive restriction lives ONLY in the prose and has no structured field: a max Grundfläche
  cap.** #405: *"Maximale Grundfläche des Hauptgebäudes: 100 m² je Baugrundstück"* + 50 % Überschreitung
  für Nebenanlagen nach § 14 BauNVO = 150 m² total überbaubar. **Convert it into achievable Wohnfläche
  and test THAT against the profile's house target** — 100 m² footprint is a ~100 m² bungalow (below
  target) or ~140–170 m² over two storeys (inside the 80–150 m² target). The Satzung's
  Geschossigkeit/Dachform/Firsthöhe are never in the exposé, so **"obtain the Satzung" is Next step #1,
  ahead of contacting the Makler** — it is public, free, and decides whether the plot fits at all.
- **A max-Grundfläche cap also explains a sub-BRW price** — feed it into Block A rather than treating
  the discount as unexplained.
**Why:** the three floor-level attributes would have scored E ~2,0 and the report would have missed the
one fact (100 m² cap) that decides whether a profile-compliant house can be built at all.

### Sub-Bodenrichtwert asking price on a plot — the inverse of the #404 note
The memory says "a price *above* the local BRW is the inverse of the below-market scam pattern — note
it as clean". #405 is the first plot priced *below* BRW (159.000 = ~179 EUR/m² vs a Fichtenwalde BRW of
~200–250), which nominally trips the **High** "price >20 % below market" scam signal. Do NOT log it as a
signal when a **buildability restriction explains it** (here the 100 m² Grundflächenbegrenzung, a
Baumbestand/§ 1a Ausgleichspflicht, and a Gemeinde market down 9,1 % y/y) AND the transparency
indicators run the other way — exact address volunteered in the Lage text, identity-verified Makler with
ratings, real object photos, Provision only after Beurkundung. **The tell that it isn't bait: the seller
himself discloses the reasons the price is low** (the 100 m² cap and the § 1a Eingriffsregelung are both
admissions against interest). Verdict stayed **Legitimate**.
**Why:** applied mechanically the High-tier signal alone would have pushed a clean listing to "Proceed
with Caution" on the very feature that makes it the best-value plot in the search.

- **`Erschließung: Erschlossen` is often itemised in `TEXT_AREA "Sonstiges"` — read it, the detail
  changes the risk.** #405 lists *"Erschließung in der **befestigten Straße**: Strom · Stadtwasser ·
  **Abwasserkanalisation** · Erdgas · Telefon"*. The named **Abwasserkanalisation** is what removes the
  #404 Kleinkläranlage unknown (15–40 T EUR); "befestigte Straße" implies the Erschließungsanlage is
  built out. Two caveats survive the tick and belong in Block A every time: **"in der Straße" ≠ "am
  Haus"** (Grundstücksanschlüsse are the buyer's, **5–15 T EUR**, more if the house is set back), and
  **"erschlossen" ≠ "beitragsfrei"** (ask for the Erschließungsbeitragsbescheinigung § 133 Abs. 3 BauGB).
- **A gewachsener Baumbestand is a Block-D LIABILITY, and its POSITION matters.** Mirror of #404's
  "keine Bäume, kein Abriss" credit. #405's trees are *"im vorderen Bereich"* — exactly where a house
  would go to keep the garden at the rear, so it is a design constraint, not decoration: Fällgenehmigung
  + Ersatzpflanzung under the Baumschutzsatzung, or the house moves back (longer Zufahrt + Hausanschlüsse).
  When the exposé also cites **§ 1a BauGB Eingriffsregelung**, Ausgleichs-/Ersatzmaßnahmen are expressly
  anticipated — an unbezifferte cost the seller has conceded.
- **Plot frontage is the Block-C number that matters, not just m².** Extends the #403 geometry rule with
  a positive datapoint: #405's **26 m Straßenfront** (rechteckig, ~34 m deep) comfortably supports a
  freistehendes EFH with side access after BbgBO-Abstandsflächen — vs #403's 13 m, which left only a
  ~5–7 m Baufenster. Grep the Objektbeschreibung for `Straßenfront|Front von ca` as well as the
  `\d+ ?m ?x ?\d+ ?m` line in Sonstiges.
- **Check the area against EVERY search in profile.yml, not just the one being scanned.** #405's
  Fichtenwalde/Beelitz is outside the *plot* search's preferred/acceptable areas (B 2,5) but **Beelitz is
  listed in `acceptable_areas` of the user's separate Freizeitgrundstück search** — i.e. the area is
  within the user's interest and the gap may be a config omission rather than a rejection. Say so and
  quantify it ("adding Beelitz would lift B to ~4,0 and the total to ~4,1") so the user makes a one-line
  config decision instead of reading a flat out-of-area verdict.
- **BRW anchors, Potsdam-Mittelmark / south:** **Beelitz Gemeindedurchschnitt 149 EUR/m²**
  (Gutachterausschuss PM, Stichtag 01.01.2026, veröffentlicht 09.03.2026, **−9,1 % gg. Vorjahr**);
  **Ortsteil Fichtenwalde 250 EUR/m² zum 01.01.2022** (up from 100 — a premium Ortsteil: Kiefernwald,
  A9-Anschluss, gewachsene EFH-Siedlung), so ca. **200–250 EUR/m² current** *(estimate)*. Same trap as
  Schönwalde-Glien: the **Gemeinde average badly understates a premium Ortsteil** — here in the buyer's
  favour, the inverse of the Grünefeld case. Extends the ladder: Speicherstadt 1.200 > Innenstadt 900 >
  Babelsberg 600–900 > Teltower Vorstadt 680 > Bornim 400–500 > Marquardt 300–350 > Fahrland 250 >
  **Fichtenwalde 200–250** > Uetz-Paaren 200–300 > Schönwalde-Glien 120 > Grünefeld 100–160.
- **`Provision für Käufer` can be VOLUNTARILY mirrored 50/50 on an unbebautes Grundstück — read the
  clause, don't just take the percentage.** §§ 656c/d do not apply to bare land (standing note), so the
  full rate is lawful; #405's Sonstiges nevertheless states *"In gleicher Höhe werden wir auch vom
  Verkäufer vergütet (§ 656c BGB)"* at 3,57 %. That is **better than the law requires** and a genuine
  Block-G plus — score it as such rather than as a neutral cost.
- Two minor #405 field notes: a **GEG-2020 "Käufer sind zur Energieberatung verpflichtet"** line in
  Sonstiges is **boilerplate misapplied** to bare land (§ 80 Abs. 4 GEG concerns existing buildings) —
  harmless, but a tell that the block is a template; and **`obj_ExclusiveExpose: false` + "Angebot
  freibleibend, Zwischenverkauf vorbehalten"** on an under-BRW plot is a genuine urgency argument
  (and a reason to cross-check other portals for a divergent price) — say so in Next steps.
**Why:** none of the above was derivable from the existing `livingbuysite` rules, which assumed the
Baurecht text would be either a B-Plan or a bare § 34 Auskunft, treated a below-BRW price as a scam
signal, and read "Erschlossen" as settling the Erschließung cost question outright.
