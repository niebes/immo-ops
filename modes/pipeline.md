# Mode: pipeline — Process Pending URLs

Processes URLs from the inbox (`data/pipeline.md`), evaluating each through the standard evaluation flow.

## Workflow

1. Read `data/pipeline.md`
2. Count pending items (unchecked `- [ ]` lines)
3. If 0 pending: inform user, suggest `/immo-scan` to find new listings
4. If 1–2 pending: process inline using `evaluate.md` workflow
5. If 3+ pending: delegate to subagent with `_shared.md` + `evaluate.md` content

For each pending URL:
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
