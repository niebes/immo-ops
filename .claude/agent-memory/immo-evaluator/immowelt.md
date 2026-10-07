# Immowelt (immowelt.de) — page quirks (general + rentals)
Portal match: immowelt.de `/expose/{id}` (AVIV Germany), incl. Immowelt twins reached via aggregators (Süddeutsche, regionalimmobilien24, Ab ins Zuhause).
Kauf / plot / Fertighaus / Zwangsversteigerung exposés: the §Kauf-* sections at the end (everything above applies to them too). **Swap ads:** the Immowelt field quirks of the two swap feeds are in §SwapFeed below. How to read the partner's Suche and score side 2 is in [[tauschwohnung]].

Consolidated 2026-09-28 from a 148 KB append log. Listing numbers (#NNN) stay only as the example behind a rule. Sections: §Access · §Liveness · §Payload · §Merkmale · §Energy · §Price · §Size · §Photos · §Location · §Identity · §SwapFeed · §Kauf-Price · §Kauf-Identity · §Kauf-Plots · §Kauf-BuildOffers · §Kauf-ZV.

## §Access
- **curl/WebFetch = 403** (a 771-byte body, even with a Chrome UA; re-confirmed #397). If an orchestrator says "Immowelt is curl-fetchable", test it with one call, then escalate. ⇒ Immowelt always needs the stealth driver, but under `Parallel: yes` that is NOT `NEEDS-BROWSER`: spawn your OWN driver process with `IP_SAVE_STATE=false` (next bullet). #871 (2026-09-29, Parallel: yes) ran clean: blocked=false, 687 KB, one call. *Why:* the old "Parallel ⇒ NEEDS-BROWSER" rule bounced every Immowelt listing back to the orchestrator for nothing.
- **Default first move: drive the stealth Firefox from a node script, not the MCP.** 17/17 clean runs between 2026-08-15 and 09-12, all `blocked=false`, ~40–60 s, 616–685 KB `innerHTML`, no truncation. `modes/evaluate.md` has stated this since 2026-09-12. Spawn it the way `scripts/scan.mjs` does:
  `spawn('bash',['scripts/invisible-venv.sh','scripts/invisible-driver.py'],{cwd:ROOT, env:{...process.env, IP_HEADLESS:'true', IP_LOCALE:'de-DE', IP_TIMEZONE:'Europe/Berlin', IP_STORAGE_STATE:'tmp/browser-state.json', IP_SAVE_STATE:'false' /* read-only: several evaluators may run drivers in parallel (2026-09-28) */}, stdio:['pipe','pipe','inherit']})` → wait for `{ready:true}` → write `JSON.stringify({cmd:'eval', url, snippet})+'\n'` → the reply is `{ok, result, blocked}`.
  - `snippet` must be a bare EXPRESSION, e.g. `({title:document.title, text:document.body.innerText, html:document.documentElement.innerHTML})`. Do not pass an arrow function: the driver wraps the snippet in `() => (…)`, so a function comes back as `result:null` (#786), which looks like an empty page.
  - The driver emits a second `{"ok":true}` line after the result. Write the first non-`ready` message to a file, then `quit`, otherwise the second line overwrites it. Wrap the whole thing in your own `setTimeout` kill so a stall fails fast.
  - Standard shape is two Bash calls: (1) the fetch writes `innerText` + `innerHTML` into `tmp/eval/{NNN}/`; (2) `node tmp/eval/{NNN}/mine.mjs` mines them offline. **Put the miner in a `.mjs` FILE, never in `node -e '…'`.** The escaping level varies per page, and the two shell/JS quoting layers eat the backslashes, so every key comes back NOT FOUND (#670).
  - A deleted exposé comes back via this path too (see §Liveness), so it settles aggregator-EXPIRED questions on its own.
- **DataDome wall comes back as `ok:true, blocked:false` — test for it yourself after every fetch.** 2026-10-07 (#908 Kauf, #909; Parallel: yes, 2 runs each, retries 20 s and ~1 min later): `document.title` "immowelt.de", `innerText` 0 chars, `innerHTML` ~1,5 KB = `var dd={…'host':'geo.captcha-delivery.com'…}` + `<iframe title="DataDome CAPTCHA">`. `scripts/invisible-driver.py` `is_blocked()` only matches CAPTCHA markers in title/body TEXT, so it never flags DataDome. Rule: `innerHTML` contains `captcha-delivery.com` OR `innerText.length === 0` → blocked, whatever the flag says. One retry; the retry carried the same DataDome `cid`, i.e. the shared `tmp/browser-state.json` session itself is flagged, so more retries won't help. Then return `NEEDS-BROWSER` (the read-only driver cannot solve it; this is the one exception to "Parallel ⇒ own driver, not NEEDS-BROWSER" above). Same-morning search pages were DataDome-blocked on every transport, which is the tell that detail pages will be too. *Why:* a 0-char page reads like a deleted exposé and the miner reports "no `__UFRN_LIFECYCLE_SERVERREQUEST__` anchor", which invites a false EXPIRED (§Liveness: decide on the phrase, never on length).
- **Skip the invisible-playwright MCP tier.** `new_page` hangs for the full 1800 s idle timeout (2026-07-20, #538). It also crashes with "Connection closed while reading from the driver". It worked first try once (#310), but each hang burns 30 minutes.
- **CiC is the last fallback.** Sequence: `tabs_context_mcp{createIfEmpty:true}` → `tabs_create_mcp` → `navigate` → `javascript_tool`. There is no consent wall. The ~1 KB return cap means 4–6 calls (a 900-char head, 2–3 body slices, one regex sweep). If the first `navigate` lands on chrome://newtab, navigate again.

## §Liveness — EXPIRED
- **Deleted exposé = HTTP 200 shell with no payload.** Decide on the phrase `Anzeige gelöscht|nicht mehr verfügbar` in `innerText` (plus a bare `document.title`), NEVER on length. Two variants:
  - `document.title` = "Immowelt", `innerText` ~540 chars, "Anzeige gelöscht — Diese Anzeige wurde bereits gelöscht" (#542).
  - Online-ID URL (`/expose/26IN6Z1991TC`): `document.title` = the bare Online-ID, `innerText` ~3,1 KB: "Diese Anzeige ist nicht mehr verfügbar" + a "Mehr Angebote wie dieses" list of ~25 foreign cards (#905). *Why:* the old `L < ~1000` test missed it, and the similar-offers cards read like the listing's own price/m²/Ortsteil.
- **Lister-declared VERGEBEN (now in evaluate.md):** the page is complete and live, `isNew:true`, but the headline reads "TAUSCHWOHNUNG VERGEBEN: …" (#712). Sweep `vergeben|bereits vergeben|nicht mehr verfügbar|reserviert` (case-insensitive) over `sections.mainDescription.headline` + `classified.title` + `document.title` together:
  - On the swap feed, `classified.title` holds the whole DESCRIPTION, and the real headline lives only in `mainDescription.headline` (#719, #779).
  - `classified.title` can be `undefined` (#730), so use `String(d.title)`, not `JSON.stringify(d.title).slice`.
  - Corroborate with `metadata.updateDate`, which equals the day the title was edited.

## §Payload — parse the embedded record, don't scrape
The extraction recipe (UFRN anchor, optional `;`, `app_cldp`/`app_demand_referral_cldp`) is doctrine now: `modes/evaluate.md` → Browser & portal quirks → Immowelt. Extra traps:
- **Slicing instead of parsing:** `indexOf` the BARE key (`zipCode`, not `'"zipCode"'`, #671). Never regex `"key":"value"`: escaping is 1×–3× per page (#660), and one unescape pass is not enough.
- **Missing sections:** null-guard every optional section. `sections.features` can be `null`, plots have no `energy`, swap ads can lack `rawData.tags`.

**Field map of `d` (`classified`):**
- `metadata.{legacyId, creationDate, updateDate, isNewBuildProject}`
- tags live in `d.tags` and/or `d.rawData.tags`, with a varying key set (`has3DVisit, hasBrokerageFee, isNew, hasFloorPlan, hasVirtualTour, hasVideo`). They can be absent entirely on swap ads (#710, #711), so run `Object.keys()` first.
- `rawData.{distributionType, propertyType, propertySubType, distributionSubType, geoIdHierarchy}`
- `domains.medias.{images, floorplans, videos, virtualTours}`: each entry is `{url, description, classification?}`
- `sections.location.{address:{street,city,zipCode,district}, isAddressPublished, geometry}`
- `sections.hardFacts` (facts[], price, `titleAdditions`, `locationDescription`) · `sections.price` (base / additional / breakdown: Kalt, NK, HK, Kaution, commissionFee) · `sections.key` (Online-ID + Referenznummer)
- `sections.description.texts[]` = the full prose incl. the Stichworte block · `sections.mainDescription.{headline, description}`
- `sections.features.{preview, details}` · `sections.energy` · `sections.documents.files[]` · `sections.priceComparison` · `classified.aiEnrichments`
- `contactSections.contactCard.{title, subtitle, isPrivateOwner, phoneNumbers}`
- **`innerText` tail, still worth reading:**
  - "Über den Anbieter" gives company + `{x},{y}/5 ({N} Bewertungen)` + partnership tenure, a ready Block-H input. The rating is portal-local and will not match IS24's for the same firm (#661: 3,9 vs 3,8). A differing rating is no evidence against a dupe, and neither number should override ProvenExpert/Jacasa.
  - Private ads show "Privater Anbieter / Keine Telefonnummer hinterlegt" (portal contact only, minor caution).

## §Merkmale — features
- **`sections.features.details.categories` is the COMPLETE list**, incl. the chips hidden behind "Alle N Merkmale anzeigen". #661: `preview` showed 8 chips, `details` held the missing 3, incl. `teilweise möbliert`. #671: the hidden tail held `Barrierefrei` + Badewanne.
  - `details:null` means `preview` IS the complete set (#662).
  - Never click the expander: it is a `<div>` and clicking changes nothing (#397, #632).
  - CiC chip selector: `span.css-qjxbdv`.
- **`sections.features === null`** means the lister never saw an Ausstattungsmaske. Must-haves are then UNANSWERABLE, not absent: write "unbestätigt" and put a question in Next Steps (#721). This is a per-ad property, not a per-feed one: #722, from the same feed, had chips incl. Keller.
- **A complete list is not a feature census.** With fewer than ~3 chips, write "not stated", not "confirmed missing", and look for a sibling posting. #660 had 1 chip and no Keller; the Tauschwohnung twin #661 of the same flat had 7 chips incl. Keller.
  - "Confirmed missing" needs all of: a complete list (`details:null` or categories) + 0 prose/HTML hits + no photo evidence + no known sibling posting + silence in a prose passage that would naturally mention it (#663).
- **AI-derived chips** are listed in the top-level `classified.aiEnrichments` (`[{icon,value,rawValue}]`, e.g. `rawValue:"hasParking"`), and per chip as `enrichment:"ai"`. They are machine-derived from the prose, so cite the sentence, not the chip.
  - An AI chip can be flatly wrong: #720's "Stellplatz" came from public Bewohnerparken.
  - `energy.features` can carry AI chips too: #665 Heizungsart "Fußbodenheizung".
- **Blocker-adjacent chips:**
  - `{icon:"furnished"}` is the one-field möbliert test (#725). It can be invisible in `innerText` (#661). Same block: `pets-allowed`, `flat-share-possible`.
  - `{icon:"rented", value:"vermietet"}` on a RENT ad (mirrored by `priceComparison.investmentValues[].is_rented:"ja"`) means the flat is occupied until the `frei ab` date. It is not a sale (#765).
- **`Stichworte` is a separate structured line** inside the description (not `Sonstiges`). It carries facts found nowhere else: Anzahl Schlaf-/Badezimmer, Anzahl Balkone/Terrassen, `Balkon-Terrassen-Fläche` (a SUM), `Mindestmietdauer`.
  - #632 had "24 Monate" while the IS24 twins of the same project had no such field. So read the Immowelt Stichworte even when you have the IS24 record, and treat the value as probably project-wide.
  - The sum resolves contradictory chips: on #730 the Balkon and Terrasse chips both showed, but the sum 21,06 was the terrace alone, so there was no balcony.
  - The field can be a typo (#731: 10,52 vs plan 10,25) or copied from a sibling (#789, #828). The floor plan wins when `rooms + outdoor × {0,25|0,50}` does not reproduce the headline area.
- **Keyword sweeps over `innerHTML` are a cross-check only.**
  - On portal-generated fields, a 0 count is trustworthy as "not stated".
  - Lister prose has typos that void full-word greps (#666 "Maissonette"). Sweep truncated stems (`Maison|Maiss`, `Souter`, `Hochpart`) or just read the text.
  - **Split the sweep by token class:**
    - Acronyms (`WBS`, `EA`, `KfW`, `WG`): case-SENSITIVE. On #667 a case-insensitive `WBS` hit CSS class names, which would have fired a phantom hard blocker.
    - Nouns that occur as compound tails (`aufzug`, `küche`, `keller`, `balkon`, `garten`, `heizung`, `stellplatz`, `bad`): lowercase stem, case-INSENSITIVE. On #671, "Personenaufzug" produced 0 hits for `Aufzug`. (#668's "kein Aufzug" was therefore never actually established.)
  - Verify the context of each hit. Nav boilerplate contains `Zwangsversteigerung`, and Ortsbeschreibungen contain `Denkmal` (#398).
  - Add `hausboot|floating|liegeplatz|auf dem wasser|überführung|schwimmend`. #725 was a floating home listed as APARTMENT/RENT: its Ortsteil is only the current berth, the Mietspiegel has no category for it, and its Keller chip is implausible.
- **Positive Keller proof:** a "Grundriss Keller" media caption (#396).
- **Sparse is real:** a Merkmale block with a single entry (#596: only `Bezug`) is a sparse listing, not a failed extraction.

## §Energy
Read `sections.energy` / "Bausubstanz und Energie" first. Four shapes; only shape 3 justifies opening the modal.
1. **Deferred:** "Der Energieausweis wird bei Besichtigung nachgereicht/vorgelegt" (#538; on #632 it was under an `Energiepass` heading in Sonstiges). This is a § 87 GEG omission.
2. **Exempt claim:** "Ein Energieausweis ist für diesen Gebäudetyp nicht notwendig." Tell: `hasScales:true` + the sentence in `certificates[0].scales[0].alternateText`, with no class and no kWh. This is the § 79 Abs. 4 GEG Baudenkmal exemption, and it is **falsifiable**:
   - If `yearOfConstruction` is > 1948, the claim is false. Treat it as a § 87 omission (Low scam signal) and give no EEK bonus in Block D.
   - If the prose also quotes an EEK/kWh, add a Medium "exposé internally inconsistent" signal (#686: Bj 2011, prose "Klasse C / 76 kWh").
   - Only when no Baujahr exists at all: report "claimed, unverified", do NOT fire the Missing-EA signal, and look the building up in the Denkmalliste ([[potsdam-mietspiegel]]) (#539).
3. **Teaser:** a class/value snippet + "Mehr Infos". Open `document.querySelector('[data-testid="cdp-energy-modal-button"]').click()`, wait ~1,5 s, read `[role="dialog"]` for kWh, Ausweistyp, Gültigkeit, Wesentliche Energieträger. With the payload, `energy.certificates` already carries all of it.
4. **Lead-gen prompt:** "Möchtest du Details zum Energieverbrauch? → … anfragen" (`data-testid="cdp-energy-info-not-available"`). The certificate is simply missing, not exempt: a § 87 GEG omission + the Low signal. Common on private and swap ads.
   - Richer variant: `{features:[heatingSystem], hasScales:false}`.
   - Poorer variant: no `energy` object at all (#669). Then there is no Heizungsart anywhere, so do not assume "warm = kalt + NK" is complete.
   - Mietspiegel: use the "kein EA" row where one exists (bis 1948 and 1949–1970 only). For 1971+ cite the whole EEK band ([[potsdam-mietspiegel]]).
- **`sections.documents.files[]` "…Energieausweis….pdf" can be a 300-dpi scan** (#893: `pdftotext` = 5 bytes, `pdfimages -list` one JPEG per page). Render `pdftoppm -r 110 -f 1 -l 1 -png` and Read page 1: Adresse, Anzahl Wohnungen, Baujahr, Anlass (Neubau vs Vermietung), Registriernummer, Gültigkeit. *Why:* a text-only pass reads "PDF empty" and loses the proof of which building it is.
- **`efficiencyClass.index` is not the GEG class.** It indexes Immowelt's own 9-segment kWh bar; derive the class from kWh (#824: index 1 at 86 kWh = class C). `validity` can be nonsense (#824 "bis 08.08.2020" on a 2023 Bedarfsausweis), so flag it.
- **The summary `Energieträger` can be wrong.** On #570 it said Fernwärme, while the prose and the modal said Öl; modal and prose win. Öl vs Fernwärme moves Block D and the CO2/Nachzahlung risk.
- **No `Heiz*` hit anywhere** means Immowelt's "Warmmiete" may be Kalt + NK only. Cross-check the IS24 twin's "Heizkosten in NK: Nein" (#632: 85–120 EUR/month, which decided the Warmmiete cap). A high NK/m² is only weak evidence that heating is included (#665: 3,37 EUR/m²).

## §Price
- **Always re-add the line items; the labels lie:**
  - A HK row with `alt:"nicht in Warmmiete enthalten"` can sit next to a displayed Warm that already equals KM + NK + HK (#783). Trust the arithmetic; don't add HK twice.
  - A lister's newer ads can gain a HK row "in Warmmiete enthalten" that its older ads lacked (#826 vs #732). Report both scenarios rather than switching the whole batch's assumption.
  - A description total can include an optional extra: #726 "Warmmiete 2.002" = 1.922,45 in line items + an 80-EUR Garage. Quote both figures and ask whether the extra is mandatory.
  - Prose and Mietkosten can disagree outright (#533: 2.340 vs "2.400"). Report both; don't average.
  - Price cuts update the header but leave a "Mietkonditionen" block in Sonstiges stale (#310).
  - `sections.price.additional` Kaution can contradict the description (#725: 2.599 vs "3 Nettokaltmieten").
  - On the swap feed, the "Kaltmiete" field and the €/m² derived from it can be the Warmmiete (#865, prose "1.112,45 € warm"). Grep the prose for `warm|kalt` before filling Kalt/Warm.
- **Rental `sections.priceComparison`** is only `{hasMainPrice, isSale:false, pricePerSqm, legalText}`; the percentile panel is Kauf-only (§Kauf-Price). `pricePerSqm` is computed from the lister's `livingSpace`, so a wrong m² produces a wrong €/m² that looks authoritative (#725, #868).
- **`defaultBackToSearch` priceMin/priceMax** is a mechanical ±20 % window around the asking price and carries no information. An earlier note claimed it leaked the lister's own band; that was refuted 2026-08-23 (#664).
- **Provision:** on rentals, `tags.hasBrokerageFee:false` settles the Bestellerprinzip. If tags are absent, run a case-insensitive `provision|courtage` sweep. (On Kauf the tag lies, see §Kauf-Price.)
- **Befristung, Mietlaufzeit and Kaution live in the rental `Sonstiges` tail** ("Mindestmietzeit von 1 Jahr", "auf vier Jahre befristet", #570). There is no structured Befristung field, so regex `befristet` over the prose; the h1 sometimes says it too.
  - Score it with the plain Befristet rule, not the Zwischenmiete cap, and add the § 575 BGB lever: without a stated Befristungsgrund in the contract, the tenancy is unbefristet.
  - Short private exposés can lack Sonstiges/Stichworte entirely; then Mietkosten is the only Kaution source (#538).
- **Availability** is often only an "Einzugsdatum" field in the contact form: Block F 3,0 + ask.

## §Size
- **`hardFacts.livingSpace` is free text.**
  - It can be neither Wohn- nor Gesamtfläche: #725 said 160 while the prose said "220 m² Gesamtfläche, 100 m² Wohnfläche". Grep `Wohnfläche|Gesamtfläche|Nutzfläche` and prefer the labelled Wohnfläche.
  - It can be a 10× typo (#868 "900 m²"): treat the size as UNKNOWN and bracket the Mietspiegel check.
  - On project lettings it can be copied from a sibling unit (#789).
- **`numberOfRooms` rounds to an integer.** The prose is exact (#654: field "3", prose "2,5 Zimmer", straddling min_rooms). Trust the prose and report both.
- **Grundriss reconciliation:** sum the per-room m² and find the outdoor factor that reproduces the headline.
  - #726: 137,62 + 14,60 × 0,5 = 144,92. That is the legal maximum Anrechnungsfaktor, not Flächenschwindel, but the heated-interior €/m² is higher (11,84 vs 11,25).
  - Plans also reveal Dachschräge `1 m/2 m Linie` markers (advertised area = Grundfläche; WoFlV area is lower), second bathrooms, an absent balcony, and an over-stated area (#723: 77 advertised vs 74,84 plan, which also moved the Mietspiegel column edge).
- **`sections.documents.files[]` can hold the Bauträger Grundriss as a text PDF.** `curl -A <UA>` the ci_seal URL + `pdftotext -layout` gives the per-room table + SUMME without any image Read (#781). Check it before downloading plan images.

## §Photos
- **`images.length` is not the real-photo count.** Work in this order:
  1. **Dump `images[].description` + `floorplans[].description` first.** The key is `description`, not `caption` or `title`.
     - On professional listers the captions are reliable: "Außenansicht - Visualisierung", "Digital-Home-Staging", and a " - (KI generiert)" suffix marks virtual staging paired with a real empty-room shot (subtract it; no D cap, no scam signal, #781).
     - Plan filenames identify the unit: `FF26888_…_Haus_1_…_WE_5_…` (#729).
     - `classification` is a GUESS, wrong in both directions. #729: a brick facade was tagged LOGO, a team photo COURTYARD. #728: "LOGO" and "ENERGY_CERTIFICATE" were Vonovia ad banners. #810: a HOUSE_FACADE tile was an ad banner and a YARD tile a stock family photo.
     - At minimum subtract LOGO and GMAP (#637: 62 classified entries vs ~44 real photos).
  2. **Download what the captions leave ambiguous:** every image without a `classification`, blank or "Bild N" captions (swap feed, allkauf), and any gallery ≤ ~8 images.
     - **Tauschwohnung-GmbH feed:** download EVERY image, including a gallery of one. The images carry no classification key (#711).
       - A lone "Bild 1" can be the Grundriss (#724 "WE 65.01", #779 "Wohnung 13") = 0 real photos, D cap 3,0.
       - It can also be a watermarked stock placeholder (#778; tell: "Fotos gern auf Anfrage") = 0 real photos, D cap, but no scam signal.
     - **`hasFloorPlan:false` + `floorplans:[]` can both lie:** #722 both images were plans; #728 (Vonovia) Bild 4 was the Grundriss with unit id and Loggia anrechnung. But the flags can also be true (#727: 15 real photos). Don't pre-conclude either way.
     - **Plan position is random.** #726 had it at Bild 3, not last.
     - **A populated `floorplans[]` can be Musterwohnung-only** while the unit plan sits in `images`. The Brauhausberg lister flipped per ad (images-tail on #731/#732/#784/#791/#830, `floorplans[0]` on #785–#790/#792/#793/#826–#829/#831/#832). Sweep BOTH arrays for `FF\d+|WE_\d+|Wohnung_\d+` (#830 used `Wohnung_15`).
- **Download recipe:**
  - `curl -s --http1.1 -A <Chrome UA> -H 'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8' -o N.bin "<images[].url verbatim>"`. Keep a `ci_seal` param if present; some payloads have none and work as-is.
  - Then `file` each download and branch on the BYTES, never the URL suffix: `.webp` URLs have served JPEG (#721) and `.png` URLs genuine WebP (#725). JPEG → `cp` to `.jpg`; RIFF/VP8 → `dwebp`.
  - A plain curl can exit 92/52 on some URLs of the same gallery (#722).
  - Shell traps:
    - A URL list without a trailing newline makes `while read` drop the last URL (#727).
    - zsh aborts the whole command on an unmatched glob (#777), so glob only the extensions present.
    - Check that `ls | wc -l` equals `images.length`.
  - Keep images in your own `tmp/eval/{NNN}/imgs/`: a shared dir once held stale foreign files (#796).
  - Build `convert … +append/-append -resize 1800x contact.png` and Read it once. One contact sheet answers Zustand, Bad, Balkon, Keller, Baualter and street signs.
- **Amenity probe:** an all-interior classification histogram with no outdoor frame means "Balkon not evidenced", never "confirmed absent" (and it is unavailable on the swap feed).
- **Musterwohnung/archive galleries:** three tells together mean D is capped at 3,0 despite real photos (#513). Quote the disclaimer.
  - Sonstiges says "Bei den Bildern handelt es sich ggf. um Beispiel- und/oder Archivfotos".
  - The Referenznummer is a type string (`EPS San 3-Zi 68m²`).
  - Stichworte says "frei werdend".
- **Partial digital-staging disclaimer** at the end of the description ("…digital gestaltet … dienen als Inspiration"): no full cap. Dock ~0,25 and name the unverifiable features (#396: the staged part was the garden).
- **Without the payload (CiC):**
  - Count from the `1 / N` / "Alle N Bilder ansehen" counter, unique `mms.immowelt.de/…` URLs (dedupe the URL-encoded hero duplicate), or `/Bild \d+/g`. The counter and the payload fail independently (#538 vs #513), so try both.
  - DOM `<img>` often holds only `/shared/images/` placeholders. An aggregator's `og:image` proves a gallery exists (#331).
  - Loose classification regex: `/classification[^A-Za-z]{0,12}name[^A-Za-z]{0,8}([A-Z_]+)/g` with a null-guarded `.map`.

## §Location
- **Resolution order (promoted to evaluate.md):** prose (landmarks, transit lines, named streets) → `zipCode` → street signs / shop names legible in the gallery (#763) → nothing else.
- **`district` lies:**
  - On swap feeds, `district:"Grunewald"` + `og:title:"Westend"` is a fallback pair meaning "location unknown". Seen on 6 flats (#655–#658, #683, #696). On #696 `city` lied too: a Siemensstadt (Spandau) flat was labelled Charlottenburg-Wilmersdorf. `zipCode` survives only at Bezirk level, and a repeated zipCode does not make the pair trustworthy. The Tauschwohnung-GmbH feed can be off by a neighbouring PLZ too: #902 `district:"Westend"` + `zipCode:"10825"`, prose "Crellekiez, Nähe U Kleistpark / S Julius-Leber-Brücke" (= 10827). The prose decides Kiez and PLZ. *Why:* the PLZ feeds the Address header and the Wohnlage lookup, and a neighbouring PLZ looks authoritative.
  - Potsdam: "Kirchsteigfeld" for an Am-Stern flat (#662). The PLZ 14480 is shared, but the Mietspiegel field differs by ~1,6×, so a matching `zipCode` clears the search group, never the Ortsteil.
  - Potsdam: "Bornstedt" for Eiche (#672).
  - Potsdam: "Fahrland" for a Golm flat (#903; PLZ 14476 is shared by Golm/Fahrland/Marquardt). The prose said "Potsdam, Golm" and a hand-drawn Grundriss in the gallery named "Geiselbergstraße". *Why:* Fahrland is Block B ~3,5 (bus only), Golm 4,7, ~0,25 on the total.
  - Potsdam: the Wohnbau-GmbH Quartier Pappelallee/Voltaireweg is systematically tagged "Bornstedt", while the IS24 mobile API says `jägervorstadt` (#584, #700). If an IS24 twin exists, take `geo_ot`/`obj_regio4` from it.
  - `city` can fail by a same-name Ortsteil collision: #763 "Paaren" was resolved to Potsdam's Uetz-Paaren; the plot is in Paaren im Glien (Havelland, 14621, ~19 km out).
- **The lister can disown the address:** grep `Adresse stimmt|stimmt nicht ganz|nicht die genaue Adresse` before writing "PLZ verified" (#654).
- **`geometry` is the Ortsteil MultiPolygon, not a point** when `isAddressPublished:false`. It is derived from the same geo id as `district`.
  - It is only useful when `district` is merely imprecise. Run point-in-polygon with REAL Nominatim centroids (`nominatim.openstreetmap.org/search?q={Ortsteil}, Potsdam&format=json&limit=1`, ~1 s apart, real UA) and iterate ALL rings (discontiguous parts are normal, #673).
  - Hand-estimated centroids produced a confident false positive (#673).
  - It adjudicated Eiche vs Bornstedt (#672), and on a dupe it corroborated Waldstadt I against an earlier report's guess (#673).
  - It CONFIRMS the error when `district` is the fallback pair (#696) or the city is wrong (#763), and it cannot resolve a Teillage (#719).
- **A named historic building in the prose** gives the address, Baujahr and Sanierung in one WebSearch (#521: Brockessches Palais → Yorckstr. 19/20, 1776, vollsaniert 2016).

## §Identity — dedup
- `Online-ID` is Immowelt-internal; it only dedups Immowelt against Immowelt.
- **Commercial listings:** `Referenznummer` is the lister's own Objekt-Nr., byte-identical across portals. It is the cheapest cross-portal key (#661 matched the IS24 Objekt-Nr. of #511).
  - A ref of ≤ ~4 characters is a row counter and useless (#687 "261").
  - Project lettings use `H{Haus}-{Etage}-{WE}`. Dedup on the full ref, never on plan, price or m²: stacked units share a plan, and mirror units have identical m².
  - Read each unit's chips and plan on its own, because chips vary per unit (#786 had no Keller chip where its siblings did).
- **Swap feeds:** the Referenznummer is the syndicator's id. Dedup rules are in [[tauschwohnung]] §Dedup.
- An identical Kalt + NK pair is no dupe signal (#665/#666: both 1.300 + 350, different flats).
- **Aggregator resurfacing:** diff Online-ID + hardFacts + Kaution + photo count. All equal means a DUPE of the existing report, not a re-listing.
- **Ad age:** use `metadata.creationDate`/`updateDate`. Never use `isNew` or the "Neu" badge: they track `updateDate` and flip back to true on any edit (#667: four months online, "Neu"). Long unmatched time is a Block F/H signal (#666: six months).
  - **Exception — slot-recycling Verwalter:** RBB Immobilien-Verwaltungs-GmbH re-uses one ad slot per flat type for successive re-lettings (#871: `creationDate` 2020-09-29, `updateDate` = scan day). Recognise it by the type-string Referenznummer `EPS San {Zi}-Zi {m²}` / `EPS San {m²}` (EPS = Erich-Pommer-Straße, Drewitz); it always comes with the §Photos archive disclaimer + "frei werdend" → D cap 3,0 (#513, #871). The old creationDate is then NOT "unlettable for years" in F/H.
- **"Privater Anbieter" + a GmbH signature in the prose** is a small Hausverwaltung on a private account, not a scam (#539: T&B Grundbesitz, HRB-verified). Resolve it with a Handelsregister search. The Eigentümer is then private, so Eigenbedarf risk stays Medium.

## §SwapFeed — Immowelt field quirks of the two swap syndicators
- **Tell:** h1 "… • Tauschwohnung" / `hardFacts.titleAdditions:["Tauschwohnung"]`. Identify the provider from "Über den Anbieter":
  - **Tauschwohnung GmbH** (c/o THE 9TH Bonn, Herr John Weinert):
    - The prose opens "Es handelt es sich hierbei um ein Tauschangebot. (Anbieter-ID: N)", and the Referenznummer is that N.
    - It ends with the "Diese Anzeige wurde von einem Nutzer eingestellt … tauschwohnung.com stellt nur die Plattform bereit" boilerplate. `classified.title` holds the description, and `documents.files` is `[]`.
    - Completeness varies per ad: sparse (no Merkmale, Kalt + Kaution only, #521), rich (10 Merkmale, NK, Stichworte, 19 photos, #533), middling (#655), or complete Merkmale with a single photo (#657). Always read Merkmale + Mietkosten before writing "unknown".
    - The Merkmale block and the photo count fail independently (#657: Block E 4,5 alongside a D cap at 3,0).
  - **Wohnungsswap.de** (Beedstraße 54, Düsseldorf, Herr Tobias Jonnarth, never a phone):
    - The headline `Wohnungsswap - {Straße}` is real street data (#660).
    - The body is the tenant's first-person prose, and a 7-digit Referenznummer is used. A closing "Wichtig — … bei Wohnungsswap als Tauschobjekt angeboten … im Gegenzug …" paragraph is boilerplate.
    - The prose beats the structured fields: #654 had 1 chip, while the prose confirmed Balkon, Keller, Sanierung and Fernwärme. A classification payload can be present (#660).
- **Neither feed routes to its source.** There is no twg.click link, and `tauschwohnung.com/wohnung/{Anbieter-ID}` is a 404 or soft-404. The free text is the only side-2 input.
- **Typically absent:** EA (lead-gen shape), Baujahr, Kaution ("keine Angabe"), availability date, exact address. The missing Baujahr decides between the § 556f exemption and a large overshoot, so report both Mietspiegel fields (#533).
- **"[Leider aktuell kein Pro, kann also nicht kontaktieren]"** means the tenant has no paid account and cannot initiate contact. It is a channel dead-end (Block H / Next Steps), not a scam signal (#655).

## §Kauf-Price
- **`Preisdetails` / `sections.price` is a ready-made Block A:** Kaufpreis, €/m², `Provision für Käufer`, the itemized Kaufnebenkosten and "Geschätzte Gesamtkosten".
  - **Count `price.breakdown.groups[].items`.** Fewer than the usual four (Notar 1,5 % · GrESt · Provision · Grundbuch 0,5 %) means the total is broken; recompute by hand.
    - #809 itemized only "Provision für Käufer (19 %)": that is the MwSt rate printed as the commission. The real `commissionFee` was 3,3 % + MwSt = 3,927 %, so the portal total was wrong in both directions.
    - The degradation is not chronic: #810 the next day carried all four items correctly. Don't discard Immowelt's total pre-emptively.
  - The GrESt line uses the state rate (Brandenburg 6,5 %). Check that it matches the property's state.
- **`tags.hasBrokerageFee:false` is NOT proof of "provisionsfrei".**
  - Read `price.base.commissionFee` and the breakdown's `BROKERAGE_FEE` item verbatim: rate, when it is due, and whether a same-rate seller contract exists (= § 656c split). Examples: #396 clean 2,38 %; #384's IS24 twin bound the Maklervertrag to the mere Exposé-Abruf at 3,57 %.
  - #833: tag `false`, but 3,57 % in commissionFee = 19.599 EUR.
  - On Bauträger/Fertighaus ads (#798, #810) the printed 3,57 % is Immowelt's boilerplate assumption. Report it as unconfirmed and make §§ 656c/d BGB a contact question.
  - A Bauunternehmen selling its own land: ask whether the "Provision" is really Kaufpreis (then grunderwerbsteuerpflichtig) and whether a Bauverpflichtung makes it an einheitliches Vertragswerk (#809).
- **The header €/m² is Kaufpreis ÷ Wohnfläche only.** If the prose names a larger Wohn- + Nutzfläche (e.g. a fully finished Keller), compute the effective €/m² too (#398: 30 % over the €/m² cap on the header figure, ~35 % under on the real one). Total cost, not sticker price, goes against the budget cap.
- **`sections.priceComparison`** = `{data:{value, accuracy 1–5, low, high}, markerPosition, pricePerSqm}`.
  - Quote `value` + `markerPosition` (the percentile of the offer). The `low`–`high` band is enormous (#687: 1.773–6.313 in one Ortsteil).
  - These are AVIV Angebotspreise, so treat the verdict as weak evidence and corroborate with ONE WebSearch anchor.
  - The `innerText` version "Preise in der Region" shows the band even on "Preis auf Anfrage" (#396 corroborated a BORIS-based floor). There `hasMainPrice:false` + `markerPosition:null` prove the missing price is real, and `value` is the regional mean, not this object's (#697).
- **"Preis auf Anfrage":**
  - `sections.mortgage.price` is a DUMMY feeding the "ab 4 € mtl. finanzieren" widget (#697: 1041). Never report it as the Kaufpreis.
  - The four fields that settle it: `hardFacts.price`, `price.base.main.value`, `priceComparison.hasMainPrice`, the visible Preisdetails.
  - **Recover the price from the IS24 Ortsteil results page** on the same stealth driver: `immobilienscout24.de/Suche/de/brandenburg/potsdam/{regio}/{ortsteil}/grundstueck-kaufen` with a plain `{title, innerText}` eval, `blocked=false`, ~60 s. #762 got "650.000 € · 832 m²" + the sibling half-plot + 9 local comps from one call. Do this before any WebSearch.
  - **Never take a price from WebSearch answer text.** #762 got two confident, fabricated prices (750k and 720k). Use only the result URLs.

## §Kauf-Identity
- **Bestand vs Neubau:** `metadata.isNewBuildProject` + `rawData.distributionSubType.buy` ("RESALE") + `propertySubType` + `energy.yearOfConstruction`. #687 refuted a suspected ScanHaus re-list in one line (115 m² / ~420k collides constantly). But on Typenhaus ads every one of these fields can lie (§Kauf-BuildOffers).
- **Portfolio sellers with baugleiche houses** (THE GROUNDS "FAHRLAND HOMES", Ref `14476-xx`): identical Baujahr/m²/rooms/EA is NOT a re-list (#796 vs #394, both live).
  - Discriminate by `sections.key` Referenznummer (= IS24 `obj_objectnumber`), `plotSpace` (= `obj_lotArea`), the EA PDF's address + Registriernummer (`pdftotext`), and IS24 `obj_rented`.
  - A Grundriss image header can name another unit's type plan (#796: three different unit ids on one ad), so never use it as the address.
  - Fast cross-check: IS24 Ortsteil search on the driver → `indexOf(title)` for the expose id → mobile API for both ids.
- **Kauf Merkmale state negatives explicitly** ("Kein Keller", #397), unlike rentals.

## §Kauf-Plots
- **Plot exposés have a shorter `sections` set:** no `energy`, no floorplans. Null-guard both, or the miner crashes and reads like a broken parse (#762).
- **Erschließung chips in `features.preview`:** `site-development-state` ("voll erschlossen"), `development-infrastructure` ("Strom, Gas, Telekommunikation, Wasser"), `with-view`, `plotSpace`, `availability`. They are the Block-D input when present.
  - They are OPTIONAL: #809 and #763 had only `plotSpace` (+ `availability`). A prose "voll erschlossen" then has zero structured backing: score it as claimed-but-unverified and put § 133 Abs. 3 BauGB (beitragsfrei?) in Next Steps.
  - Photos are the better evidence. #763 showed asphalt road, kerb, street lights and Hausanschlusskästen at the plot boundary, which rules out Stufe 3 (full Erschließungsbeitrag open).
- **Never shipped:** Flurstück, Lageplan, Katasterauszug. They go in Next Steps. A sweep of `Bebauungsplan|B-Plan|§ 34|Innenbereich|Bauvoranfrage|Baugenehmigung|Flurstück` with 0 hits puts Baurecht on the bottom rung of the `_shared.md` ladder (#809).
- **A `HOUSE_FACADE` image on an unbebautes plot** shows a neighbour or reference house (#809).
- **Location:** out-of-area plots enter via a `city` collision (#763), see §Location. Street signs in the photos can settle it.

## §Kauf-BuildOffers — Fertighaus / Typenhaus / "projektiert"
Build offers are not existing properties; detect them before scoring.
- **Classic tells (#514, allkauf):** `Zustand: Projektiert`, "projektiert geplante …", `Provision für Käufer: Auf dem Grundstück möglich`, no EA (legitimate pre-completion), a bogus `modernisiert: {current year}`, Haustyp media (facade + Musterhaus + type plans), and a Referenznummer with the calendar week (`…-kw30-…` = a weekly-rotating ad, so the named plot is indicative only).
- **Every structured field can claim existing stock** (#697 Mein Haus GmbH: "In bewohnbarem Zustand", RESALE, VILLA, `isNewBuildProject:false`, "frei ab sofort"). The tells that did work, cheapest first:
  1. `price.base.commissionFee` text: "Grundstücke … nicht im Preis enthalten … Provision … auf den Grundstückspreis". Plot excluded + commission on the plot only = build offer. It also works off the search page.
  2. A floorplan filename naming the Haustyp and an area ≠ `livingSpace` (`Bauhaus - 393 m² …` vs 347 advertised).
  3. Renders + a LOGO tile (0 real photos, but no D cap: the Neubau exception applies).
  4. Prose selling a service: Grundstücksservice, Grundrissplanung, a named Bausatz.
  5. A Referenznummer that is the creation date (`15052026`).
- **Plot priced in notionally (#798, allkauf "Pure Home 1"):** `hardFacts.locationDescription` says "Kalkulatorischer Grundstücksanteil: 300.000 EUR … Das Grundstück wird separat vom Eigentümer erworben". Subtract it for the house share, and don't add a plot on top (double-count). `energy.features` `Zustand: Projektiert` + `Haustyp: KfW 40` were reliable here.
- **Silent about the plot (#810, the commonest case):**
  - Run the **Erschöpfungstest**: a "Zu allen Häusern gehört" list enumerating items down to Steckdosen, with no Baugrundstück/Bodenplatte/Erschließung/Außenanlagen/Küche, means house-only.
  - Run the **band test**: the allkauf house-ONLY band is **3.013–3.953 €/m²** (#422 3.013 · #709 3.246 · #514 3.155 · #367 3.586 · #419 3.921 · #377 3.953; #810 3.618 sat mid-band). Keep it updated; it is the only quantitative handle when the text is silent.
- **Scoring:**
  - All-in ≈ headline +20–30 % (Bodenplatte/Keller, Erschließung, Hausanschlüsse, Baugenehmigung, Außenanlagen, Küche, Ausbauhaus Eigenleistung). Check that against the cap, not "Geschätzte Gesamtkosten".
  - Flag the einheitliches-Vertragswerk GrESt question.
  - If the plot is excluded, the `garten` must-have is not delivered (E 2,0) and Block B is nominal (a marketing catchment, not an address).
  - No D cap for renders (the `_shared.md` Neubau exception).
- **Galleries (allkauf):** captions are bare "Bild N" and classification lies, so download. #810 had 0 real object photos (2 banners, 1 stock photo, 8 renders), and the renders showed a carport, terrace, fence and garden that are in no Leistungsposition.
- **Sum the catalogue floorplans before scoring C.** #810: EG + OG = 146,26 vs 146,04 advertised, no Dachschräge, so the €/m² is honest. #798: the OG Dachschräge cut ~7 m².

## §Kauf-ZV — Zwangsversteigerung
- **Positive tests.** Any one of these means a real ZV (all three were present on #508); none means the nav boilerplate is a false positive:
  1. `document.title` contains "Zwangsversteigerungen".
  2. A Merkmal chip named `Zwangsversteigerung`.
  3. A `Zwangsversteigerung` label under the Kaufpreis in Preisdetails + a "Versteigerung / Verkehrswert: {x}" line in Sonstiges.
- **The headline is the Verkehrswert, not a Kaufpreis.** Don't write it into the tracker's price column. The ZVG rules (5/10 and 7/10 floors, § 56 S. 3 no warranty, no Besichtigungsrecht, 10 % Sicherheitsleistung, Abt.-II rights) are in [[zwangsversteigerung-de]]. "Provisionsfrei, keine Makler-/Notarkosten" saves only ~1 % against a provisionsfreien freihändigen Kauf.
- **Anbieter Argetra GmbH (Ratingen, 02102-711 711) is a ZV data publisher, not the seller.** It paywalls Termin/Amtsgericht/Aktenzeichen; the data is free on zvg-portal.de. Its "BITTE … TELEFONNUMMER ANGEBEN" opener is lead capture: score it in Block H, not as a scam signal.
