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
Delegate to subagent workers:

1. Read `modes/_shared.md` + `modes/evaluate.md`
2. For each listing, launch a worker:
   ```
   Agent(
     subagent_type="general-purpose",
     prompt="[_shared.md content]\n\n[evaluate.md content]\n\nEvaluate this listing: {url_or_data}",
     description="immo-ops evaluate #{N}"
   )
   ```
3. **NEVER run 2+ Playwright agents in parallel** — queue workers sequentially
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
