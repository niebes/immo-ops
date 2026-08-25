# Tauschwohnung.com — page quirks
Portal match: tauschwohnung.com (source behind "Tauschwohnung GmbH" swaps on IS24/Immowelt/Kleinanzeigen)

## ⚠️ The portal's STRUCTURED fields can hold the poster's SUCHE, not the offered flat
On IS24 swap exposés some posters type their **search criteria** into the object fields. #550
(expose 169908178) shipped `realEstateType: houserent`, TOP_ATTRIBUTES "5 Zimmer / 100 m²
Wohnfläche / 100 m² Grundstück / Kaltmiete 1.500 €" — while the Objektbeschreibung offered a
**4-Zi / 84 m² / 1.300 € warm Wohnung** and *sought* "Haus oder Wohnung … mindestens 5 Zimmern
und einer Fläche von 100 m² für maximal 1.700 € warm". The address (Gorgasring 10, 13599) was
still the poster's own flat, so nothing looked broken.
⇒ **Rule: on every swap, cross-check TOP_ATTRIBUTES/ATTRIBUTE_LIST against the description
before scoring.** Tells that the fields are the Suche: a `Grundstück` figure identical to the
Wohnfläche, `realEstateType: houserent` on something the title calls a "Whg", a room/m² count
that equals the number in the title's "suche …" half, or a round 100/1.500.
⇒ Two knock-on effects: (a) score blocks A–H off the **description** numbers; (b) the
`PRICE_INFO.priceBar` is computed for the *phantom* object and is **unusable** as an
address-precise band — do not quote it and do not let it drive the "20 % below Mietspiegel"
scam signal. *Why:* scoring #550 off the fields would have invented a 100-m²-Haus at 1.500 €
kalt that does not exist, and inverted the two-sided match (their Suche read as their offer).

## Side-2 base rate: our 2-Zi/54-m² Golm offer only serves DOWNSIZERS
#492, #505, #533, #541, #550, #578 all failed side 2 on the same axis — the partner wants to
*enlarge* (≥3–5 Zi, 70–100 m², family households), and the Golm flat is the small end of the
market. Side 1 kept passing (3,5–4,3/5), so the cost was a full evaluation each time.
⇒ Read the Suche's **direction** (vergrößern vs. verkleinern / "weniger Miete") FIRST; if they
name ≥4 Zimmer or a 3+-person household, side 2 is a deterministic fail and the rest of the
evaluation is only worth doing for the record. Worth proposing a triage prefilter
("suche … ≥4 Zi / ≥70 m²" → discard before evaluation).

**The size of the downsize is IRRELEVANT — only the stated FLOOR decides.** #667 is the extreme
datapoint: a 4 Zi / **160 m²** poster seeking `mind. 3 Zimmer / mind. 80 qm`, i.e. willing to *halve*
their flat. On the delta axis that is by far the best a-priori swap candidate ever seen; on the floor
axis it fails by −1 Zimmer and −32,3 % Fläche, exactly like every 95-m² poster. ⇒ Do not let a huge
offered m² raise your prior — compare our 2 Zi / 54,19 m² against the *number they wrote down*, and
say so explicitly in the report so the next reader does not re-litigate it. (Same lesson as #658, now
at the top of the size range.) Corollary worth surfacing to the user: when Ort and Miete both pass and
only size fails — repeatedly — the binding constraint is the `swap_offer` inventory, not the search.
**Cleanest instance of that corollary so far: #683** (Immowelt, Charlottenburg 10585, Anbieter-ID
477956). *Four* axes passed simultaneously — Ort ✓ (their „Rand-Berlin oder im **nahen Umland**"
covers Potsdam-Golm literally, no commuter-belt leniency needed), Ausstattung ✓ (their „Garten
**oder** Gartenzugang" is a clean #664-style disjunction our ~29 m² garden satisfies, and a garden is
their stated main motive), Miete ✓ (their 1.029 kalt vs our 1.025,25 — four euros apart, and their
Suche names **no** ceiling at all), Richtung der Miete ✓ — and it still died on „**mind. 3-4
Zimmern**" + „mit wachsender Familie … mehr Platz". ⇒ When you see Ort/Garten/Miete all green, do NOT
let the momentum carry you into a Swap-candidate: re-read the room/area floor, it is the only axis
that has ever decided these. And say so explicitly in the report, because a reader who sees three ✓
will otherwise re-litigate the discard.

**But "downsizer" is NOT automatically a side-2 pass — a second, independent kill axis is a
qualitative BAUSUBSTANZ requirement, which our 2024 Neubau can never satisfy.** #579 was the first
genuine downsizer (offers 4 Zi/89 m², seeks 3 Zi) and still failed categorically: the Suche was
"3 Zimmer **mit Altbau-Deckenhöhe für Hochbett**". Ceiling height, Stuck, Dielen, Altbau, "hohe
Decken", Loft/Fabriketage are *physical building-era* criteria — no amount of side-2 leniency turns
a Neubau 2024 with ~2,50 m standard ceilings into one; treat them exactly like an explicitly stated
deal-breaker, not a soft must-have. Note the direction still helps on the *numeric* axes (their rent
1.375 EUR kalt vs our 1.025,25 → budget fits), so the report must say which axis actually decided.
**Third kill axis: an explicitly NUMBERED Mindestfläche.** The Tauschwohnung-GmbH template Suche is
frequently one fully-quantified sentence at the end of the description, in a fixed shape:
*"Ich suche nach einem Tausch in **{Stadt}** mit **mindestens {N} Zimmern** und einer Größe von
**mindestens {M} m²** für **maximal {P} € Miete**."* (#597, Golm). Grep `mindestens|min\.|ab \d+ ?m²|
maximal|max\.` — when M is stated, our 54,19 m² offer **deterministically fails any M ≥ 60**, no
leniency applies (a stated minimum is not a soft preference), and it fails *independently* of the
direction axis: #597's poster was a downsizer on rent (1.250 → max 1.000) but a *holder* on area
(85 → min 70). Check the rent ceiling P against BOTH our numbers — 1.025,25 kalt vs 1.214,93 warm can
land on opposite sides of P (on #597: +2,5 % vs +21,5 %), so say which reading you used.
  - **Sub-variant: the rent ceiling P is the SOLE decider, and the Suche carries no m²/Zimmer at
    all.** #598 (Kleinanzeigen, Zentrum Ost) had the short form — one clause inside the platform
    boilerplate, *"Wir suchen nach einem Tausch gegen eine **kleinere** Wohnung in **Potsdam** mit
    **maximaler Miete von 700 Euro**."* — i.e. direction ✓, Stadt ✓, Größe ✓ (54,19 < 73 m², 2 < 3 Zi)
    and it still fails categorically on P alone (+46,5 % kalt / +73,6 % warm). So do NOT treat a
    missing Mindestfläche as "no numeric criterion"; grep P on its own with
    `max(imal)e[nr]? Miete|bis (zu )?\d{3,4} ?(€|Euro)|nicht mehr als|höchstens`.
    **Diagnostic shortcut: when P is BELOW the partner's own current rent, they are downsizing *for
    price*** (#598: 1.150 → 700, −39 %) — then no offer of ours can ever work, because our Golm flat
    is a freifinanzierter 2024er Neubau on an **Indexmiete** that moves the wrong way over time.
    Say in the report which axis decided; here size/city were perfect and only P mattered.
    Frequency note: #597 and #598 both landed on the same day, so a rent cap under ~1.000 EUR is
    currently the most common side-2 kill on the Kleinanzeigen swap flow, not a rarity.
**Fourth kill axis: the WOHNKONSTELLATION Suche — they want MULTIPLE units, or a household size
that no single flat of ours serves.** #606 (Kleinanzeigen, 14478 Potsdam): *"Am liebsten in einem
Haus **ZWEI Wohnungen mit 2 Zimmern**, oder 2,5 oder 3 oder 4… Auch eine **Gemeinschaft** wäre
schön. Alles was mehr Platz bietet. **Für vier Personen** ist unsere Wohnung inzwischen zu klein."*
Three things to take from that shape:
  - **The "2 Zimmer" in such a sentence is a TRAP for the room-count matcher.** Read literally it
    reads as an exact match for our 2-Zi Golm flat — but the quantifier in front (`ZWEI Wohnungen`)
    means two such units under one roof. `swap_offer` holds exactly one flat (Königsallee is
    gekündigt), so a multi-unit Suche is a fail by arithmetic, not by leniency. Grep
    `zwei Wohnungen|2 Wohnungen|Gemeinschaft|WG|Mehrgeneration|zwei Einheiten` before matching rooms.
  - **The household-size clause is the strongest direction signal there is, and it sits at the very
    END of the description — after the tauschwohnung.com boilerplate paragraph.** "Für {N} Personen
    ist unsere Wohnung zu klein" with N ≥ 3 is a deterministic upsize fail. Read the description to
    the last line; grep `für (drei|vier|fünf|\d) Personen|zu klein|Familie|Nachwuchs|Kind`.
  - **Positive-form area clause: "Bevorzugt A, B, C … aber bietet gern alles an" = lenient PASS**,
    the mirror image of #578's "alle Bereiche außer A, B, C". A named preference list that ends in an
    openness clause never fails side 2 on area — do not record it as "our Ortsteil not on their list".
  *Why:* on #606 the numeric axes all passed (rent +2,5 % kalt / −6,5 % warm, area covered by the
  openness clause) and a room-count match on "2 Zimmer" would have surfaced a Swap-candidate the
  partner can never accept — a four-person household downsizing by 20,8 m² and one room.
**Fifth kill axis: `search.radius == 0` together with NAMED Ortsteile — the machine-readable
"no commuter-belt leniency" flag.** The lenient area rule ("surface a city's commuter belt") only
applies when the Suche names a *city* loosely. When the NUXT `search` dict carries
`selectedGeos: [{name:"Westend"},{name:"Charlottenburg"}]` **and `radius: 0`**, the poster has
actively excluded everything outside those Ortsteile — treat it as an explicit exclusion, not a soft
target, and do NOT surface Golm for such a "Berlin" seeker. Read `radius` before applying leniency:
one field, settles the area axis outright. Seen on #610 (expose 170120501, Kladow EFH): free text
"mindestens 3 Zimmern und 80 m² in Charlottenburg bzw. Westend bis maximal 1800 Euro" + structured
`radius 0 / roomsMin 3 / sizeMin 80 / rentMax 1800` — the two sources agreed on every axis, which is
what made the verdict robust (contrast #454, where they contradicted each other).
**Sixth kill axis: ORT-RICHTUNGSUMKEHR — the poster ALREADY LIVES in the region our offer sits in
and names a DIFFERENT city as the target. The commuter-belt leniency must NOT be applied.** #684
(Immowelt/Wohnungsswap, Ref 1483177, Hans-Sachs-Str., Brandenburger Vorstadt 14471): „Tausche …
3-Zimmer-Wohnung **in Potsdam West** gegen eine … Wohnung **in Berlin, bevorzugt im Prenzlauer
Berg**." Offering Potsdam-Golm leaves them in the city they are leaving and pushes them ~7 km onto
the **Berlin-averted** side of Potsdam — worse Berlin access than the Bhf Charlottenhof they praise
in their own ad *and still abandon*. ⇒ **Their own address is an implicit exclusion.** The lenient
rule ("they name a city ⇒ surface its commuter belt") exists for seekers who live *elsewhere* and
might accept the Speckgürtel; it is exactly inverted for someone escaping the Speckgürtel, where the
swap's purpose would be not merely unmet but negatively met. Cheap machine test, computable from
`pipeline.md` metadata alone: **their listing's city == our offer's city AND their stated target
city != it ⇒ area fail, no leniency.** *Why:* on #684 the room axis passed, so a leniency-minded
reader with three-of-four green had real momentum toward a Swap-candidate.

**Rent axis when NO ceiling is stated: use the partner's OWN Kaltmiete as the ceiling proxy.**
Extends the #598 shortcut, which required a written P. #684 names no maximum at all — but they sit on
a **350 EUR kalt Genossenschafts-Bestandsmiete** (5,83 EUR/m², inside the official Potsdam
Mietspiegel span, not a typo) against our **1.025,25 kalt / 1.214,93 warm = +193 % / +247 %**.
Nobody swaps into a tripling of their rent, so "no stated ceiling" is NOT the free pass the lenient
rule makes it look like. Two amplifiers to name in the report: a **Genossenschaft / kommunaler
Bestand** on their side is structurally capped, and our Golm flat is a **freifinanzierte Indexmiete**
that only diverges further over time. Rule of thumb: partner's own Kaltmiete < ~60 % of 1.025,25
(≈ 615 EUR) ⇒ treat as a hard rent fail even with no P written down.

⇒ **#684 is the counterexample to the "swap_offer inventory is the binding restriction" thesis.**
After eleven straight discards on a room/area floor (#492, #505, #533, #541, #550, #578, #579, #597,
#606, #667, #683), #684 is the **first swap where the room axis PASSES**: a genuine downsizer
(60 m² / 3 Zi → seeks **1,5–2 Zimmer**, no m² floor, no rent ceiling) whose target our 2 Zi /
54,19 m² hits exactly, and they lose only 5,81 m². It fails anyway, on Ort-Richtungsumkehr and rent.
⇒ Do not conclude "only a bigger swap_offer would help" — and a triage prefilter on
"Suche nennt ≥3 Zi / ≥60 m²" would **not** have caught this one; it needs axes 6 and the rent proxy.

⇒ Seven-axis side-2 check, in this order: (1) direction/size (vergrößern, "mehr Platz", "für N
Personen zu klein" → fail), (2) qualitative Bausubstanz keywords (Altbau/Deckenhöhe/Stuck/Dielen →
fail), (3) explicit numeric floor/ceiling (mindestens m² / maximal EUR → arithmetic fail), (4)
Wohnkonstellation (zwei Wohnungen / Gemeinschaft → fail, we can only offer one unit), (5) `radius: 0`
+ named Ortsteile (→ area fail, leniency does not apply), (6) **Ort-Richtungsumkehr** (they already
live where we offer and target another city → area fail, leniency does not apply), (7) **implicit
rent ceiling** = their own Kaltmiete when none is written. All seven belong in the same triage
prefilter — axes (3), (6) and (7) are the cheapest to automate (regex on the description; city+price
comparison off the search-result row), axis (5) the cheapest to read (one NUXT field), axis (4) is
the cheapest to get WRONG. *Why:* on #579 the favourable direction made the swap look promising
right up to the last clause of the title; on #597 the favourable *rent* direction did the same, and
only the stated 70-m²-Minimum settled it; on #684 the size fit perfectly and only (6)+(7) decided.

**Both sides can fail at once — score side 1 anyway and say so.** #610 was the first swap where
side 1 *also* missed the 3,5 gate (3,3 — a 160 m²/6-Zi EFH is +33 % over `max_m2` and one room over
`max_rooms`, plus out-of-area and no Baujahr/Energieausweis/NK/Kaution). The habitual Next-steps line
"side 1 passed, grab it if it ever reappears as a normal Vermietung" then does NOT apply and would be
a wrong recommendation — check the side-1 number before writing that follow-up.

### The base rate is NOT a law — #608 is the first side-2 PASS. Don't pre-judge a swap as doomed.
**Pass roster (three known shapes, keep it current):** #608 „{N} Raum **gegen {M} Raum**" with M ≤ our
2 Zi (the Suche IS the title) · #662 · **#672 silent-except-a-bare-city-clause** (see the „TOTALLY silent
Suche" section below). Note the split: #608's pass is a *match against stated criteria*, #641/#672's is a
pass *by silence*. Both are legitimate Swap-candidates, but only the first carries real odds — say which
kind you have, so the user can budget attention accordingly.
After a long unbroken failure run (#492, #505, #533, #541, #550, #578, #579, #597, #598, #606) it is
tempting to treat every swap as a foregone Discard. **#608** (Kleinanzeigen, „TAUSCHWOHNUNG *Günstige
3 Raum Wohnung **gegen 2 Raum Wohnung***", 89 m² / 980 EUR kalt, Potsdam 14469) passed both sides.
The shape that produces a pass — spot it early, it is a *positive* triage signal:
- **Title is "{N} Raum gegen {M} Raum" with M ≤ our offer's room count.** M is then the entire Suche,
  and an exact hit on M is the strongest side-2 evidence available (here M = 2 = the Golm flat exactly).
- **No m²-Minimum, no Mietobergrenze, no Ortsteil, no Ausstattungswunsch, no Personenzahl anywhere** —
  the description is pure Tauschwohnung boilerplate. All four kill axes are then *silent*, and under
  the lenient rule silence is a PASS, not an "unknown Suche" hedge. (Contrast #597/#598, where a
  single stated number decided it, and #606, where the last line did.)
- **Check the rent axis in BOTH readings before calling it.** Here their 980 kalt / 1.330 warm vs our
  1.025,25 / 1.214,93 = **+4,6 % kalt but −8,7 % warm**, a real saving for them. A partner whose own
  Kaltmiete is *near* ours (not the usual sub-800 Altvertrag) is the one class the Golm offer serves.
⇒ Practical rule: run the four kill axes; if all are silent AND the room count matches, stop hunting
for a reason to discard — write it up as a Swap-candidate with the open questions listed instead.

**The `"{N} Zimmer … gegen {M} Zimmer"` title is the cheapest side-2 read there is — and it cuts BOTH
ways.** #608 was the positive form (M ≤ our 2 Zi ⇒ pass); **#661 (Immowelt, „TAUSCHWOHNUNG Moderne
3- Zimmer Wohnung in Bornstedt **gegen 4 -5 Zimmer**") is the negative form and was decidable from the
title alone** — M = 4 is a *numbered absolute floor*, two rooms above our only offer, so axes 1
(direction: they are upsizing) and 3 (explicit numeric minimum) both fire independently. The
description's last pre-boilerplate sentence repeated it verbatim ("Wir suchen 4/5- Zimmer-Wohnung
oder ein Haus in Potsdam, am liebsten in Drewitz."). ⇒ **Read the title's `gegen …` half first, then
confirm against the description tail; when the two agree the verdict is robust and no A–H pass is
needed to reach it** (still score side 1 for the record — #661's flat was 4,3/5). A named
Wunsch-Ortsteil in that sentence ("am liebsten in Drewitz") is a *preference* riding on a hard
"in Potsdam" — do not upgrade it to an exclusion, and do not need it: the room floor already decided.

**Third form: `gegen {M1}-{M2} Z` — a stated RANGE, and it passes when our 2 Zi hits its TOP.**
#662 (Immowelt, „TAUSCHWOHNUNG Sonnige 3-Zimmwhn. mit Balkon **gegen 1-2 Z**", Am Stern Potsdam,
3 Zi/60,20 m², 550 kalt/781 warm) = **the second side-2 PASS ever**, after #608. Read a range as a
range: `1,5-2 Zimmer` is satisfied by our 2-Zi Golm flat at its upper bound, and "in Potsdam" is
satisfied *literally* — Golm is a Potsdam Ortsteil, so no commuter-belt leniency is even needed.
Here the Suche sat in **the title AND the first prose sentence, identically** — a new position pair;
keep reading the tail anyway (it was pure boilerplate) but two agreeing statements up front make the
verdict robust immediately.
**Sub-rule that decided it: a large rent delta with NO stated ceiling is a PASS + a labelled
inference, never a fail.** Their 550/781 vs our 1.025,25/1.214,93 = **+86,4 % kalt / +55,6 % warm
(~+434 EUR/Mon.)** on an Indexmiete — by the #598 diagnostic ("downsizing for price") this smells
like a decline. But #598 had an explicit `maximale Miete von 700 Euro`; #662 states **no P at all**,
and an unstated ceiling must never be converted into an assumed one. ⇒ Keep it, and write the
economic read as an explicitly-labelled inference (as on #641) plus the *counter-offer* the first
message should lead with — here Bj. 2024 vs ~1975 Platte, EG + ~29 m² Garten vs 4. OG ohne Aufzug,
Personenaufzug. *Why:* three of the five kill axes are about numbers the poster never wrote down,
and inventing one of them would have discarded the best side-2 fit on record.

**Fourth form: `gegen {N}+ Z` — a stated FLOOR, in the TITLE ONLY, with a body that never restates
it. This is the shape that fakes a "silent Suche" and must NOT be routed to the #641 lenient KEEP.**
#663 (Immowelt, „TAUSCHWOHNUNG 3-Zimmer in Potsdam Traumlage **gegen 4+ Zimmer in Berlin**", Neuer
Markt, 95 m²/3 Zi, 1.030+330): the description is a **pure self-description** of their own flat and
ends in the tauschwohnung.com boilerplate — grepping the ad text for `such|Suche|Gegenzug` returns
**0**, and `Berlin` appears **only** in the headline. So the body-only reader sees exactly #641's
signature (no Zimmer/m²/Miete/Ortsteil/Personenzahl anywhere) and would fire "Suche unknown ⇒ lenient
KEEP" — producing a Swap-candidate the partner can never accept. ⇒ **Rule: the Suche is "unknown"
only when the TITLE is silent too. Read the headline first, and count a title-only Suche as fully
stated, not as vague** — no leniency is owed to a criterion the poster did write down, merely wrote
down once. (`mainDescription.headline` in the Immowelt payload = the ad's real headline; the pipeline
card blob is not.)
  - `{N}+` is an **absolute floor**, the exact mirror of #662's `1-2 Z` range: 4+ vs our 2 Zi = two
    rooms below ⇒ deterministic fail, kill axis 3. #662 and #663 landed in the same batch and were
    **both settled by the title alone, in opposite directions** — that pair is the argument for a
    title-regex prefilter (`gegen \d+\+? ?Z`) ahead of full evaluation.
  - Watch the axis bookkeeping: on #663 the *rent* axis was a clean PASS (our 1.025,25 kalt = −0,5 %
    vs their 1.030; warm −10,7 %) and no ceiling was stated, so the report has to say the rooms —
    not the money — decided. A favourable rent axis on a swap is common and never rescues a stated
    room/area floor.
  - Their target city being a **different** city (Berlin) while our offer sits in *their current*
    city (Potsdam) is a second, softer fail: commuter-belt leniency formally applies, but the
    direction points *away* from where our offer is. Record it as a soft miss under the hard one.

**Fifth form: the SINGLE-CRITERION Suche — one bare room count and literally nothing else.**
#665 (Immowelt `1fdae0cc-…`, Berliner Vorstadt Potsdam, 3 Zi/104 m², 1.300+350): title
„… **gegen 4 Zimmer**", body paragraph „**Wir suchen eine 4 Zimmerwohnung.** Am liebsten mit
Badewanne und Balkon/Terrasse." That is the *entire* Suche — **no Stadt, no Ortsteil, no m², no
Mietobergrenze, no Personenzahl**. It is the mirror of #598 (rent-only Suche): exactly one axis is
stated and it alone decides.
  - **Do not read the silence on area/rent as a fail — both are lenient PASSes, and here the rent
    axis ran strongly in OUR favour** (our 1.025,25 kalt / 1.214,93 warm = −21,1 % / −26,4 % below
    their own 1.300 / 1.650, i.e. the swap would *save* them money). Write that as a labelled
    inference and state plainly that only the room count decided. *Why:* a report that lists five
    silent axes as "unclear" reads like a marginal call when it is actually a clean single-axis fail.
  - **`4 Zimmerwohnung` written as a flat noun is still an absolute floor**, not a range and not a
    wish — same class as #663's `4+`. Two rooms above our only offer ⇒ axes 1 (they hold 104 m² and
    are upsizing) and 3 (numbered room floor) fire together.
  - **Generalise the `am liebsten` softener beyond the Ortsteil case (line ~132):** it softens
    *whatever follows it*, Ortsteil **or** Ausstattung. „Am liebsten mit Badewanne und
    Balkon/Terrasse" is a preference, so our missing Balkon is a con and never a fail — and the
    alternative-set half is the one thing our ~29 m² Golm garden half-answers. It still cannot
    rescue the numeric fail.
  - **Cheap prefilter:** `such\w* (eine?|nach) .{0,20}\b(\d)[ -]?Zimmer` catches this shape in the
    body, and the existing `gegen \d+\+? ?Z` title regex catches it in the headline. #665 was
    decidable from either.

**Sixth form: the SPLIT Suche — the WHERE in the first sentence, the DIRECTION in the
second-to-last paragraph, and no number anywhere.** #668 (Immowelt `42a71ce9-…`, Brandenburger
Vorstadt, 3 Zi/70 m², 570+260): headline „TAUSCHWOHNUNG Sonnendurchflutete Altbauwohnung im
Seitenflügel" carries **no `gegen …` half at all** (pure self-description, the #664 shape), and the
Suche is two sentences that sit at opposite ends of the body:
  1. first paragraph — „hiermit bieten wir unsere Wohnung zum Tausch an. **Wir suchen eine
     Tauschwohnung in Potsdam West.**" (the WHERE, and nothing else);
  2. second-to-last paragraph, right before the tauschwohnung.com boilerplate — „Da unsere
     **Familie immer weiter wächst**, ist die Wohnung **zu klein für uns geworden**." (the
     DIRECTION — the #606 household clause, here without a Personenzahl).
⇒ **Neither half alone decides, and each half alone looks like a lenient PASS.** Read in
isolation, sentence 1 is "a Suche with zero numbers" (⇒ #641/#608 lenient KEEP) and sentence 2 is
just the poster's reason for moving. Together they are two independent hard fails. So the
"silent Suche ⇒ KEEP" rule needs a stricter trigger: **silent means the title AND every prose
paragraph, including the motive sentence.** Grep the *motive* (`wächst|zu klein|Familie|Nachwuchs|
Zuwachs|mehr Platz`) as a first-class Suche criterion, not as colour.
  - **An Ortsteil-level target inside our own city is still an area FAIL.** „in **Potsdam West**"
    is not „in Potsdam": Golm is a Potsdam Ortsteil, but ~6,5 km from the one they named, and
    there is no `am liebsten` / `ggf. auch` / `bevorzugt … aber` softener. Do not let the shared
    city name upgrade it to a match — the #662 „in Potsdam" *literal* pass only works when the
    poster wrote the bare city.
  - Rent axis was a lenient PASS (no ceiling stated) but ran hard against us for once: their
    570/830 vs our 1.025,25/1.214,93 = **+79,9 % kalt / +46,4 % warm** on an Indexmiete. Write it
    as a labelled inference (#662 rule) and say plainly that direction + Ortsteil, not the money,
    decided.
  - Side 1 still passed at **4,2** (both must-haves double-evidenced), so the "watch for it as a
    normal Vermietung" follow-up applies — check the side-1 number before writing that line (#610).

**Anbieter-ID magnitude ≈ how long the swap has been unmatched.** Recent GmbH-feed posters ran
113343 (#662), 338350 (#664), 427872 (#661), 476848 (#641); #665 was **38298** — an order of
magnitude lower, i.e. a long-standing tauschwohnung.com account, and Immowelt's `tags.isNew` was
`false`. Not a scam signal and not a scoring input, but a useful freshness read: a very low id on a
still-live ad means the poster has been looking for a long time (⇒ their stated criteria are
probably firm, not an opening position). Complements the *cross-portal dedup* use of the same field
documented below.

### A `Möbliert/Teilmöbliert` flag on a swap is NOT the furnished / "auf Zeit" hard blocker
#653 (Kleinanzeigen, Tauschwohnung GmbH, 14055 Berlin-Westend) carries the checktag
**`Möbliert/Teilmöbliert`** next to Balkon/Terrasse/Keller. Taken at face value that fires the
furnished/Zwischenmiete cap (≤2,0) from `evaluate.md` and kills a 4,1 flat. It should not, because a
swap is by construction a **permanent Mieterwechsel**, and the flag on these feed-imported ads means
"furniture can be taken over", not "let furnished for a limited period".
⇒ Decide it on the *accompanying* evidence, never on the tag alone. Fire the blocker only if at least
one real furnished-let marker is present: `befristet` / `auf Zeit` / `Zwischenmiete` / `Untermiete`,
a Mietende or Mindest-/Höchstmietdauer, a **Pauschalmiete** (one all-in figure with no Kalt/NK split
*and* an explicit "inkl. alles"), or a hotel-style inventory list. On #653 all of those were absent
and the 17 photos plainly showed the **resident family's own belongings** (toys, bunk beds, fridge
magnets, personal pictures) — i.e. an occupied home, not a furnished rental product.
⇒ Still raise it as an explicit open question in Block E + Next Steps ("Möbelübernahme oder möbliert
auf Zeit?") and state the conditional: if the answer is the latter, the blocker applies and the score
drops to ≤2,0. *Why:* the tag alone would have discarded the best Berlin swap seen so far; ignoring it
silently would have hidden a genuine ≤2,0 risk. Watch whether it recurs across the GmbH feed — if so
it is a systematic import artefact and belongs in `evaluate.md` next to the furnished rule.

### Swap-specific Block A caveat: the advertised rent is the partner's ALTVERTRAG, not our price
A Mieterwechsel per Tausch needs the landlord's consent, and consent frequently comes as a **new
contract at market rent** rather than continuation of the old one. #608 advertises 980 EUR kalt =
11,01 EUR/m², ~29 % under the Potsdam Angebotsanker (~15,51) — at market that flat is ~1.380 EUR.
So the most valuable question in the first contact is *"Wird der bestehende Vertrag übernommen oder
neu abgeschlossen?"*; the answer can move Block A by ~1,5 points. Say this in the report rather than
scoring the partner's Altvertrag price as if it were ours. Corollary: a cheap swap rent is the
*signature* of an Altvertrag, which is why the "> 20 % unter Mietspiegel" High scam signal must not
fire on it — it needs an address-precise band, and against the **ortsübliche** Vergleichsmiete these
prices usually sit ABOVE the Mittelwert, not below.
  ⚠ **The Altvertrag premise is an inference, not a given — test it against the Angebotsanker.**
  #669: 1.100 EUR / 75 m² = **14,67 EUR/m²**, i.e. ~−5 % off the Potsdam Angebotsanker (~15,51) and
  **+95,9 % over** the ortsübliche Vergleichsmiete (bis 1948 · kein EA · Spalte C = 7,49). Every
  other swap in the series sat at 6–12,6 EUR/m². At Angebotsmarktniveau there is **no Altvertrag to
  inherit**, so the "consent may come as a new contract" risk is already priced in — and the real
  Block-A story flips to a **Mietpreisbremse overshoot** (zulässig 8,24 EUR/m² = 618 EUR ⇒ +78 %),
  making § 556g Abs. 3 BGB (Vormiete, Baujahr, Modernisierungsumfang) the first contact question
  instead. ⇒ Rule of thumb: swap €/m² near the Angebotsanker ⇒ young contract, Mietpreisbremse
  check; swap €/m² at half the Angebotsanker ⇒ Altvertrag, successor-rent question. *Why:* writing
  "Bestandsmiete, günstig geerbt" on a 14,67-EUR/m² ad would invert the actual risk.

## Even on IS24 the object-specific twg.click link is NOT guaranteed — check "Weitere Links" first
Some IS24 swap exposés carry only the **generic** `https://twg.click/is24-homepage` in the
`REFERENCE_LIST` titled "Weitere Links" (it 302s to the tauschwohnung.com front page with utm
params), not the per-object `twg.click/is24-{objektNr}-NN`. **Do not construct the object link
from `OBJECT_INFO`'s Objekt-Nr.** — on #526 (expose 169826619, Objekt-Nr. 349800) `is24-349800-01/02/03`
were all hard **404**, and `tauschwohnung.com/wohnung/349800` answered 200 with the soft-404 body
("Seite nicht vorhanden"): the IS24 Objekt-Nr. is NOT a tauschwohnung housing id.
⇒ Rule: read the actual `url` in "Weitere Links". If it is `is24-homepage`, the NUXT route does not
exist for this listing — fall back to the free-text Suche exactly as on Immowelt/Kleinanzeigen
(Keller/Baujahr/Kaution/moveInDate stay whatever IS24's ATTRIBUTE_LIST says, Suche = description).
Budget: one grep of the REFERENCE_LIST, not 4 curls. *Why:* #526 burned 4 probes rediscovering this.

Confirmed again on #549 (expose 169908691, Objekt-Nr. 443422): "Weitere Links" held only
`is24-homepage`. Treat the generic link as the *common* case on IS24 swaps, not the exception —
go straight to the free text. **But always look: it is roughly a coin flip, not a dead end.** #610
(expose 170120501) carried BOTH `is24-homepage` and a working object link `twg.click/is24-401260-899`
(note the **3-digit** tail, not the `-NN` two-digit form) → 302 to the tauschwohnung.com detail page,
full `__NUXT_DATA__`, structured `search` + `housing`. When the object link is there it is worth the
one curl: it delivered `market: "free"` (= no WBS, otherwise unknowable), `constructionYear`/
`energyEfficiency`/`moveInDate`/`deposit` as explicit nulls (so "unstated" is *proven*, not assumed),
and the `search.radius` field that decided side 2.

### IS24 `realEstateType: houserent` swaps are the sparsest variant — expect NO Ausstattung at all
On #549 the whole expose carried just three ATTRIBUTE_LISTs: "Hauptkriterien" (only `Wohnfläche ca.`
+ `Grundstück ca.` — the rest are SCHUFA/Telekom ad LINKs), "Kosten" (Kaltmiete + Preis/m² +
`Gesamtmiete: "1.900 € zzgl. Heiz- und Nebenkosten"`, i.e. **NK and Warmmiete genuinely absent, not
zero**), and "Bausubstanz & Energieausweis" containing the single line `Wesentliche Energieträger:
Keine Angabe`. There is **no Ausstattung block and not one CHECK attribute**, so Keller / Balkon /
Terrasse / EBK are *unresolvable* — the one-line Objektbeschreibung is the only amenity source.
Score the must-haves as unconfirmed (Block E ~2,5), don't read the absence as a negative.
MEDIA was 10 PICTURE tiles **all** captioned `www.tauschwohnung.com` (+1 AD) = 0 real photos → cap D.
`PRICE_INFO.priceBar` still works and is the only price anchor worth having, which matters doubly
here: the **Berliner Mietspiegel excludes Ein-/Zweifamilien- und Reihenhäuser**, so for a Berlin
`houserent` there is no Mietspiegel field to compare against at all — use the priceBar percentile
plus a § 556g Abs. 3 BGB Auskunft note. *Why:* without this you hunt for a criteria table and a
Mietspiegel row that cannot exist, and risk logging "keine Ausstattung" as if the flat lacked it.

**The free-text Suche is often one sentence in the middle of the Objektbeschreibung, not a tail
block** — #526: *"Ich möchte mich Ende 2026 verkleinern um weniger Miete zahlen zu müssen und suche
daher auf diesem Weg eine 3 Zimmer Wohnung."* It carries rooms + timing + an implicit rent ceiling
(their own "derzeit 1175 € Kalt") and no Ort at all. Read the WHOLE description, and mine the
*motive* ("verkleinern", "weniger Miete") — it is the decisive side-2 axis, often more decisive than
the literal room count: a 2-Zi offer that is 150 EUR cheaper serves a downsizer's stated goal even
though it misses "3 Zimmer" by one.

**IS24 swap description text can end in a literal "…" that is the poster's own ellipsis, not
truncation** — verify with `len()` on the raw `text` field before hunting for a fuller copy
(#526: 231 chars, complete).

## The NUXT route only exists from IS24 — from Immowelt AND Kleinanzeigen you are on free text alone
An Immowelt swap expose has **no `twg.click` / "Original-Exposé" link**, and its `Referenznummer`
is the poster's **Anbieter-ID**, not a tauschwohnung.com housing id. `tauschwohnung.com/wohnung/{id}`
answers **HTTP 200 with a soft-404 body** ("Fehler - Seite nicht vorhanden"), so probing by status
code alone gives a false positive — grep the body for `Seite nicht vorhanden` before parsing.
⇒ On an Immowelt-sourced swap, the description's free-text "Ich suche …" paragraph is the whole
side-2 input; Keller / Baujahr / Energieausweis / Kaution / moveInDate stay **unknown**, not
resolvable. Details in `immowelt.md`. *Why:* #521 spent two calls on the IS24-only route.

**Same on Kleinanzeigen** (#524): no `twg.click` link anywhere in the HTML, and the ad's
"Anbieter-ID / Anbieter-Objekt-ID" (e.g. 237825) is the *poster's* id — `tauschwohnung.com/wohnung/237825`
returns 200 + the soft-404 body, and `twg.click/ka-{id}-01` is a hard 404. There is no housing id on the
page, so the Suche is whatever the title + `#viewad-description-text` say — and on #524 they said nothing
at all. Record "Suche unknown", fall back to their own flat as the yardstick, apply the lenient rule.
**Status-code update (2026-08-22, #641, Anbieter-ID 476848): the probe now returns a HARD `404`**
(status 404 *and* the "Seite nicht vorhanden" body), not the old 200+soft-404. So one `curl -w
"%{http_code}"` settles it — but keep grepping the body, since 200-with-soft-404 was the behaviour for
months and may come back. Either way it is ONE curl, not four: the ID on a Kleinanzeigen swap is never
a housing id, so the outcome is known before you send it.

**Where the free-text Suche sits on the Immowelt/Tauschwohnung-GmbH variant: the SECOND-TO-LAST
paragraph, immediately before the "Diese Anzeige wurde von einem Nutzer eingestellt …
tauschwohnung.com stellt nur die Plattform bereit" legal boilerplate.** #664: headline was pure
self-description ("TAUSCHWOHNUNG Biete 3 Raum Babelsberg mit kleinem Garten EG Perfekte Lage" — no
"gegen …" half), and the whole side-2 input was one sentence in that slot: *"Wir suchen eine 3
Wohnung **ab 85 m2** mit Balkon, Terrasse oder Garten in Babelsberg, Innenstadt, Berliner- oder
Templiner Vorstadt oder Klein Glienicke."* ⇒ **A silent TITLE is not a silent Suche** — read the
full description down to the boilerplate before invoking the lenient-KEEP rule of the next section.
⚠ **"Second-to-last" is the modal slot, NOT a rule — the Suche is just as often the SECOND
paragraph, i.e. right after the "(Anbieter-ID: N)" line.** #656 had it in the title + first sentence;
**#683 has it in paragraph 2** (*"Wir suchen ein helles Zuhause mit mind. 3-4 Zimmern, mit Garten
oder Gartenzugang, bevorzugt in ruhiger, grüner Lage in Rand-Berlin oder im nahen Umland"*), while
the second-to-last paragraph carried only the *direction* (*"mit wachsender Familie wünschen wir uns
einfach mehr Platz, Natur und am liebsten einen eigenen Garten"*). ⇒ **Never slot-hunt: read the
whole `sections.mainDescription.description` end to end and collect EVERY Suche clause, because the
numeric criteria and the direction clause routinely sit in different paragraphs** and each can decide
side 2 on its own. *Why:* stopping at the documented slot on #683 would have found the direction but
missed the „mind. 3-4 Zimmern" floor, i.e. the one clause that makes the fail deterministic rather
than a judgement call.
**Richest documented form (#667): a colon-headed BULLETED Suchprofil in that same slot** — *"Ich
suche einen Tausch mit einer Wohnung in Berlin Schöneberg, Wilmersdorf oder Charlottenburg, ggf.
auch Potsdam:"* followed by `- mind. 3 Zimmer / - mind. 80 qm / - Balkon / - Badewanne /
- vorzugsweise Altbau / - gerne mit Aufzug`. Note the built-in priority grammar: **`mind.` = hard
floor, bare noun = hard must-have, `vorzugsweise`/`gerne` = soft preference** — the poster grades
their own criteria, so score each bullet at the weight they gave it instead of treating the list as
uniform. Here the title *also* carried the direction ("… in Potsdam **gegen Berlin**"), so title and
body agreed; a bulleted list is the easiest Suche to read and the easiest to under-weight.
Two sub-details from the same ad:
- **An alternative-set Ausstattungswunsch ("Balkon, Terrasse **oder** Garten") is satisfied by our
  Golm garden** — it is the one criterion our offer routinely meets, and it never rescues a numeric
  fail. Score it ✓ in the checklist so the email row is honest, then let axis 3 decide.
  ⚠ **Its mirror: a BARE standalone „Balkon" is an Ausstattungs-FAIL for us, not a near-miss.**
  #667 listed „- Balkon" as its own bullet with no `oder`; our EG flat has a ~29 m² Garten and no
  balcony, so the criterion is simply unmet. The whole difference between #664 (✓) and #667 (✗) is
  the word `oder`. Corroborate with their own flat: a poster who already has two Balkone plus a
  Dachterrasse wrote „Balkon" deliberately. ⇒ Read the conjunction, not just the noun.
  ⚠ **THIRD form — „Disjunktion PLUS Konjunktion" — reads like the ✓ case and is actually a ✗.**
  #671: „**Unbedingt mit Balkon oder Terrasse und Gartenmitbenutzung.**" The word `oder` is present,
  so the #664 rule fires on a skim — but the `oder` only ranges over *Balkon|Terrasse*, and the
  Garten is bolted on by `und` as a **separate, additional** requirement. Our Golm garden therefore
  satisfies the second conjunct and **cannot substitute for the first**, which our flat fails
  outright (no Balkon, no Terrasse). ⇒ **Parse the scope of `oder` before crediting it:** if a
  `und {Garten…}` follows the disjunction, the garden is an extra demand, not an alternative.
  Decision rule: `A oder B oder Garten` ⇒ ✓ · `A oder B **und** Garten` ⇒ ✗ (Garten ✓, A/B ✗) ·
  bare `A` ⇒ ✗. The intensifier `unbedingt` (also `zwingend`, `muss`, `Bedingung`) marks the clause
  as hard and removes any near-miss leniency. *Why:* crediting the `oder` here would have flipped a
  correct DISCARD into a contact on a Suche that rules us out in its own words.
- **A named Ortsteil list with NO openness clause is an area FAIL** — the exact mirror of #606's
  "Bevorzugt A, B, C … aber bietet gern alles an" (lenient PASS). The presence/absence of a closing
  openness sentence is the whole difference; **third documented form, #667: a trailing
  „…, *ggf. auch Potsdam*" appended to a Berlin-Ortsteil list is a genuine openness clause ⇒ area
  PASS on the poster's own wording, no commuter-belt leniency needed.** Grep the tail of the Ort
  clause for `ggf|eventuell|evtl|oder Umgebung|auch in|gern auch|am liebsten` before calling an area
  fail — the clause is usually 2–3 words and easy to read past.
  **Fourth documented form, #669: the openness word LEADS the clause instead of trailing it —
  „**Am besten** auch in Babelsberg oder in zentraler Lage in Potsdam."** Two named targets, both
  narrower than Golm, yet „am besten" (+ the „auch") frames the whole clause as a *preference*, so
  it is an area **PASS** — and the follow-up „zentraler Lage in Potsdam" names our own city, which
  Golm is part of. ⇒ Add `am besten|bevorzugt|vorzugsweise|idealerweise|vor allem` to the grep and
  check the **head** of the Ort clause too, not only its tail.
  **Fifth documented form, #671: the bare adverb „Gerne" opening the clause — „**Gerne** in der
  Brandenburger Vorstadt/ Potsdam West."** Same class as „am besten"/„am liebsten", but shorter and
  with no `auch` to help; it is easy to read as a plain statement of target. It is an openness
  clause ⇒ area **PASS**. Note the direct contrast within the same portal and Ortsteil: **#668 wrote
  „Wir suchen eine Tauschwohnung in Potsdam West" (bare, no adverb) ⇒ area FAIL, while #671 wrote
  „Gerne … Potsdam West" ⇒ area PASS.** Identical Ortsteil, opposite verdict, and the entire
  difference is one six-letter adverb. ⇒ Grep list becomes
  `gerne|gern auch|am besten|am liebsten|bevorzugt|vorzugsweise|idealerweise|vor allem|ggf|eventuell|evtl|oder Umgebung|auch in`.
  *Why:* scanning only for a trailing
  clause makes a leading „Am besten" invisible and converts a lenient PASS into a bogus area fail —
  which then hides *which* axis really killed the swap. On Immowelt there is no `radius` field to fall back on
  (axis 5 is IS24-NUXT-only — `roomsMin`/`sizeMin`/`rentMax`/`selectedGeos` return **0 hits** in
  636 KB of Immowelt HTML, and the only price pair on the page, `defaultBackToSearch`
  priceMin/priceMax, is a mechanical ±20 % window around the asking price, see `immowelt.md`).

**Cross-PORTAL swap dupes: Tauschwohnung GmbH syndicates one flat to Kleinanzeigen AND Immowelt.**
CONFIRMED 2026-08-23: report #641 (Kleinanzeigen, Babelsberg, 700 EUR / 60 m² / 3 Zi / 1. OG, 2021
renoviert, 5 Fotos, Anbieter-ID 476848) and the queued Immowelt expose `94b8c035-…` are **one flat**
— closed as DUPE, no #665 written. All five prose-fingerprint axes matched verbatim: identical
headline (`TAUSCHWOHNUNG Klein aber Fein: 3-Zimmer-Wohnung in Babelsberg`), identical description
(1.OG, „viele liebe Nachbarn", 2021 komplett renoviert incl. Netzwerk + Heimkino, 10-min-Radius mit
Linden- und Filmpark), 5 Fotos, 700 EUR / 60 m² / 3 Zi.
⚠ **CORRECTION to the "never dedupe swaps by Referenznummer" rule: that holds only ACROSS
syndicators. WITHIN the Tauschwohnung-GmbH feed the poster's `Anbieter-ID` is stable cross-portal
and is the single cheapest dedup key there is.** Immowelt prints it in **two** places —
`Referenznummer: 476848` in the Anbieter tail *and* a literal line in the description body,
„Es handelt es sich hierbei um ein Tauschangebot. (Anbieter-ID: 476848)" — and Kleinanzeigen prints
the same 476848 as its Anbieter-/Objekt-ID. (Immowelt's `Online-ID`, here `261G6BY8HXRI`, stays
portal-internal and is useless cross-portal.) The #660/#661 case that produced the original warning
was **Wohnungsswap.de vs Tauschwohnung GmbH** = two different syndicators, hence two different ids.
⇒ On a suspected cross-portal swap dupe, grep both ads for `Anbieter-ID` FIRST (one field, settles
it), then confirm with the prose fingerprint. *Why:* the orchestrator explicitly instructed "do NOT
try to settle it with Referenznummer — on swap ads those always differ", which is only half true and
would have cost a full A–H re-scoring.
⚠ **…but grep the Anbieter-ID over `reports/*.md`, NOT over `data/listings.md` — the tracker's Notes
column usually does NOT carry it.** #673: the briefing said "grep it against `data/listings.md` Notes
first"; `grep 477331 data/listings.md` returned **nothing**, while `grep -rn 477331 reports/` hit
`606-…md` instantly ("Inserent ist ein privater Mieter (Anbieter-Objekt-ID 477331)"). #606's tracker
row records only the *portal-internal* Kleinanzeigen Ad-ID 3488620217, which by the rule above is
useless cross-portal. The full-body report is where the id survives. ⇒ Standard dedup grep for a swap
is `grep -rn "{id}" data/listings.md data/pipeline.md reports/` — all three at once, one call. A
listings-only grep returns a **false "not a dupe"** and buys a whole redundant evaluation.
⇒ Cheap belt-and-braces second key: grep a **distinctive prose phrase** from the Suche at the same
time (#673: `"ZWEI Wohnungen"`), which caught the same report independently.
**Bonus: fetch the sibling even on a confirmed dupe — the richer post can RESOLVE an open question
from the first report.** #641 could not decide whether the bare `700 €` was kalt or warm (it flips
the side-2 rent delta by ~27 points and the whole Mietpreisbremse verdict). The Immowelt twin states
it outright: `"price":{"value":"700 €","additionalInformation":"Kaltmiete"}` plus a `Mietkosten`
block reading `Kaltmiete 11,67 €/m² · 700 €` and `Kaution: keine Angabe`. ⇒ 700 EUR = **Kaltmiete**,
Nebenkosten genuinely unstated. Also corroborated: the Suche is silent on BOTH portals (Immowelt
headline has no `gegen …` half; body is self-description + boilerplate; `Keller/Balkon/Terrasse/
Garten/Baujahr/möbliert/WBS/Aufzug/Einbauküche` = **0 hits in 616 KB**, and there is no `"features"`
key at all — the Merkmale block is entirely absent, not merely truncated) ⇒ #641's lenient-KEEP
stands, now on two independent posts.

### The Suche can be a COORDINATED CLAUSE of the self-description sentence, not a sentence of its own
#669 (Immowelt, Babelsberg Süd): the entire description is three sentences, and the middle one is
*„Wir wohnen in der Hochparterre eines schönen Altbaus mit 3 Zimmer, Flur, Küche, Bad und einer
Loggia **und suchen mind. 4 Zimmer**. Am besten auch in Babelsberg oder in zentraler Lage in
Potsdam."* — i.e. the Suche hangs off the self-description by a bare `und`, sharing its subject.
Sentence-splitting or paragraph-hunting ("which paragraph is the Suche?") finds **one** paragraph
that reads as pure self-description and can be filed as "silent". ⇒ Match on the **verb**
(`suche|suchen|gesucht|wünschen uns|bräuchten|benötigen`) anywhere in the body, not on a
sentence/paragraph boundary, and always read the self-description sentence to its end. *Why:* this
is the cheapest Suche shape to miss (whole side 2 in nine words), and missing it flips a determined
DISCARD into a bogus "Suche unknown → lenient KEEP".
  - Also #669's positive lesson: **a Suche can be lenient-PASS on every axis but one and still be a
    determined fail.** Area PASS („Am besten …"), m² unstated, no rent ceiling, no Ausstattung, no
    Bausubstanz, and — a first in 14 swaps — the **money axis running in OUR favour** (their
    1.100/1.350 vs our 1.025,25/1.214,93, i.e. the partner would pay *less*). One numbered floor
    („mind. 4 Zimmer") killed it anyway. ⇒ Never let an accumulating run of PASSes soften the
    reading of the one written number, and say in the report which single axis decided.

### The Suche can be an INVERTED `gegen … suchen wir` clause — every documented trigger returns 0
#670 (Immowelt, Drewitz, Anbieter-ID 105369): the *entire* description is one sentence —
*„Wir tauchen eine 3 Mietwohnung in Potsdam Drewitz an **gegen eine 4 zimmer wohnung in Potsdam
oder Ludwigsfelde suchen wir** wir sind 2 Erwasche und 2Kind"* — and the title
(„TAUSCHWOHNUNG **Tauschwoungung**") is a pure typo carrying no `gegen …` half.
Sweep result: `im Gegenzug` **0** · `Ich suche` **0** · `Wir suchen` **0** · `Nun suche ich` **0** ·
`Suchprofil`/`Das suche ich` **0** · `mindestens` **0** · `Du suchst`/`bietest` **0**. Only the bare
stem `suchen` hits, and it sits **after** its object in an inverted V2 clause (`gegen X suchen wir`),
so even a `such(e|en) (eine|nach)` pattern misses it. ⇒ **Add `gegen …` as a body-level trigger, not
just a title trigger, and match the bare stem `such` anywhere.** *Why:* the `gegen X` construction
was so far only ever seen in titles („… gegen 4+ Zimmer in Berlin"), so a body-only trigger list
plus a title check both come up empty and produce a bogus "Suche unknown → lenient KEEP".

  - **New independent side-2 axis: the stated HOUSEHOLD SIZE.** #670 closes with „**wir sind
    2 Erwasche und 2Kind**" = 4 persons. That is a *structural* floor that stands even where no
    room number is given: 4 people do not fit our 2 Zi / 54,19 m² (13,5 m²/person), and most
    Vermieter apply an Überbelegungs-check. ⇒ Grep the body for `wir sind \d`, `\d ?(Kind|Kinder)`,
    `Familie`, `zu (zweit|dritt|viert)`, `Personen` and score it as its own row in the checklist.
    It is also the *reason* behind a room floor, so it makes the discard defensible even if the
    partner later "softens" the number.
  - **The money axis STILL cannot fail when no ceiling is stated — now proven at the extreme.**
    #670 is the largest rent delta of the whole series: their 324/457 vs our 1.025,25/1.214,93 =
    **+216,4 % kalt / +165,8 % warm (2,66×)** — and the ad states **no** Mietobergrenze, not even
    an adjective („bezahlbar"). Under the lenient rule that is a **PASS**, with the delta written
    down as a *labelled inference* only. The orchestrator had pre-called this as "the first of the
    batch to fail on money"; it failed on rooms + household size instead. ⇒ Never convert a large
    computed delta into a stated criterion; a rent axis fails only on words the partner wrote
    (a number, or „bis max. …", or „bezahlbar/günstig"). *Why:* letting arithmetic manufacture a
    fail is exactly the recall loss the lenient rule exists to prevent.
  - Positive note for our offer, worth reusing: **partners leaving an upper floor without a lift
    are the one group our EG+Personenaufzug genuinely serves.** #670 sits in a 4. OG/DG with
    `Aufzug` = 0 hits. It still fails on rooms, but say it in the report — it is the second time
    (after #655 „weniger Treppen steigen") that barrierearm was our strongest matching axis.

### Side-2 sub-case: the TOTALLY silent Suche (no "gegen X" title, no Suche sentence at all)
#641 (Kleinanzeigen, "TAUSCHWOHNUNG Klein aber Fein: 3-Zimmer-Wohnung in Babelsberg", 60 m² / 3 Zi /
700 EUR): the description describes only their own flat and ends in the tauschwohnung.com boilerplate —
**zero** Zimmer/m²/Miete/Ortsteil/Ausstattung/Personenzahl anywhere, and no `{N} Raum gegen {M} Raum`
title either. This is NOT #608's positive shape (there M was stated and matched our 2 Zi exactly); here
there is no matchable criterion at all. Verdict is still **lenient KEEP / Swap-candidate** — all five
kill axes silent = pass, and "unknown Suche" must never be converted into an assumed ceiling.
⇒ But the report must then carry the **honest economic read as an explicitly-labelled inference**, not
as a Suche: when their flat is BOTH cheaper AND bigger than the Golm offer (700 EUR / 60 m² / 3 Zi vs
1.025,25 / 54,19 / 2 Zi = −1 Zi, −5,81 m², +46,5 % kalt or +73,6 % warm), the partner is by construction
in the one class our offer cannot serve, so a decline is the likely outcome — say so, cap the time
budget at one message, and let the user decide. *Why:* without that paragraph a "Swap-candidate" with a
100 %-unknown Suche reads as a promising lead, and with it the user gets the same recall at honest odds.
Also state which reading of an unsplit price you used: when the ad shows a bare price heading and **no**
NK/Warmmiete field, kalt-vs-warm is genuinely undecidable and flips the rent delta by ~27 points.

- **Variant „silent except for a bare city clause" — and the honest read can point the OTHER way.**
  #672 (Immowelt, Anbieter-ID 474144, Eiche, 4 Zi / 94 m² / 900 kalt / ca. 1.300 warm): the only search
  statement in the whole exposé is the sign-off „Wir freuen uns auf einen **Wohnungstausch in Potsdam**".
  All five kill axes silent ⇒ lenient pass, and the city clause is **literally satisfied** (Golm *is* an
  Ortsteil of Potsdam) so leniency is not even invoked — say that, it is stronger than a soft match.
  What differs from #641: there the partner was cheaper AND bigger, so the honest read was "they will
  decline". Here their flat is bigger (−2 Zi / −42,4 % for them) but their **warm rent is HIGHER than
  ours** (1.214,93 vs ca. 1.300 = **−6,5 %**) even though our kalt is +13,9 %. ⇒ On a silent Suche always
  compute **both** deltas: a partner can be worse off on space and better off on money, and that is the
  only lever the first message has. Same duty as #641 — label it an inference, not a Suche.
- ⚠️ **The mirror of the #666 „Du suchst …" trap: a second-person RHETORICAL OPENER that describes the
  OFFER and reads exactly like a Suche.** #672 opens „**Bist du auf der Suche nach einer geräumigen
  Wohnung in Potsdam?**" — same grammar family as #666's real second-person Suche, opposite meaning:
  #666 attached the criteria to *deine Wohnung* (= what the partner owns ⇒ their Suche), #672 attaches
  them to what the reader *wants* (= a pitch for their own listing). Taking it as a Suche would have
  invented a floor of „geräumig … in Potsdam" and could have flipped the verdict.
  **Test that separates them in one step: which flat do the criteria describe?** If the sentence's
  object is the READER's flat („bietest deine 4-Zi-Wohnung", „deine Wohnung in X") ⇒ Suche. If it is the
  POSTER's flat, restated in the next sentence with „Wir bieten …" ⇒ marketing, not a Suche. Second tell:
  a rhetorical opener is a **question ending in „?"** followed immediately by „Wir bieten/Wir haben".
  Same duty for the headline: #672's „**Perfekt für Familien**" describes the offer's suitability, **not**
  the poster's household — do not read it as a household-size clause (`personen`/`kind` were 0).

## ⚠️ The SAME swap ad appears twice on Immowelt — via Wohnungsswap.de AND via Tauschwohnung GmbH
Two competing swap platforms syndicate into Immowelt, and a tenant who registers with both gets
**two `/expose/` pages for one flat**. Confirmed 2026-08-23: #660 (`53228bd7-…`, Anbieter
**Wohnungsswap.de**, Herr Tobias Jonnarth, Ref **1501708**, Online-ID **26F63QCEXRZE**, headline
`Wohnungsswap - In der Feldmark`) and #661 (`3a7cb8ce-…`, Anbieter **Tauschwohnung GmbH** c/o THE
9TH Bonn, Herr John Weinert, Ref **427872** = the poster's Anbieter-ID, Online-ID **26AX5VKYBCHT**,
headline `TAUSCHWOHNUNG Tausche Garten-Glück …`) are **one flat**.

**Never dedupe swaps by Referenznummer/Online-ID** — both are the *syndicator's* ids, so they always
differ and always read as "two different ads". Dedupe on a **unit fingerprint** taken from the prose:
the description's own title line, the exact m² (`70,53`, not the portal's rounded `70`), a physical
oddity (garden `ca. 6x8m` + Außenwasseranschluss), the occasion (`WG-Auflösung, Mitbewohner bereits
versorgt`), and the price triple (1.280 kalt / 250 NK / 65 EUR TG-Platz). All five matched verbatim.

**The Tauschwohnung.com variant is the RICHER one — fetch it before writing "confirmed missing".**
Same flat, wildly different structured data:

| | Wohnungsswap.de (#660) | Tauschwohnung GmbH (#661) |
|---|---|---|
| Merkmale-Chips | **1** (`Erdgeschoss`) | **7** — Erdgeschoss, **Barrierefrei**, Einbauküche, Bad mit Dusche, **Keller**, Bodenbelag, Garten |
| Fotos | 10 | **17** |
| `Keller` in HTML | 0 Treffer ⇒ „vierfach bestätigt kein Keller" | Chip vorhanden, Liste **nicht** abgeschnitten (`Alle N Merkmale anzeigen` = null) |
| Anbieter-Bewertung | keine | 4,4/5 (510 Bew.), 3 Jahre Partnerschaft |

⇒ The `immowelt.md` triple-negative test ("no expander + 0 HTML hits + no photo = confirmed absent")
is **sound per page but unsound per flat**: it certified a Keller as absent that the sibling ad lists
as a feature. **Add a fourth condition: no known sibling posting.** When a swap looks like a dupe of
something already evaluated, fetch the other variant and let the richer one win on amenities.

**The free-text Suche can also differ between the two posts** — here `mindestens 55 m²`
(Wohnungsswap) vs `mindestens 50 m²` (Tauschwohnung). Treat a single-platform m²/EUR floor as
approximate and score side 2 against the **more permissive** figure; a −1,5 % "near-miss" was in
fact a +8 % pass. Constraints that are *identical* across both posts (here: the five inner-city
Ortsteile, Must-haves EBK + Balkon, max 1.100 EUR warm) are the real, load-bearing ones.

*Why:* without this, one flat burns two full evaluations and the weaker post's gaps get written into
reports (and into `potsdam-mietspiegel.md`) as verified facts.

## Getting the partner's Suche (the side-2 input) — no browser needed
The IS24 expose NEVER contains the Suche. The expose's "Weitere Links" section has an
**"Original-Exposé"** link (`https://twg.click/is24-{objektNr}-NN`) that 302s to the
tauschwohnung.com detail page — plain `curl -sL` with a Firefox UA returns the full SSR
HTML (no consent wall, no bot-block).

Two places to read it:
1. **Rendered HTML**: `<h2>{Name} sucht</h2>` block with `search-item` divs (Miete bis X,
   Wohnfläche ab Y, Zimmer ab Z, Orte — but Orte collapses behind "Mehr anzeigen").
2. **`__NUXT_DATA__` script (better — complete)**: devalue-style flat array where dict
   values are indices into the same array. Find the dict with keys
   `{sourceUserId, targetUserId, housing, user, search, match,...}` (near index ~42):
   - `search` → `{cityNames, radius (km), rentMax, roomsMin, sizeMin, storeyMin/Max,
     residentCountAdults/Children, housingPropertyIds}` — the FULL Suche incl. radius
     and must-have property ids the HTML hides.
   - `housing` → their flat, richer than IS24: `isActive`, `deposit`, `moveInDate`,
     `constructionYear`, `energyEfficiency` (often missing on IS24!), `propertySize`,
     `market: "free"` (= no WBS), `housingPropertyIds`.
   - Property-id map: the array also holds `{id, key, inSearch}` dicts mapping ids →
     keys (`1=balconyOrTerrace, 2=fittedKitchen, 4=garage, 6=garden, 8=guestToilet,
     9=cellar, 12=petsAllowed, 14=floorHeating, 36=terracedHouse, 64=centralHeating,
     66=bathtub, 71=levelShower`). Absence of 9 = no Keller — the only reliable
     Keller signal (IS24 CHECK list omits negatives).
   - Resolve values with `data[idx]`; do NOT recursively follow ints (booleans/ids
     collide with array indices).
3. `moveInDate` can be a stale past date (seen 2024-03-01 on a live 2026 listing) —
   treat as "nach Vereinbarung", not as availability data.
4. Photos: the caption `www.tauschwohnung.com` is a **watermark attribution, not proof of a logo
   tile** — do NOT infer "0 real photos" from the caption alone (that misread would have capped D
   on #548, which has 14 genuine phone photos all captioned that way). Decide by **fetching one
   `fullImageUrl`**: a real photo is ~40–60 KB at 1333×1000 (amateur snap with a translucent
   "Tauschwohnung" wordmark across the middle); a placeholder/logo tile is tiny and uniform, and
   the `Gesponsert`-captioned tile has an **empty** `fullImageUrl` (it is the AD slot, never count
   it). One curl + `file` settles it; only then cap Block D at 3.0 for "no real photos".

**Why:** without the twg.click fetch the two-sided swap match runs blind ("Suche unknown")
and the Keller/Energieausweis facts are wrong or missing; the NUXT payload gave the exact
radius (10 km) that decided the side-2 verdict on #335.

## The NUXT structured `search` dict can CONTRADICT the owner's free-text Suche — read BOTH
On #454 (expose 169486171, obj 191235, Lankwitz DHH) the housing owner's own
Objektbeschreibung said the Suche was "**2-3 Zimmer**, günstig, ruhig/hell/grün, am liebsten
**Bergmannkiez/Kreuzberg**, nur nah angrenzend ok", while the resolved NUXT `search` dict (idx-42
`{...,search}`, userId matching the housing) said `roomsMin 4, sizeMin 110, rentMax 1500,
storeyMin 2, cityNames [Berlin], radius 0`. The two disagree on rooms (2-3 vs ≥4) and size.
Don't trust the structured dict alone as "the Suche" — it can be a stale/match-derived filter.
**Treat the Objektbeschreibung tail ("Suche dafür …") as the authoritative human intent, and use
the structured dict only as a corroborator.** When they agree on the decisive axis (here: both
say **Berlin** city, both exclude a 2-Zi/54-m² Golm flat) the side-2 verdict is robust regardless.
IS24 MEDIA here was 5 tiles all captioned `www.tauschwohnung.com`/`Gesponsert` = 0 real photos
(cap D 3,0), and `energyEfficiency` (Klasse A) came ONLY from NUXT — IS24 ATTRIBUTE_LIST was all null.
**Why:** scoring side 2 off the structured `roomsMin 4/110 m²` alone would misstate what the partner
wants; reading the free text confirmed the real target (Kreuzberg) and made the mismatch unambiguous.
