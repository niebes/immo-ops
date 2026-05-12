# Mode: auto-pipeline — Full Evaluation Pipeline

Automatic pipeline triggered when a listing URL or text is pasted directly into `/immo-ops`. Runs the full evaluation flow: extract → score → scam check → report → tracker.

## Workflow

1. **Detect input type**:
   - URL → navigate with Playwright, extract listing data
   - Pasted text → parse structured data from text

2. **Check for duplicates**:
   - Search `data/listings.md` for matching URL or address
   - Search `data/scan-history.tsv` for URL
   - If found: show existing evaluation, ask user if they want to re-evaluate

3. **Execute evaluate mode**: Follow the full `evaluate.md` workflow (blocks A–H)

4. **Register in tracker**: Write TSV to `batch/tracker-additions/`

5. **Run merge**: `node scripts/merge-tracker.mjs` to add to `data/listings.md`

6. **Show summary**:
   ```
   Evaluation Complete
   ━━━━━━━━━━━━━━━━━━
   #{NNN} | {location} | {rooms} rooms | {m²} m²
   Score: {X.X}/5 | Price: {kaltmiete} EUR kalt ({warmmiete} warm)
   Scam: {assessment}
   Status: Evaluated
   Report: reports/{filename}

   → /immo-ops contact {NNN}     to draft a message
   → /immo-research {NNN}        for deep area research
   → /immo-ops viewing {NNN}     to prepare for viewing
   ```

## URL Detection

Supported portal URL patterns:
- `immobilienscout24.de/expose/`
- `immowelt.de/expose/`
- `kleinanzeigen.de/s-anzeige/`
- `wg-gesucht.de/`
- `immosuche.degewo.de/`
- `howoge.de/`
- `gesobau.de/`
- `vonovia.de/`
- `deutsche-wohnen.com/`
- `sparkassen-immobilien.de/`

Any URL containing these domains triggers auto-pipeline.
