# Immowelt (immowelt.de) — listing-page quirks

Matches: immowelt.de `/expose/{id}` detail pages (AVIV Germany GmbH).

## Getting the data
- **Plain curl/WebFetch is blocked (403)** even with a browser UA — don't bother; go straight to a browser tier. Re-confirmed 2026-07-20 (#397): still 403 (771-byte body) with a Chrome-126 UA. *Why:* callers/orchestrators sometimes assert "Immowelt is curl-fetchable" — it is not; test it in one call if told so, then escalate.
- ⚠ **SUPERSEDED 2026-09-12 — the first move on Immowelt is the NODE DRIVER SCRIPT (see „⇒ Treat the node-script path as the DEFAULT first move" below); `modes/evaluate.md` was corrected the same day and no longer says „CiC FIRST".** The paragraph below stays only to explain *why* the MCP tier is skipped. 17/17 clean node-driver runs incl. #732.
- **invisible-playwright can HANG (not just crash), so the MCP tier is skipped entirely; CiC is the FALLBACK, not the first move.** `new_page` returns nothing for the full 1800s idle timeout: seen 2026-07-20, **recurred 2026-08-09 (#538)**, i.e. twice = the norm, not a blip. Symptom differs from the "Connection closed while reading from the driver" crash below but the remedy is the same: don't retry, use CiC. *Why:* each attempt burns 30 min of wall-clock; the standing "PREFER invisible-playwright" doctrine is a net loss on this portal specifically. Immowelt renders fully in CiC with no consent wall, so the fallback is cheap.
  - **CiC entry sequence that works (stable — 4th clean run 2026-08-20 #632; a full rental expose costs ~6 `javascript_tool` calls):** `tabs_context_mcp{createIfEmpty:true}` (a bare `tabs_create_mcp` errors with "No tab group exists for this session yet") → `tabs_create_mcp` → `navigate{tabId}` → `javascript_tool`. The 2026-07 "first navigate lands on chrome://newtab" no-op has NOT recurred in two runs; one navigate loads the expose. A full rental expose is only ~4,3 k chars of `innerText` ⇒ **4–5 `javascript_tool` calls total** (900-char head, 2–3 body slices, one combined regex sweep). *Promotion candidate: this CiC-first-on-Immowelt rule has been stable since 2026-07-20 — worth moving into `evaluate.md` / `portals.yml` notes.*
- **When CiC is DOWN ("Browser extension is not connected"), do NOT fall back to the invisible-playwright *MCP* — drive the same stealth Firefox from a script instead. It does not hang.** The wedge above is a property of the MCP server path (`new_page`), not of the browser. Spawn the driver exactly the way `scripts/scan.mjs` does and send one eval command on stdin:
  `spawn('bash', ['scripts/invisible-venv.sh','scripts/invisible-driver.py'], {cwd: ROOT, env:{...process.env, IP_HEADLESS:'true', IP_LOCALE:'de-DE', IP_TIMEZONE:'Europe/Berlin', IP_STORAGE_STATE:'tmp/browser-state.json'}, stdio:['pipe','pipe','inherit']})` → wait for the `{ready:true}` line → write `JSON.stringify({cmd:'eval', url, snippet})+'\n'` → the reply is `{ok, result, blocked}`.
  **Sixteen for sixteen clean runs, 2026-08-15 → 2026-08-23** (#596, #636, #637, #655–#658, #660,
  #661, #662, #663, #664, #669, **#670**, the Stiftstr. 8a re-check, and the Potsdamer Str. 18 dupe check): always
  `blocked=false`, ~50–60 s
  end-to-end, 616–685 KB of `innerHTML`, and **no truncation** — a single eval returns `title` +
  `innerText` (4–5 k chars) + the whole `innerHTML` together, so ONE call covers liveness AND the full
  extraction. ⇒ Treat it as reliable, not as a lucky path. The standard shape is exactly **two Bash
  calls**: one fetch that writes `innerText`/`innerHTML` to the scratchpad, one offline `node -e` mine
  that prints innerText + the indexOf-sliced JSON + photo count + a keyword sweep in one go. That shape
  has settled full evaluations, EXPIRED checks, and DUPE-vs-relisting calls alike.
  ⚠ **Mine the embedded JSON with `indexOf(key)` + a slice, NOT with a `"key":"value"` regex.** On
  #660 the payload was **triple**-escaped (`\\\"zipCode\\\":\\\"14476\\\"`), so every documented
  ⚠ **Corollary (#670): the escaping LEVEL varies per page, so do the offline mine from a `.mjs`
  FILE, never from `node -e '…'`.** #670's payload was only **single**-escaped (`\"zipCode\":…`),
  and a `node -e` one-liner has to carry those backslashes through **two** quoting layers
  (zsh single-quotes + JS string) — every key came back `NOT FOUND` on a page that had them all,
  which reads exactly like "listing has no structured data". Rewriting the identical logic into a
  scratchpad `.mjs` and running `node mine.mjs` printed every block first try. ⇒ Standard shape
  stays two Bash calls, but call 2 must be `node {scratchpad}/mine.mjs`, not `node -e`.
  regex (`/"address":\{…/`, `/"hardFacts":…/`, `/"titleAdditions":…/`, `/"floorplans":…/`) returned
  NULL and the listing read as having no structured data at all — while `h.indexOf('zipCode')` +
  `h.slice(i-60,i+260)` printed the whole `address`/`hardFacts`/`floorplans` block instantly. One
  `replace(/\\\\"/g,'"')` unescape pass is NOT enough either (it strips only one level). *Why:* a
  NULL from the regex looks like "field absent" and silently downgrades PLZ/rooms/Grundriss to
  unknown. **Default to indexOf+slice; keep the regexes only as a convenience.**
  ⚠ **…and the indexOf needle must be the BARE key, never `'"'+key+'"'`.** #671: searching
  `'"zipCode"'` returned NOT FOUND for all 24 documented keys on a page that has every one of them,
  because in the escaped payload they read `\"zipCode\"`. Same false "listing has no structured
  data" verdict as the `.mjs`-vs-`node -e` trap above, one layer further in.
  ✅ **BEST: stop slicing and parse the payload properly — it is one clean object.** The blob lives in
  `<script id="__UFRN_LIFECYCLE_SERVERREQUEST__">window["__UFRN_LIFECYCLE_SERVERREQUEST__"]=JSON.parse("…")</script>`.
  Three lines get the whole record, escaping level irrelevant:
  ```js
  const tail = raw.slice(raw.indexOf('__UFRN_LIFECYCLE_SERVERREQUEST__'));   // ⚠ anchor FIRST
  const m = tail.match(/JSON\.parse\("([\s\S]*?)"\)\s*;?\s*<\/script>/);      // lazy + OPTIONAL ; + </script>
  const d = JSON.parse(JSON.parse('"' + m[1] + '"')).app_cldp.data.classified;
  ```
  ⚠ **The `;?` is mandatory — Immowelt emits BOTH `JSON.parse("…")</script>` and
  `JSON.parse("…");</script>`, and the older semicolon-less regex silently returns `null` on the
  latter.** #683 (`9369daa7-…`): the anchor found the script at index 988.888 of 1,02 MB, the payload
  was ordinary single-escaped, and the documented `"\)\s*<\/script>` still failed →
  `TypeError: Cannot read properties of null (reading '1')`. That crash is one character away from the
  #673 symptom and reads exactly the same way ("this page has no structured payload"), so the reflex is
  to go back to innerText scraping on a page that has the complete record. Make the terminator
  `"\)\s*;?\s*<\/script>` permanently; it costs nothing on the semicolon-less variant.
  ⚠ **Both the anchor and the end-delimiter are load-bearing — get either wrong and you do not get an
  error, you get the WRONG script's payload.** #673: an unanchored `/JSON\.parse\("([\s\S]*?)"\)/`
  (lazy, no anchor) matched an **earlier, unrelated** `JSON.parse(...)` script on the page; it parsed
  cleanly and then died on `Cannot read properties of undefined (reading 'data')` because
  `obj.app_cldp` was absent. The greedy variant in the old note (`[\s\S]*` with no anchor) has the
  mirror failure — it runs past the payload into a *later* script. So: `indexOf` the
  `__UFRN_LIFECYCLE_SERVERREQUEST__` id to slice the tail, then match **lazily** and terminate on
  `"\)\s*</script>`. Sanity-check `Object.keys(obj)` — the correct payload's ONLY top-level key is
  `app_cldp`. *Why:* the symptom ("Cannot read 'data' of undefined") reads like "this listing has no
  structured payload" and pushes you back to innerText scraping on a page that has the full record.
  `classified` then gives, fully typed and unescaped: `metadata.{legacyId,creationDate,updateDate}` ·
  `tags.{has3DVisit,hasBrokerageFee,isNew}` · `domains.medias.{images,floorplans,videos,virtualTours}`
  (`images.length` is the **exact** photo count — better than the `/Bild \d+/g` innerText count, which
  returned **0** on #671's single-photo gallery because the counter renders as „1 / 1") ·
  `sections.location.{address:{city,zipCode,district},isAddressPublished,geometry}` ·
  `sections.hardFacts.facts[]` · `sections.price` (Kaltmiete/NK/Kaution) · `sections.key` (Online-ID +
  Referenznummer) · `sections.description.texts[]` (the FULL prose incl. the Stichworte block) ·
  `contactSections.contactCard.{title,subtitle,isPrivateOwner,phoneNumbers}` · `rawData`.
  **`sections.features.details.categories` is the COMPLETE Merkmale list including the ones hidden
  behind „Alle N Merkmale anzeigen"** — on #671 `features.preview` showed 8 chips while
  `details.categories` held all 10, and the 2 hidden ones were `Barrierefrei` and
  `Badezimmer: Badewanne, Bad mit Dusche` — i.e. a must-have-adjacent amenity and the Badewanne
  nice-to-have were BOTH in the hidden tail. *Why:* the existing "expander present ⇒ list truncated ⇒
  feature stays unconfirmed" rule can now be **resolved instead of hedged** — parse `details` and the
  list is complete either way (`details:null` = the preview WAS everything; `details.categories`
  populated = here is the rest).
  ⚠ **…unless `sections.features` is `null` OUTRIGHT — then there is no Merkmale list at all and the
  rule above has nothing to resolve.** #721 (`ddfc7e62-…`, Tauschwohnung GmbH): `sections.features`
  === `null`, not `{preview, details:null}`. So there is no Ausstattungsmaske that could be left
  unticked — the must-haves are **unanswerable**, not "declared absent". Consequence for scoring:
  a 0-hit `balkon|terrasse|keller` sweep on such a page is **weaker evidence than usual**, because
  those fields were never offered to the lister; say "unbestätigt" and put the question in Next
  Steps rather than scoring it as missing-and-known. The Tauschwohnung-GmbH feed is the reliable
  producer of this shape — it ships `location`, `hardFacts`, `price`, `key`, `mainDescription` and
  nothing else of substance (`documents.files:[]`, `areaDescription`/`extendedInfoDescription` are
  bare `{headline}` stubs). *Why:* `d.sections.features.preview` throws on `null` and reads like a
  broken parse of an otherwise complete 616-KB payload.
  ⚠ **…but `features: null` is a per-AD property, NOT a property of the Tauschwohnung-GmbH feed —
  do not generalize #721.** #722, same feed, same `documents.files:[]` / stub-`areaDescription`
  shape, had a normal `features` = `{preview: [5 chips], details: null}` (Dachgeschoss/2. Geschoss,
  Einbauküche, **Keller**, **Badewanne**, Bodenbelag Holzdielen — i.e. a must-have and a
  nice-to-have both positively asserted, none carrying an `enrichment` flag). ⇒ Read
  `sections.features` on every swap ad; `null` means "this lister left the Ausstattungsmaske empty",
  not "this feed has no Merkmale". *Why:* assuming the feed shape would have written „Keller
  unbestätigt" onto a listing that states it outright.
  ⚠ **A `{icon:"rented", value:"vermietet"}` chip in `features.preview` (mirrored by
  `sections.priceComparison.investmentValues[].is_rented = "ja"`) on a `distributionType:"RENT"` ad
  does NOT mean Kapitalanlage/vermietet-verkauft — it means the unit is still OCCUPIED until the
  `frei ab` date.** #765: RENT + `price.layout` `GERMAN_RENT` + chip „vermietet" + „frei ab
  01.11.2026" = the sitting tenant leaves on 31.10. Score it as a normal Block-F future date (and as
  the reason a Möbel-Abstandszahlung is offered), never as a sale or as unavailability. *Why:* the
  chip reads like the IS24 „vermietet" flag on investment sales and would flip the object type; it is
  also the corroboration that the `frei ab` date is current rather than a stale field.
  **⇒ Treat the node-script path as the DEFAULT first move on Immowelt, ahead of CiC.**
  Two gotchas in the harness itself: (a) set `IP_HEADLESS/IP_LOCALE/IP_TIMEZONE/IP_STORAGE_STATE` and
  `cwd: ROOT` in the spawn env (`tmp/drive.mjs` omits them); (b) the driver emits a **second** line
  `{"ok":true}` after the result — write the result to a file on the first non-`ready` message and
  `quit`, or the second line overwrites it with nothing. ✅ *Promotion DONE 2026-09-12: `modes/evaluate.md`
  now states the node-driver-first doctrine — treat any remaining "CiC FIRST on Immowelt" wording as stale.*
  It is the cheapest *first* move, not just a CiC fallback: one `node` script (spawn driver → wait for `{ready:true}` → one `eval` cmd) answered liveness in ~40 s with no MCP round trip and no permission prompt. A **deleted** expose comes back as `title:"Immowelt"`, `L:542`, "Anzeige gelöscht" — i.e. this path alone settles the aggregator-EXPIRED question.
  Verified 2026-08-15 (#596): expose fetched in well under a minute, `blocked=false`, **no truncation** — one call returned `innerText` + the whole 632 KB `documentElement.innerHTML`. Wrap it with your own `setTimeout` kill so a stall fails fast. Two passes is the cheapest shape: pass 1 = `{title, innerText, imgs}` for liveness + fields, pass 2 = raw `innerHTML` to disk for the offline keyword/JSON mining below. *Why:* CiC is not always available, and without this the doctrine's only remaining tier is the one that wedges.
- **Downloading the gallery: `mms.immowelt.de/*.webp` actually serves JPEG — `dwebp` fails, just
  rename to `.jpg`.** #721: all 12 images came back `BITSTREAM_ERROR` from `dwebp`, while `file`
  reported „JPEG image data, JFIF 1.01, 1024x768". The `.webp` in the URL is content-negotiated and
  the driver/curl gets JPEG regardless of Accept header. Recipe that works: pull
  `domains.medias.images[].url` from the payload, `curl -A <Chrome UA>` each one (the `ci_seal` query
  param is mandatory — strip it and you get 403), `cp x.webp x.jpg`, then
  `convert \( 1.jpg … +append \) … -append -resize 1800x contact.png` and Read the contact sheet.
  One Read then answers Zustand, Badezimmer, Balkon-Sichtung and Baualter together. *Why:* the
  `dwebp` failure reads as "the images are corrupt/unavailable" and pushes you into scoring Block D
  and the must-haves blind on a listing whose photos are the ONLY evidence (the Tauschwohnung feed
  states no Baujahr, no EA, no Merkmale). On #721 the sheet proved Gründerzeit + two bathrooms +
  a Badewanne + one room in raw shell — none of it in the text.
  ⚠ **Correction (#722): the JPEG-vs-WebP answer is per-URL and depends on the request headers, and a
  bare `curl -A <UA>` can fail outright with exit 92 (HTTP/2 stream error) on some image URLs while
  succeeding on others in the SAME gallery.** Image 1 came back JPEG on a plain curl; image 2 failed
  92 on three retries (and 52 = empty reply with `--http1.1` alone). What fixed it: **`--http1.1`
  PLUS a browser image Accept header** — `-H 'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8'`
  → HTTP/1.1 200 and a *genuine* WebP (`RIFF … VP8`) that `dwebp` decodes normally. ⇒ Standard image
  recipe: `curl -s --http1.1 -A <Chrome UA> -H '<image Accept>' -o x.bin <url>`, then `file x.bin` and
  branch (`cp` → `.jpg` for JPEG, `dwebp` for RIFF/WebP). *Why:* a 92 on one image of a two-image
  gallery reads as "the gallery is unavailable" and leaves Block D scored blind on exactly the
  listings where the images are the only evidence.
  ✅ **Re-confirmed 2026-09-12 (#725) and simplified: the URL extension is meaningless — `.png` URLs
  served genuine WebP.** All 6 images were `mms.immowelt.de/**.png?ci_seal=…` and came back
  `RIFF … VP8` on the documented `curl -s --http1.1 -A <Chrome UA> -H 'Accept: image/avif,image/webp,
  image/apng,image/*,*/*;q=0.8'`, decoding cleanly with `dwebp`. ⇒ Never branch on the URL suffix;
  always `file` the bytes and branch on that. No 92/52 errors on this run, so the `--http1.1` +
  image-Accept combo is now 2-for-2 as the default first attempt (not a retry).
- ⚠⚠ **`tags.hasFloorPlan:false` + `domains.medias.floorplans:[]` can BOTH lie — the Grundrisse then
  sit in `medias.images` and inflate the photo count, so the Block-D "no real photos" cap is silently
  missed.** #722 (`b308b2f6-…`, Tauschwohnung GmbH): `images.length` = 2, `floorplans` = `[]`,
  `hasFloorPlan` = false, no `classification` key on either image (the documented swap-feed shape) —
  and **both images are architectural floor plans** (Bauantragspläne, „Tauschwohnung" watermark). So
  the real-photo count is **0**, not 2, and D must be capped at 3,0. ⇒ On any listing whose photo
  count is small (≤ ~4) AND whose images carry no `classification`, **fetch and Read them before
  scoring D** — the count alone cannot distinguish a photo from a Grundriss on this feed.
  ⚠⚠ **Extend that: on the Tauschwohnung-GmbH feed, fetch the GRUNDRISS on EVERY ad regardless of
  gallery size — it is routinely present, and it is the best identity key the feed has.**
  ⚠⚠ **…and it is NOT a swap-feed property: the same three lies fire on a big COMMERCIAL lister.**
  #728 (`9d5fa76d-…`, **Vonovia Kundenservice GmbH**, 6 images, `hasFloorPlan:false`,
  `floorplans:[]`): Bild 4 carried **no `classification` key** and is the **Grundriss** — and it
  was the single most valuable field of the whole evaluation (unit id „WOHNUNG 31-24", real area
  **94,92 m²** vs. advertised 95,6, and the fact that the chip-advertised „**Balkon**" is a
  **LOGGIA 4,57 m², [2,29 m²] angerechnet** — i.e. ~2,3 m² of the "Wohnfläche" is outdoor space,
  which moves the €/m² from 11,42 to 11,78 on the heated interior). ⇒ The rule is portal-wide:
  **any image without a `classification` key gets fetched and Read, on every feed.**
  ⚠⚠ **Worse — a classification that IS present can be flatly WRONG, so the count of "real
  photos" cannot be derived from the histogram either.** Same ad: Bild 5 `LOGO` and Bild 6
  `ENERGY_CERTIFICATE` are both **Vonovia marketing banners** (a Grünstrom ad and a „Mein Vonovia
  App" ad) — no logo tile, and emphatically not an Energieausweis-Skala (the real certificate is
  in `sections.energy`, fully populated). So `images.length` 6 = **3 real object photos + 1
  Grundriss + 2 ad banners**. The documented „subtract LOGO and GMAP" fix is not enough: the
  labels are a *guess*, in both directions. ⇒ On any gallery ≤ ~8 images, download all of them
  and build the contact sheet before quoting a photo count or applying the Block-D no-real-photos
  cap — `file`-ing the bytes and one Read is ~2 Bash calls and settles it. *Why:* here the count
  6 → 3 and the Grundriss both changed the report materially, and both were invisible in a
  complete, well-formed 655-KB payload.
  ✅ **CHEAP FIX FIRST: every media object carries a human caption in `description` — and on a
  professional lister that field is far more reliable than `classification`.** The key is
  `description`, NOT `caption`/`title` (both absent), which is why it is easy to miss when you dump
  `im.caption||im.title` and get blanks. #729 (Brauhausberg, locals Real Estate, 59 images +
  4 floorplans): `description` gave „Titelbild" · „Wohnzimmer mit Balkonzugang" ·
  „**Außenansicht - Visualisierung**" · „Schlafzimmer / **Digital-Home-Staging**" ·
  „Hausaufteilung - Visualisierung" · „locals Immobilien" — i.e. the render-vs-photo and
  marketing-vs-object split, per image, for free — while `classification` was wrong in both
  directions on the SAME gallery (a real brick-facade close-up tagged `LOGO`, a team photo tagged
  `COURTYARD`, a fountain sculpture tagged `SWIMMING_POOL`). And `floorplans[].description` is the
  source filename, which on project lettings encodes the unit:
  `FF26888_2026-07-27_…_Haus_1_Haus_1_WE_5_1900_2300_jpg` ⇒ Haus 1, WE 5 = the Referenznummer
  `H1-01-05`, so the unit-specific plan is identifiable without opening a single image.
  ⇒ **Standard order: dump `description` for all media first, then download only what it leaves
  ambiguous** (blank/duplicate captions, the swap feed's unlabelled images, any image with no
  `classification` key). On a 63-image professional gallery this turns a ~2-minute download +
  5 contact-sheet Reads into one `node` line. It does NOT retire the download rule — the swap feed
  still ships empty `description`s — it just stops it being unconditional. *Why:* the existing note
  says „the labels are a guess, in both directions", which is true of `classification` but not of
  `description`; without this you pay full gallery cost on every well-tagged commercial listing.
  ⚠ **…and a POPULATED `floorplans[]` is no guarantee that the unit's own plan is in it — sweep
  `images[].description` for plan filenames too.** #731 (same project as #729): `hasFloorPlan:true`,
  `floorplans` = 3 entries, all „Grundriss/3D-Grundriss - **Musterwohnung**", while the
  unit-specific plan sat as **Bild 59 of 60 in `images`**, the only image without a `classification`,
  captioned with the raw source filename (`FF26888_…_Haus_2_Haus_2_WE_5_…`). On #729 the very same
  project put it in `floorplans`. **#732 repeated #731 exactly** (`floorplans` = 3× „Musterwohnung",
  real plan = Bild 59 of 60, `FF26888_…_Haus_1_Haus_1_WE_16_…`, again the sole image with no
  `classification`); **#784 made it 3-for-3** (H1-02-10 → Bild 59 of 60, `…_WE_10_…`) — **but #785 (H1-02-11, same batch,
  same day) put it back in `floorplans[0]`** (59 images + 4 floorplans, no unclassified image). So the
  placement is a per-ad coin-flip on this lister, NOT a pattern. *Why:* checking only the images-tail
  selector would have reported "no unit plan" on #785. The selector that covers both: filter
  `images` (no `classification`) AND `floorplans` for the `FF\d+|WE_` filename token in one `node` pass. ⇒ Run the filename/`WE`-token sweep over **both** arrays and
  download any image lacking `classification`; one `curl` then yields the per-room m² that settle
  the Wohnfläche-vs-Innenfläche question. *Why:* „`floorplans` has 3 entries" reads as „the plans
  are covered" and you score the area on the lister's headline number alone.
  ⚠ **…but it is NOT reliably the LAST image — download the WHOLE gallery and build a contact
  sheet.** #726 (`aa2c696c-…`, 20 images): the Grundriss was **Bild 3**; the last image was a
  Kellergang photo. A "fetch the last image" shortcut would have (a) missed the plan entirely and
  (b) reported 20 real photos instead of 19. All 20 came down in ~40 s with the documented
  `curl --http1.1 + image Accept` recipe (mixed bag: Bild 1 JPEG, Bilder 2–20 genuine WebP —
  `file` each, never branch on the `.webp` suffix), and one `+append/-append` contact sheet answered
  photo-count, Zustand, Balkon, Badewanne, Keller (Kellergang mit Verschlägen) and Tiefgarage in a
  single Read. ⇒ Cost is one Bash call; make the whole gallery the default, not the tail.
  ⚠ **Shell trap in that recipe: write the URL list with a TRAILING NEWLINE (or feed the loop from
  an array) — `while read -r u; do …; done < urls.txt` silently drops the LAST url when the file
  ends without `\n`.** #727: `writeFileSync(urls.join('\n'))` → 15 urls in the file, 14 downloaded,
  no error anywhere; `montage` was the only thing that complained (missing `15.png`). On this feed
  the last image is a coin-flip for the Grundriss (#723) — so a silent off-by-one is exactly the
  miss the whole-gallery rule exists to prevent. Check `ls imgs/ | wc -l` against
  `images.length` before building the sheet.
  ⚠ **Second shell trap: the Bash tool runs zsh, where an unmatched glob is a hard error
  (`no matches found: *.jpg`) that kills the WHOLE command line** — so
  `montage $(ls *.jpg *.png | sort -n) …` aborts when the gallery is all-WebP (no `.jpg` exists).
  #777: 12/12 images decoded fine, montage never ran. Glob only the extension(s) actually present,
  or decode everything to `.png` first and glob `*.png`.
  ✅ **Calibration counter-example — `hasFloorPlan:false` + `floorplans:[]` is sometimes simply
  TRUE.** #727 (`8991a275-…`, Tauschwohnung GmbH, 15 images, no `classification`): all 15 are real
  photos, no plan anywhere ⇒ real-photo count 15, Block-D cap does not fire. The flags lie often
  enough to make downloading mandatory, but do not pre-conclude „there must be a hidden Grundriss";
  report what the contact sheet shows.
  #723 (`64e0a0da-…`, 9 images, `hasFloorPlan:false`, `floorplans:[]`, no `classification`):
  Bild 9 was the KW-Development plan „**Haus I – WE 8**" with per-room m² and **Wohnfläche gesamt
  ca. 74,84 m²**. Three payoffs the text alone never gives: (a) real-photo count 8, not 9;
  (b) the advertised **77 m² was 2,16 m² / 2,9 % too high** — the plan is the accurate area and
  changes the €/m² *and* the Mietspiegel m²-column (74,84 sits on the 75-m² Spaltenkante, so both
  columns must be quoted); (c) the **`Haus {N} – WE {n}` unit designator identified the flat as one
  already evaluated in the tracker** (#642, same plan, same 74,84 m²) — i.e. a swap ad and a
  Kleinanzeigen *Nachmietergesuch* were two exit channels of ONE unit. The documented „≤4 images"
  threshold would have skipped all of it. *Why:* the swap feed carries no Referenznummer that dedups
  across portals (it is the syndicator's Anbieter-ID), so the Grundriss caption is the only
  cross-portal identity key — and it is one `curl` away.
  ⚠⚠ **…and that includes a gallery of exactly ONE image, which can be the Grundriss and nothing
  else.** #724 (`b2aa0284-…`, Anbieter-ID 148536): `images.length` = 1 („Bild 1"),
  `hasFloorPlan:false`, `floorplans:[]`, no `classification` — and that single image is a furnished
  architectural plan with the Tauschwohnung watermark, captioned „**WE 65.01**". Real-photo count
  = **0**, so Block D is capped at 3,0 on a Neubau that would otherwise have scored 5,0 — a full
  1,0-point swing decided by one `curl`. Note the unit key can be a bare `WE {n.nn}` with **no
  `Haus {N}` part**, so dedup on the `WE` token alone. ⇒ The rule is unconditional now: on this
  feed fetch and Read **every** image lacking `classification`, gallery size 1 included; never
  read „1 Bild" as „1 Foto".
  ⚠ **…and a lone „Bild 1" can also be a platform STOCK PLACEHOLDER — neither the flat nor a
  plan.** #778 (`7a203645-…`, Anbieter-ID 129319): the single unclassified image was a stock photo
  of hands holding a decorative plate („Tanze aus der Reihe") with the Tauschwohnung watermark, while
  the text said „Fotos gern auf Anfrage". The watermark makes it look like a genuine upload.
  ⇒ Real-photo count 0, D cap 3,0, and do NOT fire the „photos from different properties" scam
  signal (the placeholder does not pretend to be the flat). Tell: a description that promises photos
  „auf Anfrage".
  Bonus once you do: the plans carried per-room m², Raumhöhen (2,44–2,53 m), „1 m Linie"/„2 m Linie" Dachschräge
  markers (⇒ the advertised 130 m² is Grundfläche, WoFlV-Wohnfläche is lower ⇒ the real EUR/m² is
  higher), a second bathroom, and the definitive absence of any Balkon/Terrasse. *Why:* this inverts
  two documented rules at once — „`floorplans:[]` is the definitive no-Grundriss answer" and
  „`images.length` is the exact photo count" — and both errors push the score the same wrong way.
- ⚠⚠ **`hardFacts.livingSpace` is a free-text lister field and can be NEITHER Wohnfläche NOR
  Gesamtfläche — and `priceComparison.pricePerSqm` is computed from it, so a wrong m² silently
  produces a wrong €/m² that looks authoritative.** #725 (`26dzepzyatjz`): hardFacts said **160 m²**
  and the portal printed **12,50 €/m²**, while the lister's own description said „Ca. **220 m²
  Gesamtfläche**, ca. **100 m² Wohnfläche**" — i.e. three figures, and the only one *labelled*
  Wohnfläche gives the real rate **20,00 €/m²** (+60 % on the portal's number). ⇒ Before computing
  Block A, grep the description for `Wohnfläche|Gesamtfläche|Nutzfläche` and prefer the labelled
  Wohnfläche; quote the portal €/m² only as „portal figure, computed on the disputed m²".
  Same class of trap as the Grundriss-m² correction on #723, but here the contradiction is inside
  the exposé text itself, so no image fetch is needed — one regex settles it.
  **Sibling check on the same ad: `sections.price.additional[].label:"Kaution"` can contradict the
  description too** (#725: price block `"Kaution":"2599"` = 1,3 NKM vs. description „Kaution: 3
  Nettokaltmieten" = 6.000 €). Read both; report the contradiction rather than one number.
  **Third sibling: the description's own Warmmiete TOTAL can contradict its own line items — always
  re-add them.** #726 wrote „Kaltmiete 1.630,00 + 146,00 Betriebskosten + 146,45 Heizkosten
  = Gesamte Warmmiete aktuell: **2.002,00 €**"; the sum is **1.922,45 €**, and the 79,55 € gap is
  almost exactly the **80 €/Monat Garagenstellplatz** mentioned two paragraphs later. So the lister's
  „Warmmiete" silently included an optional extra. Quote both figures and make „is the Stellplatz
  included/obligatory?" a contact question — copying the headline total overstates Warmmiete by ~4 %.
  ✅ **When the m² IS disputed or unlabelled, the Grundriss settles it arithmetically — sum the
  per-room m² and see which Loggia/Balkon factor reconciles.** #726: rooms summed to **137,62 m²**;
  137,62 + 14,60 Loggia × **0,5** = **144,92 m²** = the advertised figure exactly. ⇒ no Flächen-
  schwindel, but ~7,3 m² of the "Wohnfläche" is outdoor space counted at the WoFlV *maximum*
  (25 % is the regular case → 141,27 m²), and the heated-interior €/m² is 11,84 not 11,25. This
  reconciliation distinguishes „lister lied about the area" from „lister used the legal upper
  Anrechnungsfaktor" — two very different Block-A/C conclusions from the same headline number.
  *Why:* both fields are the ones an evaluator copies verbatim, and each error moves Block A/G.
  **Fourth sibling: the `price.base` Heizkosten row can carry `alt: "nicht in Warmmiete enthalten"` while
  the displayed Warmmiete DOES include it.** #783: KM 506,15 + NK 120 + HK 130 = Warmmiete 756,15 exactly,
  yet the HK row says "nicht in Warmmiete enthalten" (and `breakdown.excluded` lists it). Re-add the
  line items; trust the arithmetic, not the label — otherwise you add HK twice (886 instead of 756).
- ⚠⚠ **`rawData.propertyType:"APARTMENT"` does not mean it is a building — Immowelt lists
  HAUSBOOTE / Floating Homes as ordinary „Wohnung zur Miete" with nothing in the structured payload
  to tell you.** #725: `propertyType:"APARTMENT"`, `distributionType:"RENT"`, normal hardFacts,
  normal `features` chips (incl. an implausible `Keller` chip) — and the object is a floating home
  whose berth is **mutable**: headline „Luxus auf dem Wasser … Waterloft", Sonstiges „Aktueller
  **Liegeplatz**: in Potsdam" + „**Überführung** zu anderen Standorten (z. B. Berlin oder Ostsee)
  auf Wunsch möglich". Consequences that no other field reveals: the Ortsteil in
  `sections.location` is a current fact, not a contractual one (Block B); the Mietspiegel has no
  category for it *and* the tenancy may not even be Wohnraummiete (Liegeplatz-/Chartervertrag);
  physical must-haves like `Keller` become implausible-by-construction. ⇒ **Add a case-insensitive
  `hausboot|floating|liegeplatz|auf dem wasser|überführung|schwimmend` sweep to the standard
  keyword pass**, next to the `vergeben` EXPIRED sweep. *Why:* scoring it as a flat in Potsdam West
  gives it a preferred-area 4,5 and a clean Block E on a Keller that cannot exist.
- ⚠ **`möbliert` is a one-field hard-blocker test in the payload** — it renders as a
  `sections.features` chip `{icon:"furnished", value:"möbliert"}` (in `preview` *and* under
  `details.categories → Allgemeine Informationen`). Check it before any prose sweep; `möbliert`
  also appears in `innerText`, but the chip is the lister's own assertion. #725 confirmed it against
  the photos (fully kitted designer interior). Same block usually carries the other blocker-adjacent
  flags: `pets-allowed`, `flat-share-possible`, `furnished`.
- ⚠ **The `Stichworte` line is the tie-breaker when the Merkmal-chips contradict the Grundriss —
  and `Balkon-Terrassen-Fläche` is a SUM field, not a per-item area.** #730: chips listed both
  `Balkon` and `Terrasse` with **no `aiEnrichments` in the payload** (so both looked like lister
  assertions), while the unit floorplan showed exactly one outdoor space; `Stichworte` read
  „Anzahl Balkone: 1, Anzahl Terrassen: 1, **Balkon-Terrassen-Fläche: 21,06 m²**" — the sum equals
  the terrace alone ⇒ there is no balcony, the second chip is lister sloppiness. *Why:* the
  documented „`enrichment:"ai"` ⇒ chip is a portal guess" test returns *clean* here and would have
  confirmed a second outdoor space that does not exist; the sum-vs-plan comparison is the only
  cheap check that settles it. Same line also carries `Anzahl der Schlafzimmer/Badezimmer` and
  `Mindestmietdauer`, i.e. facts that exist nowhere else in the payload.
  ⚠ **But the number in that field can itself be a TYPO — reconcile it arithmetically before
  quoting it.** #731: `Balkon-Terrassen-Fläche: 10,52 m²` vs. Grundriss `10,25 m²` (digit swap).
  Only 10,25 reproduces the advertised Wohnfläche (rooms 73,35 + 10,25 × 0,50 = 78,48 exactly);
  10,52 would give 78,61. ⇒ Keep it as the tie-breaker against contradictory chips, but the
  floorplan wins whenever `Zimmersumme + Außenfläche × {0,25|0,50}` does not land on the headline
  m². *Why:* the field is otherwise treated as the hard number, and a 0,27-m² error is small enough
  to copy unnoticed while proving the wrong Anrechnungsfaktor.
- ✅ **`sections.documents.files[]` can hold the Bauträger Grundriss as a TEXT PDF — `pdftotext -layout` gives the
  per-room m² table (incl. „Balkon 2,6 m² (5,2 m²)" + SUMME) without reading any image.** #781 (locals,
  „Grundriss Bauträger", Fontane Gärten E.3.16): plain `curl -A <UA>` on the `ci_seal` URL, no Accept header
  needed. Check `documents.files` before downloading `floorplans[]` images. *Why:* the plan images need a
  Read per image; the PDF settles the Wohnfläche reconciliation in one Bash line.
- ✅ **Media `description` suffix „ - (KI generiert)" marks virtual-staging images** (#781: 4 of 54, each
  paired with the real empty-room shot of the same caption). These are honest labels on an existing flat:
  subtract them from the real-photo count; they do NOT trigger the D-cap or a scam signal.
- ⚠ **On the swap feed `classified.title` can hold the whole DESCRIPTION** (#779: the full boilerplate
  with `<br>`s), while the real headline is `mainDescription.headline`. Never read `title` as the ad title.
  Same ad, again a lone „Bild 1" = the developer Grundriss („Wohnung 13, ca. 81,75 m²"), i.e. the #724 case.
- ⚠ **`classified.title` can be `undefined` outright** (#730, commercial lister) — the headline then
  lives only in `sections.mainDescription.headline`. Harmless if you already sweep
  `mainDescription.headline + classified.title + document.title` together for VERGEBEN, but
  `JSON.stringify(d.title).slice(…)` **throws** on it; use `String(d.title)`.
- ⚠ **A live, complete page is NOT proof the flat is available — read the ad TITLE for `VERGEBEN`.**
  #712 (`001f6218-…`, Tauschwohnung GmbH): HTTP 200, `blocked:false`, 623 KB payload, every field
  populated, `tags.isNew:true` — and `classified.title` = „**TAUSCHWOHNUNG VERGEBEN:**
  3-Zimmerwohnung". The lister marks the ad as taken by editing the title; Immowelt has no
  status field for it and renders it like any other listing. The documented liveness test
  (`innerText` length < ~1000 / „Anzeige gelöscht") passes cleanly ⇒ you score a phantom.
  Corroborator: `metadata.updateDate` equals the day the title changed (here 12.09.2026 05:08, on
  an ad created 25.09.2025), and `isNew` flips true for exactly that reason — so a „new" badge on a
  12-month-old ad is a tell, not freshness. ⇒ **Add a case-insensitive
  `vergeben|bereits vergeben|nicht mehr verfügbar|reserviert` sweep over `classified.title` +
  `document.title` to the first call**; a hit = EXPIRED, stop before extraction.
  ⚠ **…but `classified.title` is NOT reliably the ad headline — on the Tauschwohnung-GmbH feed it
  holds the whole DESCRIPTION text.** #719 (`aae3a265-…`): `classified.title` was the 1,5-KB
  Beschreibung („Es handelt es sich hierbei um ein Tauschangebot. (Anbieter-ID: 388078)…"), while
  the real headline „TAUSCHWOHNUNG Suchen 4, bieten 3 Zimmer Altbau" lived **only** in
  `sections.mainDescription.headline` (`document.title` is the generic „Wohnung 66 m² 540 € zur
  Miete …" SEO string and carries no lister wording; `<h1>` count is 0). ⇒ Sweep
  **`sections.mainDescription.headline` + `classified.title` + `document.title` together**. *Why:*
  the #712 EXPIRED test is worthless on a feed where the headline is not in the field it reads —
  a „VERGEBEN" headline would pass unseen.
- ⚠ **`sections.location.geometry` is the Ortsteil POLYGON, not the flat's point — it cannot
  falsify a district label.** #719: `district:"Babelsberg Nord"` while the description says
  „Süd-Babelsberg"; `geometry` was a `MultiPolygon` (box ≈ 52,389–52,411 N / 13,077–13,139 O)
  covering the whole Babelsberg area, and `isAddressPublished:false` means there is no point
  anywhere in the payload. The polygon is drawn from the **same lister-chosen geo id** as the
  `district` string (`rawData.geoIdHierarchy`), so it is not independent evidence. ⇒ When
  `district` and the prose disagree, say the Teillage is unresolved and score the shared parent
  Ortsteil; only an actual address settles it. *Why:* callers ask for the geometry cross-check as
  if it were a coordinate pair — treating a polygon centroid as "the flat's location" invents a
  precision that isn't there.
- Minor: on RENTALS `sections.priceComparison` carries only `{hasMainPrice, isSale:false,
  pricePerSqm, legalText}` — **no `data.value` / `low` / `high` / `markerPosition`**. The rich
  percentile panel documented under „KAUF listings" is a Kauf-only feature; don't hunt for it on a
  Mietwohnung (#719).
- **Cheap liveness test — one `javascript_tool` call.** A deleted exposé still returns HTTP 200 and a normal-looking shell; the tell is that `document.body.innerText` collapses to **~540 chars** (nav + footer only) and contains **"Anzeige gelöscht — Diese Anzeige wurde bereits gelöscht"**, with `document.title` a bare `"Immowelt"` instead of the listing headline. So the standard first call (`{L, title, head:t.slice(0,900)}`) already answers liveness: `L < ~1000` ⇒ dead, stop, mark EXPIRED. Confirmed #542. *Why:* arriving from an aggregator you don't yet know if the ad is alive; this costs nothing and avoids extracting a phantom.
- **invisible-playwright works first-try** (2026-07-11, #310): `new_page` → title already shows price/m²/address; `document.body.innerText` returns the FULL expose in one `evaluate_script` (no truncation), incl. Merkmale, Mietkosten, Sonstiges, Anbieter name + rating. No consent wall. Real gallery `<img>`s ARE present in the DOM here (filter out `/shared/images/` placeholders) — the "photos absent from DOM" note below was observed under CiC only.
- **Mine the embedded JSON, not the rendered text, once you have the raw `innerHTML`.** One blob near the end of the document holds everything in clean form: `"hardFacts":{...,"facts":[{"type":"numberOfRooms"…},{"type":"livingSpace"…}],"price":{…}}`, `"sections":{"location":{"address":{"street","district","zipCode","city"},"geometry":{coordinates}}}`, the media array (`url` + `description` = the original filename + `classification.name`), and `"floorplans":[]` / `"videos"` / `"virtualTours"`. `floorplans:[]` is the definitive "no Grundriss" answer.
  - **⚠ …but that only holds for PORTAL-generated fields. In lister-written PROSE a typo silently voids the sweep.** #666: `Maisonette` returned **0** hits in 634 KB on a flat the description calls a „**Maissonette**-Wohnung" (lister's double s) — the whole two-level layout would have been missed. Same class of trap as the Ortsteil/`district` lie: the structured side is reliable, the human side is not. ⇒ For any prose-only concept (Maisonette, Souterrain, Hochparterre, Loft, Dachgeschoss), **sweep on a truncated stem** (`Maison|Maiss`, `Souter`, `Hochpart`) or just read the description — never conclude "absent" from a full-word grep over free text.
  - **A plain keyword grep returning 0 for `Balkon`/`Keller`/`Baujahr`/`Etage` really does mean the field is absent** — Immowelt does not hide them behind escaping or a different token (checked `constructionYear`, `BALCONY`, `CELLAR`, `LIFT`, `BUILT_IN_KITCHEN`: all 0 on a listing that genuinely stated none). So a 0-count sweep is trustworthy as "not stated"; it still is not "confirmed absent" (see the Keller rule below).
    - ⚠ **Run acronym sweeps CASE-SENSITIVELY.** #667: `new RegExp('WBS','gi')` returned **2 hits** in
      637 KB — both inside minified CSS class names (`css-…wbs…`), i.e. pure noise; the case-sensitive
      count was **0**. Same exposure for any short uppercase profile deal-breaker (`WBS`, `EA`, `KfW`,
      `WG`). Long German words are safe either way; 2–3-letter acronyms are not. *Why:* a phantom `WBS`
      hit is a hard blocker — it would have capped an otherwise-fine listing at ≤2,0 on a CSS artefact.
    - ⚠ **…but the line above says "long German words are safe either way" and that is WRONG for
      COMPOUNDS. #671: `Aufzug` (capital A) returned 0 hits in 625 KB on a flat whose Merkmale chip
      literally reads „Personen*a*ufzug" — because a German compound lowercases its second element
      (`Personen`+`aufzug`).** The flat has a lift to the 4. OG; a capitalized-stem sweep would have
      written up "kein Aufzug" and cost a Block-C/E point on a DG flat where the lift is the whole
      point. ⇒ **Split the sweep by token class:** short UPPERCASE acronyms (`WBS`, `EA`, `KfW`, `WG`)
      case-SENSITIVE; ordinary German nouns that can appear as a compound TAIL — `aufzug`, `küche`,
      `keller`, `balkon`, `garten`, `miete`, `wohnung`, `heizung`, `stellplatz`, `bad` — on a
      **lowercase stem, case-INSENSITIVE**. *Why:* both errors are silent and they point in opposite
      directions, so one blanket case policy is guaranteed to be wrong half the time.
      ⚠ **Audit flag:** #668 concluded „kein Aufzug (`Aufzug`/`elevator` = 0 Treffer)". That evidence
      is unsafe by this rule — the Altbau-Seitenflügel conclusion is probably still right, but it was
      not actually established.
  - **`rawData.tags` is a free re-check/dedup panel: `{"has3DVisit","hasBrokerageFee","isNew"}`.**
    ⚠ **The panel lives in TWO places and the key set VARIES — `Object.keys()` before reading a
    field.** #711 (`2bbd4e87-…`, Tauschwohnung GmbH): `rawData` had no `tags`, but the *top-level*
    `classified.tags` did, with a different set — `{hasBrokerageFee, isNew, hasFloorPlan,
    hasVirtualTour, hasVideo}`, **no `has3DVisit`**. So before concluding "this ad has no tags",
    check `d.tags` as well as `d.rawData.tags`. Bonus: `hasFloorPlan` is a one-field Grundriss
    check that agrees with `domains.medias.floorplans.length`.
    ⚠ **…and `tags` is OPTIONAL — on swap/Tauschwohnung ads `rawData` can carry only
    `{distributionType, propertyType, geoIdHierarchy, distributionSubType}` and no `tags` at all**
    (#710, `f7e26e14-…`, Tauschwohnung GmbH). Then `hasBrokerageFee`/`isNew` are simply unavailable —
    `Object.keys(d.rawData)` first, and fall back to a case-insensitive `provision|courtage` sweep for
    Bestellerprinzip and to `metadata.creationDate`/`updateDate` for ad age (which are always there and
    are the better source anyway). *Why:* reading `d.rawData.tags.hasBrokerageFee` on such a page throws
    on `undefined` and reads like a broken parse of an otherwise complete payload.
    `hasBrokerageFee:false` settles the Bestellerprinzip/Provision question without a keyword sweep,
    and **`isNew` flips true→false as the ad ages** — on the Stiftstr. 8a re-check (2026-08-23) it was
    the *only* field that had changed since 2026-08-15, every price/size/Merkmal/photo field being
    byte-identical.
    **Better than `isNew`: `metadata.creationDate` + `metadata.updateDate` give the ad's exact age.**
    They sit next to `legacyId` in the same payload (`h.indexOf('updateDate')` + a ±200 slice). #666:
    `creationDate 2026-02-16`, `updateDate 2026-08-10`, `isNew:false` ⇒ **six months online without
    finding a swap partner** — a real Block-F/H signal (no urgency, no competition, but also nothing
    imminent) that `isNew:false` alone only hints at. Read them on every swap; on commercial ads they
    date the relisting.
    ⚠ **`isNew` is NOT monotonic — it flips BACK to true when the lister touches the ad.** #667
    (2026-08-23): `creationDate 2026-04-23`, `updateDate 2026-08-19`, `isNew:true`, and the page
    rendered a **"Neu" badge** — on an ad that had been online **four months**. So the "flips
    true→false as the ad ages" line above only describes the *untouched* case; `isNew` really tracks
    `updateDate`, not `creationDate`. ⇒ **Never report ad age or "freshly listed" from `isNew`/the
    "Neu" badge — always read `creationDate`.** *Why:* an ad that failed to find a partner for four
    months and got bumped reads as brand-new competition-heavy, which inverts the Block-F/H signal.
    ⚠ **CORRECTION (2026-08-23, #664): the neighbouring `defaultBackToSearch` band is NOT the lister's
    own search — it is a mechanical ±20 % window around the asking price** (`priceMin=520&priceMax=780`
    on a 650 € ad = 650×0,8 / 650×1,2 exactly). It carries zero information and must never be quoted as
    a market/price band in Block A. *Why:* an earlier version of this note claimed it leaked the
    lister's priceMin/priceMax, and it read as an independent corroboration of a rent estimate; test it
    with the ×0,8/×1,2 arithmetic before using it and it collapses every time.
    ⇒ When an expose resurfaces from a second portal, diff `Online-ID` + `hardFacts` + `Kaution` +
    photo count: all equal ⇒ **DUPE of the existing report, not a re-listing** — an unchanged ad whose
    `isNew` merely dropped is the signature of "still the same posting, just older". *Why:* the same
    Immowelt expose reaches the pipeline repeatedly through aggregators (Ab ins Zuhause, Süddeutsche)
    and a re-listing would reset `isNew` to true and usually move a number.
  - **On COMMERCIAL (non-swap) listings the `Referenznummer` is the LISTER's own Objekt-Nr., carried
    verbatim across every portal they syndicate to — it is the single cheapest cross-portal dedup key,
    and it beats everything else in the panel above.** #661 (Potsdamer Str. 18, Bornstedt): Immowelt
    printed `Referenznummer: 10109018.100405/P18-1.OG-re`, byte-identical to the IS24 `Objekt-Nr.`
    recorded months earlier in report #511 ⇒ same posting, settled in one field. Note the split:
    `Online-ID` (e.g. `25111S4DS3BQ`) is Immowelt-*internal* and will NEVER match another portal, so it
    only dedups Immowelt-vs-Immowelt; `Referenznummer` is the *lister's* id and dedups across portals.
    (Both appear together in the `innerText` tail just under the Anbieter block, so one fetch gets them.)
    ⚠ This inverts on SWAP ads, where `Referenznummer` is the *syndicator's* id (tauschwohnung.com
    Anbieter-ID / Wohnungsswap 7-digit) and differs per platform — there, dedup on a prose fingerprint.
    ⚠ **A matching Kaltmiete+Nebenkosten pair is NOT a dupe signal** — #665 and #666 were both exactly
    `1.300 + 350` from the same Tauschwohnung-GmbH feed on the same day, yet are different flats
    (3 Zi/104 m²/1. OG/Berliner Vorstadt vs. 4 Zi/98 m²/EG-Maisonette/Jutekiez, Anbieter-IDs 38298 vs.
    416645). Round Potsdam rents collide constantly; only rooms+m²+Ortsteil+Etage+Merkmale together
    settle it. *Why:* an orchestrator seeing two identical price rows will flag a dupe and skip one.
    *Why:* an orchestrator flagged #661 as only a numeric-match candidate needing a full re-evaluation;
    the Referenznummer turned a ~15-call scoring pass into a two-call DUPE confirmation.
  - Minor: **the Anbieter star rating is portal-local and will not match the other portal's** (#661:
    Immowelt 3,9/5 from 250 Bewertungen vs. IS24 3,8/5 for the same EB IMMOBILIENMANAGEMENT GmbH) —
    a differing rating is NOT evidence against a dupe, and neither number should override the
    independent ProvenExpert/Jacasa figures used in Block H.
  - **The `Merkmale` list can legitimately hold a single entry** (#596: only `Bezug: 2026-08-31T00:00:00Z`). That is a real, extremely sparse listing, not a failed extraction — don't keep re-fetching looking for the missing Ausstattung.
  - ⚠ **On the Tauschwohnung-GmbH feed the images carry NO `classification` key at all** — each
    entry is just `{id, key, url, description:"Bild N"}` (#711, 5 images). So the
    photo-classification amenity probe below is simply **unavailable** on swap ads; that is a feed
    property, not a failed parse, and it must not be read as "no outdoor photo ⇒ no Balkon".
    Photo COUNT still works (`medias.images.length`, matches the „Alle N Bilder ansehen" headline),
    and realness is settled by fetching one `url`: a genuine amateur photo comes back ~37–60 KB at
    1024×768 (`curl … | file`), a logo/placeholder tile is tiny and uniform. *Why:* without this you
    either burn calls hunting a classification histogram that was never emitted, or you cap Block D
    for "no real photos" on a listing with five of them.
  - **Photo classifications double as an amenity probe.** 12 photos all classified as interior rooms (LIVING_ROOM/BEDROOM/KITCHEN/BATHROOM/HALLWAY/CLOSET/HOME_OFFICE) with **no** outdoor/balcony frame is decent evidence that there is no Balkon/Terrasse when the text is silent — enough to take the Block-E must-have penalty, phrased as "not evidenced" rather than "confirmed absent".
- **Second "no Energieausweis" shape — the lead-gen prompt, and it means NO data, not an exemption.**
  `sections.energy = {features:[{type:"heatingSystem",…}], hasScales:false}` and the page renders
  „Möchtest du Details zum Energieverbrauch? → Details zum Energieverbrauch anfragen" where the scale
  would be (#710). Do NOT read this as the § 79 GEG Baudenkmal exemption below — there is no exemption
  sentence; the class is simply unfilled (typical for private Tausch-/Nachmieter ads). ⇒ the Low
  "Missing Energieausweis" scam signal DOES apply, and Block D stays unverified. **`hasScales` is the
  one-field test:** `false` = no scale rendered at all; a real certificate has `hasScales:true`.
- **Energieausweis can legitimately be absent: `"Ein Energieausweis ist für diesen Gebäudetyp nicht notwendig."`** appears in `data-testid="cdp-energy-certificate-preview"` in place of the scale. On a Baudenkmal this is the § 79 Abs. 4 GEG exemption — **do NOT fire the "Missing Energieausweis" scam signal** for it, but do note that the energy performance is then unverifiable (Block D). ⚠ **Only when the exposé states no Baujahr** — if a Baujahr > 1948 is present the exemption is false and the signal DOES fire; see the shape-2 falsification rule under „Check `Bausubstanz und Energie`" below. Such listings also omit the Baujahr; recover it from the Wikipedia Denkmalliste — see `potsdam-mietspiegel.md` → "Baujahr HARD bekommen".
- CiC fallback: **first `navigate` often lands on `chrome://newtab/` (no-op) — just call `navigate` again.** Second call loads.
- No cookie/consent wall blocks content; page renders immediately. `read_page`/`javascript_tool` on `document.body.innerText` works.
- **All load-bearing fields are in `innerText`** — extract by section, not one blob (CiC truncates ~1100 chars):
  - Header `h1`: Kaltmiete, Warmmiete, rooms · m² · Geschoss, area+PLZ.
  - `Merkmale` block: amenities list (Einbauküche, Balkon, Stellplatz, Badezimmer count, möbliert y/n, WG-geeignet, Dachgeschoss). **Keller is NOT reliably listed.** The visible chip list is truncated to ~7 items behind "Alle N Merkmale anzeigen"; absence of a Keller chip does NOT mean no Keller (see the Structured-payload section — #396 had a Keller that only the Grundriss caption revealed). Confirm against `innerHTML` before scoring a Keller as missing.
  - `Bausubstanz und Energie`: Energieausweis class, Zustand (teilsaniert/saniert/…), Energieträger.
  - `Mietkosten`: Warmmiete, Kaltmiete + €/m², Nebenkosten, Heizkosten note, Kaution.
  - **KAUF listings — `Preisdetails` is a ready-made Block A.** Gives Kaufpreis, €/m², `Provision für Käufer` (%), and a full itemized `Kaufnebenkosten` + **`Geschätzte Gesamtkosten`** (Notar 1,5 % / Grunderwerbsteuer / Provision / Grundbuch 0,5 %). Immediately after it, `Preise in der Region` states whether the €/m² is above/below comparable regional objects, plus the regional min/max €/m². *Why:* no need to hand-compute Nebenkosten or WebSearch a market benchmark — but note Immowelt's Grunderwerbsteuer line is the **state** rate (Brandenburg 6,5 %), so verify it matches the property's state, and the "günstiger als vergleichbare" verdict is an AVIV estimate over a very wide band, so treat it as weak evidence only.
    - **In the parsed payload the same thing is machine-readable and richer: `sections.priceComparison`.** #687: `{data:{value:4076, accuracy:5, low:"1.773", high:"6.313"}, markerPosition:42, pricePerSqm:"3.695,65"}` — i.e. the regional comparable €/m², an **`accuracy` 1–5 self-rating**, the min/max band and the **percentile the offer sits at**. Quote `value` + `markerPosition` in Block A and the band as the caveat; the `low`–`high` spread is usually enormous (here 1.773–6.313 for one Ortsteil), so the band alone says nothing — the percentile is the usable number. Corroborate with ONE WebSearch anchor (immoportal/E&V Angebotspreise) and note that those are *Angebots*preise, biased upward. *Why:* the innerText version only renders a prose verdict; the JSON gives the percentile that actually discriminates.
    - **Bestand vs. Neubau is settled by two fields, not by the prose — this is the identity/dedup key on Kauf listings.** `metadata.isNewBuildProject` (bool) + `rawData.distributionSubType.buy` (`"RESALE"` = existing stock) + `rawData.propertySubType` (`SEMIDETACHED_HOUSE`, `SINGLE_FAMILY_HOUSE`, …). #687 was routed in as a suspected re-list of a ScanHaus-Marlow *new-build offer* in the same Ortsteil at nearly the same price and identical 115 m²; `isNewBuildProject:false` + `RESALE` + `energy.yearOfConstruction:"1999"` refuted it in one line. *Why:* 115 m² / ~420k is the standard German house-offer size, so price+m²+Ortsteil collide constantly between Bauträger offers and Bestandsobjekte — the same false-dupe trap the "matching Kaltmiete+NK pair is not a dupe signal" rule covers on the rental side.
  - ⚠ **The `Referenznummer` cross-portal dedup key can be a worthless short counter.** #687: `Referenznummer: 261` (Heimkapital GmbH). A 1–3-digit value is the lister's internal row number, not a syndicated Objekt-Nr., and will collide with hundreds of other listings — check the *length/shape* before using it as a dedup key; below ~5 characters, fall back to Baujahr + m² + Grundstück + Anbieter.
  - Tail: `Über den Eigentümer` → "Privater Anbieter" / "Keine Telefonnummer hinterlegt", `Online-ID`.
  - Tail for COMMERCIAL listings: `Über den Anbieter` → company name + address + **`{x},{y}/5 ({N} Bewertungen)`** + partnership tenure ("10 Jahre Partnerschaft", "Diamond Partner") + Ansprechpartner. This is a ready-made Block-H reputation input — grab the last ~900 chars of `innerText` for it. *Why:* saves a WebSearch for landlord reputation; the portal rating is right there.
- **The presence/absence of the "Alle {N} Merkmale anzeigen" control tells you whether the list is truncated — test for it, it converts "unconfirmed" into "confirmed absent".** Regex `innerText` for `/Alle (\d+) Merkmale anzeigen/`: a match ⇒ the visible ~7–8 chips are a *subset* and a missing feature stays **unconfirmed**; **null ⇒ the rendered chips ARE the complete Merkmale set**. On #539 (26ephn5ffvma) null + a `Balkon|Terrasse|Loggia|Dachterrasse` sweep of `documentElement.innerHTML` returning **0 hits** + no `BALCONY`/`TERRACE` in the media-classification payload = three independent negatives ⇒ scored the `balkon_or_terrasse` must-have as *confirmed missing* (Block E 2,0) rather than the hedged in-between score. *Why:* the standing "absence of a chip does NOT mean absent" warning (below) is only true for the truncated variant; applying it blindly to short exposes hedges every must-have forever and understates a real profile violation. Run the same triple test before writing "confirmed missing" for Keller/Balkon.
  - **⚠ The triple test is sound per PAGE but not per FLAT — add a 4th condition: no sibling posting.**
    2026-08-23, #660 vs #661: one Golm flat listed twice on Immowelt (once via Wohnungsswap.de, once
    via Tauschwohnung GmbH). The Wohnungsswap page had **1** Merkmal-Chip, no expander and 0
    `Keller` hits ⇒ the triple test certified "confirmed missing Keller" (Block E 2,0). The
    Tauschwohnung page for the **same flat** had **7** chips, also no expander, and one of them is
    **`Keller`**. So "no expander" only proves the *rendered* list is complete, never that the
    lister *filled it in* — a 1-chip Merkmale block is a data-quality signal, not a feature census.
    ⇒ Below ~3 chips, downgrade "confirmed missing" to "not stated" and look for a sibling ad.
    Cross-post fingerprinting rules: `tauschwohnung.md`.
  - **A chip can carry `"enrichment":"ai"` — it was DERIVED FROM THE DESCRIPTION, not filled in by
    the lister.** #663: `features.preview` = `[{"icon":"floors","value":"2. Geschoss"},{"icon":
    "kitchen","value":"Einbauküche"},{"icon":"cellar","value":"Keller","enrichment":"ai"},{"icon":
    "floor-covering","value":"Bodenbelag: Parkett"}]`, and the prose said „Zur Wohnung gehört ein
    Kellerraum". Two consequences: (a) an `enrichment:"ai"` chip is only as good as the sentence it
    came from — **cite the prose, not the chip**, and re-read that sentence before scoring a
    must-have as met (an LLM extractor can mis-attribute a *Kellerraum im Haus* to the flat);
    (b) it is further proof that the chip list mixes lister-filled and machine-filled entries, so
    the absence of a chip is even weaker evidence than the "≥3 chips" rule above already assumes.
    ⇒ On a sparse Merkmale block, an amenity is *confirmed present* only via prose or photo, and
    *confirmed absent* only via the triple test **plus** silence in a prose passage that would
    naturally have mentioned it (#663: a description that dwells on light, Westsonne and
    Dächerblick and never names a Balkon, with 0 `Balkon|Terrasse|Loggia|Dachterrasse` hits in
    628 KB of HTML). *Why:* without reading the `enrichment` flag you cannot tell a lister's
    positive assertion from the portal's guess, and the two carry very different confidence.
    ✅ **One-read version: the payload carries a TOP-LEVEL `classified.aiEnrichments` array listing
    exactly which chips are machine-derived** — `[{icon,value,rawValue}]`, e.g. #720
    `[{"icon":"parking-lots","value":"Stellplatz","rawValue":"hasParking"}]`. It sits next to
    `tags`/`rawData`, not inside `sections.features`, so one read separates lister-asserted from
    AI-guessed features without walking every chip for an `enrichment` key. The `rawValue` is the
    portal's internal boolean name (`hasParking`) and is the better thing to quote.
    ⚠ **And #720 is the case where the AI chip is flatly WRONG, not just weak:** the `Stellplatz`
    chip was derived from „Vor dem Haus gibt es einen großen **Parkplatz**, auf dem man mit einem
    **Bewohnerparkausweis** kostenlos parken kann" + a bike shelter — i.e. public resident parking,
    **no mitvermieteter Stellplatz at all**. The #663 rule ("cite the prose, not the chip") is
    therefore not a formality: on an amenity the profile actually scores, read the source sentence
    or you write a Stellplatz into the report that does not exist.
  - **The photo-classification regexes can return an empty histogram on a page that clearly has
    photos** (#661: both the escaped and the plain `classification.name` forms matched 0, yet the
    gallery header said "Alle 17 Bilder ansehen"). Fallback that worked: count `/Bild \d+/g` in
    `innerHTML` (= 17, exact). ⇒ Treat an empty histogram as "payload shape changed", never as
    "no photos", and cross-check against the `Alle N Bilder ansehen` headline before applying the
    Block-D no-real-photos cap.
- **`Merkmale` shows only ~8 entries behind an "Alle {N} Merkmale anzeigen" control — clicking it via a `[...querySelectorAll('button')]` text match does NOT expand it** (2026-07-20, #397: not a `<button>`). The visible 8 plus the description prose have carried every scoring-relevant amenity so far; don't burn calls on the expander. Note that negatives ARE stated explicitly here ("**Kein Keller**"), unlike the rental Merkmale block where absence = missing.
- **`Alle {N} Merkmale anzeigen` often refuses to expand under automation** — clicking the leaf element and its 4 ancestors leaves `innerText` unchanged (React handler not on any clickable ancestor). Don't burn calls on it: the visible 7–8 Merkmale plus the description prose normally already confirm every must-have. To probe for a specific feature, regex `documentElement.innerHTML` for the keyword instead — but **verify the hit's context**, since Immowelt's nav dropdown contains `Zwangsversteigerung` and Ortsbeschreibungen contain `Denkmal`; both are boilerplate and will false-positive a profile deal-breaker (#398). *Why:* a naive keyword scan would have wrongly discarded a 4,4/5 house.
- **Kauf: the header €/m² can badly understate value** — it is Kaufpreis ÷ *Wohnfläche* only. When the description names a larger `Wohn- und Nutzfläche` (e.g. voll ausgebauter Keller: 100 m² Wohnfl. but 200 m² per Energieausweis), compute the effective €/m² too and say so in Block A. Also grab `Geschätzte Gesamtkosten` + the Kaufnebenkosten breakdown (Notar/GrESt/Provision/Grundbuch) straight from `Preisdetails` — for a budget check, total cost is the load-bearing number, not the sticker price. Nearby, `Preise in der Region` gives an AVIV comparable €/m² — useful Block-A market anchor, but low-confidence in small Ortsteile. *Why:* #398 read as 30% over the €/m² cap on the header figure, ~35% under on the real one.
- **Check `Bausubstanz und Energie` in `innerText` BEFORE opening the energy modal.** Three observed shapes, two of which are already complete answers:
  1. *Deferred* (#538): "**Der Energieausweis wird bei Besichtigung nachgereicht.**" + Baujahr — no class, no kWh, and a § 87 GEG violation worth flagging.
  2. *Exempt* (#539, 26ephn5ffvma): "**Ein Energieausweis ist für diesen Gebäudetyp nicht notwendig.**" — the portal's canned § 79 Abs. 4 GEG (Baudenkmal) wording, and note it can appear with **no Baujahr line at all**. Immowelt renders it from the lister's object-type flag, so the *reason* is never stated: `Denkmal`/`Denkmalschutz` returns 0 hits in `innerHTML`. ⇒ report the exemption as *claimed, unverified* and make it a contact question; also feed the Mietspiegel lookup the **"kein EA" EEK row** for that Baualtersklasse.
     ⚠ **Shape 2 is FALSIFIABLE — do not stop at "claimed, unverified". Cross-check it against the
     Baujahr and the prose, because on a post-1948 building the claim is legally impossible and then
     flips from a benign exemption into a Medium scam signal.** Machine-readable tell for shape 2:
     `energy.hasScales:true` + `energy.certificates[0].scales[0].alternateText` carrying the sentence,
     with **no** class and no kWh value (so it is NOT shape 4 — `hasScales` is `true` here).
     #686 (25bq8a5hkzkr, Mertz-von-Quirnheim-Str. 7): the same canned sentence appeared **next to
     `energy.features.yearOfConstruction = "2011"`** and a prose Ausstattungsliste quoting
     „Energieeffizienzklasse C / Endenergieverbrauch 76 kWh/(m²·a)". § 79 Abs. 4 GEG covers
     Baudenkmäler; a 2011 MFH has no exemption, and an exposé cannot simultaneously assert
     "no certificate needed" *and* quote one. ⇒ Three-step rule: (a) if `yearOfConstruction` is
     present and > 1948 → the exemption is **false**, treat as a § 87 GEG omission (Low scam signal)
     and withhold any EEK bonus in Block D; (b) if the prose *also* names an EEK/kWh figure, log the
     contradiction as a **Medium** "exposé internally inconsistent / text likely lifted from another
     property" signal; (c) only when there is no Baujahr at all (the #539 case) does the old
     "claimed, unverified + Denkmalliste lookup" handling apply. *Why:* the existing line above says
     flatly "do NOT fire the Missing-Energieausweis scam signal" for this sentence — followed
     blindly, that suppresses a real signal on exactly the listings that fabricate their data.
  3. *Teaser*: a class/value snippet or a bare "Mehr Infos" button — only THIS one justifies opening the modal.
  4. *Lead-gen prompt* (#668): the section renders **no energy data at all**, just „**Möchtest du Details zum Energieverbrauch? → Details zum Energieverbrauch anfragen**" plus a bare `Heizungsart` line. Machine-readable tell: `"energy":{"features":[{"type":"heatingSystem",…}],"hasScales":false}` — `hasScales:false` with no class/value is the positive proof that the lister supplied nothing, i.e. **the certificate is simply missing, not exempt**. Distinguish it from shape 2 by grepping `Denkmal` (0 hits ⇒ no § 79 Abs. 4 GEG exemption ⇒ it IS a § 87 GEG omission worth flagging + the Low scam signal). Common on private/swap ads. ⇒ Feed the Mietspiegel lookup the **"kein EA" row**, which is the conservative (landlord-unfriendly) assumption and keeps the Mietpreisbremse check defensible. ⚠ **…but that row does not always exist.** In the Potsdam Grundmietentabelle only `bis 1948` and `1949–1970` have a `kein EA` row; **`1971–1990` and everything after do not** (they have `A,B` / `C,D` / `E,F` / „alle"). Confirmed #670 (Drewitz Platte, no EA at all). ⇒ On those Baualtersklassen cite the **whole EEK band** of the class instead of guessing a row — see `potsdam-mietspiegel.md` → Ortsteil-Anker Drewitz.
     ⚠ **Shape 4 has a second variant in which there is NO `energy` object at all** — #669:
     `hasScales` returned **0 hits in 619 KB** (so did `heatingSystem`), while the DOM still
     rendered the same lead-gen prompt. So "read `energy.hasScales` first" can come back empty and
     look like a failed extraction / changed payload shape. **The stable tell is the DOM testid
     `data-testid="cdp-energy-info-not-available"`; `hasScales:false` is only the richer variant
     (the one that at least carries a `heatingSystem`).** Either way the ruling is identical:
     certificate missing, § 87 GEG, "kein EA" Mietspiegel row. Extra consequence of the poorer
     variant: **there is then no Heizungsart anywhere**, so you cannot even say whether the
     Nebenkosten include heating — call that out in Block A/D rather than assuming warm = kalt + NK
     is complete. *Why:* a 0-hit `hasScales` sweep invites a second fetch looking for the "missing"
     energy data that was never in the payload.
  *Why:* shapes 1, 2 and 4 are full answers; opening the modal on them wastes 2 calls, and mistaking 2 or 4 for "data missing, look harder" loses the Mietspiegel row selection. Check `data-testid="cdp-energy-info-not-available"` / `energy.hasScales` first — one field separates 4 from 3.
- **The `Energieträger` summary field can be flatly WRONG — cross-check it against the modal's `Wesentliche Energieträger` and the description prose.** #570: `Bausubstanz und Energie` said `Energieträger: Fernwärme`, while the description said "Beheizt wird die Wohnung über eine **Ölzentralheizung**" and the energy modal said `Wesentliche Energieträger: **OEL**`. Two of three sources beat the summary field. *Why:* Öl vs. Fernwärme changes Block D and the Nebenkosten risk (CO2-Preis-Durchreichung, Nachzahlungsrisiko) — and it is exactly the kind of field an evaluator copies without reading the prose. The modal (below) is the authoritative one; it also carries the class + kWh + Gültigkeit, so one click settles all four.
- **Energieausweis detail is NOT in `innerText`** — the `Bausubstanz und Energie` section shows only Baujahr + a "Mehr Infos" button. Generic "click every button labelled Mehr anzeigen/Mehr Infos" does NOT open it; click `document.querySelector('[data-testid="cdp-energy-modal-button"]').click()`, wait ~1,5s, then read `[role="dialog"]`.innerText → Energieverbrauch kWh/(m²·a), **Energieausweistyp** (Verbrauchs-/Bedarfsausweis) and **Gültigkeit von–bis**. *Why:* without this the class/value looks "not stated" and the cert's validity window (a real red flag when expired) is invisible.
- **Photo count + per-room labels live in the embedded JSON, not the DOM `<img>`s.** Only the Anbieter logo is a real `<img>`. In `documentElement.innerHTML` find `\"medias\"` and read `\"description\":\"Bild N\"` (count) plus `\"classification\":{\"name\":\"...\"}` — values like `BEDROOM/KITCHEN/BATHROOM/LIVING_ROOM/HALLWAY/EMPTY_ROOM`. *Why:* gives exactly which rooms are pictured and, by absence, which are NOT (balcony, exterior, Grundriss) — much better than a bare mms-URL regex count, which also over-counts by including the logo.
- **When invisible-playwright's driver is down** (`new_page: Connection closed while reading from the driver`, repeatable), fall back to CiC — Immowelt loads fine there and `javascript_tool` slicing `innerText` around anchors like `indexOf('Kaltmiete')` gets every field in 2–3 calls.

## Structured payload (CiC) — media classification + hidden features
- The page embeds a JSON payload in `documentElement.innerHTML` with **backslash-escaped** quotes
  (`\"name\":\"...\"`), not plain `"name":"..."`. A naive `/"name":"X"/` regex returns **nothing** —
  match `/\\"name\\":\\"[A-Z_]+\\"/` instead. *Why:* #396 first attempt returned an empty object and
  looked like "no media data" when 35 classified entries were present.
- That payload gives a **per-image classification histogram** — `FLOORPLAN`, `INTERIOR`-type values
  (`LIVING_ROOM`, `BATHROOM`, `KITCHEN`, `BEDROOM`, `CLOSET`, `HALLWAY`, `STAIRCASE`, `EMPTY_ROOM`),
  `HOUSE_FACADE`/`BUILDING_FACADE`, `EXTERIOR_VIEW`, `TERRACE`, `BALCONY`, `COURTYARD`, `YARD`,
  `SWIMMING_POOL`. This separates **real photos from Grundrisse exactly**,
  which is what the `_shared.md` "cap D at 3.0" rule actually needs — better than the mms-URL count.
  - ⚠ **`LOGO` and `GMAP` are also classifications and must be subtracted from the photo count.**
    #637: 62 classified entries vs. a headline "Alle 60 Bilder ansehen" — 11 `LOGO` (Anbieter
    marketing) + 4 `GMAP` (map tiles) + 3 `FLOORPLAN` ⇒ **~44 real object photos**. Counting the
    histogram naively overstates the gallery by a third. *Why:* the photo count drives the Block-D
    "no real photos" cap, so an inflated count silently hides an unverifiable listing.
  - The classification keys appear in **both** shapes in the wild — escaped
    (`\"classification\":{\"name\":\"X\"`) and plain (`"classification":{"name":"X"`). Try the plain
    regex as a fallback when the escaped one returns nothing (#637 matched plain).
  - `"floorplans":[]` being empty does **not** mean no Grundriss: #637 had `floorplans:[]` yet
    3 `FLOORPLAN`-classified media and a rendered `Grundrisse 1 / 3` carousel. Trust the media
    classifications over the `floorplans` array.
- **Hidden Merkmale — SOLVED: the payload carries the COMPLETE list, so never fight the expander and
  never fall back to keyword grepping.** In `documentElement.innerHTML` find
  `"features":{"preview":[…],"details":{"categories":[…]}}`. `preview` = the ~8 rendered chips;
  **`details.categories` = all N**, grouped and labelled (`Allgemeine Informationen`,
  `Barrierefreiheit`, `Innenbereich`, `Außenbereich`) with an `icon` + `value` per element
  (`cellar`, `balcony`, `terrace`, `parking-lots`, `bathroom-amenities`, `toilet-amenities`,
  `kitchen`, `elevator`, `floor-covering`, `furnished`). #661: the header said "Alle 11 Merkmale
  anzeigen", `preview` had 8, and `details.categories` returned exactly the missing 3 —
  **Badewanne, Bodenbelag Fliesen/Parkett, and `furnished: "teilweise möbliert"`**.
  ⚠ **`"features":{"preview":[…],"details":null}` — `details: null` (not a categories object) is the
  positive machine-readable proof that the rendered chips ARE the complete set**, i.e. the JSON
  equivalent of "no `Alle N Merkmale anzeigen` control". Read it *before* the innerText expander test:
  it is one field, it cannot be missed by a regex, and it upgrades every un-listed amenity from
  "unconfirmed" to "not stated by the lister" in one step (#662: preview = 8 chips, `details:null`
  ⇒ Balkon/Terrasse/Keller/Badewanne/EBK/Haustiere all confirmed, and **no `furnished` value anywhere
  ⇒ the furnished blocker provably does not fire**). Caveat unchanged: complete-as-rendered still is
  not a feature census — apply the ≥3-chip / sibling-posting rule below before writing "confirmed missing".
  ⚠ **The `furnished` value can be INVISIBLE in `innerText`** — a möbliert/teilmöbliert flag, i.e. a
  hard-blocker-adjacent field, lived only in the JSON on #661. So an `innerText`-only extraction can
  miss the furnished question entirely. Always read `details.categories` before scoring Block E or
  ruling on the furnished blocker.
  ⇒ This supersedes the old advice below ("don't fight it, grep `innerHTML` for keywords and read the
  context") — grep only as a cross-check now, since it costs context-inspection and returns nothing
  about features the lister *did* set but the chip list hid. It also makes the triple/quadruple
  "confirmed absent" test much cheaper: an amenity missing from `details.categories` on a listing
  with ≥3 categories really is unstated. *Why:* #396 the visible list showed 7 of 11 and omitted
  Keller, provable then only from a `"unverbindlicher Grundriss Keller"` FLOORPLAN caption; the
  categories payload would have answered it in one slice.
  **A `Grundriss Keller` image caption is still positive proof of a Keller** even when no Keller chip renders.

## Zwangsversteigerung — positive test (resolves the nav-boilerplate false positive)
The warning above ("`Zwangsversteigerung` in `innerHTML` is nav-dropdown boilerplate") only covers the
*negative* direction. **Three positive tells prove the object itself is a forced auction** (all present
together on #508, b31b3d9e):
1. `document.title` contains **`Zwangsversteigerungen`** (the nav boilerplate never reaches the title).
2. A **Merkmal chip literally named `Zwangsversteigerung`** in the `Merkmale` block.
3. Inside **`Preisdetails`**, a `Zwangsversteigerung` label directly under the Kaufpreis, plus a
   `Versteigerung / Verkehrswert: {x}` line at the end of `Sonstiges`.
Any of 1–3 ⇒ real ZV; none ⇒ boilerplate, ignore. *Why:* without a positive test the existing
false-positive warning makes you dismiss a genuine ZV, which is a profile deal-breaker for the
house search.

**Consequences once confirmed:** the headline price is the **Verkehrswert, not a Kaufpreis** — do not
write it into the tracker `price` column as one; the ZVG domain rules (5/10 & 7/10 floors, § 56 S. 3
no warranty, no Besichtigungsrecht, 10 % Sicherheitsleistung, Abt.-II-Rechte on top) are already
written up in `zwangsversteigerung-de.md` — reuse that section rather than re-deriving it.
Also: `Provision für Käufer: provisionsfrei` + "keine Makler- und Notarkosten" makes the ZVG route look
cheap, but against a *provisionsfreier* freihändiger Kauf it saves only ~1 % (Notar+Grundbuch) — say so.

**Anbieter `Argetra GmbH` (Ratingen, Tel. 02102-711 711) = ZV data publisher, NOT the seller.**
The seller is the Vollstreckungsgericht. Argetra syndicates its whole nationwide ZV database into
Immowelt/IS24 and **paywalls Versteigerungstermin, Amtsgericht and Aktenzeichen** behind its
"Full-Service-Paket" — exactly like zwangsversteigerung.de does. Don't hunt for a date in the DOM
(`/Termin[^<]{0,120}/` returns only the glossary sentence) and don't contact them; the data is free on
**zvg-portal.de**. The expose also opens with "BITTE BEACHTEN SIE, DASS SIE BEI IHRER ANFRAGE EINE
TELEFONNUMMER ANGEBEN" — pure lead capture, score it in Block H, not as a scam signal.

## Photos
- **Real property photos are frequently absent from the DOM** — `document.querySelectorAll('img')` returns only
  placeholders under `immowelt.de/shared/images/` (map `address-map.png`, `travel-time.png`, house-icon
  `selection_property_house.png`). A gallery *region* exists but holds zero real `<img>`.
  Filter out `/shared/images/` srcs; if nothing real-CDN remains → **no real photos → cap Block D at 3.0** and
  flag "no photos" in summary. *Why:* naive `img` count returns ~5–6 and looks like photos exist when none do.
- **The counter and the classification payload are each optional — but they fail INDEPENDENTLY, so try both before concluding anything.** #538 (private rental, 26xfjfhh69iz): the `Alle N Bilder ansehen` counter was **absent** (regex null) while the classification payload was **present** with 10 entries; #513 was the mirror image. A short private expose can also have **no `Sonstiges`/`Stichworte` tail at all** — then `Mietkosten` is the only source for Kaution (there it did give an explicit EUR figure, `Kaution 4950 €`, not the vaguer "3 Nettokaltmieten"). *Why:* stopping at the first null reads as "no photos" and wrongly caps Block D at 3,0.
- **Match the classification payload with an escaping-tolerant regex.** The documented backslash form `/\\"classification\\":\{\\"name\\":\\"[A-Z_]+\\"/` returned nothing on #538 under CiC even though the data was there; `/classification[^A-Za-z]{0,12}name[^A-Za-z]{0,8}([A-Z_]+)/g` + `.map(s=>s.match(/[A-Z_]+$/)[0])` got all 10. Immowelt ships both escaped and unescaped variants — use the loose pattern by default. (Also guard the `.map`: an unmatched element throws `Cannot read properties of null`, which aborts the whole `javascript_tool` call.)
- **There IS an on-page counter (when present):** `innerText` opens with `1 / N` + `Alle N Bilder ansehen` right above the price header. Cheapest reliable photo count — read it before any regex. (The mms-URL regex over-counts by ~1: the hero image also appears URL-encoded, `mms.immowelt.de%2F6%2F6%2F…`, so dedupe after decoding. #513: counter said 7, raw regex said 9, real uniques 8 incl. the encoded dupe.)
- **The `\"classification\":{\"name\":\"…\"}` media payload is NOT always present** (absent on #513, a small 7-photo rental) — when the regex returns null it means "no payload", not "no photos". Fall back to the `1 / N` counter + mms-URL uniques; you then have no per-room labels, so state Grundriss/room coverage as unknown rather than absent.
- **Photo URLs existing ≠ photos of THIS flat.** Three tells, all in the page tail, together mean the gallery is a Musterwohnung/archive set and the `_shared.md` "cap Block D at 3,0" rule fires even though real mms photos load:
  1. `Sonstiges` (NOT the description body) contains *"Bei den Bildern handelt es sich ggf. um Beispiel- und/oder Archivfotos."* — a boilerplate line many Verwalter append; a description-only keyword scan misses it entirely.
  2. `Referenznummer` is a **type** string, not a unit id (#513: `EPS San 3-Zi 68m²` = street + "saniert" + layout).
  3. `Stichworte` says `Sonstiges: frei werdend` (still tenanted → nobody could have photographed it empty).
  *Why:* #513 looked photo-rich (7 images) and "Saniert", which would have scored D 4,25; the disclaimer means the condition claim is unverifiable and D must be capped at 3,0. Always quote the disclaimer verbatim in the report and put "no real photos of this unit" in the ✗ cons.
- **Rental `Sonstiges` tail is where Mietlaufzeit + Kaution actually live** — e.g. "Das Mietverhältnis ist unbefristet mit einer **Mindestmietzeit von 1 Jahr**", "Kaution: 3 Nettokaltmieten", and (#570) the **Befristung** itself: "Bitte beachten Sie, dass das Mietverhältnis auf **vier Jahre befristet** wird." There is no structured Befristung field — a `Befristet`/`befristet` regex over `innerText` is the only reliable detector, and the `h1`/title sometimes advertises it too ("… - Befristet!"). Note the Block-G consequence is the plain 2,0 Befristet rule, **not** the Zwischenmiete hard-blocker cap (a mehrjähriger Zeitmietvertrag is neither Zwischenmiete nor möbliert) — and add the § 575 BGB lever: the Befristungsgrund is never in the exposé, and without it *in the contract* the tenancy is unbefristet by law. The `Mietkosten` box only shows "Kaution: 3 Nettokaltmieten" without the EUR amount and says nothing about a Kündigungsausschluss. *Why:* a Mindestmietzeit is a Block-G deduction that is invisible unless you read the tail.
- **Proving "no WBS" / "no Keller" / "no Provision":** run one `innerHTML` keyword sweep with ±60 chars of context and *inspect the context* — a bare `/WBS/` match hits random base64 inside page tokens and looks like a WBS requirement (#513). `Wohnberechtigung` is the safe positive term. Absence of `Keller`/`Abstellraum` in a rental expose stays **unconfirmed, not confirmed-missing** (see the truncated-Merkmale note above) — score it between the must-have-present and the 2,0 missing-must-have penalty and make it question #1 for contact.
- **Photo count under CiC without an aggregator:** even when gallery `<img>`s are absent, the raw HTML holds the photo CDN URLs — regex `documentElement.innerHTML` for `mms\.immowelt\.de\/[a-z0-9\/\-]+\.(webp|jpg|png)` and count uniques (also check `og:image`, which is a real mms photo). *Why:* #334 showed 0 real `<img>` but 10 unique mms URLs — avoids a wrong D-cap and needs no aggregator twin.
- **Cross-check via the aggregator:** when arriving from Süddeutsche/regionalimmobilien24, the aggregator page's `og:image` meta holds a real listing photo — use it to confirm photos EXIST (count still unknown) before capping D for "no photos". *Why:* #331 Immowelt DOM showed zero real imgs under CiC, but the SZ og:image proved the gallery is populated — a blind D-cap would have been wrong.

## Kauf listings
- **"Preise in der Region" block is a free Block-A anchor.** Even on a "Preis auf Anfrage" expose,
  Immowelt prints `Niedrigster Wert in der Region {x} €/m²` / `Höchster Wert {y} €/m²` (it says
  "Wir haben derzeit keinen Vergleich für diese Immobilie" but still shows the band). Use it as an
  independent cross-check against a Bodenrichtwert-derived estimate. *Why:* #396 — the portal's own
  3.218–5.946 EUR/m² band corroborated the BORIS-based floor with zero extra research.
  In the JSON it is `sections.priceComparison = {data:{value,accuracy,low,high}, hasMainPrice}` —
  and on a priceless expose **`hasMainPrice:false` + `markerPosition:null` prove the absence of a
  Kaufpreis is real, not a parse failure**, while `data.value` is then the *regional* mean €/m², NOT
  a value derived from this object (#697: 6.374, band 3.544–9.895 for Potsdam-Nauener Vorstadt).
- **⚠ On a "Preis auf Anfrage" expose, `sections.mortgage.price` IS populated — with a DUMMY, not a
  hidden price. Never report it as the Kaufpreis.** #697: `mortgage.price: 1041`, `monthlyAmount: 4`
  — it exists only to feed the "**ab 4 € mtl. finanzieren**" widget, i.e. the seller typed a token
  value into a mandatory field (a 347-m²-Villa is not 1.041 EUR). The four fields that actually settle
  the question all say the same thing: `hardFacts.price = "Preis auf Anfrage"` ·
  `sections.price.base.main.value.main.value = "auf Anfrage"` · `priceComparison.hasMainPrice = false`
  · the visible `Preisdetails` block. *Why:* when the task is literally "find the hidden price", a
  numeric field deep in the payload reads like the answer and produces a fabricated Kaufpreis.
  ✅ **…and a hidden price is usually RECOVERABLE in one extra driver call: pull the IS24
  *Ortsteil search-results page* for the same property class and read the price off the twin.**
  #762 (`2c697ec0…`, Grundstück Ringstraße 80, Neu Fahrland): Immowelt said „Preis auf Anfrage"
  in all four fields, while the same agency's cross-post on
  `immobilienscout24.de/Suche/de/brandenburg/potsdam/{regio}/{ortsteil}/grundstueck-kaufen`
  showed **„650.000 € · 832 m² · ab 416 m² · Ringstraße 80"** — same title text, same street,
  same area. The search page is a plain `{title, innerText}` eval on the SAME stealth driver
  (`blocked=false`, ~3,5 k chars, ~60 s) and needs no expose id, no mobile-API token and no
  geocode hunting — the human-readable IS24 URL pattern is enough. It also delivered two
  bonuses the Immowelt page hid: the **sibling half-plot** listed separately (325.000 € /
  416 m², same €/m² — which is what Immowelt's „ab 416 m²" means), and the **full local comp
  set** (9 plots with price + m²) that Block A otherwise costs a WebSearch to assemble.
  ⇒ On any priceless Immowelt Kauf-expose with a *published address or Ortsteil*, make the IS24
  Ortsteil-Trefferliste the next call, before any WebSearch.
  ⚠⚠ **Do NOT trust the WebSearch answer text for the price — it fabricates plausible numbers.**
  Same listing, two searches, two different confident answers: **„750.000 €"** and **„720.000 €"**,
  both quoting the right street and the right 832 m², both wrong (real: 650.000). The linked
  results were only *search/landing pages*, and the summarizer synthesized a figure from the
  surrounding listings. *Why:* the instruction „spend one WebSearch before concluding the price
  is unknown" is right, but the usable output of that search is the **list of portal URLs**, never
  the prose answer — a fabricated price walks straight into the 40 %-over-budget hard-blocker
  decision.
- **Provision terms are spelled out in the Preisdetails block** — rate, when it becomes due, and
  crucially whether a **same-rate contract with the seller** exists (= § 656c BGB split confirmed).
  Read it verbatim; it is a real Block-G differentiator (#396 was clean and 2,38 %; #384's IS24 twin
  tried to bind the Maklervertrag to the mere Exposé-Abruf at 3,57 %).
- **Grundstück (PLOT) exposés have a SHORTER `sections` set — `energy` is absent outright, so a
  generic miner crashes on `d.sections.energy` and reads like a broken parse.** #762: sections =
  `location,description,hardFacts,key,price,features,documents,mortgage,partnerAd,sellerLeadLink,
  priceComparison,mainDescription,areaDescription,extendedInfoDescription` — no `energy`
  (legitimate: no building), no `floorplans`. Always `|| null` the optional sections in the mine
  script. The plot-specific payload is in **`features.preview`**, whose icons ARE the
  Erschließungsgrad: `site-development-state: "voll erschlossen"` +
  `development-infrastructure: "Strom, Gas, Telekommunikation, Wasser"` (+ `with-view: "Fernblick"`,
  `plotSpace`, `availability`). Those two chips are the Block-D input — read them instead of
  guessing from prose. What a plot expose still never ships: **Flurstücksnummer, Lageplan,
  Katasterauszug** (`documents` empty, `floorplans: []`), so Zuschnitt/Teilungslinie stay unbelegt
  and belong in Next Steps.
- **Fertighaus / "projektiert" listings are build offers, not properties — detect them before scoring.**
  Tells (all on #514, 13ccf669, allkauf haus): `Zustand der Immobilie: **Projektiert**` in the
  Bausubstanz block · description opens "Diese *projektiert geplante* …" · `Preisdetails` →
  `Provision für Käufer: **Auf dem Grundstück möglich.**` (a plot-only commission — the object is
  house+plot bundled) · no Energieausweis, only "Details zum Energieverbrauch anfragen" (legitimate
  pre-completion) · `Stichworte` shows a bogus `modernisiert: {current year}` · media payload is
  HOUSE_FACADE + Musterhaus interiors + FLOORPLANs of the *Haustyp*, never of the object.
  **The `Referenznummer` encodes the calendar week** (`4232-313-**kw30**-26281`) ⇒ a weekly-rotating
  Typenhaus ad, so the named plot is indicative, not secured — say so and make "is this plot real?"
  question #1. Scoring consequences: the headline price excludes Bodenplatte/Keller, Erschließung,
  Hausanschlüsse, Baugenehmigung, Außenanlagen/Terrasse, Küche **and** (for an Ausbauhaus) the
  buyer's own Trockenbau+Estrich → compute a realistic all-in of roughly headline +20–30 % and check
  *that* against the budget cap, not `Geschätzte Gesamtkosten`. Also flag the **einheitliches
  Vertragswerk** GrESt question (6,5 % on the whole sum vs. on the plot alone). Do NOT cap Block D
  for renders — the `_shared.md` Neubau/Erstbezug exception applies.
  *Why:* on the sticker price alone #514 reads as a comfortable 78 %-of-budget 5,0 in Block A; the
  real cost sits at/over the 500 k cap and the "house" does not exist.
  ⚠ **…but the `Zustand: Projektiert` tell is NOT reliable — a Typenhaus ad can claim to be existing
  stock in EVERY structured field.** #697 (`d237c4da…`, Mein Haus GmbH Nauen, "Villa im Bauhausstil
  347 m²"): `Zustand der Immobilie: **In bewohnbarem Zustand**` · `rawData.distributionSubType.buy:
  **"RESALE"**` · `propertySubType: "VILLA"` · `metadata.isNewBuildProject: **false**` ·
  `frei ab sofort` — i.e. every field the "is this a build offer?" check normally relies on lies.
  The five tells that DID work, in order of cost:
  1. **`sections.price.base.commissionFee.value` (the `Provision für Käufer` text) is the decider**:
     „**Grundstücke werden auf Anfrage angeboten, sind nicht im Preis enthalten..** Die Provision …
     ist ausschließlich auf den **Grundstückspreis** zu entrichten." Plot excluded + commission on the
     plot only ⇒ build offer, always. This is a pure text test and works off the search page too.
  2. **`domains.medias.floorplans[].description` is a filename that names the Haustyp AND its area** —
     here `Bauhaus - 393 m² EG/OG/Staffel G.png` while the ad advertises **347 m²**. A floorplan area
     ≠ the advertised `livingSpace` means the plans belong to a catalogue type, not to the object.
  3. **Gallery = renders + a logo tile.** One image carried `classification.name: "LOGO"` (Immowelt's
     own scene classifier tags the builder's banner), the rest were CGI with the firm's logo burnt in.
     0 real photos — but do NOT cap Block D, the `_shared.md` Neubau exception still applies.
  4. Prose sells a *service*: „Grundstücksservice", „Netzwerk an Immobilienmaklern und
     Grundstücksbesitzern", „individuelle Grundrissplanung", a named build system („Liaplan Bausatz").
  5. **`Referenznummer` = the creation date** (`15052026` = 15.05.2026), the date-variant of the
     kw-rotation tell above.
  Scoring consequence when the plot is excluded: the profile's `garten` must-have is **not delivered**
  (Block E 2,0 — the garden on the render belongs to no land in the offer), and Block B must be marked
  *nominal*: the Ortsteil is a marketing catchment, not an address (`isAddressPublished:false`,
  `geometry` = Ortsteil polygon, builder 30 km away). Same #419/#381 pattern.
  *Why:* without this, #697 passes the #514 checklist as an existing villa and the whole evaluation
  argues about a resale price that was never on offer.
- **Watch the tail of the description for a digital-staging disclaimer** — e.g. "Einige Räume sowie
  die Außenanlage wurden digital gestaltet und dienen ausschließlich als Inspiration." It sits AFTER
  the prose and before "Mehr anzeigen", so a truncated read misses it. It is *partial* staging on an
  existing building: do NOT apply the full `_shared.md` cap-D-at-3.0 (plenty of real photos coexist),
  but dock ~0,25 and flag which features are unverifiable. *Why:* #396 the staged part was the
  Außenanlage — i.e. exactly the garden + waterfront the listing was selling.

## Tauschwohnung (swap) listings
- Title `h1` shows "… • Tauschwohnung" (in the JSON: `hardFacts.titleAdditions:["Tauschwohnung"]`). **There are TWO swap providers feeding Immowelt, and they render differently — identify which one before extracting.** The `Über den Anbieter` block names it:
  - **Tauschwohnung.com** — the variant all the notes below describe (sparse/rich split, "Anbieter-ID" in the description).
  - **Wohnungsswap.de** (Beedstraße 54, 40468 Düsseldorf, contact "Herr Tobias Jonnarth", never a phone number) — first seen 2026-08-23 (#654, 923335d4). Description headline is auto-generated as **`Wohnungsswap - {Straße}`**, the body is the sitting tenant's own first-person prose, and a boilerplate "**Wichtig** — Diese Wohnung wird derzeit bei Wohnungsswap als Tauschobjekt angeboten …" paragraph closes it. `Referenznummer` = Wohnungsswap's internal id (7 digits, e.g. 1487219); the only wohnungsswap.com/.de URL on the page is the bare homepage, so — exactly like the tauschwohnung.com variant — **there is no route to the source listing**, and the free-text Suche is the only side-2 input.
- **The Wohnungsswap headline `Wohnungsswap - {Straße}` is REAL, usable location data** — on #660 (`Wohnungsswap - In der Feldmark`) it was the only street-level evidence on a page with `isAddressPublished:false`, and it agreed with `zipCode:"14476"`, `district:"Golm"`, `document.title` and the tenant's landmarks ("Rewe & Bahnhof fußläufig"). Four-source agreement ⇒ location fully verified. The confirmed *junk pair* is specifically `district:"Grunewald"` + `og:title:"Westend"` (Berlin batch, see below) — but **`district` being wrong is NOT Berlin-only, and outside Berlin it fails quietly, inside the correct PLZ.** #662 (Potsdam swap, 1d73a78b): JSON `district:"Kirchsteigfeld"`, `zipCode:"14480"` — and 14480 really does contain Kirchsteigfeld, so both the zipCode tiebreaker AND the search-group fit look clean. The prose named **Bushaltestelle Lilienthalstraße direkt vor dem Haus** + **Tram Johannes-Kepler-Platz** + "Nähe Filmpark Babelsberg **am Stern**" ⇒ the flat is in **Am Stern**, a different Ortsteil of the same PLZ. *Why this matters even when the PLZ is right:* 14480 spans three Baualtersklassen (Am Stern Platte 1971–1990 · Kirchsteigfeld 1993–1998 → 1991–2008 · Neubauriegel ab 2021, see `potsdam-mietspiegel.md`), so the wrong Ortsteil silently picks the wrong Mietspiegel field — 5,82 vs 9,45 EUR/m², factor ~1,6, which flips the Mietpreisbremse verdict from "clearly exceeded" to "compliant". ⇒ **Run the landmark/transit check on every swap regardless of city; a matching `zipCode` clears the search group, never the Ortsteil.** On tenant-posted swaps `district` is whatever the poster picked from a dropdown.
- **On the Wohnungsswap variant the PROSE beats every structured field. Read it first; a near-empty `Merkmale` block is not "unknown".** #654: `Merkmale` held a single chip ("Erdgeschoss") and no "Alle N Merkmale anzeigen" control (⇒ genuinely complete), yet the description confirmed **Balkon** ("Balkon zum großen, grünen Innenhof", stated twice), **Keller** ("Der Keller ist trocken und warm … recht großes Kellerabteil"), Sanierung ("saniert vor ca. 5 Jahren, neues Bad") and Heizung (Fernwärme). Scoring both must-haves as unconfirmed off the chip list would have cost ~1,5 points in Block E on the best-fitting flat of the batch.
  - Same variant: `Bausubstanz und Energie` collapses to "Details zum Energieverbrauch anfragen" (no class, no kWh, **no Baujahr**), `Mietkosten` = Kaltmiete + `Kaution: keine Angabe` only (**no Nebenkosten ⇒ Warmmiete genuinely not computable**), no availability date, `isAddressPublished:false`. No `classification` media payload either — count photos from `\"description\":\"Bild N\"` instead (#654: 13; the mms-URL regex gave 14 incl. the hero dupe).
- **⚠ `district:"Grunewald"` + `og:title:"Westend"` is a CONFIRMED FALLBACK PAIR, not data — it has now appeared on FIVE unrelated flats. Treat the pair as "location unknown" on sight.** #655 → `zipCode:"10589"` (real: Charlottenburg-Nord/Mierendorffinsel) · #656 → `"14199"` (real: Charlottenburg/Westend) · #657 → `"14059"` (real: Charlottenburg, Klausenerplatz/Schlossviertel) · #658 → `"10589"` again (real: Charlottenburg-Nord/Mierendorffkiez) · **#683 → `"10585"`** (real: Charlottenburg, Kiez Richard-Wagner-Platz/Mierendorffplatz/Schloss; pinned by the prose "Altbauwohnung … **in Charlottenburg**" + "der **Schlosspark** in Laufnähe") · **#696 → `"13629"`** (real: **Siemensstadt, Bezirk Spandau** — a *different Bezirk* than the `city` field claims; pinned by the prose "in **Siemensstadt** zuhause" ×5 + Nominatim `13629 → Siemensstadt, Spandau`). Same two junk fields every time; the `zipCode` is the only part that moves — and **a repeated `zipCode` does NOT make the pair trustworthy**, it just means two different flats happen to share a postcode. Note the `city` field lies too on #696 (`"Charlottenburg-Wilmersdorf"` for a Spandau flat), so **only `zipCode` survives of the whole `address` object**.
  - ⚠ **…and `geometry` does NOT adjudicate this pair — it is derived from the FALSE `district`, so the #672 point-in-polygon trick silently confirms the wrong answer.** #696: the MultiPolygon is the **Grunewald** Ortsteil polygon (bbox 13,1876–13,2727 O / 52,4665–**52,5087** N) while the real Ortsteil centroid (Siemensstadt 52,5398 / 13,2569) sits ~3,4 km **north of it**. So the polygon is not an independent locator here; running PIP would "prove" Grunewald. *Why:* the #672/#673 rule says the polygon adjudicates a prose-vs-`district` conflict — that holds when `district` is merely *imprecise*, **not** when it is the Grunewald/Westend fallback. Test order on this pair stays: prose → `zipCode` (→ geocode the PLZ, one Nominatim call) → nothing else.
  **Resolution order: (1) the tenant's prose, (2) `zipCode`, (3) nothing else — `district` and `og:title` are worthless when they read Grunewald/Westend.** Two cheap tiebreakers, in order of availability:
  - a **named landmark** in the prose — #657's "direkt am **Schloss Charlottenburg**" pins 14059 in one word and matches the `zipCode` exactly (prose + zipCode agreeing is the strongest state you can reach when `isAddressPublished:false`);
  - a **named transit line** — #656's "S-Bahn 5 Min., **U2** 10 Min." excludes both 14199 and 14193 (neither has a U2) in one step.
  *Why:* the whole Grunewald batch was contaminated by trusting `district` — 5 of 6 listings were mis-tagged. A landmark/transit check is one sentence of reading and beats a street-directory lookup when there is no street at all.
- **⚠ The lister can explicitly DISOWN the address — and Immowelt derives PLZ/Ortsteil from exactly that field.** #654 description: "*(Die Adresse stimmt nicht ganz, aber ich kann sie nicht mehr ändern.)*" while the JSON showed a clean-looking `sections.location.address = {city:"Charlottenburg-Wilmersdorf", zipCode:"14193", district:"Grunewald"}`. Note that `geometry` on an unpublished address is the **Ortsteil MultiPolygon, not a point** — so the structured data proves nothing beyond "the lister typed a 14193 street". Always regex the description for `Adresse stimmt|stimmt nicht ganz|nicht die genaue Adresse` before writing "PLZ verified", and verify the named street independently (a street-directory search settles it in one call: Fontanestraße 1–23 really is 14193 Grunewald). *Why:* a Grunewald batch had three listings mis-tagged by area already; the structured `zipCode` looks authoritative and is the exact field that can be wrong.
- **Room count: `hardFacts.numberOfRooms` is rounded to an integer, the prose is not.** #654: field `"3 Zimmer"` vs description "**2,5 Zimmer** Wohnung im EG/Hochparterre" — the difference straddled `min_rooms: 3` and moved Block C by ~2 points. Trust the tenant's prose, report both.
- **⚠ The Suche can be phrased in the SECOND PERSON, describing what the READER owns — and then EVERY documented trigger phrase returns zero.** #666 (tauschwohnung.com variant, Anbieter-ID 416645): the entire Suche is the **first sentence**, „**Du suchst** eine großzügige Wohnung in Potsdam und **bietest gerne deine 4-Zimmer-Wohnung in Babelsberg**?" A full sweep of the documented triggers returned **`Ich suche` 0 · `Wir suchen` 0 · `suche` 0 · `im Gegenzug` 0 · `Gegenzug` 0 · `Suchprofil`/`Das suche ich` 0 · `mindestens` 0 · `Falls du` 0**, and the title carried no Suche either — so a trigger-only reader concludes "Suche unknown" and the lenient fallback wrongly produces a Swap-candidate. ⇒ **Add `Du suchst` / `bietest` / `bietest du` to the trigger list, and always read the first sentence in full regardless of what the greps say.** The grammatical inversion is the whole trap: the poster states their Suche as *what the ideal partner already has*, so the criteria (`4-Zimmer-Wohnung`, `in Babelsberg`) are attached to "deine Wohnung", not to a verb of wanting. They are still an absolute floor and an explicit Ortsteil. *Why:* the fallback for an unreadable Suche is KEEP, so missing a stated Suche flips the outcome — this is the same failure the "always the last paragraph" correction fixed, in a new grammatical disguise.
  - Same listing, second lesson: **direction ≠ downsizing just because their flat is big.** #666 holds 4 Zi / 95–98 m² and asks for **4 Zi** again — a **lateral move motivated by the Ortsteil**, not a downsizing. A large partner flat is not evidence that our 2-Zi offer has a chance; only their stated floor is.
- **The partner's Suche is free-text, not a structured field — and it sits in ONE OF FIVE places. Check them all, it costs nothing and settles side 2 before any A–H work:**
  -1. **Under an explicit `Suchprofil (Das suche ich)` heading, as a labelled bullet list** — the Wohnungsswap variant's richest shape, and the easiest of all to score. #660: the description is split into two labelled halves, `Objektbeschreibung (Das biete ich)` … then `Suchprofil (Das suche ich)` with one bullet per axis (`Größe: Ab 2 Zimmer und mindestens 55 m².` · `Lage: …` · `Budget: Bis max. 1.100 € Warmmiete.` · `Must-haves: Einbauküche (EBK) und Balkon.` · `Optional: …`). ⇒ **Grep `Das suche ich|Suchprofil|Das biete ich` FIRST** — when present it hands you the whole per-criterion checklist verbatim, including a **`Must-haves:` line that is an explicit deal-breaker declaration** under `evaluate.md` step 4 (no leniency owed).
     ⚠ **`im Gegenzug` is NO LONGER a safe first grep on the Wohnungsswap variant — there it is BOILERPLATE.** The closing "Wichtig" paragraph reads "…eignet sich also nur für diejenigen, die **im Gegenzug** eine eigene passende Wohnung für den Tausch haben." (#660: 5 html hits, all boilerplate, zero in the actual Suche). Trigger-phrase priority is now: `Das suche ich`/`Suchprofil` → `Ich suche`/`Nun suche ich`/`Falls du … hast` → `mindestens {N}` → `im Gegenzug` **last, and verify the hit is not the platform footer**.
  0. **Mid-paragraph, in the MIDDLE of the body prose** — neither the title, nor the first sentence, nor the last paragraph. #658: the body reads "Hallo! Ich biete meine … Wohnung … zum Tausch an. Sie ist 140 m² groß … **Nun suche ich** eine passende Tauschwohnung in Charlottenburg, unbedingt in der Nähe des Karl-August-Platz … Falls du eine Wohnung mit mindestens 3 Zimmern und 70 qm hast, meld dich gerne." — sentences 3–4 of 4, with the last paragraph being a date line. ⇒ **Do not scan by position at all; scan the whole description for the trigger phrases** (`im Gegenzug`, `Nun suche ich`, `suche … Wohnung`, `Falls du … hast`, `mindestens {N}`). Position-based reading has now been wrong in both directions (last-only missed #656, first/last-only would have missed #658).
  1. **The ad title** — the cheapest of all and easy to skip past. #656: `TAUSCHWOHNUNG 3Z Wohnung in Charlottenburg/Westend, **suche 3+Z Wohnung**`. The title alone was the whole discard.
  2. **The FIRST sentence of the description**, when the tenant opens with their motive — #656: "Schweren Herzens wollen wir uns von unserer schönen 3 Zimmer Wohnung in Charlottenburg trennen und uns **vergrößern**."
     - ⚠ **New trigger, and it defeats the ENTIRE documented list: `Tausche {ihr Angebot} gegen {ihre Suche}` — one sentence, no verb of wanting at all.** #684 (Wohnungsswap variant, Ref 1483177, Hans-Sachs-Str.): the whole Suche is the first sentence, „**Tausche** ruhig gelegene 3-Zimmer-Wohnung in Potsdam West **gegen** eine schöne 1,5 - 2 Zimmer Wohnung in **Berlin, bevorzugt im Prenzlauer Berg**. **Haustiere müssen erlaubt sein** …". Sweep result: `Ich suche`/`Wir suchen`/`Nun suche ich`/`suche` **0** (note „Tausche" does *not* contain the substring „suche"), `Suchprofil`/`Das suche ich` **0**, `mindestens`/`maximal` **0**, `Falls du`/`Du suchst`/`bietest` **0** — and `im Gegenzug` hits only the Wohnungsswap „Wichtig"-boilerplate. A trigger-only reader therefore finds nothing, and the lenient fallback („Suche unknown → KEEP") wrongly produces a Swap-candidate. ⇒ **Add `Tausche … gegen` / `tausche gegen` / `gegen eine … Wohnung` to the trigger list.** Grammatically it is the mirror of #666: there the Suche hung on *„deine* Wohnung", here it is the **object of the preposition `gegen`**, so the criteria (`1,5 - 2 Zimmer`, `in Berlin`, `Prenzlauer Berg`, `Haustiere`) carry no wanting-verb to grep for. Reading the first sentence in full is the only reliable move — third distinct grammatical disguise now (#656 motive, #666 second person, #684 `gegen`-object).
  3. **The LAST prose paragraph, immediately before the platform boilerplate** — Wohnungsswap's "**Wichtig** …" (#654: "Suche wg-taugliche Wohnung ab 4 Zimmer in Schöneberg, Tempelhof, Kreuzberg, Neukölln.") or tauschwohnung.com's "**Diese Anzeige wurde von einem Nutzer eingestellt. Tauschwohnung.com stellt nur die Plattform bereit …**" (#655: "Wir suchen eine Familienwohnung ab 3 (besser 4) Zimmern, die … bis etwa 1500€ kalt kostet. Sie sollte 75 m² oder besser größer sein.").
  ⚠ **The "always the last paragraph" rule was WRONG** — #656's last paragraph was about parking and transit, and a last-paragraph-only reader would have found no Suche at all and wrongly kept the listing as "Suche unknown → lenient PASS". *Why:* the fallback for an unreadable Suche is KEEP, so missing a stated Suche flips the outcome, not just the confidence.
  ⚠ **The mirror error is just as live: all three positions are occupied in the wild, so always check all three.** #657's title (`TAUSCHWOHNUNG Wunderschöne Altbauwohnung am Schloss Charlottenburg`) and first sentence carry **no** Suche at all — it sits in the last prose paragraph ("Ich suche **im Gegenzug** eine Wohnung mit mindestens 3,5 Zimmern…"). Tally so far: last paragraph #654/#655/#657, title+first sentence #656. **`im Gegenzug` is the highest-yield trigger phrase** — it opens the Suche sentence regardless of which of the three positions that sentence lands in, so grep for it first.
  - **⚠ CORRECTION (#660) — the floor test can PASS and side 2 still fail; run all five axes, don't stop at rooms/m².** #660 is the first swap in the series where the room floor passes ("Größe: **Ab 2 Zimmer** und mindestens 55 m²" vs. our 2 Zi) and the m² gap is a genuine near-miss (54,19 vs. 55 = **−1,5 %**, protected by the lenient rule). It still fails, on three other axes: an **explicit five-Ortsteil enumeration** ("Nahe Innenstadt: Brandenburger Vorstadt, Potsdam West, Babelsberg, Bornstedt oder Zentrum-Ost") that excludes Golm, a **`Must-haves:` line naming Balkon** (which our offer permanently lacks — a stated deal-breaker, not a soft con), and a **Warmmiete ceiling** (max 1.100 € vs. our 1.214,93 = +10,4 %, and ours is Indexmiete so it only diverges). ⇒ Score the Suche as a **checklist over {rooms, m², area, rent, must-haves, optional}**, not as a rooms-first funnel.
    **The sharpest new failure mode: the partner LIVES in the Ortsteil our offer sits in and is explicitly leaving it.** #660's flat is in **In der Feldmark, Golm — the same street and same Neubauquartier as our own `swap_offer` flat** — and their whole Suche is "nahe Innenstadt". So "they are already in our Ortsteil" is **not** the promising signal it looks like on the search-result row; check whether the named target areas *include* or *replace* their current one. Our offer's structural weaknesses are now two, not one: **no Balkon** and **Golm itself**.
  - **⚠ CORRECTION (#658) — the load-bearing test is the ABSOLUTE FLOOR they state, not the direction.** The direction heuristic below was built on four enlarge-cases and reads as "downsizers are our chance". #658 is the counter-example: a **5 Zi / 140 m²** household genuinely downsizing — "suche … mindestens 3 Zimmern und 70 qm" — and it still fails, because the floor (3 Zi / 70 m²) sits above our 2 Zi / 54,19 m². So run the comparison against **our offer**, never against *their* current flat: `their stated minimum > (2 Zi | 54,19 m²)` ⇒ unwinnable, stop. Direction only tells you whether to expect a floor at all. Phrase it as *"they want to halve, and we are less than half of their half"* rather than *"they want to enlarge"* whenever their own flat is bigger than their floor. Also watch for a Suche that names a **Kiez/Platz rather than a Bezirk** ("unbedingt in der Nähe des **Karl-August-Platz**") — that is an *explicit* area exclusion under `evaluate.md` step 4 and removes the lenient "commuter belt" allowance entirely. **Five** consecutive discards now (#654–#658).
  - **The DIRECTION of the move is still the cheap first read, just not the verdict.** A Suche that names more rooms *and* more m² than the partner's own flat means they want to **enlarge** — our 2 Zi / 54,19 m² Golm offer is then structurally smaller than their existing Bestand and no leniency can rescue it (#655: 2 vs. "ab 3, besser 4" and 54,19 vs. "ab 75 m² oder besser größer" = two clearly-stated large gaps). Our offer only ever fits partners who want to **downsize** or go **barrierearm** — the EG + Personenaufzug is its one strong selling point ("weniger Treppen steigen" matched perfectly on #655 while everything else failed). **Three** consecutive discards (#654 rooms/WG, #655 rooms/area, #656 rooms/area/rent) came down to room count. The tell is a verb-or-floor phrase, not a number: `vergrößern | größer | mehr Platz | zu klein | suche {N}+Z | ab {N} Zimmer | **mindestens {N} Zimmer**` with N ≥ 3 ⇒ structurally unwinnable against a 2-Zi offer, stop there. **`mindestens {N} Zimmer` is the pure-floor variant with no motive verb attached** (#657: "mindestens 3,5 Zimmern") — a verb-only regex misses it, and the direction still has to be inferred by comparing the floor to *their own* room count (3 → wants ≥3,5 = enlarge). **Four** consecutive discards now (#654 rooms/WG, #655 rooms/area, #656 rooms/area/rent, #657 rooms/area/must-haves) all came down to room count. Add the rent axis to the one-liner when it points the same way (#656: their ~830 EUR warm Bestandsmiete vs. our 1.214,93 = +46,4 % **and** Indexmiete). *Why:* stating the direction in one line makes the discard defensible without a per-criterion argument. Read the description prose for rooms/m²/area of what they want AND the real address/Vermieter of their flat (often a municipal landlord like Gesobau — swap needs that landlord's approval).
- **Immowelt swap exposes have NO route to the tauschwohnung.com source** — unlike IS24 there is no "Original-Exposé"/`twg.click` link (`[...querySelectorAll('a')]` filtered for `twg|tauschwohnung` returns `[]`; the only tauschwohnung.com URL on the page is the illegal-content reporting link). The `Referenznummer` == the `Anbieter-ID` printed in the description ("Es handelt es sich hierbei um ein Tauschangebot. (Anbieter-ID: NNNNNN)") and is **NOT** a tauschwohnung.com housing id — `tauschwohnung.com/wohnung/{that id}` returns a **soft 404 with HTTP 200** (61 KB "Seite nicht vorhanden" page), so a bare status-code check looks like success. ⇒ From Immowelt you get **no NUXT `search`/`housing` dict**: the free-text Suche in the description body is the ONLY side-2 input, and Keller/Baujahr/Energieausweis/Kaution stay unknown rather than resolvable. *Why:* #521 burned two calls chasing the `tauschwohnung.md` NUXT route that only works from IS24.
- **Swap-expose completeness VARIES — do not assume the sparse shape.** Two observed variants:
  - *Sparse* (#521): no `Merkmale` block at all, `Mietkosten` = Kaltmiete + Kaution ("keine Angabe") only, so the **Warmmiete is genuinely absent, not missed**.
  - *Rich* (#533, d0df8fec, Kirchsteigfeld): a **full `Merkmale` block** ("Alle 10 Merkmale anzeigen" — Keller, Balkon, Terrasse, Einbauküche, Personenaufzug, Stellplatz, Gäste-WC), a **Nebenkosten line** in `Mietkosten` (⇒ Warmmiete computable), a `Stichworte` tail ("Anzahl Balkone: 1, Anzahl Terrassen: 1") and **19 real mms photos**.
  - *Middling* (#655, 0230de0d, tauschwohnung.com): 6 Merkmale chips (Haustiere erlaubt, Keller, Balkon, Terrasse, Badewanne, Bodenbelag) with **no "Alle N Merkmale anzeigen" control ⇒ complete list**, a `Heizungsart` line, a `Stichworte` tail ("Anzahl Balkone: 1, Anzahl Terrassen: 1") **and a Nebenkosten line ⇒ Warmmiete computable** — but still no Baujahr, no Energieausweis, no Kaution, no date.
  - *Well-equipped but photo-less* (#657, 966a325d, tauschwohnung.com): the two axes fail **independently** — a **complete** 7-chip Merkmale list (null "Alle N anzeigen": 2. Geschoss, Einbauküche, Keller, Balkon, Terrasse, Badewanne, Holzdielen) + a `Stichworte` tail + a Nebenkosten line (⇒ Warmmiete computable) **alongside exactly ONE photo** (counter `1 / 1`, one `"description":"Bild 1"`, 2 mms uniques incl. the hero dupe, no classification payload, no Grundriss). ⇒ Block E scored 4,5 on confirmed must-haves while Block D was capped at 3,0 for "no real photos" **in the same listing**. Don't let a rich Merkmale list talk you out of the photo cap, or one photo talk you out of scoring the must-haves positively.
  ⇒ Always read `Merkmale` + `Mietkosten` on a swap before writing "unknown". The **"Alle N anzeigen" null-test is the highest-value call on a swap expose**: it converts a short chip list from "unconfirmed" into a *complete, confirmed* Ausstattung and lets both profile must-haves be scored positively (#655 Block E 4,0 instead of ~2,0).
- **"[Leider aktuell kein Pro, kann also nicht kontaktieren]" in the description = the sitting tenant has no paid tauschwohnung.com account and cannot initiate contact.** Report it as a practical channel dead-end (Block H / Next Steps), not as a scam or availability signal. Seen #655. *Why:* going in expecting the sparse shape, #533's must-haves (Keller **and** Balkon, both explicitly present) would have been scored as unconfirmed and Block E under-rated by ~2 points.
- **What is reliably absent on BOTH swap variants:** `Bausubstanz und Energie` collapses to "Details zum Energieverbrauch anfragen" (no Energieausweis, **no Baujahr**), Kaution = "keine Angabe", no availability date, no exact address (`isAddressPublished:false`).
  - ⚠ **CORRECTION (#660): the `classification` media payload is NOT reliably absent on swaps.** #660 (Wohnungsswap variant) carried a full 10-entry payload (`LIVING_ROOM`×2, `KITCHEN`×2, `TERRACE`×2, `BATHROOM`, `CLOSET`, `HALLWAY`, `YARD`) matching the "Alle 10 Bilder ansehen" counter exactly. **Always try the loose regex before writing "room coverage unknown"** — here it independently confirmed the `balkon_or_terrasse` must-have (2× `TERRACE` + 1× `YARD`) and, by absence, supported the no-Keller finding. Photo count from `\"description\":\"Bild N\"` stays the safer counter (#660: 10 vs. 11 mms uniques incl. the hero dupe; #655: 3 vs. 4; #654: 13 vs. 14). With no classifications you also lose the room-coverage probe, so say "which rooms are pictured is unknown" rather than inferring absence. The missing Baujahr is load-bearing: it is the only thing deciding a § 556f Neubau exemption vs. a large Mietpreisbremse overshoot — report both Mietspiegel fields (e.g. #533: 1991–2008 → 10,28 EUR/m² vs. ab 2021 → 15,14 EUR/m², actual 17,27) rather than picking one.
- **Cross-check the Ortsteil: the Lage field, the `h1`/`document.title` and the description body can name three different ones — and on a swap the structured `district` can be flatly WRONG, not merely imprecise.** Two grades of this:
  - *Imprecise* (#533, same PLZ): Lage `Kirchsteigfeld`, headline `Potsdam, Stern`, description "In Potsdam, Drewitz, bei Stern Center" — adjacent Ortsteile, one PLZ (14480), different housing stock/price. Say so in Block B.
  - *Flatly wrong* (#655, 0230de0d): JSON `address = {city:"Charlottenburg-Wilmersdorf", zipCode:"10589", district:"Grunewald"}` while `document.title` said **Westend** and the tenant's prose said "Altbau-Wohnung in **Charlottenburg auf der Mierendorff-Insel**" (U7, Ringbahn, Spree, Österreichpark — all Mierendorffinsel, none of them in Grunewald). **10589 is Charlottenburg-Nord; 14193 is Grunewald. Three names, one PLZ.**
  **Rule: the `zipCode` + the description prose are the tie-breakers; `district` is the field that lies.** Cheapest test — does the PLZ belong to the named Ortsteil at all? If not, the district label is Immowelt geocoding noise and the listing is out of a PLZ-scoped search group. Note this is a *different* failure from the #654 "Die Adresse stimmt nicht ganz" case: there the lister disowned his own entry, here the lister is precise and the **portal** is wrong — so a `Adresse stimmt|stimmt nicht ganz` regex returning nothing does **not** clear the location. *Why:* the Grunewald batch had four listings mis-tagged by area (10711 Halensee, Schmargendorf, 14055 Westend, 10589 Mierendorffinsel); `district` looks authoritative and is exactly what the search-result metadata repeats.
  - ✅ **…and when prose and `district` disagree, `sections.location.geometry` ADJUDICATES — it is the Ortsteil MultiPolygon, so just ask which candidate Ortsteil's centroid falls inside it.** #672: `district:"Bornstedt"`, prose twice „Stadtteil **Eiche**" + headline „Potsdam, Eiche". Polygon spans 13,0199–13,0442 O / 52,4138–52,4297 N ⇒ **Eiche's centroid (52,4139 / 13,0247) is INSIDE**, **Bornstedt's (52,4153 / 13,0489) is OUTSIDE** (east of the 13,0442 edge). Prose + geometry agree ⇒ Eiche, settled with zero extra calls. This upgrades the rule above: the documented tie-breakers were `zipCode` + prose, but **`zipCode` is useless whenever both candidate Ortsteile share it** (14469 = Eiche *and* Bornstedt *and* **Jägervorstadt/Nördliche Vorstadt**; 14480 = Am Stern *and* Kirchsteigfeld, cf. #662) — exactly the common case. The polygon is not a point (#654 already noted that), and that is precisely what makes it usable: a *point* would only locate the flat, an *Ortsteil polygon* names the Ortsteil. ⇒ **Standard move on any prose-vs-`district` conflict: look up the two Ortsteil centroids and do the bbox/point-in-polygon check.** *Why:* the Potsdam Mietspiegel is addressed by Baualtersklasse, not by Ortsteil, so this does not move Block A — but it moves Block B (Eiche borders Golm = preferred area; Bornstedt does not) and it is the field the search-result metadata parrots.
    - **Shortcut when the flat is ALSO on IS24 (the usual case for corporate Bestandshalter): skip the polygon, take the Ortsteil from the IS24 mobile API.** `geo_ot` / `obj_regio3` / `obj_regio4` are portal-generated from the full address and have been right every time Immowelt's `district` was wrong. Confirmed twice on the **Wohnbau-GmbH-Quartier Pappelallee/Voltaireweg, 14469** (#584 Pappelallee 49, #700 Pappelallee 48): **Immowelt says „Bornstedt", IS24 says `jägervorstadt` / `Nördliche_Vorstadt`** — and the Objekttext itself says „Wohnquartier in der Jägervorstadt". Expect the Immowelt twin of any listing from this quarter to carry the wrong Ortsteil; it is a systematic mis-geocode, not a lister typo. *Why:* one grep on JSON you already have replaces a two-centroid PIP check, and the wrong Ortsteil is what the pipeline row and the DUPE note would otherwise inherit.
    - ✅ **The same test also CORROBORATES `district` — and that is worth running even when prose is
      silent, because it can overturn a *previous report's* guessed Ortsteil.** #673 (dupe of #606):
      prose named no Ortsteil at all, so there was no conflict to adjudicate; `district:"Waldstadt I"`
      stood alone — but report #606 (the Kleinanzeigen copy, where no Ortsteil field exists) had
      inferred **Waldstadt II** from building traits. PIP settled it for `district`: Waldstadt I's
      centroid is **inside**, Waldstadt II / Zum Jagenstein / Schlaatz / Am Stern / Teltower Vorstadt
      all **outside**. ⇒ Treat the polygon as an independent locator, not merely a tie-breaker; and on
      a **cross-portal dupe, re-run it** — the richer copy can falsify the poorer copy's hypothesis.
    - ⚠ **Use REAL geocoded Ortsteil centroids, never hand-estimated ones — a wrong centroid produces
      a confident FALSE POSITIVE, not a miss.** #673 first pass used from-memory coordinates and the
      polygon "contained" **Am Stern**; the OSM-geocoded run put Am Stern 3,5 km outside and Waldstadt I
      inside. One Nominatim call per candidate (`nominatim.openstreetmap.org/search?q={Ortsteil},
      Potsdam&format=json&limit=1`, ~1 s apart, real UA) costs nothing and is the whole basis of the
      verdict. Bonus: Nominatim's `display_name` itself resolves sub-locations — it placed the street
      *Zum Jagenstein* in **Waldstadt II**, contradicting #606's premise directly.
    - ℹ️ **Polygon-shape tell: a MultiPolygon with several DISJOINT parts is normal, not corrupt.**
      #673's Waldstadt I geometry had **3** separate rings (15 / 45 / 6 points) — it matches the
      Potsdam statistical district „Waldstadt I und Industriegelände", which genuinely is
      discontiguous. So iterate all `coordinates[i][0]` rings; testing only the first, or judging by
      the union bbox (which spanned ~4 × 2,7 km here and swallowed three foreign Ortsteile), gives the
      wrong answer.
- **The description's own Warmmiete can contradict the `Mietkosten` arithmetic** — #533: Kaltmiete 1.900 + Nebenkosten 440 = 2.340, description prose says "Die Warmmiete beträgt 2400 Euro". Report both, don't average (same failure mode as the stale price-cut note below).
- **A named historic building in the description is a free data source.** #521's expose gave no address, no Baujahr and no condition field, but the description named the "Brockessches Palais" — one WebSearch yielded the exact address (Yorckstraße 19/20, 14467), **Baujahr 1776** (⇒ Mietspiegel Baualtersklasse "bis 1948") and "denkmalgerecht vollsaniert bis Ende 2016" (⇒ Block D "Saniert" **and** the § 556f umfassende-Modernisierung exception that decides the Mietpreisbremse verdict). *Why:* without the Baujahr there is no Mietspiegel field at all, and "Der Anbieter hat die genaue Adresse nicht freigegeben" reads like a dead end.
- **The Suche can hinge on FLOOR/Etage, not just rooms/m²/area — check the title too.** Seen on #351 (dd00b8fa, Bornstedt): title = "TAUSCHWOHNUNG **Tausch in eine höhere Etage**", flat is EG, Suche = "2-3 Zimmer mit Balkon in Potsdam (Norden)". Their central motivation was a *higher floor*. Our Golm offer (EG, no balcony) matched rooms+area (Golm = Potsdam-Nord) but failed the two explicit points (höhere Etage + Balkon) → side-2 clear fail → DISCARDED, even though their flat scored 4,4/5 for us. So a floor preference in the title is a real side-2 match dimension; our EG offer fails any "höhere Etage"/upper-floor Suche.

## Notes
- **`Stichworte` (rental tail) is a SEPARATE, structured field from `Sonstiges` — and it can carry MORE than the IS24 twin of the same unit.** #632 (Brauhausberg H1-01-04): `Stichworte` = "Anzahl der Schlafzimmer: 2, Anzahl der Badezimmer: 1, Anzahl Balkone: 1, **Balkon-Terrassen-Fläche: 9,78 m²**, Bundesland: Brandenburg, **Mindestmietdauer: 24 Monate**". The four IS24 exposés of the *same* project (#624/#628/#629/#630) had **no Mindestmietdauer field at all** and were scored "keine Mindestmietdauer im Exposé". *Why:* a 24-month Kündigungsausschluss is a real Block-G deduction (~0,7–1,0) that is invisible on the "better" portal — so when a unit is cross-posted, **read the Immowelt `Stichworte` even if you already have the IS24 record**, and treat what you find as probably project-wide. Same field is also the cheapest source of exact balcony m² and the Schlafzimmer/Badezimmer split.
- **Media `description` values are original filenames — use them to tell a UNIT-specific Grundriss from a Musterwohnung plan.** #632's floorplan set was `Grundriss – Musterwohnung`, `3D-Grundriss – Musterwohnung` **and** `FF26888_…_Haus_1_Haus_1_WE_4_1900_2300_jpg` = Haus 1, Wohneinheit 4, i.e. this exact flat. *Why:* on a Neubau-Vorvermietung the standing assumption is "everything is Musterwohnung"; a `Haus_N…WE_M` filename is positive proof of a unit-specific plan and is a genuine Block-C plus over the sibling units.
- **`span.css-qjxbdv` is the clean selector for the Merkmale chips** (`[...document.querySelectorAll('span.css-qjxbdv')].map(e=>e.textContent)`) — returns the visible chips as a tidy array without slicing `innerText`. Confirms again that the "Alle N Merkmale anzeigen" control is a `<div>`, and `.click()` on it changes nothing (#632: 8 of 9 chips, unchanged after click).
- **Rental energy section: `"hasScales":false` in the embedded JSON is the machine-readable "no Energieausweis scale rendered" flag**, and the *reason* sits in the `Sonstiges` tail under its own `Energiepass` heading (#632: "Energieausweis wird bei Besichtigung vorgelegt."). A `Heiz` sweep of the whole `innerHTML` returning **0** means Immowelt states nothing about whether Heizkosten are in the Nebenkosten — the portal's "Warmmiete" is then just Kalt + NK and may be misleadingly low; cross-check the IS24 twin's explicit "Heizkosten in Nebenkosten enthalten: Nein". *Why:* on #632 that difference was ~85–120 EUR/month and decided whether the flat sits under or over the Warmmiete cap.
  - **Second shape: `hasScales:false` with NO reason anywhere** — the section renders only „Möchtest du Details zum Energieverbrauch? → Details zum Energieverbrauch anfragen" (`data-testid="cdp-energy-info-not-available"`), there is no `Sonstiges`/`Energiepass` tail and no § 79 Abs. 4 GEG Denkmal exemption is claimed (#664, #665). That is a plain **§ 87 GEG Pflichtangaben violation**: report it as such, drop the EEK adjustment in Block D, and — on a pre-1948 Altbau — say so in Block A too, because the Potsdam Grundmietentabelle needs an EEK row and „kein EA" is a *different, lower* row than C–E. Score every plausible row rather than guessing one.
  - **The `energy` block has its OWN `features[]`, separate from the Merkmale `features` object, and it can ALSO carry `"enrichment":"ai"`.** #665: `energy.features:[{"type":"heatingSystem","label":"Heizungsart","value":"Fußbodenheizung","enrichment":"ai"}]` — derived from the prose („niemals kalte Füße durch die praktische Fußbodenheizung"), not filled in by the lister, and the *Energieträger* stays unknown. ⇒ Apply the same rule as for amenity chips: cite the sentence, not the chip. *Why:* an AI-derived Heizungsart reads like a lister assertion and can be mis-attributed (a Heizung "im Haus" vs. in the flat).
  - **A rental price panel with only a `Nebenkosten` detail and no `Heizkosten` line does not settle the heating question either** — say "Warmmiete = Kalt + NK, heating inclusion is an inference". A high NK per m² (#665: 350 EUR on 104 m² = 3,37 EUR/m²) is weak evidence *for* inclusion, nothing more.
- **Price cuts leave the description stale:** header Kaltmiete/Warmmiete fields get updated on reduction, but a "Mietkonditionen:" breakdown inside Sonstiges keeps the OLD numbers (seen #310: header 1.494/2.184 vs description 1.563,42/2.303,42). Report both and flag the conflict — don't average them.
- Availability: usually no explicit date on page (only an "Einzugsdatum" field in the contact form) → Block F = 3.0, ask in contact.
- Private listings show no Anbieter name and often no phone → contact via portal only; minor scam-caution signal.
- **"Über den Eigentümer → Privater Anbieter" + a GmbH signature at the end of the description is NOT a scam signal — it is a small Hausverwaltung on a private-anbieter account.** #539: block said "Privater Anbieter / Keine Telefonnummer hinterlegt", description signed "T&B Grundbesitz GmbH"; one WebSearch resolved it to a real Miet-/WEG-Verwaltung (HRB 34233P, AG Potsdam, named GFs, own website), no negative findings. Resolve the mismatch with a Handelsregister/company search **before** writing an "identity mismatch" caution — and note the consequence for Block H: the *Eigentümer* is then a private person, so **Eigenbedarf risk stays Medium** (a GmbH could not invoke § 573 Abs. 2 Nr. 2 BGB, a natural person can). *Why:* untreated, the mismatch reads as a medium scam signal and the Eigenbedarf risk gets scored as Low (corporate), both wrong.
- Aggregator twins: same units re-appear via regionalimmobilien24 / sueddeutsche / ab-ins-zuhause — dedup by unit (rooms/m²/area), not URL.
- ⚠ **`address.city` also fails by SAME-NAME-ORTSTEIL COLLISION, and that is how out-of-area objects end up inside a city's search group.** #763 (`574be1ff-…`, Grundstück): `city:"Potsdam"` + a `geometry` MultiPolygon at **12,916–12,961 O / 52,478–52,504 N** — which is Potsdam's *own* Ortsteil **Uetz-Paaren** (14476). The plot is in **Paaren im Glien**, Gemeinde Schönwalde-Glien, **Landkreis Havelland** (14621), ~**19 km north**. Immowelt resolved the bare Ortsteil string „Paaren" to the wrong same-named place, and `geometry` is derived from that false `city`, so it confirms the error (same trap as the Grunewald/Westend `geometry` note above — the polygon is **never** an independent locator). `zipCode` was again the only correct field of the whole `address` object. *Why:* the search group said "Potsdam", the portal said "Potsdam", and only the prose and a street sign said Havelland — scoring Block B on the portal's city would have put a 40–50-minute-from-Golm plot into the preferred area.
  - ✅ **New, cheap tiebreaker on plots/houses: READ THE STREET SIGNS IN THE PHOTOS.** #763's gallery carried „**Märkischer Ring**" (Bild 1) and „**Sandplan**" (Bild 9) legibly; one search confirmed *Sandplan* is a street in 14621 OT Paaren im Glien. On an `isAddressPublished:false` object this is often the only street-level evidence that exists, it costs nothing extra once the contact sheet is built, and it is **independent** of every structured field. Add it to the resolution order: prose → zipCode → **street signs / shop names in the gallery** → nothing else.
- ⚠ **Plot exposés: `features.preview` can contain ONLY `plotSpace` — no `site-development-state`, no `development-infrastructure`.** This narrows the #762 note above ("the plot-specific payload is in `features.preview`, whose icons ARE the Erschließungsgrad"): those chips are **optional**, not guaranteed. #763 had the single `plotSpace` chip and nothing else, so the Erschließungsgrad existed **only as prose** („Die ortsüblichen Medien liegen in der Straße" = Stufe 2 of 5) with **no word on Abwasser at all**. ⇒ When the chips are missing, do NOT read it as "unerschlossen" and do NOT read it as a parse failure: fall back to (a) the description, and (b) **the photos, which are the better evidence anyway** — #763's images showed the finished asphalt Anliegerstraße with kerb, Betonstein-Gehweg and street lighting *plus* Hausanschluss-/Verteilerkästen and an Anschlussmerkpfahl standing at the plot boundary, which positively excludes Stufe 3 (unbefestigte Straße, full Erschließungsbeitrag open). Say "prose-only, Abwasser unbelegt" and make the § 133 Abs. 3 BauGB question a Next Step.
