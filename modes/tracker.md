# Mode: tracker — Listing Status Overview

Displays and manages the listing tracker (`data/listings.md`).

## Commands

- **Show all**: Display the full tracker table
- **Show {status}**: Filter by status (e.g., "show Interested", "show Contacted")
- **Update {#} {status}**: Change listing status (e.g., "update 5 Contacted")
- **Stats**: Show summary statistics (total, by status, average score, score distribution)
- **Top {N}**: Show top N listings by score
- **Expired check**: Run `node scripts/listing-expiry-check.mjs` to find listings that may have been removed

## Workflow

1. Read `data/listings.md`
2. Read `templates/states.yml` for valid statuses
3. Execute the requested command
4. If updating status, edit `data/listings.md` directly (status updates are the ONE exception to the "never edit directly" rule)

## Display Format

```
Listing Tracker — {date}
━━━━━━━━━━━━━━━━━━━━━━━━

Total: {N} listings | Evaluated: {N} | Interested: {N} | Contacted: {N} | Viewing: {N}

| # | Score | Location | Price | Rooms | Status | Notes |
|---|-------|----------|-------|-------|--------|-------|
| ... |
```

Sort by score descending unless user requests otherwise.
