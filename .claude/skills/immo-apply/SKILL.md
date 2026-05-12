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
