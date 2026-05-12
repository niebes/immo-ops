---
name: immo-ops
description: AI real estate search command center -- evaluate listings, score neighborhoods, scan portals, track applications
user_invocable: true
args: mode
argument-hint: "[evaluate | compare | viewing | contact | tracker | pipeline | batch | market | scam-check | selbstauskunft | documents]"
---

# immo-ops -- Router

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| URL or listing text (no sub-command) | **`auto-pipeline`** |
| `evaluate` | `evaluate` |
| `compare` | `compare` |
| `viewing` | `viewing` |
| `contact` | `contact` |
| `tracker` | `tracker` |
| `pipeline` | `pipeline` |
| `batch` | `batch` |
| `market` | `market` |
| `scam-check` | `scam-check` |
| `selbstauskunft` | `selbstauskunft` |
| `documents` | `documents` |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND contains listing text (keywords: "Zimmer", "Wohnung", "Miete", "Kaltmiete", "Warmmiete", "m²", "Erstbezug", "Altbau", address-like strings) or a URL to a listing portal (immobilienscout24, immowelt, kleinanzeigen, wg-gesucht, degewo, howoge, gesobau, vonovia), execute `auto-pipeline`.

If `{{mode}}` is not a sub-command AND doesn't look like a listing, show discovery.

---

## Discovery Mode (no arguments)

Show this menu:

```
immo-ops -- Real Estate Command Center

Available commands:
  /immo-ops {listing}    → AUTO-PIPELINE: evaluate + score + track (paste text or URL)
  /immo-ops evaluate     → Evaluate a single listing (A-H scoring)
  /immo-ops compare      → Compare multiple listings side-by-side
  /immo-ops viewing      → Manage viewings + generate checklist
  /immo-ops contact      → Draft landlord/agency messages
  /immo-ops tracker      → Listing status overview
  /immo-ops pipeline     → Process pending URLs from inbox (data/pipeline.md)
  /immo-ops batch        → Batch process multiple listings
  /immo-ops market       → Market analysis for an area
  /immo-ops scam-check   → Standalone scam detection for a listing
  /immo-ops selbstauskunft → Generate Selbstauskunft / buyer profile
  /immo-ops documents    → Track submitted documents per listing

Scanning: /immo-scan        → Scan portals for new listings
Research: /immo-research     → Deep area/landlord/building research

Inbox: add URLs to data/pipeline.md → /immo-ops pipeline
Or paste a listing URL directly to run the full pipeline.
```

---

## Context Loading by Mode

After determining the mode, load the necessary files before executing:

### Modes that require `_shared.md` + their mode file:
Read `modes/_shared.md` + `modes/{mode}.md`

Applies to: `auto-pipeline`, `evaluate`, `compare`, `contact`, `pipeline`, `batch`, `scam-check`

### Standalone modes (only their mode file):
Read `modes/{mode}.md`

Applies to: `tracker`, `viewing`, `market`, `selbstauskunft`, `documents`

### Modes delegated to subagent:
For `batch` (3+ listings) and `pipeline` (3+ URLs): launch as Agent with the content of `_shared.md` + `modes/{mode}.md` injected into the subagent prompt.

```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/_shared.md]\n\n[content of modes/{mode}.md]\n\n[invocation-specific data]",
  description="immo-ops {mode}"
)
```

Execute the instructions from the loaded mode file.
