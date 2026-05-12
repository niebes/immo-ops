---
name: immo-scan
description: Scan real estate portals for new listings, filter, deduplicate, and add to pipeline
user_invocable: true
---

# immo-scan -- Portal Scanner

Scans configured real estate portals, filters by search criteria, deduplicates against history, and ingests new listings into the pipeline.

## Execution

This skill runs as a subagent to avoid consuming main context:

```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/_shared.md]\n\n[content of modes/scan.md]\n\n[portals.yml content]\n\nExecute scan.",
  description="immo-scan",
  run_in_background=True
)
```

## Steps

1. Read `modes/_shared.md` + `modes/scan.md`
2. Read `portals.yml` for portal configuration
3. Read `config/profile.yml` for search criteria
4. Read `data/scan-history.tsv` for dedup
5. Execute scan workflow from `modes/scan.md`
6. Write results to `data/pipeline.md` and `data/scan-history.tsv`
