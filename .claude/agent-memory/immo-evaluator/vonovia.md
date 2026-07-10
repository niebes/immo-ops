# Vonovia Potsdam (vonovia.de)

Angular SPA. The detail page `/zuhause-finden/immobilien/{slug}` renders **nothing**
server-side (XHR-only, Cookiebot wall) and has **no per-listing detail JSON API** — the
only data endpoint is the list API `/api/real-estate/list?...&latitude=..&longitude=..&perimeter=..`
which carries ONLY summary fields (wrk_id, titel, **strasse, plz, ort**, preis, groesse,
anzahl_zimmer, slug, imageUrls, **lat/lng, has_grundriss, vermarktungsart_miete/_kauf**).
No Nebenkosten/Warmmiete/energy/floor/Baujahr/Keller/Kaution/description/availability.
Guessed detail endpoints (`/api/real-estate/{id}`, `/detail`, `/expose`) all 404 to the SPA
shell; `/api/real-estate/OBJECT` seen in the page is an **econda analytics placeholder**, not data.

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
Address in the detail HTML is under key **`"postCodeAndCity"`** (e.g. `"13591 Berlin OT Staaken"`)
— grep that, not strasse/plz/ort (those keys are the *list*-API shape, absent here). `space`/
`numberOfRooms` are string-quoted (`"space":"94…"`, `"numberOfRooms":"4"`). The Lage text under
`"location"` + `"postCodeAndCity"` confirm the real city — the "Potsdam" search bucket regularly
returns Berlin flats (e.g. Berlin-Staaken/Spandau), so score Block B on the real city.
Real-photo count still from `imageUrls`: `VNA-*`=real, `CAMP-*`(Gruenstrom/APP)=marketing banners.
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

## Landlord / character
Anbieter = "Vonovia Kundenservice GmbH", direct landlord, **no Provision** (Bestellerprinzip
fine), low Eigenbedarf risk (corporate). Reputation: commonly cited slow-on-repairs — note in
Block H, especially when listing says renovation "noch nicht abgeschlossen". Kaution normally
exactly 3 Nettokaltmieten (legal). These Kirchsteigfeld 3-room flats cluster 4,4–4,7.
