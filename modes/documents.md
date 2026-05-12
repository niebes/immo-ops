# Mode: documents — Document Submission Tracker

Tracks which documents have been submitted to which listings, monitors expiry, and flags missing documents.

## Commands

- **show**: Show document status across all active listings
- **show {#}**: Show documents for a specific listing
- **submit {#} {doc_type}**: Record a document submission
- **prepare**: Show what documents need to be prepared/renewed
- **check-expiry**: Flag documents that are expired or expiring soon

## Standard Document Types

| Document | German Name | Typical Validity | Required By |
|----------|-------------|-----------------|-------------|
| `schufa` | SCHUFA-BonitätsAuskunft | 3 months | Most landlords |
| `gehalt` | Gehaltsnachweise (last 3) | Current month | Most landlords |
| `arbeitsvertrag` | Arbeitsvertrag / Bescheinigung | Until changed | Some landlords |
| `selbstauskunft` | Mieterselbstauskunft | Per listing | All landlords |
| `ausweis` | Personalausweis (Kopie) | Until expiry | All landlords |
| `vermieter_ref` | Vormieterbescheinigung | Until changed | Many landlords |
| `buergschaft` | Mietbürgschaft | Per listing | If income insufficient |
| `kontoauszuege` | Kontoauszüge (last 3 months) | Current month | Some landlords |
| `finanzierung` | Finanzierungszusage | Varies | For purchases |

## Workflow

### show / show {#}

Read `data/documents.md` and display:

```
Document Status — {date}
━━━━━━━━━━━━━━━━━━━━━━━

Listing #{NNN} — {location}
  ✓ SCHUFA (submitted 2026-05-01)
  ✓ Gehaltsnachweise (submitted 2026-05-01)
  ✓ Selbstauskunft (submitted 2026-05-02)
  ○ Vormieterbescheinigung (not yet submitted)
  ⚠ Arbeitsvertrag (prepared, not submitted)

Listing #{NNN} — {location}
  ...
```

### submit {#} {doc_type}

1. Record in `data/documents.md`: listing #, document type, date
2. Calculate expiry if applicable (SCHUFA: +3 months, Gehalt: end of month)

### prepare

1. Read `data/listings.md` for all listings with status Interested/Contacted/Viewing
2. Cross-reference with `data/documents.md`
3. List what's missing or needs renewal

```
Documents to Prepare
━━━━━━━━━━━━━━━━━━━

⚠ SCHUFA expires in 5 days (2026-05-16) — renew at meineschufa.de
⚠ Gehaltsnachweise: May payslip not yet added
✓ Arbeitsvertrag: current
✓ Personalausweis: valid until 2028-03-15

For Listing #003 (Kreuzberg):
  Missing: Selbstauskunft — run /immo-ops selbstauskunft 3
  Missing: Vormieterbescheinigung — contact current landlord
```

### check-expiry

Flag documents nearing or past expiry:

```
Document Expiry Check — {date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 EXPIRED:
  SCHUFA (from 2026-02-01) — 3+ months old, renew immediately

🟡 EXPIRING SOON:
  Gehaltsnachweise — add current month's payslip

🟢 CURRENT:
  Arbeitsvertrag, Personalausweis, Vormieterbescheinigung
```

## Data Format

`data/documents.md` table:

```
| Listing # | Document | Prepared | Submitted | Confirmed | Expires | Notes |
|-----------|----------|----------|-----------|-----------|---------|-------|
| 001 | schufa | 2026-05-01 | 2026-05-02 | - | 2026-08-01 | meineschufa.de |
| 001 | gehalt | 2026-05-01 | 2026-05-02 | - | 2026-05-31 | Mar/Apr/May |
| 001 | selbstauskunft | 2026-05-02 | 2026-05-02 | - | - | Tailored to listing |
```
