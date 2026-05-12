# Mode: pipeline — Process Pending URLs

Processes URLs from the inbox (`data/pipeline.md`), evaluating each through the standard evaluation flow.

## Workflow

1. Read `data/pipeline.md`
2. Count pending items (unchecked `- [ ]` lines)
3. If 0 pending: inform user, suggest `/immo-find scan` to find new listings
4. **Run triage** (Step 4) on all pending items
5. Present triage results to user, then evaluate qualifying listings (Step 5)

### Step 4 — Triage (metadata-only, no browser visits)

Score each pending listing from its pipeline metadata (price, m², rooms, location) without visiting the URL. This is a quick pass to prioritize and discard obvious non-matches.

For each pending listing, compute a **triage score** (1–5) from available metadata:

| Factor | Score contribution |
|--------|-------------------|
| Price at/below max_kaltmiete | +1.5 |
| Price 1–10% above | +1.0 |
| Price 10–20% above | +0.5 |
| Price 20%+ above | 0 (auto-discard) |
| Rooms within range | +1.0 |
| Rooms below min | 0 (auto-discard) |
| m² within range | +1.0 |
| m² below min | 0 (auto-discard) |
| Location is preferred area | +1.0 |
| Location is acceptable area | +0.5 |
| EUR/m² at/below max | +0.5 |

**Auto-discard** (mark as `DISCARDED` without browser visit):
- Rooms < min_rooms from profile
- m² < min_m2 from profile
- Kaltmiete > max_kaltmiete × 1.2 (20% tolerance — borderline listings get evaluated)
- Price suspiciously low (>30% below Mietspiegel) — likely Tauschwohnung

**Triage output** (present to user before proceeding):
```
Triage Results — {N} pending
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Auto-discarded: {N} (criteria: {reasons})
Qualifying for evaluation: {N}
  ★★★ {title} | {location} | {price} | triage {X.X}
  ★★  {title} | {location} | {price} | triage {X.X}
  ★   {title} | {location} | {price} | triage {X.X}
```

### Step 5 — Full Evaluation

After triage, evaluate qualifying listings (triage score 2.5+):

- If 1–2 qualifying: process inline using `evaluate.md` workflow
- If 3+ qualifying: delegate to subagent with `_shared.md` + `evaluate.md` content

For each qualifying URL:
1. Navigate to URL with Playwright
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
