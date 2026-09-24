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
   Work dir: tmp/eval/{NNN}/
   Parallel: {yes|no}
   Search-result metadata: {title, price, m², rooms — unverified hint only}

   Evaluate per your standing instructions; write report #{NNN}, tracker TSV, and the staged pipeline update; return the one-line result."
   )
   ```
   Assign all report numbers up front so each worker owns its `{NNN}`. Use `Parallel: yes` for workers launched alongside others (they get curl-only, no browser, and memory notes go to `batch/memory-inbox/`). Use `Parallel: no` for a worker running alone.
   Do NOT restate steps, file paths, scoring rules, or portal quirks in the prompt — they live in the agent definition, `modes/evaluate.md`, and the agent's memory. Pass metadata as an unverified hint; let the evaluator read the live page (see `modes/evaluate.md` "Trust the LIVE listing").
2. Only if `immo-evaluator` is unavailable: fall back to `general-purpose` and inline the `modes/evaluate.md` Browser & portal quirks + workflow (plus `modes/_shared.md` scoring) in the prompt.
3. **NEVER run 2+ browser-driving agents in parallel** (Playwright or CiC — each needs exclusive browser access) — queue workers sequentially. A `Parallel: yes` worker that returns `NEEDS-BROWSER` gets re-run alone with `Parallel: no`.
4. Each worker writes only its own per-`{NNN}` paths. No two workers ever write the same file:
   - Report to `reports/{NNN}-{slug}-{date}.md`
   - Tracker addition to `batch/tracker-additions/{NNN}-{slug}.tsv`
   - Pipeline update to `batch/pipeline-updates/{NNN}.json` (workers never edit `data/pipeline.md`)
   - Scratch files in `tmp/eval/{NNN}/`
   - Memory notes (parallel mode) to `batch/memory-inbox/{NNN}-{portal}.md`
5. After all workers complete, run these serially:
   - `node scripts/merge-tracker.mjs`: merges the TSVs and applies the pipeline updates.
   - If `batch/memory-inbox/` is non-empty: run one `immo-evaluator` with the prompt `MEMORY CONSOLIDATION`.

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
