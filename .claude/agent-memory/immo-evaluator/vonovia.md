# Vonovia Potsdam (vonovia.de)

Angular SPA. The detail page `/zuhause-finden/immobilien/{slug}` renders **nothing**
server-side (XHR-only, Cookiebot wall) and has **no per-listing detail JSON API** — the
only data endpoint is the list API `/api/real-estate/list?...&latitude=..&longitude=..&perimeter=..`
which carries ONLY summary fields (wrk_id, titel, **strasse, plz, ort**, preis, groesse,
anzahl_zimmer, slug, imageUrls, **lat/lng, has_grundriss, vermarktungsart_miete/_kauf**).
No Nebenkosten/Warmmiete/energy/floor/Baujahr/Keller/Kaution/description/availability.
Guessed detail endpoints (`/api/real-estate/{id}`, `/detail`, `/expose`) all 404 to the SPA
shell; `/api/real-estate/OBJECT` seen in the page is an **econda analytics placeholder**, not data.

## ⚠ The list API is DOWN for plain curl as of 2026-08-09 — HTTP 406, zero-byte body
`GET /api/real-estate/list?latitude=…&longitude=…&perimeter=…&limit=50&offset=…` now answers
**406 Not Acceptable with an empty body**, both with and without `Accept: application/json`,
with a normal desktop UA, at perimeter 15000 and 30000. This is *not* the documented soft-block
(that returned `count:0`, valid JSON). Don't spend more than one probe on it — if it 406s, skip
straight to the **detail-HTML curl** path below (which still works and is richer anyway), or to
an aggregator/IS24 cross-post. Re-test occasionally; if it stays 406 for weeks, delete the
enumeration section.
**Why:** #542 burned three rounds of requests reading the empty files as an IP throttle.

## Finding ONE object without the browser (works — no CiC needed for summary data)
The list API **paginates via `offset` + `limit`** (NOT `page`, which is ignored and re-returns
the same 15). `limit` max is ~50 (limit=1000/500 → `count:0`; limit=50 → 50 rows). So to locate
a specific slug/wrk_id, enumerate: `&limit=50&offset=0,50,100,…` around Potsdam
(lat 52.3906 lng 13.0645, perimeter=30000, ~3200 rows) and grep for `"wrk_id":"{id}"`
(the wrk_id is the trailing number in the slug, e.g. slug `…-82-0419080001` → wrk_id `0419080001`).
The matched record gives the **full street address, lat/lng, Kaltmiete (`preis`), m², rooms,
real-photo URLs and floor-plan flag** — enough to score A/B/C and photo-count without the SPA.
**Throttling:** a burst of requests makes the API return `count:0` for ~15–60 s (IP soft-block).
Keep it gentle (limit=50, ~0.3 s apart, ≤4 parallel); back off and retry if you see count:0.
Real vs banner photos: flat photos are `cdn.expose.vonovia.de/VNA-*.jpg`; `CAMP-*.jpg`
(e.g. CAMP-Gruenstrom, CAMP-APP) are Vonovia marketing banners — exclude from the real-photo count.

**"Potsdam" bucket ≠ Potsdam.** The `perimeter=30000` around Potsdam pulls in **Berlin** flats too
(e.g. wrk 0419080001 = Ernst-Lemmer-Ring 148, **14165 Berlin-Zehlendorf**, not Potsdam). Always
read `ort`/`plz`/`strasse` from the record and score Block B on the *real* city, not the scan seed.

**Why:** the browser (CiC navigate) stays denied in unattended sessions, but this offset+limit
enumeration recovers the address + summary numbers the SPA otherwise hides — the only reliable
path when no IS24 cross-post exists to hit the mobile expose API.

## How to get FULL detail with a plain curl (BEST — no browser, no IS24 needed) [2026-07-10]
The detail page `/zuhause-finden/immobilien/{slug}` **does** ship the complete expose in its
server-rendered HTML — as **HTML-entity-encoded JSON** embedded in the page (contradicts the old
"renders nothing server-side" note; that was about *visible* DOM, not the source). Just:

    curl -s -A "<desktop UA>" "https://www.vonovia.de/zuhause-finden/immobilien/{slug}" -o detail.html
    python3 -c "import html;print(html.unescape(open('detail.html',errors='ignore').read()))" | grep -o '"label":"[^"]*","value":"[^"]*"'

`html.unescape` turns `&quot;label&quot;&#x3A;&quot;Nebenkosten&quot;…` into real JSON. Fields present:
Kaltmiete, Nebenkosten, **Heizkosten** (+"Heizkosten enthalten"), Warmmiete, Kaution (rows under
headings Kosten/Details), Baujahr, Heizungsart, Energieträger, Geschoss, "Verfügbar ab" (date),
plus a flat JSON blob with `energyPassValueClass`/`energyPassType`(BEDARF|VERBRAUCH)/
`energyPassEnergyRequirements`/`energyPassCreatedAt`/`energyPassValidUntil`, `space`,
`numberOfRooms`, and a **`"features":[…]`** array = the full Ausstattung (Balkon, Mieterkeller,
Badewanne eingemauert, Fahrradabstellraum, Holzdielen, E-Herd, etc.) + `"location":"…"` (Lage text).
The `/api/real-estate/{id}` etc. endpoints still 404 — the data lives in the HTML, not a detail API.
Address in the detail HTML is under keys **`"postCodeAndCity"`** (e.g. `"13591 Berlin OT Staaken"`)
and **`"streetAndHouseNumber"`** (exact street — grep it too; confirmed working 2026-07-11)
— grep that, not strasse/plz/ort (those keys are the *list*-API shape, absent here). `space`/
`numberOfRooms` are string-quoted (`"space":"94…"`, `"numberOfRooms":"4"`). The Lage text under
`"location"` + `"postCodeAndCity"` confirm the real city — the "Potsdam" search bucket regularly
returns Berlin flats (e.g. Berlin-Staaken/Spandau), so score Block B on the real city.
Real-photo count: the detail HTML uses **`"images":[{"url":…,"caption":…},…]`** (NOT the list-API
key `imageUrls` — grepping for `imageUrls` on a detail page returns nothing and looks like "0 photos").
Real = `VNA-*.jpg` **plus legacy asset IDs like `DA015BB2000008D9.jpg`** (16 hex chars, older stock —
also real flat photos, don't drop them); only `CAMP-*` (Gruenstrom/APP) are marketing banners.
Extract by slicing from `"images":[` to the first `]`, then regex the URLs.
Watch the description for **"Musterbilder"/"Musterbild"** (example photos) — same as no real photos,
cap Block D at 3.0 for an existing flat (common on Vonovia flats "wird vollständig saniert").
**Why:** fastest, fully-unattended full-detail path; no SPA render, no CiC, no IS24 cross-post.
Prefer this over the browser and over the IS24 mobile API. (Also: invisible-playwright `new_page`
hung ~30min silent in this session — don't rely on it unattended; go straight to this curl path.)

## How to get FULL detail WITH the browser (fallback when the HTML-JSON path fails)
When CiC `navigate` works (attended sessions — the Chrome extension approves it live), just
navigate to the detail SPA and read `document.body.innerText` after ~2.5 s. The full expose
**renders behind the Cookiebot wall without clicking consent** — no need to dismiss the banner.
The text carries everything the list API lacks: Kaltmiete/Nebenkosten/Heizkosten/Warmmiete,
Kaution, Baujahr, Geschoss, Heizungsart/Energieträger, full Energieausweis (class + kWh +
Bedarf/Verbrauch + gültig-bis), the complete Ausstattung list (Loggia/Balkon, Mieterkeller,
Badewanne, etc.), Bezugsfrei-ab date, and Lage/description. Real-photo count: `document
.querySelectorAll('img')` filtered to `expose.vonovia.de` — `VNA-*` = real flat photos,
`CAMP-*` (Gruenstrom/APP) = marketing banners (exclude). Many listings have ONLY CAMP banners
= 0 real photos → cap Block D at 3.0. This is the fastest full-detail path; use it over the
IS24 cross-post whenever navigate is available.
Why: earlier memory said navigate was auto-denied — that's only true unattended; when it works,
the SPA yields ALL detail directly and no IS24 lookup is needed.

## How to get FULL detail without the browser
The CiC `navigate` tool may be **denied in unattended/remote sessions** (permission prompt →
auto-deny), so the SPA can't load. Vonovia Potsdam flats are cross-posted on
ImmoScout24, so pull detail from the **IS24 mobile API** (no bot wall, returns 25 KB JSON):

    curl -s -A "ImmoScout24_1410_30_._" -H "Accept: application/json" \
      https://api.mobile.immobilienscout24.de/expose/{is24_scoutId}

Find the IS24 scoutId in `data/pipeline.md` (the DUPE cluster lines list the cross-posts).
Parse `sections[]` (ATTRIBUTE_LIST "Kosten"/"Bausubstanz & Energieausweis"/"Hauptkriterien",
TEXT_AREA Objektbeschreibung/Ausstattung/Lage), `adTargetingParameters.obj_*`
(baseRent/totalRent/heatingCosts/livingSpace/floor/yearConstructed/energyEfficiencyClass/
balcony/cellar/garden/lift), and MEDIA section (PICTURE count = real photos).
Kaution in `sections` "Kosten" as raw number (verify = 3× Kaltmiete).

**Why:** Vonovia's own site yields only summary numbers and the browser is unavailable;
the IS24 mobile API is the reliable full-detail source for these cross-posted Vonovia flats.

## Don't grep the decoded HTML for bare short tokens (WBS, EBK, …)
The unescaped page contains large **base64 analytics/state blobs**, so a naive
`grep WBS` / `'WBS' in text` hits random base64 and yields a **false positive WBS
requirement** (nearly capped a clean 4,6 listing at 2.0 as a hard blocker). Always match on
the *labelled* JSON shape (`"label":"…","value":"…"`) or German words with context
("Wohnberechtigungsschein", "Einbauküche"), and print the surrounding ±120 chars to confirm
before treating any short token as a hard blocker.
**Why:** short uppercase tokens collide with base64; a false WBS hit silently triggers the
worst-case scoring cap.

## Rooms/size: trust the detail-HTML fields, not the title and not the scan hint
Marketing titles inflate ("Weitläufige 4-Zimmer-Wohnung" while the Zimmer field says 3 —
seen on #306, wrk 1306270007). Score Block C from `numberOfRooms`/the Überblick Zimmer field.
On the detail page these are **German-formatted strings**: `"numberOfRooms":"3,5"`,
`"space":"91,20 m²"` — a `\d+` regex truncates them to "3"/"91". The **scan hint floors half
rooms** (pipeline said "3 Zi" where the expose says 3,5 — #515); always re-read the expose.
Useful sibling keys: `"availableFrom":"2026-09-05"` (ISO, next to the German "Verfügbar ab" row),
`securityDeposit`, `constructionYear`, `energyPass*`.
Object-Id on page is `82-{wrk_id}`; the URL slug ends in the bare `{wrk_id}`.

## Always read the `description` for an announced **Modernisierungsumlage**
Recurring Vonovia pattern on 70s stock: "Die Wohnanlage wird 2026/2027 umfassend modernisiert …
Die maximale monatliche Mieterhöhung beträgt **X €**". That is a *contractually foreshadowed*
rent increase, typically pushed right to the § 559 Kappungsgrenze (3,00 EUR/m² in 6 Jahren —
#515 Kladow: 259,01 EUR on 91,20 m² = 2,84). Score it in **Block A** (recompute EUR/m² and
Warmmiete *after* the umlage against the profile ceilings) and mention the construction-site
disruption in Block D, plus the pattern itself in Block H. Missing it understates the true rent
by 15–20 %.
**Why:** the number only appears in the free-text description, never in the labelled Kosten rows.

## „Keller ✓" on 70s Hochhaus stock can be a **Kellerersatzabteil auf der gleichen Etage**
On Vonovia Plattenbau-Hochhäuser every structured field agrees there is a cellar — IS24
`obj_cellar: y`, Hauptkriterium „Keller ✓", Ausstattung „Mieterkeller" — while the
**Objektbeschreibung** says the real thing: *"zu jeder Wohnung ein Kellerersatzabteil auf der
gleichen Etage"*, i.e. a lockable storage closet on the flat's own floor, no basement compartment.
Score the `keller` must-have as **met with a caveat** (it is private lockable storage) and make
size/access a viewing check — don't silently upgrade it to a real Keller and don't delete it.
Same family as the Vonovia „Stellplatz … sofern verfügbar anmietbar" line (an option, not an
included amenity). Seen on #566 (IS24 expose 150719587, Humboldtring 21, Südliche Innenstadt
Potsdam, Bj 1975, 15 Geschosse).
**Why:** three independent fields say "Keller" and only the free text distinguishes a 7th-floor
closet from a basement — bulky-storage plans (bikes, sports kit) depend on which one it is.

## „Musterbilder, da die Sanierungsarbeiten noch nicht abgeschlossen sind" — Vonovia re-lets a flat
## MID-renovation, and that combination costs TWO blocks
Recurring pattern on modernised Vonovia stock: the gallery holds 6–8 attractive photos, and the last
line of the Objektbeschreibung says *"ACHTUNG: Bei den Fotos handelt es sich lediglich um
**Musterbilder**, da die Sanierungsarbeiten aktuell noch nicht abgeschlossen sind."* Consequences:
- The flat is an **existing** one (no Neubau/Erstbezug exception) ⇒ `_shared.md` photo-evidence rule
  fires: **zero real photos ⇒ Block D capped at 3,0** regardless of how good the described fit-out is
  (neu geflies­tes Bad, Vinyl-Planken). Put "nur Musterbilder" in the ✗ cons explicitly.
- It travels with **"Die Wohnung wird unrenoviert vermietet / lediglich tapezierfertig gespachtelt"** —
  i.e. wallpapering/painting all rooms is the tenant's cost (~1.500–3.000 EUR). Score that as a hidden
  entry cost in Block A and a Schönheitsreparatur-/Endrenovierungsklausel check in Block G (a clause
  shifting them onto a tenant who got the flat *unrenoviert* is regularly unwirksam, BGH).
- Expect the Ausstattungsliste to **contradict** the free text (there: "PVC/Linoleum" + "tapeziert"
  vs "Vinyl-Planken" + "tapezierfertig gespachtelt") — the list is stale boilerplate; list both as
  viewing checks instead of picking one.
- No Grundriss ships with these ads either → request real photos + Grundriss in the first contact.
Seen on #679 (IS24 expose 170256330, Maxie-Wander-Str. 8, Kirchsteigfeld, DG 73,49 m²).
**Why:** the photos look like a normal, verified interior, so without reading the last description
line Block D gets a 4,0+ "modernisiert" on evidence that does not exist.

## Landlord / character
Anbieter = "Vonovia Kundenservice GmbH", direct landlord, **no Provision** (Bestellerprinzip
fine), low Eigenbedarf risk (corporate). Reputation: commonly cited slow-on-repairs — note in
Block H, especially when listing says renovation "noch nicht abgeschlossen". Kaution normally
exactly 3 Nettokaltmieten (legal). These Kirchsteigfeld 3-room flats cluster 4,4–4,7.
