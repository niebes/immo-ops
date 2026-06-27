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

---

## Viewing mode — scheduling a viewing

When a viewing is scheduled/confirmed, do ALL of the following for that listing:

1. **`data/viewings.md`** — add/update the row (date, time, address, contact, status).
2. **`correspondence/{NNN}-{slug}.md`** — log the appointment (see `correspondence/README.md`); set the file's Status.
3. **`data/listings.md`** — update the tracker status (`Contacted` → `Viewing`).
4. **Google Calendar** — create the event via `mcp__claude_ai_Google_Calendar__create_event` on the primary calendar, `timeZone: Europe/Berlin`, with 1-day + 2-hour popup reminders, no attendees (don't send invites).

### Calendar event fields — REQUIRED
- **`location` = the full street address.** A calendar invite has a dedicated address field; the address ALWAYS goes there (not only in the description) so the user can navigate from the event. If the address is not yet known, create the event and put `address pending` in `location`, then fill it the moment it's known.
- `summary`: `🏠 Viewing #{NNN} — {short title} ({score}/5)` + a `⚠` flag if the landlord has a caution in `modes/_profile.md` Landlord Notes.
- `description`: all listing links (every portal/agent URL), contact (name · email · phone · agency), flat details (rooms · m² · Kalt/Warm · must-haves), watch-outs / landlord cautions, and the apply process. Mirror the report + correspondence log.
