# Tauschwohnung — swap listings: sources, the partner's Suche, the two-sided match
Portal match: tauschwohnung.com and its syndication ("Tauschwohnung GmbH" on IS24 / Immowelt / Kleinanzeigen), Wohnungsswap.de syndication, and private DIY swaps. Portal field quirks: [[immowelt]] §SwapFeed, [[kleinanzeigen-de]] §Swaps, [[immobilienscout24]].

Consolidated 2026-09-28 from a 98 KB append log plus the Suche notes that were scattered over immowelt.md and kleinanzeigen-de.md. Doctrine is in `modes/evaluate.md` step 4: side 2 is lenient, and only a Suche that explicitly excludes our offer fails. Sections: §Sources · §WhereTheSucheIs · §Side2 · §Economics · §Dedup.

**Our offer.** Numbers used below come from `swap_offer` golm-feldmark in `config/profile.yml` and must be re-read there: Golm, 2 Zi / 54,19 m², EG + Personenaufzug, ~29 m² Privatgarten, 1.025,25 kalt / 1.214,93 warm, Indexmiete, Bj 2024. It lacks Balkon, Keller and Stellplatz.

## §Sources — where their data and Suche come from
- **Only IS24 can route to the tauschwohnung.com source.** Look in the expose's "Weitere Links" (`REFERENCE_LIST`):
  - An object link `twg.click/is24-{objektNr}-NN` (the tail can be 3 digits, `-899`, #610) 302s to the detail page. Plain `curl -sL` with a Firefox UA returns full SSR HTML (no consent wall, no bot block).
  - Often there is only the generic `twg.click/is24-homepage` (#526, #549): roughly a coin flip. Grep the list once; never construct the link from the IS24 Objekt-Nr. (#526: all 404).
- **Reading the source page:** the rendered `<h2>{Name} sucht</h2>` block, or better `__NUXT_DATA__`, a devalue flat array where dict values are indices. Resolve with `data[idx]`, but do not recursively follow ints (ids and booleans collide with indices).
  - The dict with `{sourceUserId, targetUserId, housing, user, search, match}` (≈ idx 42) holds:
    - `search` = `{cityNames, radius (km), rentMax, roomsMin, sizeMin, storeyMin/Max, residentCountAdults/Children, housingPropertyIds}`.
    - `housing` = their flat: `isActive, deposit, moveInDate, constructionYear, energyEfficiency, propertySize, market` (`"free"` = no WBS), `housingPropertyIds`. Explicit nulls prove "unstated".
  - Property-id map: `1=balconyOrTerrace, 2=fittedKitchen, 4=garage, 6=garden, 8=guestToilet, 9=cellar, 12=petsAllowed, 14=floorHeating, 36=terracedHouse, 64=centralHeating, 66=bathtub, 71=levelShower`. Absence of 9 = no Keller, the only reliable Keller negative (IS24's CHECK list omits negatives).
  - `moveInDate` can be stale (2024 on a live 2026 ad): read it as "nach Vereinbarung".
  - Worth the one curl when the link exists: on #335 the NUXT `radius` (10 km) decided side 2.
  - The NUXT `search` dict can contradict the owner's free text (#454: text "2–3 Zi, Kreuzberg" vs dict `roomsMin 4, sizeMin 110`). The free text is the authoritative intent; the dict only corroborates.
- **Immowelt and Kleinanzeigen have no route.** Their `Referenznummer` / "Anbieter-(Objekt-)ID" is the poster's id, not a housing id.
  - `tauschwohnung.com/wohnung/{id}` returned HTTP 200 with a soft-404 body ("Seite nicht vorhanden") for months, and a hard 404 since 2026-08-22 (#641, #711). `twg.click/ka-{id}-01` is a hard 404.
  - The outcome is known in advance: at most one curl, and grep the body, not just the status.
  - The free text (title + description) is the whole side-2 input. Keller/Baujahr/EA/Kaution stay whatever the portal shows.
- **IS24 swap-specific traps:**
  - The structured fields can hold the poster's SUCHE instead of their flat (#550: TOP_ATTRIBUTES "5 Zi / 100 m² / Grundstück 100 m² / 1.500 kalt" while the text offered 4 Zi / 84 m²). Tells: Grundstück = Wohnfläche, `houserent` on a "Whg", counts equal to the title's "suche …" half, round 100/1.500.
    - Score from the description.
    - `PRICE_INFO.priceBar` was then computed for a phantom object: unusable, and it must not drive the >20 %-below scam signal.
  - `realEstateType: houserent` swaps are the sparsest shape (#549): no Ausstattung block, NK/Warm absent ("zzgl. Heiz- und Nebenkosten"). Score must-haves as unconfirmed (E ~2,5).
    - The Berliner Mietspiegel excludes Ein-/Zweifamilien- und Reihenhäuser, so use the priceBar + a § 556g Abs. 3 note.
  - The description can end in a literal "…" that is the poster's own (#526: 231 chars, complete). Check the raw `text` length before hunting for more.
- **A 10×-typo in the size field** (Immowelt #868 "900 m²") auto-computes an absurd €/m² ("0,78"). Treat the size as UNKNOWN, bracket the Mietspiegel across 60–90 m², and never let it fire the scam signal.
- **Photos:**
  - The caption `www.tauschwohnung.com` is a watermark attribution, not a logo tile (#548: 14 genuine photos). Fetch one `fullImageUrl`: a real photo is ~40–60 KB at 1333×1000 with a translucent wordmark.
  - The `Gesponsert` tile has an empty URL; never count it. Only then decide the D cap.
  - Brochure-scan galleries leak the street (#869: a "Lage der Wohnung im Haus" page read "…-Mendelsohn-Allee, 14469"). That fixes Block B and the likely Baujahr.
  - Photos can reveal the household (#868: Hochbett + second bed = a family). Report it only as a labelled inference, never as a stated Suche. Developer room labels ("Kind 01") are generic.

## §WhereTheSucheIs — read EVERYTHING, then collect every clause
- **Positions seen:**
  - title: `gegen …`, "Suche Y / Biete X", "Tausch in eine höhere Etage"
  - first sentence
  - mid-paragraph
  - paragraph 2 right after the "(Anbieter-ID: N)" line
  - the second-to-last paragraph before the boilerplate (the modal slot)
  - the very last line AFTER the boilerplate (#606's household clause)
  - labelled blocks
- **Never slot-hunt.** The numeric criteria and the direction clause routinely sit in different paragraphs, and each can decide side 2 on its own (#683: the floor in paragraph 2, the direction second-to-last). Position rules have been wrong in both directions (#656, #657, #658).
- **Title and body both count, in both directions:**
  - The title alone can carry the whole Suche: #656, #710 "gegen mind. 4 Zi."; #663 "gegen 4+ Zimmer in Berlin" over a pure self-description body; #685, headline only.
  - A silent title is not a silent Suche (#664).
  - The title can carry a structural motive while the body carries the numbers (#351/#360: "höhere Etage").
  - The WHERE can be in sentence 1 and the DIRECTION in the second-to-last paragraph (#668).
  - The Suche is "unknown" only when the title AND every paragraph, incl. the motive sentence, are silent. Confirm by length: a description under ~500 chars that is all boilerplate = genuinely absent (#721, #524, #641).
- **Title parsing:** the first number = OFFERED, the number after `gegen | gg. | → | Suche` = SOUGHT ("Tauschen 3 Raum gg 4 Raum" #541, "Biete 4 – Suche 3 Zimmer mit Altbau-Deckenhöhe" #579). The clause after the room number is a real criterion. Search-result hints can copy the SOUGHT room count, so take the offered flat's rooms from the page (#317, #579).
- **Trigger set** (grep the whole description; each group was once the only hit):
  - labels: `Suchprofil (Das suche ich)` / `Das biete ich` (Wohnungsswap bullet list, #660) · `SUCHE:` (#712) · line-start `Suche:` / `Biete:` (#805) · `Gesucht:` after a `-----` divider (#804) · `Unsere Wunschwohnung:` / `Unsere Wohnung:` (#717)
  - verbs: `Ich suche|Wir suchen|Nun suche ich|daher suchen|suchen (wir )?eine|auf der Suche nach|Da wir .{0,60}(sind wir|suchen)` (#719, #720) and the bare stem `such` anywhere. It also catches the inverted `gegen X suchen wir` (#670) and the coordinated `… mit 3 Zimmer … und suchen mind. 4 Zimmer` (#669), where the Suche hangs off the self-description by a bare `und`.
  - `gegen` object: `Tausche … gegen|tausche gegen|gegen eine … Wohnung|gg\.?` ("Tausche" does not contain "suche", #684)
  - second person: `Du suchst|bietest (du)?|deine … Wohnung` (#666: "Du suchst … und bietest gerne deine 4-Zimmer-Wohnung in Babelsberg?" = their Suche). The mirror trap: the rhetorical opener "Bist du auf der Suche nach einer geräumigen Wohnung in Potsdam?" + "Wir bieten …" is a pitch for THEIR flat (#672). Test which flat the criteria describe. "Perfekt für Familien" in a headline describes the offer, not the household.
  - motive/direction: `vergrößer|vergroesser|größer|verkleiner|mehr Platz|mehr Raum|wächst|zu klein|Zuwachs|Nachwuchs|Familie|weniger Miete`. It is typo-tolerant: #578 "Wie wollen uns vergrößern".
  - numeric: `mindestens|mind\.|min\.|ab \d+ ?(m²|Zimmer)|\d\+ ?Zimmer|\d Zimmerwohnung|maximal|max\.|bis (zu )?\d{3,4} ?(€|Euro)|höchstens|nicht mehr als`
  - household: `wir sind \d|\d ?(Kind|Kinder)|Personen|zu (zweit|dritt|viert)|\d-köpfig|(drei|vier|fünf|sechs)köpfig` (#670, #777)
  - constellation: `zwei Wohnungen|2 Wohnungen|Gemeinschaft|WG|Mehrgeneration|zwei Einheiten` (#606, #778)
  - deal-breaker wording: `ein Muss|zwingend|unbedingt|Bedingung|muss (vorhanden|dabei) sein|Must-haves:`
  - object/Bausubstanz: `Haus|Häuschen|Einfamilienhaus|Reihenhaus|DHH` (#779) · `Altbau|Deckenhöhe|Stuck|Dielen|hohe Decken|Loft` (#579) · `höhere Etage`
  - `im Gegenzug` LAST, and verify the hit: it is boilerplate in the Wohnungsswap "Wichtig" paragraph (#660).
- **Also read to the last line:** a closing "Hard Facts: Größe, Zimmer, Warmmiete, Keller ja/nein, Stellplatz ja/nein" checklist is a second statement of which criteria are hard (#805).
- **Two posts of the same flat** (Wohnungsswap + Tauschwohnung) can state different floors (#660 55 m² vs #661 50 m²). Score against the more permissive one; constraints identical in both posts are the load-bearing ones.
  - **Silence is not the more permissive statement.** A Tauschwohnung-GmbH post can be Suche-silent while the tenant's private Kleinanzeigen twin states it (#903 Immowelt = #503 KA: "Ich suche eine 2-3 Zimmer Wohnung in Potsdam West, Zentrum oder Babelsberg"). Before writing "Suche unknown", look for a twin (§Dedup); its written Suche decides. *Why:* #903 would have gone out as a "Suche unknown" Swap-candidate, while the twin showed a Golm resident wanting out of Golm, a clear area fail.

## §Side2 — score the Suche as a checklist; fail only on WRITTEN words
Checklist rows: direction · rooms · m² · area · rent · must-haves · object type/Bausubstanz · household/constellation · floor. Each kill axis needs text the partner wrote.
1. **A stated room or area FLOOR above our offer.** Forms seen: `mind. 3`, `3+ Zimmern` (with no trigger word, #722), `4 Zimmerwohnung` as a noun (#665), `gegen 4-5 Zimmer` (#661), `gegen {N}+ Z` (#663), `Wir benötigen eine Dreizimmerwohnung` (#776).
   - "Im Idealfall N, kann mich aber auch auf M einlassen" sets the floor at M (#723: M = 2 passed). Grep `kann mich auch|notfalls|zur Not|im Idealfall|auch eine \d`.
   - A range `1-2 Z` or `1,5–2` is satisfied at its top by our 2 Zi (#662, #684).
   - Compare the floor with OUR offer, never with their flat. The size of their downsize is irrelevant (#667: 160 m² → "mind. 3 Zi / 80 m²" fails; #658 140 m² → "mind. 3 Zi / 70 m²" fails).
   - "keine Durchgangszimmer" on a 3-room floor is a layout demand a 2-room flat can't meet (#722).
   - An m² CEILING ("bis ca. 45 m²", #804) is a cost cap and confirms a rent fail.
2. **A written rent ceiling P.** Test it against both our kalt and warm; if P is unlabelled, report both overshoots (#808).
   - P below their own current rent means they are downsizing for price, which is structurally unreachable with our Indexmiete Neubau (#598 1.150→700, #727 1.200→600, #804 845 warm→500 warm, #825 1.450→700).
   - When P is warm, compare warm-to-warm, then show that even our kalt overshoots it.
   - Frequency: P < ~1.000 is the commonest single kill (#597, #598, #727, #808, #825).
3. **Area — explicit exclusion only.**
   - FAIL:
     - a bare Ortsteil with no softener (#668 "Wir suchen eine Tauschwohnung in Potsdam West")
     - a closed enumeration with no openness clause (#710 Grunewald/Schmargendorf/Dahlem/Zehlendorf; #660 five inner-city Ortsteile)
     - NUXT `radius: 0` + named `selectedGeos` (#610, the machine-readable version)
     - a named Kiez/Platz ("unbedingt in der Nähe des Karl-August-Platz", #658)
     - a **Punktadresse**: a street/corner + "so nah wie möglich" + a reason (#723). It fails even inside our city; asymmetric flexibility (rooms conceded, location not) marks location as the hard axis.
     - **Ort-Richtungsumkehr**: they live in our city and target ANOTHER city (#684 Potsdam West → Berlin, #704 Bornstedter Feld → Zehlendorf). This is readable from the title "{Potsdam} gegen {Berlin}". It is silent when their target is inside our own city (#685); there, leniency applies at Ortsteil level.
   - PASS:
     - a softener leading OR trailing the clause: `gerne|gern auch|am besten|am liebsten|bevorzugt|vorzugsweise|idealerweise|vor allem|ggf|eventuell|evtl|oder Umgebung|auch in|oder im nahen Umland` (#669 "Am besten auch in Babelsberg oder zentraler Lage in Potsdam", #671 "Gerne … Potsdam West" vs #668's bare "in Potsdam West" = the same Ortsteil with the opposite verdict, #667 "…, ggf. auch Potsdam", #683 "Rand-Berlin oder im nahen Umland")
     - "alle Bereiche in X außer A, B, C" unless ours is listed (#578). The excluded ones are usually their own neighbourhood.
     - "bevorzugt A, B … aber biete gern alles an" (#606)
     - topological formulas like "VOR der Langen Brücke / nicht unterhalb der Havel" (#805): Golm, Marquardt and Neu Fahrland sit on the wanted side.
     - a bare "in Potsdam" (#662, #672, #727) or "Potsdam Nord", which is literally satisfied: Sozialraum II = Bornim, Bornstedt, Eiche, Golm, Grube, Nedlitz (#776).
   - A bare Ortsteil inside a five-word title fragment ("gegen 1-2 Z. Babelsberg", #685) is weaker than a written sentence: KEEP, and flag the Ort as the open axis in the first sentence of the contact message.
   - A named Wunsch-Ortsteil riding on a hard "in Potsdam" ("am liebsten in Drewitz", #661) is a preference, not an exclusion.
4. **An Ausstattungs-Muss we lack** (Balkon/Keller/Stellplatz) fails ONLY with deal-breaker wording: #805 "Keller ist ein Muss", #660 "Must-haves: EBK und Balkon", #671 "Unbedingt mit Balkon oder Terrasse und Gartenmitbenutzung".
   - A plain enumeration ("mit Balkon und Keller", #726) is a con, not a kill.
   - Parse the scope of `oder`: `A oder B oder Garten` ✓ (our garden satisfies it, #664) · `A oder B und Garten` ✗ (the garden is extra) · a bare `Balkon` ✗ in the checklist (unmet, a con unless marked hard, #667).
   - `am liebsten mit …` softens whatever follows it (#665).
   - Score amenities as a DELTA between the two flats, not as our abstract lacks: #696's partner had no Keller either.
   - Side-1 mirror of the same case: "Keller not stated" on a Berlin pre-1990 Bestandsbau is weak evidence of absence, because Kellerabteile are near-universal there. Score E 2,5 rather than 2,0, and make the Keller question the first contact item (#696).
5. **Physical impossibles:** Bausubstanz demands (Altbau-Deckenhöhe for a Hochbett, Stuck, Dielen, Loft, #579), object type Haus/Häuschen (#779; "mit Garten" there is not a near-miss), a higher floor vs our EG (#351, #360).
6. **Constellation / household:**
   - "ZWEI Wohnungen mit 2 Zimmern" is a trap for the room matcher: the quantifier means two units (#606, #778 "alternativ zwei 3-Raum-Wohnungen").
   - A stated household of ≥3–4 people is a structural floor even without a room number (#670 "2 Erwachsene 2 Kind", #777 "5-köpfige Familie", #606 "für vier Personen zu klein").
- **Not a kill axis: a rent delta with no written ceiling, however large.** PASS + a labelled inference (#662 +86 % kalt, #670 +216 % kalt, #608).
  - ⚠ Refuted and removed: "implicit ceiling = their own Kaltmiete; below ~60 % of ours = hard fail" (#684). It contradicts evaluate.md leniency and #662/#670, and #684 was decided by the Ort-Richtungsumkehr anyway.
  - Also refuted (old kleinanzeigen note): "a partner under ~800 kalt fails on affordability alone" (#608 and #662 passed).
- **Direction** (enlarge vs downsize) is the cheap first read, not the verdict. A downsizer can still state a floor above us (#658). A 5-Zi household with NO Suche still goes to Swap-candidate "Suche unknown" (#721); a base rate never substitutes for a written floor.
- **Suche genuinely absent:**
  - The outcome is `Swap-candidate`, "Suche unknown — verify on contact". Write side 2 as "unanswered, not passed".
  - Pre-commit the rule in Next Steps: one message asking only for the Suche, and a reply naming ≥3 Zi or ≥60 m² → Discarded.
  - A bare comparative ("mit einer ähnlichen Wohnung", #359) makes their own flat the yardstick.
- **Honest economics on silent/lenient passes:** compute both kalt and warm deltas and label the result as an inference.
  - Bigger AND cheaper than ours means a likely decline (#641).
  - Bigger but with a HIGHER warm rent than ours is the money lever (#672).
  - Say whether the pass is a match against stated criteria (#608, #662, #685, #696, #726: real odds) or a pass by silence (#641, #672, #721: long odds).
- **A high side-1 score must not soften side 2** (#719, #720, #723, #683, #805 all scored 4,2–4,3 and died). When most axes are green, re-read the room/area floor. Always write which single axis decided, or the next reader re-litigates it.
- **Both sides can fail:** check the side-1 number before writing "grab it if it reappears as a normal rental" (#610: side 1 was 3,3).
- **Who our offer genuinely serves:**
  - downsizers to 1–2 Zi who name Potsdam (#608, #662, #685, #712)
  - people leaving an upper floor without a lift / wanting barrierearm (#655 "weniger Treppen", #670, #776 pensioners)
  - partners whose rent is near ours
  - Large downsizers with a rent advantage for them (#726: −604,75 kalt/month for the partner) are the structurally best shape. Lead the first message with that rent advantage, and state the missing amenities openly.
- **Triage prefilter candidates** (not built): title `gegen \d+\+? ?Z` · body `such\w* (eine?|nach) .{0,20}\b(\d)[ -]?Zimmer` · rent `max(imal)|bis (zu)? \d{3} ?(€|Euro)` below ~1.000 · title "{our city} gegen {other city}". Positive signal: "Suchen M, bieten N" with M < N.

## §Economics — Block A/G/H specifics for swaps
- **The advertised rent is usually the partner's ALTVERTRAG.** Consent can come as a new contract at market rent, so ask first: "Wird der bestehende Vertrag übernommen oder neu abgeschlossen?"
  - €/m² ≈ ½ the Angebotsanker (~15,51) ⇒ Altvertrag. The question can move A by ~1,5 (#608: 11,01 vs ~15,51).
  - €/m² near the anchor ⇒ a young contract. The Block-A story becomes a Mietpreisbremse check (#669: 14,67 vs zulässig 8,24).
  - A Neubau contract below ortsüblich (#724: ab-2021 field, § 556f) ⇒ a small lever only.
  - Large downsizers carry the biggest repricing risk (#726: 11,25 vs quarter 19,7–22,4 EUR/m²). First question: Baujahr/Erstbezug + Übernahme zu unveränderten Konditionen?
- **A cheap swap rent never fires the ">20 % below Mietspiegel" signal** without an address-precise band; against ortsüblich these rents usually sit above the Mittelwert.
- **The counterparty can be the EIGENTÜMER** (#722, "Ich bin der Eigentümer, also ist die Kaltmiete verhandelbar"):
  - no consent gate on their side
  - the rent is his real (negotiable) ask, not an Altvertrag
  - Block H Eigenbedarf risk is HIGHER
- **A swap ad and a Nachmietergesuch can be two exit channels of ONE flat** (#723 = #642, matched by the Grundriss "Haus I – WE 8"):
  - score Block A with the owner's ask (1.250 vs swap 1.100)
  - the non-swap channel is strictly better: no `landlord_consent` gate, and we keep Golm.
- **Feldmark vacancies:** a flat in our own street goes via an internal move with DIBAG, not a swap. See [[potsdam-mietspiegel-ortsteile]] (14476, In der Feldmark).
- **A `Möbliert/Teilmöbliert` flag on a swap is NOT the furnished/auf-Zeit blocker** (#653). A swap is a permanent Mieterwechsel, and the flag means "furniture can be taken over".
  - Fire the blocker only with real markers: `befristet|auf Zeit|Zwischenmiete|Untermiete`, a Mietende or Mindest-/Höchstdauer, a Pauschalmiete with "inkl. alles", or a hotel-style inventory.
  - Raise it as an open question with the conditional ≤2,0.
- **A relative can post as proxy** ("Meine Eltern haben …", #776). The motive is then proximity to the poster, and Block H has no tenant voice.
- **Anbieter-ID magnitude ≈ account age.** Low ids (#665 38298, #685 199871, vs 400k–480k for current posters) mean long unmatched: the criteria are firm, not an opening position.

## §Dedup
- **Within the Tauschwohnung-GmbH feed, the poster's Anbieter-ID is stable across portals.**
  - Immowelt shows it twice: the `Referenznummer` and the "(Anbieter-ID: N)" line. Kleinanzeigen shows it as "Anbieter-/Objekt-ID".
  - #641 (Kleinanzeigen) = Immowelt `94b8c035-…`: closed as DUPE.
- **Grep all three stores in one call:** `grep -rn "{id}" data/listings.md data/pipeline.md reports/`. The tracker's Notes column usually lacks the id; the full report has it (#673). Add a distinctive Suche phrase as a second key.
- **Numeric re-list matchers flag false dupes** on ~price/m²/rooms (#696, #779 vs #484). The id settles it.
- **Across syndicators** (Wohnungsswap.de vs Tauschwohnung GmbH) the ids always differ.
  - Dedup on a prose fingerprint: the exact m² (70,53, not 70), a physical oddity (garden 6×8 m + Außenwasser), the occasion (WG-Auflösung), and the price triple (#660 = #661).
  - The Tauschwohnung variant is the richer one (7 vs 1 chips, 17 vs 10 photos, rating). Fetch it before writing "confirmed missing".
- **Private DIY post + syndicated post of the same flat** (tenant on Kleinanzeigen privately AND via Tauschwohnung GmbH on Immowelt, #903 = #503 KA 3471947654): the ids never match (KA userId/ad-id vs Anbieter-ID). Match on Ortsteil + Kaltmiete in the tracker (`grep Golm data/listings.md | grep 1.150`), then confirm with identical gallery photos. The private twin often carries the Suche (§WhereTheSucheIs).
- **Fetch the sibling even on a confirmed dupe.** The richer post can resolve an open question: #641's bare 700 € was "Kaltmiete" on the Immowelt twin.
- **Developer Grundriss unit designators** (`Haus {N} – WE {n}`, `WE 65.01`) are the cross-portal identity key. Grep the tracker for them.
