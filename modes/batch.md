# Mode: batch — Batch Process Multiple Listings

Processes multiple listings in parallel using subagent workers.

## Input

One of:
- `batch pipeline` — process all pending pipeline URLs
- `batch evaluate {url1} {url2} ...` — evaluate specific URLs
- `batch re-evaluate {#1} {#2} ...` — re-evaluate existing listings

## Workflow

### For 1–2 listings:
Process inline using `evaluate.md` workflow sequentially.

### For 3+ listings:
Delegate to subagent workers — the dedicated **`immo-evaluator`** agent first. It is the specialist: it carries the full evaluation procedure, the report format, and (via its own memory) the per-portal page quirks, so it does NOT need to be re-taught them. Keep the prompt THIN — pass only the per-listing variables:

1. For each listing, launch a worker:
   ```
   Agent(
     subagent_type="immo-evaluator",
     description="immo-assess {expose_id}",
     prompt="LISTING URL: {url}
   Portal: {portal}
   Next report number: {NNN}
   Search-result metadata: {title, price, m², rooms — unverified hint only}

   Evaluate per your standing instructions; write report #{NNN}, tracker TSV, and the pipeline update; return the one-line result."
   )
   ```
   Do NOT restate steps, file paths, scoring rules, or portal quirks in the prompt — they live in the agent definition, `modes/evaluate.md`, and the agent's memory. Pass metadata as an unverified hint; let the evaluator read the live page (see `modes/evaluate.md` "Trust the LIVE listing").
2. Only if `immo-evaluator` is unavailable: fall back to `general-purpose` and inline the `modes/evaluate.md` Browser & portal quirks + workflow (plus `modes/_shared.md` scoring) in the prompt.
3. **NEVER run 2+ browser-driving agents in parallel** (Playwright or CiC — each needs exclusive browser access) — queue workers sequentially
4. Each worker writes:
   - Report to `reports/{NNN}-{slug}-{date}.md`
   - Tracker addition to `batch/tracker-additions/{NNN}-{slug}.tsv`
5. After all workers complete: run `node scripts/merge-tracker.mjs`

## Output Summary

```
Batch Processing Complete — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Processed: {N} listings
  #{NNN} | {location} | {score}/5 | {status}
  #{NNN} | {location} | {score}/5 | {status}
  ...

Top pick: #{NNN} ({location}, {score}/5)

→ /immo-assess compare {top-picks} to compare the best ones.
```
