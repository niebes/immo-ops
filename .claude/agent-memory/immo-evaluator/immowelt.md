# Immowelt (immowelt.de) — listing-page quirks

Matches: immowelt.de `/expose/{id}` detail pages (AVIV Germany GmbH).

## Getting the data
- **Plain curl/WebFetch is blocked (403)** even with a browser UA — don't bother; go straight to a browser tier. Re-confirmed 2026-07-20 (#397): still 403 (771-byte body) with a Chrome-126 UA. *Why:* callers/orchestrators sometimes assert "Immowelt is curl-fetchable" — it is not; test it in one call if told so, then escalate.
- **invisible-playwright can HANG (not just crash) — on Immowelt, go to CiC FIRST.** `new_page` returns nothing for the full 1800s idle timeout: seen 2026-07-20, **recurred 2026-08-09 (#538)**, i.e. twice = the norm, not a blip. Symptom differs from the "Connection closed while reading from the driver" crash below but the remedy is the same: don't retry, use CiC. *Why:* each attempt burns 30 min of wall-clock; the standing "PREFER invisible-playwright" doctrine is a net loss on this portal specifically. Immowelt renders fully in CiC with no consent wall, so the fallback is cheap.
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
  **⇒ Treat the node-script path as the DEFAULT first move on Immowelt, ahead of CiC.**
  Two gotchas in the harness itself: (a) set `IP_HEADLESS/IP_LOCALE/IP_TIMEZONE/IP_STORAGE_STATE` and
  `cwd: ROOT` in the spawn env (`tmp/drive.mjs` omits them); (b) the driver emits a **second** line
  `{"ok":true}` after the result — write the result to a file on the first non-`ready` message and
  `quit`, or the second line overwrites it with nothing. *Promotion candidate: this now outranks the
  "CiC FIRST on Immowelt" line in `evaluate.md`, which should be rewritten.*
  It is the cheapest *first* move, not just a CiC fallback: one `node` script (spawn driver → wait for `{ready:true}` → one `eval` cmd) answered liveness in ~40 s with no MCP round trip and no permission prompt. A **deleted** expose comes back as `title:"Immowelt"`, `L:542`, "Anzeige gelöscht" — i.e. this path alone settles the aggregator-EXPIRED question.
  Verified 2026-08-15 (#596): expose fetched in well under a minute, `blocked=false`, **no truncation** — one call returned `innerText` + the whole 632 KB `documentElement.innerHTML`. Wrap it with your own `setTimeout` kill so a stall fails fast. Two passes is the cheapest shape: pass 1 = `{title, innerText, imgs}` for liveness + fields, pass 2 = raw `innerHTML` to disk for the offline keyword/JSON mining below. *Why:* CiC is not always available, and without this the doctrine's only remaining tier is the one that wedges.
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
  - **Photo classifications double as an amenity probe.** 12 photos all classified as interior rooms (LIVING_ROOM/BEDROOM/KITCHEN/BATHROOM/HALLWAY/CLOSET/HOME_OFFICE) with **no** outdoor/balcony frame is decent evidence that there is no Balkon/Terrasse when the text is silent — enough to take the Block-E must-have penalty, phrased as "not evidenced" rather than "confirmed absent".
- **Energieausweis can legitimately be absent: `"Ein Energieausweis ist für diesen Gebäudetyp nicht notwendig."`** appears in `data-testid="cdp-energy-certificate-preview"` in place of the scale. On a Baudenkmal this is the § 79 Abs. 4 GEG exemption — **do NOT fire the "Missing Energieausweis" scam signal** for it, but do note that the energy performance is then unverifiable (Block D). Such listings also omit the Baujahr; recover it from the Wikipedia Denkmalliste — see `potsdam-mietspiegel.md` → "Baujahr HARD bekommen".
- CiC fallback: **first `navigate` often lands on `chrome://newtab/` (no-op) — just call `navigate` again.** Second call loads.
- No cookie/consent wall blocks content; page renders immediately. `read_page`/`javascript_tool` on `document.body.innerText` works.
- **All load-bearing fields are in `innerText`** — extract by section, not one blob (CiC truncates ~1100 chars):
  - Header `h1`: Kaltmiete, Warmmiete, rooms · m² · Geschoss, area+PLZ.
  - `Merkmale` block: amenities list (Einbauküche, Balkon, Stellplatz, Badezimmer count, möbliert y/n, WG-geeignet, Dachgeschoss). **Keller is NOT reliably listed.** The visible chip list is truncated to ~7 items behind "Alle N Merkmale anzeigen"; absence of a Keller chip does NOT mean no Keller (see the Structured-payload section — #396 had a Keller that only the Grundriss caption revealed). Confirm against `innerHTML` before scoring a Keller as missing.
  - `Bausubstanz und Energie`: Energieausweis class, Zustand (teilsaniert/saniert/…), Energieträger.
  - `Mietkosten`: Warmmiete, Kaltmiete + €/m², Nebenkosten, Heizkosten note, Kaution.
  - **KAUF listings — `Preisdetails` is a ready-made Block A.** Gives Kaufpreis, €/m², `Provision für Käufer` (%), and a full itemized `Kaufnebenkosten` + **`Geschätzte Gesamtkosten`** (Notar 1,5 % / Grunderwerbsteuer / Provision / Grundbuch 0,5 %). Immediately after it, `Preise in der Region` states whether the €/m² is above/below comparable regional objects, plus the regional min/max €/m². *Why:* no need to hand-compute Nebenkosten or WebSearch a market benchmark — but note Immowelt's Grunderwerbsteuer line is the **state** rate (Brandenburg 6,5 %), so verify it matches the property's state, and the "günstiger als vergleichbare" verdict is an AVIV estimate over a very wide band, so treat it as weak evidence only.
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
- **Provision terms are spelled out in the Preisdetails block** — rate, when it becomes due, and
  crucially whether a **same-rate contract with the seller** exists (= § 656c BGB split confirmed).
  Read it verbatim; it is a real Block-G differentiator (#396 was clean and 2,38 %; #384's IS24 twin
  tried to bind the Maklervertrag to the mere Exposé-Abruf at 3,57 %).
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
- **⚠ `district:"Grunewald"` + `og:title:"Westend"` is a CONFIRMED FALLBACK PAIR, not data — it has now appeared on FIVE unrelated flats. Treat the pair as "location unknown" on sight.** #655 → `zipCode:"10589"` (real: Charlottenburg-Nord/Mierendorffinsel) · #656 → `"14199"` (real: Charlottenburg/Westend) · #657 → `"14059"` (real: Charlottenburg, Klausenerplatz/Schlossviertel) · #658 → `"10589"` again (real: Charlottenburg-Nord/Mierendorffkiez) · **#683 → `"10585"`** (real: Charlottenburg, Kiez Richard-Wagner-Platz/Mierendorffplatz/Schloss; pinned by the prose "Altbauwohnung … **in Charlottenburg**" + "der **Schlosspark** in Laufnähe"). Same two junk fields every time; the `zipCode` is the only part that moves — and **a repeated `zipCode` does NOT make the pair trustworthy**, it just means two different flats happen to share a postcode.
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
  - ✅ **…and when prose and `district` disagree, `sections.location.geometry` ADJUDICATES — it is the Ortsteil MultiPolygon, so just ask which candidate Ortsteil's centroid falls inside it.** #672: `district:"Bornstedt"`, prose twice „Stadtteil **Eiche**" + headline „Potsdam, Eiche". Polygon spans 13,0199–13,0442 O / 52,4138–52,4297 N ⇒ **Eiche's centroid (52,4139 / 13,0247) is INSIDE**, **Bornstedt's (52,4153 / 13,0489) is OUTSIDE** (east of the 13,0442 edge). Prose + geometry agree ⇒ Eiche, settled with zero extra calls. This upgrades the rule above: the documented tie-breakers were `zipCode` + prose, but **`zipCode` is useless whenever both candidate Ortsteile share it** (14469 = Eiche *and* Bornstedt; 14480 = Am Stern *and* Kirchsteigfeld, cf. #662) — exactly the common case. The polygon is not a point (#654 already noted that), and that is precisely what makes it usable: a *point* would only locate the flat, an *Ortsteil polygon* names the Ortsteil. ⇒ **Standard move on any prose-vs-`district` conflict: look up the two Ortsteil centroids and do the bbox/point-in-polygon check.** *Why:* the Potsdam Mietspiegel is addressed by Baualtersklasse, not by Ortsteil, so this does not move Block A — but it moves Block B (Eiche borders Golm = preferred area; Bornstedt does not) and it is the field the search-result metadata parrots.
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
