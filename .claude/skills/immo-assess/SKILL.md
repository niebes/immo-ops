---
name: immo-assess
description: Evaluate and score listings — compare, scam-check, market analysis
user_invocable: true
args: mode
argument-hint: "[evaluate | compare | scam-check | market]"
---

# immo-assess — Analyze Listings

## Mode Routing

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` — Show command menu |
| URL or listing text (no sub-command) | **`auto-pipeline`** — Full evaluation pipeline |
| `evaluate` | `evaluate` — Score a single listing (blocks A–H) |
| `compare` | `compare` — Compare listings side-by-side |
| `scam-check` | `scam-check` — Standalone scam detection |
| `market` | `market` — Market analysis for an area |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND contains listing text (keywords: "Zimmer", "Wohnung", "Miete", "Kaltmiete", "Warmmiete", "m²", "Erstbezug", "Altbau") or a URL to a listing portal, execute `auto-pipeline`.

---

## Discovery Mode (no arguments)

```
immo-assess — Analyze Listings

  /immo-assess {URL}              → Evaluate a listing (paste URL or text)
  /immo-assess evaluate           → Evaluate interactively
  /immo-assess compare 1 3 5      → Compare listings side-by-side
  /immo-assess scam-check {URL}   → Standalone scam detection
  /immo-assess market Kreuzberg   → Market analysis for an area

  Deep research: /immo-research {area or #}
```

---

## Context Loading

All modes load `modes/_shared.md` (scoring system, scam detection, domain rules) + their mode file.

| Mode | Files |
|------|-------|
| auto-pipeline | `_shared.md` + `auto-pipeline.md` |
| evaluate | `_shared.md` + `evaluate.md` |
| compare | `_shared.md` + `compare.md` |
| scam-check | `_shared.md` + `scam-check.md` |
| market | `market.md` (standalone — uses WebSearch, not scoring) |

Also read `config/profile.yml` and `modes/_profile.md` before evaluating.

**CiC tab rule:** When navigating to listing URLs via CiC, create a dedicated tab via `tabs_create_mcp`. Never reuse existing tabs. When done, close only the tab(s) you created — never close tabs you didn't create.
