# Mode: auto-pipeline — Full Evaluation Pipeline

Automatic pipeline triggered when a listing URL or text is pasted directly into `/immo-assess`. Runs the full evaluation flow: extract → score → scam check → report → tracker.

## Workflow

1. **Detect input type**:
   - URL → open per the browser doctrine in `modes/evaluate.md` (CiC for bot-protected portals), extract listing data
   - Pasted text → parse structured data from text

2. **Check for duplicates**:
   - Search `data/listings.md` for matching URL or address
   - Search `data/scan-history.tsv` for URL
   - If found: show existing evaluation, ask user if they want to re-evaluate

3. **Tauschwohnung detection**: After extracting the page, check for swap indicators. Handling is config-driven (see `evaluate.md` step 4): if swaps are OFF, register as Discarded; if `include_swaps: true` + a `swap_offer:` block exist, run the two-sided swap match (→ `Swap-candidate` or `Discarded` "swap-mismatch").

4. **Execute evaluate mode**: Follow the full `evaluate.md` workflow (blocks A–H)

5. **Register in tracker**: Write TSV to `batch/tracker-additions/`

6. **Run merge**: `node scripts/merge-tracker.mjs` to add to `data/listings.md`

7. **Show summary**:
   ```
   Evaluation Complete
   ━━━━━━━━━━━━━━━━━━
   #{NNN} | {location} | {rooms} rooms | {m²} m²
   Score: {X.X}/5 | Price: {kaltmiete} EUR kalt ({warmmiete} warm)
   Scam: {assessment}
   Status: Evaluated
   Report: reports/{filename}

   → /immo-apply contact {NNN}    to draft a message
   → /immo-research {NNN}        for deep area research
   → /immo-track viewing {NNN}   to prepare for viewing
   ```

## URL Detection

Config-driven: any URL whose domain matches a portal configured in `portals.yml` triggers auto-pipeline, plus any URL that resolves to a real estate listing detail page (expose/detail/anzeige-style URL on an unconfigured portal). When in doubt, open the URL and judge from the page — do not maintain a hardcoded domain list.
