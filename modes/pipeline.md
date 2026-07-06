# Mode: pipeline — Process Pending URLs

Processes URLs from the inbox (`data/pipeline.md`), evaluating each through the standard evaluation flow.

## Workflow

1. Read `data/pipeline.md`
2. Count pending items (unchecked `- [ ]` lines)
3. If 0 pending: inform user, suggest `/immo-find scan` to find new listings
4. **Run triage** (Step 4) on all pending items
5. Present triage results to user, then evaluate qualifying listings (Step 5)

### Step 4 — Triage (metadata-only, no browser visits)

Triage is an **AI judgement pass**, not a scoring formula — follow the pipeline-triage procedure in `.claude/skills/immo-find/SKILL.md` (auto mode, Step 3). In short: read each pending entry's title + metadata and mark `DISCARDED` (with a one-line reason) only when it is clearly not a real, on-target listing (objective criteria breach, swap when swaps are off, Zwischenmiete, WBS without WBS, garage/commercial as the object itself, wrong city). When unsure, KEEP it — evaluation catches what triage misses (favour recall).

Notes:
- **Low price is a KEEP-and-flag signal, never an auto-discard** — prepend "⚠ LOW PRICE" and let evaluation + scam-check decide (a >30%-below-Mietspiegel price can be a coop rent, an extraction error, or a scam).
- **Swaps are config-driven** (see CLAUDE.md "Tauschwohnung"): discard only when no enabled search sets `include_swaps: true`; otherwise keep for the two-sided match at evaluation.

**Triage output** (present to user before proceeding):
```
Triage Results — {N} pending
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Discarded: {N} ({one-line reasons})
Qualifying for evaluation: {N}
  {title} | {location} | {price}
  ...
```

### Step 5 — Full Evaluation

After triage, evaluate all qualifying listings:

- If 1–2 qualifying: process inline using `evaluate.md` workflow
- If 3+ qualifying: delegate to subagent (see `modes/batch.md`)

For each qualifying URL:
1. Open the URL per the browser doctrine in `modes/evaluate.md` (CiC for bot-protected portals)
2. Verify listing is still active
3. If expired: mark as `- [x] #{NNN} | {url} | EXPIRED` and register in tracker with status `Expired`
4. If active: run full evaluation (blocks A–H)
5. Mark as processed: `- [x] #{NNN} | {url} | {company} | {title} | {score}`

## Pipeline Format

`data/pipeline.md`:

```markdown
# Pipeline

## Pending
- [ ] https://www.immobilienscout24.de/expose/12345 | ImmoScout24 | 3-Zi Kreuzberg
- [ ] https://www.immowelt.de/expose/67890 | Immowelt | 2-Zi Neukölln

## Processed
- [x] #001 | https://... | ImmoScout24 | 3-Zi Kreuzberg | 4.2/5
- [x] #002 | https://... | Immowelt | 2-Zi Neukölln | 3.8/5
- [x] #003 | https://... | Kleinanzeigen | EXPIRED
```
