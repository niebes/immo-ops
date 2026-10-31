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

## Save the whole ad when applying (ALWAYS)

As soon as an application for a listing is in progress (any `selbstauskunft {NNN}` /
`documents {NNN}` work for it, an application drafted, or the user says they are
applying or have applied), save the complete ad to **`listings/{NNN}/`** before
anything else, unless `listings/{NNN}/ad.md` already exists. If it exists, fetch the
ad again and record anything that changed. Ads go offline soon after a flat is let,
and the report holds only what we scored.

What goes into `listings/{NNN}/`:
- **`photos/`**: every image in **full resolution** (the original upload, not a
  resized preview), named `{NN}-{caption-slug}.{ext}` in gallery order. Skip ad
  banners. Check with `md5sum` that no two files are the same image.
- **Attached documents**: every PDF the ad links (Grundriss, Energieausweis,
  Prospekt, the landlord's forms), under the names they have in the ad.
- **`ad.md`**: the ad as readable text: `**URL:**`, the date it was saved and
  whether it was live, title, address, every attribute and cost line, every
  description text in full, the Anbieter, and a captioned list linking each photo.
  Note anything misleading (e.g. a floor plan that belongs to another unit).
  Write `Key: value`, not raw section/type names.
- **The raw source** with its date in the name: `is24-api-{YYYY-MM-DD}.json` for
  ImmoScout24, otherwise the page HTML or extractor output. Copy the evaluation's
  `tmp/eval/{NNN}/` data too when it exists.

How to fetch: use the same access path as evaluation for that portal (see
`modes/scan.md` and `.claude/agent-memory/immo-evaluator/{portal}*.md`).
ImmoScout24: use the mobile-API JSON recipe in `immobilienscout24.md` §Access. The
photo URLs are `MEDIA[].fullImageUrl`; cut everything after `/ORIG` to get the
original file (PNG or JPEG). PDFs are in `REFERENCE_LIST`. If the ad is already
gone, save what remains (evaluation data in `tmp/eval/{NNN}/`, mapio.net text) and
say so in `ad.md`.

Afterwards: mention the path `listings/{NNN}/` in the tracker Notes and log it in the
correspondence file. If any term changed since the evaluation (rent, Kaution, move-in
date), state the change in the log and in the reply to the user.

**Why:** 2026-10-31, #1047. The user asked to save all images and information of
the ad after the viewing, then: "Whenever I apply I want all information
downloaded as well". On that same fetch the Kaution had changed from 3.336 € to 3.840 €.

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
