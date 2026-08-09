# Mode: evaluate — Single Listing Evaluation

Evaluates a single real estate listing using the 8-block scoring system (A–H). Produces a detailed report.

## Input

One of:
- A URL to a listing on a supported portal
- Pasted listing text
- A listing # from the tracker (re-evaluate)

## Browser & portal quirks (doctrine)

General policies for opening listing pages. Stable, applies to every evaluation. (Concrete per-portal steps/selectors — which change more often — live in the `immo-evaluator` agent's memory at `.claude/agent-memory/immo-evaluator/`, and the portal's `notes:` in `portals.yml`.)

- **Trust the LIVE listing, not cached metadata.** The title/type/price passed in (from `scan-history.tsv` / `pipeline.md` / the caller's prompt) is only a hint and is often **stale** — listers edit titles (e.g. expose 168542537 was re-titled away from "…zur unbefristeten Untermiete", but the cached title still said Untermiete and produced a bogus "sublet" report). Read the live page and base every field — especially a consequential label like **Untermiete / Zwischenmiete / möbliert / Tausch / Mietkauf** — on what the page actually says now. If a caller-supplied label isn't on the live page, drop it and say so. Never let a cached title drive the score.
- **Aggregators (Süddeutsche Immobilienmarkt, Regionalimmobilien24).** Their detail page is a thin re-list that links out to the real source (Immowelt / ImmoScout24 / OhneMakler / E&V). Open the source and extract there. Aggregator caches go **stale**: if the source is deleted / "Anzeige gelöscht" / "nicht gefunden", mark **EXPIRED** — never score the cached numbers.
- **CAPTCHA** ("Ich bin kein Roboter", ImmoScout24 especially): wait ~8 s and re-check — most auto-solve. Only report blocked if still stuck after waiting; do not ask the user prematurely.
- **Cookie/consent dialogs**: choose the privacy-preserving option ("Ablehnen" / decline non-essential). Content usually renders behind it; some portals also lazy-load cards on scroll (scroll to the bottom and wait before extracting).
- **Number format in reports is always German** (see Report Format): `1.443,87 EUR`, `80,5 m²`, `3,5 Zimmer`.
- **Furnished / "auf Zeit" / Zwischenmiete / Mietkauf** are not standard long-term rentals: apply the hard-blocker cap per `_shared.md` (Zwischenmiete) or discard (Mietkauf is a sale), and say so.
- **CiC truncates returned strings at ~1100 chars** — extract field-by-field, not in one giant blob.
- **Immowelt: go to CiC FIRST — do not open it with `mcp__invisible-playwright__*`.** `new_page` wedges on Immowelt detail pages and returns nothing. Observed on #397, #538, #539 and #542; on #538 it burned a full 30-minute MCP idle timeout (35,7 min for one evaluation vs a ~6 min baseline). Both backstops now bound it — `IP_TIMEOUT_MS` (30 s, context default in `scripts/invisible-playwright-mcp.py`) and the per-server `"timeout": 120000` in `.mcp.json` — so a stall now fails fast instead of hanging, but it is still a wasted round trip. Entry sequence that works: `tabs_context_mcp{createIfEmpty:true}` (required — a bare `tabs_create_mcp` errors out) → `tabs_create_mcp` → `navigate` → `javascript_tool`. Close only the tab you created.
- **Prefer a plain `curl` over any browser when the portal has a data route.** ImmoScout24 answers fully on `api.mobile.immobilienscout24.de/expose/{id}` with UA `ImmoScout24_1410_35_._`, and Kleinanzeigen detail pages render server-side — both need no browser at all. This is the single biggest lever on evaluation cost, and a curl-only evaluation holds no browser lock, so it is safe to run in parallel with other evaluations (see `immo-find` auto Step 4).

## Workflow

1. **Read profile**: `config/profile.yml` for search criteria, `modes/_profile.md` for overrides
2. **Get listing data**:
   - If URL: open it in the browser (CiC for bot-protected portals) and extract all listing details — applying the Browser & portal quirks above
   - If text: parse the pasted content
   - If listing #: read existing report from `reports/`, re-evaluate with current criteria
3. **Extract structured data**:
   - Title, address/location, Bezirk/PLZ
   - Kaltmiete, Nebenkosten, Warmmiete (or Kaufpreis + Nebenkosten for purchases)
   - m², rooms, floor, total floors
   - Baujahr, condition, last renovation
   - Energieausweis class + kWh/m²a
   - Amenities: Balkon, EBK, Keller, Stellplatz, Aufzug, Badewanne, Garten, etc.
   - Availability date
   - Pet policy, WBS requirement, Befristung
   - Kaution amount
   - Landlord/Hausverwaltung/Makler name
   - Number of photos, floor plan available
   - Provision/Maklergebühr
4. **Detect Tauschwohnung + two-sided swap match**: Check title, description, and Anbieter
   for swap indicators (title contains "Tauschwohnung", "Wohnungstausch", "Tausche",
   "gegen Wohnung"; description mentions a swap partner / tauschwohnung.com; Anbieter
   "Tauschwohnung GmbH"). If it IS a swap:
   - **If no enabled search has `include_swaps: true` (or no `swap_offer:` block exists):**
     legacy behaviour — **stop**, mark `Discarded` with note "Tauschwohnung — swaps not
     enabled", register in tracker, inform user.
   - **If swaps are enabled:** run the **two-sided match**. A swap is a `Swap-candidate`
     only if BOTH sides pass:
     - **Side 1 — their flat fits us:** score their flat with the normal blocks A–H
       (steps 5–7 below). Gate: global score **≥ 3.5**. Below that → `Discarded`
       (note "swap — their flat scores {x}, below 3.5").
     - **Side 2 — our offer fits their Suche:** extract the partner's *Suche / Gesuchte
       Wohnung* from the listing (target Stadt/Bezirk, m² range, rooms, max Kaltmiete,
       must-haves) and test it against each `swap_offer:` flat. Matching is **LENIENT /
       recall-favoring**:
       - **Area:** surface even when their target area is narrower than where the offer
         sits (e.g. they name a city and the offer is in its commuter belt) — treat as a
         soft match, note the gap. Only a Suche that *explicitly excludes* the offer's
         area fails.
       - **Size / rooms / rent:** "close enough" passes; surface near-misses with the
         delta noted. A hard fail only on a large, clearly-stated gap (e.g. they need
         ≥4 rooms and we offer 2, or their max rent is far below our Kaltmiete).
       - **Must-haves we lack** (see `swap_offer.lacks` — e.g. Balkon, Keller,
         Stellplatz): if their Suche *requires* one, note it as a con but do not hard-fail
         unless they state it as a deal-breaker.
       - **Suche missing / too vague:** surface anyway as `Swap-candidate`, flagged
         "Suche unknown — verify on contact". Never discard for an unreadable Suche.
     - If Side 1 passes and Side 2 does not clearly fail → **`Swap-candidate`**. Add a
       **🔄 SWAP** prefix to the report title and a dedicated **Swap Match** section
       covering: which `swap_offer` flat matched, their Suche as extracted, the two-sided verdict,
       the Vermieter-consent caveat (`landlord_consent`), and the `swap_offer.caveats`
       (Indexmiete, Gartenpflege dispute) the partner must be told.
     - If Side 2 clearly fails → `Discarded` with note "swap-mismatch: {reason}".
5. **Run scam detection** (from `_shared.md`)
6. **Score all 8 blocks** (A–H) using rules from `_shared.md` and weight overrides from `_profile.md`
7. **Calculate global score** (weighted average with hard blocker caps)
8. **Generate report** in the format below
9. **Register in tracker**: write TSV to `batch/tracker-additions/{NNN}-{location-slug}.tsv`
10. **Merge the tracker row**: `node scripts/merge-tracker.mjs` — the TSV is only a staging
    file; without the merge the listing never appears in `data/listings.md`. (In auto/batch
    mode the orchestrator runs one merge after ALL evaluations; when evaluating a single
    listing directly, run it yourself.) Scores in the TSV are dot-decimal (`4.4`, not `4,4`);
    German comma stays in the report prose only.

## Report Format

**Number format — ALWAYS German.** Write every numeric value the German way, matching
the source listings: thousands separator is `.` (period) and the decimal separator is
`,` (comma). So `1.443,87 EUR`, `80,5 m²`, `3,5 Zimmer`, `1.250–1.382 EUR` for ranges.
Never use the English convention (`1,443.87`, `80.5`, `3.5`). This keeps reports
consistent with the source sites and lets `scripts/reconcile-from-reports.mjs` parse
them reliably. (The data files `scan-history.tsv` / `pipeline.md` stay machine-normalized
US-style — that is produced by the parser, not by you; only your prose is German.)

Write to `reports/{NNN}-{location}-{rooms}r-{date}.md`:

```markdown
# Evaluation: {Title} — {Location}

**Date:** {YYYY-MM-DD}
**URL:** {listing_url}
**Portal:** {portal_name}
**Score:** {X.X}/5
**Type:** {Mietwohnung | Eigentumswohnung | Haus | Grundstück}
**Scam Assessment:** {Legitimate | Proceed with Caution | Likely Scam}

---

## A) Price (Score: {X.X}/5, Weight: {W}%)
- Kaltmiete: {amount} EUR
- Nebenkosten: {amount} EUR
- Warmmiete: {amount} EUR
- Price/m² (Kaltmiete): {amount} EUR
- Mietspiegel comparison: {area average} EUR/m² → {above/below/at} average
- Mietpreisbremse: {compliant / exceeded / not applicable}
- Kaution: {amount} EUR ({N} Nettokaltmieten) — {correct / excessive}

## B) Location (Score: {X.X}/5, Weight: {W}%)
- Area: {Bezirk/Stadtteil}
- PLZ: {postal code}
- Area preference: {preferred / acceptable / excluded}
- Commute to {destination}: {N} min ({mode})
- Nearest transit: {station} ({distance})
- Nearby amenities: {supermarket, doctor, park, etc.}

## C) Size (Score: {X.X}/5, Weight: {W}%)
- Living area: {N} m²
- Rooms: {N}
- Floor: {N} of {total}
- Floor plan: {available / not available}
- Layout assessment: {notes on room layout}

## D) Condition (Score: {X.X}/5, Weight: {W}%)
- Year built: {year}
- Condition: {Neubau / Saniert / Gepflegt / Unrenoviert / Sanierungsbedürftig}
- Last renovation: {year or unknown}
- Energieausweis: {class} ({N} kWh/m²a)
- Heating: {type}

## E) Amenities (Score: {X.X}/5, Weight: {W}%)
Must-haves:
- [{x or space}] {amenity_1}
- [{x or space}] {amenity_2}
- ...

Nice-to-haves:
- [{x or space}] {amenity_1}
- ...

## F) Availability (Score: {X.X}/5, Weight: {W}%)
- Available from: {date or "sofort"}
- User move-in window: {earliest} – {latest}, or "flexible (no fixed date)" if unset
- Alignment: {fits / early / late, or "n/a — flexible window"}

## G) Rules (Score: {X.X}/5, Weight: {W}%)
- WBS required: {yes/no}
- Pets allowed: {yes/no/on request}
- Befristung: {yes (until date) / no (unbefristet)}
- Kaution: {amount} ({legal / illegal})
- Provision: {amount or none} ({Bestellerprinzip compliant / violation})

## H) Landlord (Score: {X.X}/5, Weight: {W}%)
- Landlord: {name or "Private" or "Unknown"}
- Type: {Private / Hausverwaltung / Municipal / Corporate}
- Reputation: {findings or "No data found"}
- Eigenbedarf risk: {Low (corporate/municipal) / Medium (private) / N/A (purchase)}

---

## Scam Detection
**Assessment:** {Legitimate | Proceed with Caution | Likely Scam}
**Signals:** {detected signals or "None"}
**Recommendation:** {advice}

## Summary
Score: {X.X}/5 — {one-sentence assessment}. {Key strengths}. {Key concerns}.

## Next Steps
1. {recommended action 1}
2. {recommended action 2}
3. {recommended action 3}

## Research Recommendations
- [ ] {suggested deep research topics}
```

## Tracker Addition

Write TSV to `batch/tracker-additions/{NNN}-{location-slug}.tsv`:

```
num	date	portal	type	location	price	m2	rooms	score	status	report	notes
{NNN}	{YYYY-MM-DD}	{portal}	{type}	{location}	{price}	{m2}	{rooms}	{score}	Evaluated	reports/{filename}	{one-line summary}
```

## Numbering

Next number = highest existing # in `data/listings.md` + 1. If tracker is empty, start at 001.
