# Kleinanzeigen (kleinanzeigen.de) — listing-page quirks
Portal match: kleinanzeigen.de `/s-anzeige/{slug}/{adId}-{cat}-{loc}` (rentals cat 203, Kauf cat 208, swaps). Swap side 2 (reading the partner's Suche, kill axes) lives in [[tauschwohnung]]; this file keeps the Kleinanzeigen field quirks only.

Consolidated 2026-09-28 from a 91 KB append log. Listing numbers stay only as the example behind a rule. Sections: §Access · §Scope · §Price · §Amenities · §Photos · §Location · §Poster · §Expired · §TypeTraps · §Swaps · §Kauf · §Triage.

## §Access — fetch + identity
- **Detail pages are plain-curl accessible:** `curl -A "Mozilla/5.0 … Firefox"` returns the full 200 HTML. Only SEARCH pages bot-block. Prefer curl for single-listing evals; no browser needed (so it is fine under `Parallel: yes`).
- **Field anchors:** title `#viewad-title` · price `#viewad-price` · `#viewad-locality` · `#viewad-details` (= `ul.addetailslist`, first list = specs, second list = money + boolean amenities) · description `#viewad-description-text` · seller `#viewad-contact` · posting date + view counter `#viewad-extra-info` · gallery before the title.
- **The cookie overlay** ("Alle akzeptieren") does not block anything. Don't click it.
- **After every fetch, check the served ad id** (`<link rel="canonical">` / `og:url` / `"adid"`) against the requested one; on a mismatch, re-fetch. The 2026-09-23 "Kleinanzeigen served a different/hybrid ad" reports (#812, #821–#823) were parallel evaluators overwriting a shared scratch file, not the portal (a 9/9 clean re-probe). The fix is isolation in `tmp/eval/{NNN}/`; the id check is the safety net.

## §Scope — the page embeds ~10 FOREIGN ads in full
Doctrine (own-text-only sweep, ad-ID contamination count) is in `modes/evaluate.md` → Browser & portal quirks. Implementation details and cases:
- **The sidebar ("Das könnte dich auch interessieren") ships each recommended ad as JSON-LD** with its whole `description` and a `contentUrl` image. Page-wide greps therefore read strangers' flats and manufacture hard blockers and amenities.
  - #804: `WBS erforderlich` + `vollständig möbliert` both belonged to other ads.
  - #807: an unscoped sweep said `befristet 12 · möbliert 6 · WBS 3 · Balkon 14` for an ad whose own text had none.
  - #522: "Tauschangebot"/"TAUSCHWOHNUNG" hits on a plain rental.
  - #580: 10 "befristet" hits from one Teltow sidebar ad.
- **Scope every keyword sweep to `title + #viewad-description-text + the ul.addetailslist blocks`** (~2–3 KB).
  - If you slice by offset: `ti = html.find('id="viewad-title"')`, own-ad region = `html[ti : html.find('interessieren')]`.
  - The "everything before the title" form is WRONG on a 0-image ad. Normally the description is repeated once per gallery image before the title (14 photos → 14 copies, #599: never read a hit COUNT as emphasis). With no gallery the only copy sits after the title (#607), so the pre-title filter reported "WBS: 0" on "Die Wohnung ist keine WBS Wohnung".
  - Print the offsets of `viewad-title`, `viewad-description-text` and `interessieren` once per page.
- **Contamination check = the AD-ID count.** `grep -o '/s-anzeige/[^"]*/[0-9]\{10\}-' | sed 's/.*\///' | sort -u | wc -l`: 1 = clean, >1 = foreign ads embedded.
  - Contamination varies per page (#811: clean; #804–#807: heavy), so run the check, never assume.
  - `grep "Anbieter-ID:"` fails open (#811: 0 matches with the seller block present).
  - The seller id is `profileUserId = "…"` or the `s-bestandsliste.html?userId=` link.

## §Price — reading heading / Nebenkosten / Warmmiete
The 7-step order is doctrine in `modes/evaluate.md` → Browser & portal quirks; the regexes and cases below are the working detail.
The form labels the headline field "Preis" = Kaltmiete, with NK / Heizkosten / Warmmiete / Kaution as optional fields. Posters misuse it constantly. **Order of operations** (stop at the first test that decides):
1. **A self-declaring sentence or bullet in the description.** Grep `setzt sich .{0,40}zusammen|Nettokaltmiete|zzgl\.|Betriebskosten-?vorauszahlung|Nebenkostenvorauszahlung|angegebene[nr]? Preis|Preis ist|Miete ist|alles inklusive|warm pro Monat|inkl\. NK|Die (Warm)?miete beträgt|Warmmiete\s*:|Kaltmiete\s*:`.
   - #642 "1250 Nettokaltmiete, 300 NK-Vorauszahlungen + 110 TG-Stellplatz" settled a heading == Warmmiete coin flip (naive 22,13 → real 16,70 EUR/m²).
   - #575 "Der angegebene Preis ist die aktuelle Warmmiete".
   - #580 an Eckdaten bullet "* Warmmiete: 1.442,67 €" (cents beat the rounded heading).
   - A self-label can still be wrong: test it against the local NK anchor (#806: "Die Warmmiete beträgt 702 €" on 89,5 m² would leave 2,55–2,94 EUR/m² kalt, implausible; the Kalt reading fits a 90s Altvertrag). Present both readings.
2. **Kaution ÷ 3 = NKM.** Also test the reverse for impossibility (a 2,27–2,46 NKM reading is a number nobody computes).
   - The quotient may carry cents (#694: 4.276 ÷ 3 = 1.425,33).
   - It decided #767 (1.400 heading == Warm, NK 250, Kaution 3.450 = 3,00 × 1.150) and #853 (NK + Heiz filled, no Warm field: 2.850 ÷ 3 + 400 NK = heading ⇒ heading = Kalt + NK).
   - A small remainder is a Stellplatz inside the rent (#813: 1.594 − 300 = 1.294 vs Kaution ÷ 3 = 1.254 → 40 EUR Stellplatz). Compute EUR/m² from the Kaution quotient.
   - On a fully priced ad a mismatch is a copied-text detector: #715 "Kaution 2.550 (3 Nettokaltmieten)" with kalt 950 (3 × 950 = 2.850). Report it as an inconsistency; the amount itself (2,68 NKM) is legal.
3. **Stated minimum household income ÷ 3 ≈ Warmmiete** (#694: 5.600 vs heading 1.885 × 3 = 5.655). Grep `Haushaltseinkommen|Nettoeinkommen|mind\..{0,20}€`.
4. **A sibling ad of the same poster in the same building** (via the `s-bestandsliste` curl): the reading under which a sibling's Kaution would exceed 3 NKM is wrong (#774).
5. **The Vermieter name + exact address → one WebSearch** `"{Straße}" {Stadt} {Vermieter} Neubau`: it gives the Baujahr AND the plausible rent level (#607 ProPotsdam: 1.200 as Kalt impossible for a kommunale Gesellschaft, as Warm = Mietspiegel-Mittelwert).
6. **A Betriebskosten anchor from an evaluated flat in the same quarter** when Warmmiete is the ONLY money field and there is no Kaution (#803, Brunnen Viertel 3,47 EUR/m²; otherwise a generic 3,00–4,00 band). Label the result "abgeleitet", give the range, and check that the Mietspiegel verdict holds across it. Never compare a Warmmiete with a Kaltmiete band.
7. **Only then the conservative default:** heading = Kaltmiete. Show a two-row table (heading as Kalt vs as Warm), rank the readings when the arithmetic allows (#540: the Kalt reading implied 26,6 EUR/m² warm, impossible in Potsdam), check whether both readings clear the profile caps (if yes, the ambiguity costs only a contact question, #718), and put "Kalt/Warm klären" first in Next Steps.

Shapes to recognise:
- **heading == `Warmmiete`:**
  - NK empty (#356): step 7.
  - NK filled, no Heiz (#540, #767): steps 1–2.
  - NK + separate `Heizkosten` filled (#522): Warm = Kalt + NK + **Heiz**; forgetting Heizkosten understates warm by a whole line.
- **Three fields that don't add up** (#520: 1.300 + 450 ≠ 1.717): report the stated and the derived NK, "NK klären".
- **Stated Warm LOWER than the heading** (#718: 1.350 / NK 250 / Warm 1.300): internally impossible. Take the form semantics (heading = Kalt) and discard the Warm field in the table.
- **heading ≠ Warm, no NK field, prose names the total** (#593): heading = Kalt, NK derived.
  - Watch "inkl. Stellplatz": a Stellplatz is not Wohnraummiete, so the true Wohnungs-Kaltmiete (and €/m², Mietspiegel) is lower.
  - Watch "muss mit gemietet werden" = an unavoidable cost (a Block-A con).
  - #642 had three price levels (kalt 1.250 · Wohnraum-warm 1.550 · Gesamt 1.660).
- **"Zu verschenken" on a rental** (#594): the price field is empty (`<meta itemprop="price" content="">`) and the h1 `data-soldlabel="Verschenkt"`. Neither means giveaway or sold. Kalt = Kaution ÷ 3 (#594: 2.625 → 875; warm 1.085 → NK 210). Say "derived".
- **Per-ROOM heading on a WG/room share** with the whole flat's m² in the spec list (#547/#595): 650 € = one bedroom, and the flat is 1.250 warm = 15,43 EUR/m², not 8. Before firing the ">20 % below Mietspiegel" signal on any ad mentioning WG/Zimmer/Mitbewohner, divide the per-room SUM by the m².
- **"Kaution / Genoss.-Anteile"** = refundable cooperative shares, not a deposit and not an advance-fee scam; the low rent is the coop structure.
- **Tenant's Nachmieter ad:** the stated rent is the BESTANDSMIETE. The landlord signs a new contract and may reprice; under § 556f there is no ceiling at all. Quantify it in Block A (#803: up to +124 EUR/month).
- **Ablöse:** it is often not called "Ablöse" (#540 "Abschlagszahlung 1.500 €"). Grep `Ablös|Abschlag|Abstand|übernehmen|Übernahme`.
  - When it covers tenant-owned equipment, the landlord channel removes both the payment and the appliances.
  - No Ablöse on a Nachmieter ad is a real plus worth stating (#803).
  - Private Nachmieter ads: the heading is often Warm, NK/Kaution/Baujahr/EA/Adresse are usually absent, and Zimmer can run half a room high (HWR counted). Look for the landlord-channel twin (Semmelhaack / Hausverwaltung / IS24) by exact Warm + m² + Etage (#521 = #516).
- **The spec list rounds m² that the prose states exactly** (#806: 89 vs 89,5). Take the prose; at a Mietspiegel column edge the half metre decides.

## §Amenities
- **Boolean amenities are bare labels without values** in the second `ul.addetailslist` (`Terrasse · Einbauküche · Badewanne · Fußbodenheizung · Altbau · Neubau · Haustiere erlaubt`, #652). A label→value parser drops them. `Altbau` + `Neubau` together = Erstbezug nach Sanierung, so neither alone gives a Baujahr.
- **That list can be ENTIRELY absent while the flags exist in the ad-targeting JSON** (#716: Terrasse/Badewanne/Altbau/Haustiere/WG_geeignet only there). Check the JSON before declaring a must-have unbelegt. A flag found ONLY there counts as met-but-unconfirmed ("per Ad-Attribut, bei Kontakt verifizieren"). Absence from both = missing.
- **The ad-targeting JSON** (`%ENCODED_BIDDER_CUSTOM_PARAMS%` / `%DFP_TARGETS%`) gives flat keys: `ExactPreis`, `Nebenkosten`, `Warmmiete`, `Kaution_/_Genoss._Anteile`, `Zimmer`, `Schlafzimmer`, `Badezimmer`, `Etage`, `Wohnungstyp`, `Tauschangebot`, `Verkaeufer`, amenity booleans, `Verfuegbar_ab_Monat/_Jahr`, `posterid`.
  - ⚠ `Preis` and `Wohnflaeche` there are BUCKETS: `Wohnflaeche:"160"` for 83 m² (#652) and 90 m² (#767); `Preis:"1500"` vs `ExactPreis:"1400"`. Take m² from the spec list/prose and price from `ExactPreis`/the heading. Use the JSON only for booleans + `posterid`/`Verkaeufer`/`Tauschangebot`.
  - `WG_geeignet:true` = suitable for a WG, not "is a WG".
- **"Neubau" is a poster-ticked box with no year.** It contradicts the stock regularly (#522: Neubau in a Waldstadt Plattenbau area). Never let it set the Baualtersklasse; run both fields and say the verdict hinges on the unstated Baujahr (#522: 5,82 vs 15,72 EUR/m²).
- **Zero checktags** (`li.checktag*` empty, #594): the must-haves are undecidable from structure, so download and Read the gallery. On #594 the photos gave a Balkon, a Whg.-Nr. and an unadvertised EBK.
- **The Zimmer count contradicts the room-by-room prose** (#606: `Zimmer 3` = 2 Zi + Wohnküche). Diff against `Wohnküche|Abstellkammer|Kammer|Diele|halbes Zimmer` before scoring Block C against `min_rooms`. Tenant-entered spec lists also self-contradict elsewhere ("Etage 3" + "Erdgeschosswohnung"): report both.

## §Photos
- **Count unique image UUIDs in the pre-title slice, not `data-imgsrc` attributes:** `len(set(re.findall(r'prod-ads/images/[0-9a-f]{2}/([0-9a-f\-]{36})', html[:html.find('id="viewad-title"')])))`.
  - It is immune to the `?rule=$_57/$_59` duplication (a raw count is 2×, #505) and to the sidebar JSON-LD `ImageObject`s (#608 read 11 for a 1-photo ad).
  - Some galleries render only as CSS `background-image` in `div.galleryimage-large--cover`, where a `data-imgsrc` grep returns 0 for 17 real photos (#653). A false zero invents a defect.
- **Download:** `curl ".../{pp}/{uuid}?rule=\$_57.JPG"`; real phone photos are 60–120 KB. The URL-list trailing-newline trap applies (`while read` drops the last URL): compare the file count with the UUID count.
- **Find the Grundriss without Reading everything:** run `file -b` over the downloads. Phone photos are uniform (900×1600 portrait or 4:3), while a scan/plan has an odd ratio (#642 873×978, image 4 of 14). Read the odd one first.
  - It gave the unit id "Haus I – WE 8", the exact 74,84 m², three real rooms, the Balkon anrechnung, a HWR and the orientation.
  - The Grundriss is often last (#609: 7 of 8; that plan revealed a Galerie as the "3rd room", Balkon AND Terrasse, "WE 13"). Read the whole gallery.
- **"1 image" is often ZERO real photos** (D cap 3,0), but mine the image anyway:
  - a watermarked Grundriss (#804) that settled Balkon-vs-Terrasse and the separateness of the rooms
  - a phone shot of an old Bauzeichnung (#718): the Baualter ≤1948 (sets the Mietspiegel row), no Balkon, and a 4-vs-3 room contradiction. Don't credit drawn fixtures as current.
  - a Heizlastberechnung printout (#822): the `EG-` room prefix is a software default; sum the rooms to check m². Heated rooms only, so no balcony can be inferred. A weak § 556f hint, never a Baujahr.
  - an AI promo collage with "KI-generiert" printed INSIDE the image (#850): labelled, not a scam.
- **0 images** happens on ordinary private ads too: D cap 3,0.
- **Provenance tests** (the CDN preserves the uploader's aspect ratio across rules, #715; Kleinanzeigen strips EXIF from every upload, so missing EXIF means nothing):
  - Camera-native ratios (4:3, 3:2, 16:9, 900×1600) = ordinary photos.
  - One odd ratio among native ones = the Grundriss.
  - EVERY image at the same non-native ratio (#715: all 1280×943) = one export pipeline, i.e. Exposé or viewer material. Fire the Medium "re-used marketing material" signal as a stated suspicion, with no D cap.
  - Baked-in app chrome ("12 Fotos" overlay badge, greyed UI text) + black side bars = phone screenshots of another listing (#594). Medium signal, Block H ~2,5, "who is letting and whose Exposé?" first. The photos still show one property, so no D cap.
  - Letterboxed screenshots WITHOUT chrome, mixed with native shots of the same rooms = a tenant re-uploading from a messenger (#682). No signal.
  - Building-age tells in the photos that contradict the address's known Baujahr prove "photos from a different property" (#775: Gründerzeit interiors for a Vonovia 1995 address; see §Poster).
  - A self-built mini-Exposé (screenshots with white margins + German room captions, #609) is not foreign material.
- **Use the photos to date the building when the Baujahr is absent** (#609: verputzte Fassade + Dachflächenfenster + Rollläden + Glasbausteine + Wendeltreppe ⇒ 1990s/2000s, field 1991–2008). See [[potsdam-mietspiegel]] for the Baualter photo test.

## §Location
- **`#viewad-locality` = "{PLZ} {Bundesland} - {Stadt}"** only. The Ortsteil is in the prose. On swap ads the Ortsteil label is a poster-picked dropdown tied to the URL suffix (#774: same building labelled "Dahlem" (-24192) and "Grunewald" (-24194)). Trust PLZ + prose.
- **The exact street is not in any `ul.addetailslist`.** It sits in the separate "Standort" block (and under the price heading); strip-tag the own-ad region to read it (#607). A house-number-precise address is the highest-value field on a Mieterinserat, because it unlocks Baujahr/Bauvorhaben via one WebSearch.
- **The PLZ field can be flatly wrong, and `og:latitude/longitude` inherit it** (#640: PLZ 14473 Potsdam on a Grünheide (Oder-Spree) ad). Resolve by:
  1. triangulating the prose's distance claims (Tesla 10 min, Müggelsee 10 km, BER 35 km)
  2. the poster's other ads (`curl "https://www.kleinanzeigen.de/s-bestandsliste.html?userId={id}"`, plain curl, rows via `data-href`), where a sibling carried the correct PLZ
  3. comparing UUID sets between the poster's live ads (identical UUIDs across "different" flats = a Medium signal)
  - Whenever the title Ort ≠ the field Ort, settle it before scoring anything.
- **Mirror case: the field is right and the TITLE upsells to the neighbouring prestige Ortsteil** (#682: "Grunewald" title, Helene-Jacobs-Str. 18 = Schmargendorf). The STREET beats both: WebSearch `"{Straße}" {PLZ} Berlin Ortsteil`, which also names the Bauvorhaben. This is a near-miss, not an excluded area (B ~3,5).
- **For no-street ads, `og:lat/lon` is the PLZ centroid** (#652: middle of the Grunewald forest). Not a contradiction by itself.
- **Potsdam repeats street names across the 2003-incorporated Ortsteile** ("Habichtweg" in Bornstedt 14469 AND Golm 14476; #891: PLZ field 14476, prose "Bornstedt" + Volkspark). When PLZ field and prose Ortsteil disagree, WebSearch `"{Straße}" Potsdam 14469 OR 14476` (onlinestreet has one page per PLZ) before choosing a Quartier anchor or Block B, and make it a contact question. *Why:* a street-only lookup silently picks one.
- **Title vs description Ortsteil on swaps:** trust the tenant's prose (#717: title "Jägervorstadt", prose "Bornstedt" twice, same PLZ 14469).

## §Poster — account, role, scam signals
- **The seller block:** name, "Privater Nutzer" / "Gewerblicher Nutzer", "Aktiv seit {date}", N Anzeigen.
  - Positive-feedback badges ("TOP Zufriedenheit", "Besonders freundlich/zuverlässig") come from real transactions and suppress the "new account, single listing" signal (#594).
  - A computable version of that signal: "Aktiv seit" vs the posting date + the bestandsliste count (#715: account 1 day old, 1 ad).
- **The poster's other ads reveal their ROLE** (same `s-bestandsliste` curl).
  - Household clear-out ads (Waschmaschine, Kommode …) = the outgoing tenant: hunt the landlord-channel twin and score Block H on the landlord (#703).
  - Several flats on one private account = a re-poster or disguised gewerblich.
- **Fake-ad pattern: a real corporate address + another building's photos.** Grep the Standort street against our data first: `grep -n "{Straße}" data/listings.md reports/`.
  - #775 claimed Maxie-Wander-Str. 6 (known Vonovia 1995 stock, no Aufzug, 12,10 EUR/m²) with Aufzug at 16,67, NK + Heiz 3,33 vs the building's known 4,9–5,3, and Gründerzeit photos.
  - Other tells: an account name echoing the street, a private poster at a Vonovia/ProPotsdam/Genossenschaft address, "Online-Besichtigung: Möglich".
  - Every price heuristic passed that ad; only the address and photo check exposed it.
- **Reposts:**
  - An evaluated ad can be silently EDITED (#594 → Warm 1.085→1.200, Kaution 2.625→2.700) and re-posted under a new ad id with all-new photo UUIDs (#703).
  - Never dedup a repost by UUID. Use `m² + Zimmer + Etage + NK + Verfügbar-ab + description hash`; `posterid` is optional because reposts can move to a new account (#807).
  - Re-fetch the OLD ad before trusting the old report's numbers.
  - **Landlord re-list vs copied-ad scam:** download both galleries at `rule=$_57.JPG` and `md5sum` them. Byte-identical files = the same originals re-uploaded (a copier only has re-encoded CDN renders), and NEW photos absent from the old ad = the poster has access to the flat (#807: 7/11 identical + 4 new ⇒ legitimate). Still drop Block H (the old account's history does not transfer) and fire the two Medium signals (reposted / new account) ⇒ "Proceed with Caution", identity verification first.

## §Expired
Doctrine (visible badges only, `s-bestandsliste` as the liveness test) is in `modes/evaluate.md`. Cases:
- **A deleted or reserved ad still renders the full cached page** with HTTP 200. The status shows as VISIBLE badges prepended to the heading, e.g. "Reserviert • Gelöscht • {title}". "Gelöscht" = EXPIRED; don't score the cached numbers.
- **Hidden templates:** every page carries `display:none` "Gelöscht"/"Reserviert" elements, and every `<h1>` has a `data-soldlabel` attribute ("Nicht mehr verfügbar" / "Verschenkt"). Decide only from visible text (`innerText` / the h1 prefix), never from DOM presence or a raw-HTML grep (false positives #314, #328, #807).
- **A withdrawn ad can show NO marker at all** (#807). The only reliable liveness test is the poster's inventory: `s-bestandsliste.html?userId={id}` still lists the ad id, or not.
- **Soft-closed ad:** "Nicht mehr schreiben! / KEINE ANFRAGEN MEHR", no badge (#609). This is NOT EXPIRED: score it normally and flag the closed applicant channel in the Summary and Next Steps.

## §TypeTraps — what the ad really is
- **"Nachmieter gesucht"** is a normal long-term rental unless the text says befristet / Untermiete / auf Zeit.
- **"Wohngemeinschaft" in owner prose often means the Hausgemeinschaft** (#767: "nur 3 Parteien", a whole 90-m² flat). All four must agree before you write "WG":
  - category cat 203 Mietwohnungen vs "Auf Zeit & WG"
  - the ad rents a complete unit (own EBK, Bad, Keller)
  - Kaution ÷ Kalt ≈ 3 on the whole rent
  - no `Mitbewohner` / "Zimmer in" / per-room prices
- **A real WG/room share looks like a whole-flat rental in the spec list** (#547). Only the prose shows it: "Die beiden Schlafzimmer kosten jeweils 600 oder 650 Euro", "Wohnzimmer … mitbenutzt". These are usually also möbliert + befristet = two hard blockers.
- **Monteur-/Projektwohnungen in the ordinary cat 203 never say "auf Zeit".** Tells: "komplett möbliert" + a hotel-style inventory (Handtücher, Bettwäsche, Kaffeemaschine) + an employer-shaped audience ("Mitarbeiter der {Werk}", Expats) + car/airport distances. The structure has Schlafzimmer/Badezimmer counts but no NK/Warm/Kaution/Etage/Baujahr/EA. Fire the furnished/auf-Zeit blocker without the keyword. The price may be per bed (#640: 3 beds) — say the price scope is undefined.
- **Wohnen auf Zeit with ZERO Befristung keywords** (#599). Tells, strongest first:
  1. `Nebenkosten 0 €` AND `Heizkosten 0 €` with Warm == heading, and a Pauschale that covers Strom, WLAN, Rundfunkbeitrag
  2. the ad's own "Zuhause auf Zeit" / "Home Away from Home" / "stay", bilingual copy
  3. `selected_category_name` in the gaTagging JSON (cat 203 is weak counter-evidence)
  - Cap it. The headline €/m² is not comparable: subtract services (BK + Heizung ~3,20 EUR/m², Strom ~65, WLAN ~35, GEZ 18,36, Stellplatz ~55) and the Möblierungszuschlag (BGH VIII ZR 44/18: ~120–180 EUR for a full 70-m² furnishing) before any Mietspiegel comparison (#599: 25,00 → ~17,10).
  - The Mietpreisbremse is doubly inapplicable (§ 549 Abs. 2 Nr. 1 BGB, and the Mietspiegel does not cover furnished space).
  - First contact question: § 535 unbefristet or § 549 vorübergehender Gebrauch?
- **"Verfügbar ab {Monat}" is a START-only field** and hides Zwischenmiete (#452: "August 2026" = a one-month furnished sublet 01.08.–31.08., found only in the prose). Always read the description.

## §Swaps — Kleinanzeigen field quirks (side 2 → [[tauschwohnung]])
- **Decide swap vs rental ONLY from ad-own DOM:** the `Tauschangebot` row in `#viewad-details` ("Nur Tausch" / "Kein Tausch"; absent on ordinary ads), the title, the `#viewad-contact` Anbieter, and the opener INSIDE `#viewad-description-text`. The same opener in raw HTML hits sidebar ads (#805 matched foreign Anbieter-IDs).
- **Three swap variants:**
  - **Tauschwohnung GmbH:** "Gewerblicher Nutzer"; the description opens "Es handelt es sich hierbei um ein Tauschangebot. (Anbieter-ID: N)". The `Tauschangebot` row can be absent (#524).
  - **Private DIY swap:** "[TAUSCH]"/"Tausche … gg. …" titles, often a quality ad (18 real photos, long prose, an old account). "Nur Tausch" is the tell (#357), but the row can be absent too (#805), leaving only the title + the `Suche:` / `Biete:` blocks.
  - **Wohnungsswap.de** (#851, posterid 140044646, "Gewerblicher Nutzer · Aktiv seit 16.04.2024"):
    - Title "Wohnungsswap - {Zi}, {m²} - {Straße}, {Stadt}". None of the Tausch title triggers match, so key on the prefix + the Anbieter.
    - The body ends with a "Wichtig … bei Wohnungsswap als Tauschobjekt angeboten" + `Anbieter-Objekt-ID` boilerplate.
    - No `Tauschangebot` row, `Wohnungstyp` "Andere", no checktags, no NK/Warm/Kaution; Warm and the Suche are prose-only.
    - The gallery is the platform's watermarked app screenshots at mixed ratios (its own presentation, not the re-captured-Exposé Medium).
    - The Grundriss can show neighbouring units: read the tenant's red circle before crediting a Balkon (#851's balcony belonged to the neighbour).
- **The price heading is usually Kaltmiete, with Warm only in the prose** ("Die Miete beträgt 1600 € mit Nebenkosten" = Warm, derive NK, #505). NK can sit in the main details list with no Warm field (#359). The heading IS Warm when the prose says so (#806, but test it against the NK anchor, §Price). Private DIY swaps: heading = Warm with Kalt/NK never stated ⇒ the Mietpreisbremse is not checkable; say so rather than inventing a split.
- **GmbH swap ads often ship no NK/Warm/Kaution/Baujahr/EA at all** (#358): write "nicht angegeben", Mietpreisbremse not checkable. Don't hunt for a second list.
- **The gallery ranges from 0 to 18 real photos** (#355 2, #358 16, #505 4). Count by UUID; never assume image-poor.
- **No route to the tauschwohnung.com source** from Kleinanzeigen: see [[tauschwohnung]] §Sources.

## §Kauf
- **Haus/Kauf `#viewad-details`:** Wohnfläche, Zimmer, Schlafzimmer, Badezimmer, **Grundstücksfläche**, Haustyp, Etagen, Baujahr, Provision. Checktags Terrasse/Badewanne/Keller/Garage/Garten. The heading = Kaufpreis (#448, all curl).
- **Cat 208 embeds a sidebar-free `window.kaReFinancingFrontend.render({adAttributes:{adId, categoryId, adPrice, propertyType, livingArea, plotSize, constructionYear, postalCode, street}})`** right after the description. Use `adId` as the identity check and cross-check price/m²/plot/Baujahr (`street:""` = withheld). The `mortgageData` next to it is Check24's generic assumption (#860).
- **Cat 207 ("Weitere Grundstücke & Gärten") has NO `kaReFinancingFrontend.render` block** (cat 208 only): identity check falls back to `og:url`. Spec list = Grundstücksart / Angebotsart / Grundstücksfläche / Provision; "VB" with an empty `itemprop=price` = Preis auf Anfrage (#899).
- **Broker cross-posts: fetch the broker's own exposé for price/Objekt-Nr.** Philipp Krentz Immobilien: `krentz.de/immobilien/kaufen/` lists every object (plain curl, Firefox UA), detail `krentz.de/immobilien/{ort}/kaufen/{slug}/P{nnnn}/` with Objektnummer + Kaufpreis + Courtage (#899 confirmed "auf Anfrage" is real, not a KA field loss). Krentz plot galleries put the Ortsteil in the photos (outlined aerials, place-name signs): read the contact sheet before falling back to the PLZ (14469 spans Nedlitz/Bornim/Bornstedt/Nauener Vorstadt).
- **"# Weitere Angaben" / "# Energie" prose sections are importer markdown** used by ohne-makler.net AND broker feeds (Evernest #860). The Energieausweis, Objektzustand and Verfügbar-ab live there; grep the description before reporting "no energy data".
- **ohne-makler.net cross-posts** ("OM Ohne Makler – Privat vom Eigentümer", gewerblich, thousands of ads) are the platform account for a legitimate FSBO, not a scam. The Exposé PDF link (`ohne-makler.net/immobilie/file/{id}.pdf`) is in the description.
- **Fertighaus lead-gen** (allkauf, Town&Country, Massa, Bien-Zenker via "HD Handelsvertreter …" accounts with 1000s of ads; Objekt-ID `3801-313-kw28-…`, an allkauf "# Sonstiges" boilerplate):
  - This is not an existing property: no address, no secured plot, and a package price that often excludes land + GrESt. Watch "Ausbauhaus"/"HEIMWERKER-Paket" = Eigenleistung.
  - Score it but flag it as aspirational: B ~3,5, dock A for the package/land ambiguity, H ~3,0 (#466). Spec-list Grundstücksfläche vs the prose can disagree (1.052 vs 152 m²): report both.
- **Bespoke "auf Ihrem Grundstück" architect builds** (#474, SCHOSS INGENIEUR GmbH): heading "VB" with no number, no plot/address/Baujahr/EA. A services pitch (also "Wir suchen Baugrundstücke"): A ≈ 1,0, B ≈ 2,5, legitimate firm.

## §Triage
- **Dedup on the AD-ID, never the URL.** A re-titled ad gets a new slug with the same 10-digit id, and title/price in the hint change too. The first action on any Kleinanzeigen eval: `grep -rn "{ad-id}" data/ reports/`.
  - The same id cycled THREE times with word-for-word identical descriptions (#547/#595, from a 2026-07-22 discard).
  - The id also REFUTES a wrong dupe-skip: #575 vs #357 (different ids, "Kein Tausch" vs "Nur Tausch") was a genuine 4,4 rental.
  - m² + rooms + Ortsteil never identify a Potsdam flat (89 m² / 3 Zi / Bornstedt-Volkspark covered three ads); Etage + exact rent + ad id do.
