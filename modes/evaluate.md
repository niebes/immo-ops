# Mode: evaluate — Single Listing Evaluation

Evaluates a single real estate listing using the 8-block scoring system (A–H). Produces a detailed report.

## Input

One of:
- A URL to a listing on a supported portal
- Pasted listing text
- A listing # from the tracker (re-evaluate)

## Workflow

1. **Read profile**: `config/profile.yml` for search criteria, `modes/_profile.md` for overrides
2. **Get listing data**:
   - If URL: navigate with Playwright (`browser_navigate` + `browser_snapshot`) to extract all listing details
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
4. **Detect Tauschwohnung**: Check title, description, and Anbieter for swap indicators:
   - Title contains "Tauschwohnung", "Wohnungstausch", "Tausche", "gegen Wohnung"
   - Description mentions looking for a swap partner or references tauschwohnung.com
   - Listed by "Tauschwohnung GmbH" or similar swap platforms
   - If detected: **stop evaluation**, mark as `Discarded` with note "Tauschwohnung — not a rental", register in tracker, and inform user.
5. **Run scam detection** (from `_shared.md`)
6. **Score all 8 blocks** (A–H) using rules from `_shared.md` and weight overrides from `_profile.md`
7. **Calculate global score** (weighted average with hard blocker caps)
8. **Generate report** in the format below
9. **Register in tracker**: write TSV to `batch/tracker-additions/{NNN}-{location-slug}.tsv`

## Report Format

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
- User move-in window: {earliest} – {latest}
- Alignment: {fits / early / late}

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
