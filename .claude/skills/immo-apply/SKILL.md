---
name: immo-apply
description: Act on listings — contact landlords, generate Selbstauskunft, track documents
user_invocable: true
args: mode
argument-hint: "[contact | selbstauskunft | documents]"
---

# immo-apply — Act on Listings

## Mode Routing

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` — Show command menu |
| `contact` | `contact` — Draft landlord/agency messages |
| `selbstauskunft` | `selbstauskunft` — Generate Mieterselbstauskunft / buyer profile |
| `documents` | `documents` — Track submitted documents per listing |

---

## Discovery Mode (no arguments)

```
immo-apply — Act on Listings

  /immo-apply contact 3         → Draft a message to landlord for listing #3
  /immo-apply selbstauskunft    → Generate Mieterselbstauskunft from your profile
  /immo-apply selbstauskunft 3  → Generate tailored to listing #3
  /immo-apply documents         → Show document submission status
  /immo-apply documents 3       → Show documents for listing #3
```

---

## Context Loading

| Mode | Files |
|------|-------|
| contact | `_shared.md` + `contact.md` + listing report from `reports/` |
| selbstauskunft | `selbstauskunft.md` + `config/profile.yml` |
| documents | `documents.md` + `data/documents.md` |

All modes read `config/profile.yml` for personal data.

**RULE: NEVER send messages or submit documents automatically. Always show draft to user.**

---

## Logging to the correspondence log

Tracking lives in `/immo-track` (`correspondence/{NNN}-{slug}.md`). `immo-apply`
feeds it:

- **contact** — a *draft* is not logged (nothing was sent yet). Once the user
  confirms they have sent it, append a `→ sent` block to the listing's
  correspondence log (create it from `templates/correspondence.example.md` if it
  doesn't exist): date · channel · `→ sent` · one-line summary · `**Next:**`.
- **selbstauskunft / documents** — when the user confirms documents were sent to a
  landlord/agent, append a `→ sent` block listing exactly which documents went, via
  which channel/format, to whom. Tick off any matching `**Requested docs:**` items
  recorded earlier in that log.

Keep the log's header **Status** and `data/listings.md` in sync when an action
advances the lifecycle (e.g. Applied). Do NOT duplicate the conversation log here —
`immo-apply` writes entries; `/immo-track log` is how you read/manage them.
