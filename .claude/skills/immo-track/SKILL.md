---
name: immo-track
description: Manage the search — listing tracker, viewing schedule
user_invocable: true
args: mode
argument-hint: "[viewing]"
---

# immo-track — Manage Your Search

## Mode Routing

| Input | Mode |
|-------|------|
| (empty / no args) | `tracker` — Show listing status overview (default) |
| `viewing` | `viewing` — Manage viewings + generate checklist |

The default (no args) shows the tracker directly — no discovery menu needed since there are only 2 modes.

---

## Usage

```
/immo-track                  → Show listing tracker overview
/immo-track top 5            → Show top 5 by score
/immo-track Interested       → Filter by status
/immo-track viewing 3        → Generate viewing checklist for listing #3
/immo-track viewing schedule 3 2026-06-15 14:00  → Schedule a viewing
```

---

## Context Loading

| Mode | Files |
|------|-------|
| tracker | `tracker.md` + `data/listings.md` + `templates/states.yml` |
| viewing | `viewing.md` + `data/viewings.md` + listing report from `reports/` |

Lightweight — no `_shared.md` needed.
