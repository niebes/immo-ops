---
name: immo-track
description: Manage the search — listing tracker, viewing schedule
user_invocable: true
args: mode
argument-hint: "[viewing | log]"
---

# immo-track — Manage Your Search

This is the single home for **tracking** a listing's state: status, viewings, the
conversation/correspondence log, and which documents a landlord requested. (Use
`/immo-apply` to *act* — draft a message, generate a Selbstauskunft, manage your
own document inventory.)

## Mode Routing

| Input | Mode |
|-------|------|
| (empty / no args) | `tracker` — Show listing status overview (default) |
| `viewing` | `viewing` — Manage viewings + generate checklist |
| `log` | `log` — Append/read a listing's correspondence + requested-docs log |

The default (no args) shows the tracker directly.

---

## Usage

```
/immo-track                  → Show listing tracker overview
/immo-track top 5            → Show top 5 by score
/immo-track Interested       → Filter by status
/immo-track viewing 3        → Generate viewing checklist for listing #3
/immo-track viewing schedule 3 2026-06-15 14:00  → Schedule a viewing
/immo-track log 216          → Show listing #216's correspondence log
/immo-track log 216 "← E&V offered viewing 05.07 17:30; requested docs after viewing"
                             → Append a dated entry to #216's log
```

---

## Context Loading

| Mode | Files |
|------|-------|
| tracker | `tracker.md` + `data/listings.md` + `templates/states.yml` |
| viewing | `viewing.md` + `data/viewings.md` + listing report from `reports/` |
| log | `correspondence/{NNN}-*.md` + `correspondence/README.md` + `templates/correspondence.example.md` |

Lightweight — no `_shared.md` needed.

---

## Duplicates — ALWAYS surface them

A flat usually appears under several expose IDs / portals. Every downstream
artifact for a listing — correspondence log AND calendar invite — MUST list its
known cross-portal duplicates, so the full footprint is visible (and you don't
re-contact the same flat elsewhere).

Get them with: **`node scripts/duplicates.mjs {NNN}`** (signature match — same
rooms + m² ±0.5 + identical title or near-exact price; output is "likely — verify").
Include the result as a **Duplicates / also listed as** block (price · **full URL**),
labelled *verify* since price-matches can over-include. If none, write "none found".

**ALWAYS write the full clickable URL — never a bare expose ID** ("168453075" is
useless to a human; `https://www.immobilienscout24.de/expose/168453075` is clickable).
This applies everywhere a listing is referenced for a human (logs, calendar invites,
emails), not just the duplicates block.

## Viewing mode — scheduling a viewing

When a viewing is scheduled/confirmed, do ALL of the following for that listing:

1. **`data/viewings.md`** — add/update the row (date, time, address, contact, status).
2. **`correspondence/{NNN}-{slug}.md`** — log the appointment (see `correspondence/README.md`); set the file's Status; include the **Duplicates** block (above).
3. **`data/listings.md`** — update the tracker status (`Contacted` → `Viewing`).
4. **Google Calendar** — create the event. **Follow [`google-calendar-mcp.md`](google-calendar-mcp.md)** for the full procedure and tool gotchas.

### Calendar essentials (full details in `google-calendar-mcp.md`)
- Primary calendar · `timeZone: Europe/Berlin` · 1-day + 2-hour popup reminders · **no attendees** (never email the landlord).
- **`location` = the full street address** (the dedicated field the user navigates from), or empty if unknown — never placeholder text.
- ⚠ **`create_event` silently drops `location`** — set it via a follow-up `update_event`, then `get_event` to confirm it saved. Don't assume it persisted.
- Don't hand-label weekdays — derive from the date (29.06.2026 is a Monday, not Sunday).
- `summary`: `🏠 Viewing #{NNN} — {short title} ({score}/5)` + `⚠` if the landlord is flagged in `modes/_profile.md` Landlord Notes.
- `description`: all links, contact, flat facts, watch-outs, a `FRAGEN` checklist mirroring `correspondence/{NNN}`, AND a **Duplicates / also listed as** block (from `scripts/duplicates.mjs {NNN}`).

---

## Log mode — correspondence + requested documents

Per-listing conversation log: one file per Exposé at `correspondence/{NNN}-{slug}.md`
(see `correspondence/README.md` for the convention; start new ones from
`templates/correspondence.example.md`). This is the durable record of the
back-and-forth with a landlord/agent — never auto-overwritten.

**`/immo-track log {NNN}`** — show that listing's log.

**`/immo-track log {NNN} "{entry}"`** — append a dated block:
```
## {YYYY-MM-DD [HH:MM]} · {channel: email|phone|portal|in-person|letter} · {→ sent | ← received}
{summary}
**Next:** {open action · owner · due}
```
- If no file exists yet, create it from the template, filling the header (URL/links,
  address, contact, status) AND the **Duplicates / also listed as** block from
  `node scripts/duplicates.mjs {NNN}` (see "Duplicates — ALWAYS surface them").
- Keep the header **Status** in sync with `data/listings.md` when the conversation
  advances the lifecycle (Contacted → Viewing → Applied …).

**Requested documents** — when a landlord/agent states which documents they want,
record it in the log so it's not lost. Use a `**Requested docs:**` line in the
relevant entry (and/or a short list), capturing: which docs, the channel/format
they must be sent in (e.g. separate PDFs, the agent's own Selbstauskunft form),
the destination (email address), and timing (before/after viewing). Tick them off
as supplied. (Your own reusable document **inventory** + expiry — SCHUFA age etc. —
lives in `/immo-apply documents`; the per-flat *request* lives here.)
