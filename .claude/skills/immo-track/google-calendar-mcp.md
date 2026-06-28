# Google Calendar MCP — viewing events guide

Reusable rules for creating/maintaining viewing events with the
`mcp__claude_ai_Google_Calendar__*` tools. Referenced from `immo-track` SKILL.md
(Viewing mode). Keep this in sync with what the tools actually do, not what they
claim.

## Standard viewing event

- Calendar: user's **primary** (`mario@niebes.net`). No `calendarId` needed.
- `timeZone`: **Europe/Berlin** on every create/update that sets times.
- **No attendees** — never add `attendees`/`attendeeEmails` (that emails the
  landlord). On updates set `notificationLevel: NONE` so nothing is sent.
- Reminders: `overrideReminders` = `[{popup,1440},{popup,120}]` (1 day + 2 h).
- `summary`: `🏠 Viewing #{NNN} — {short title} ({score}/5)` + `⚠` if the landlord
  has a caution in `modes/_profile.md` Landlord Notes.
- `description`: all listing links, contact (name·email·phone·agency), flat facts
  (rooms·m²·Kalt/Warm·must-haves), watch-outs, a `── FRAGEN (am Termin) ──`
  checklist mirroring the listing's `correspondence/{NNN}` log, AND a
  `── DUPLIKATE / auch gelistet als ──` block from `node scripts/duplicates.mjs {NNN}`
  (portal · price · URL; label "verify"). If none, omit the block or write "keine".

## GOTCHAS (verified 2026-06-27)

- **`create_event` silently DROPS `location`.** Passing `location` to
  `create_event` does not persist it — the created event comes back with no
  `location` field. **Always set the address in a follow-up `update_event`, then
  re-read (`get_event`) and confirm the response echoes `location`.** Do not
  assume it saved because you passed it.
- **`location` = full street address, always** (it's the field the user navigates
  from). If the address is unknown, **leave it empty** — never put placeholder
  text like "address pending". Fill it the moment the address is known (it's often
  already in the landlord's mail / Exposé).
- **Don't hand-label weekdays.** Derive the day from the date — don't type
  "Sunday 29.06" from memory (29.06.2026 is a Monday). If you state a weekday,
  compute it from the ISO date or omit it.
- **`update_event` only changes fields you pass**; description/location are
  replaced wholesale when set, so pass the full new value, not a fragment.

## Editing an existing event
Keep the eventId (from create/`get_event`). To add the on-site questions or fix
the address: `update_event(eventId, location=…, description=…, notificationLevel:"NONE")`,
then `get_event` to verify the change took.
