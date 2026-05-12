# Mode: selbstauskunft — Generate Mieterselbstauskunft / Buyer Profile

Generates a filled Mieterselbstauskunft (renter self-disclosure) or buyer profile from `config/profile.yml`.

## Input

- `selbstauskunft` — generate standard Mieterselbstauskunft
- `selbstauskunft {#}` — generate tailored to a specific listing
- `selbstauskunft buyer` — generate buyer profile (for purchases)

## Workflow

1. Read `config/profile.yml` for personal and document data
2. If listing # provided, read report to tailor the cover note
3. Generate filled form
4. Show to user for review — NEVER submit automatically

## Mieterselbstauskunft Fields

Standard fields filled from `config/profile.yml`:

### Personal Data
- Full name
- Date of birth
- Current address
- Phone number
- Email

### Household
- Number of persons moving in
- Relationship (partner, family, WG)
- Pets (type, count)
- Smoker: yes/no

### Employment
- Employer name
- Employment type (unbefristet/befristet/selbständig)
- Position/role
- Employment since (date)
- Monthly net income

### Financial
- SCHUFA: available yes/no (date of most recent)
- Previous insolvency: no
- Outstanding debts: no
- Bürgschaft available: yes/no

### Current Housing
- Current landlord (name, contact for reference)
- Reason for moving
- Notice period / availability

### Listing-Specific (if # provided)
- Reference to the specific listing (address, portal, listing ID)
- Desired move-in date aligned with listing availability
- Brief personal note expressing interest

## Output Format

Generate as a clean markdown document that can be copied or exported:

```markdown
# Mieterselbstauskunft

## Angaben zur Person
| | |
|---|---|
| Name | {full_name} |
| Geburtsdatum | {dob} |
| Aktuelle Adresse | {address} |
| Telefon | {phone} |
| E-Mail | {email} |

## Angaben zum Haushalt
| | |
|---|---|
| Anzahl Personen | {number_of_persons} |
| Haustiere | {pets or "Keine"} |
| Raucher | {Ja/Nein} |

## Berufliche Situation
| | |
|---|---|
| Arbeitgeber | {employer} |
| Beschäftigungsverhältnis | {employment_type} |
| Monatliches Nettoeinkommen | {income} EUR |

## Finanzielle Angaben
| | |
|---|---|
| SCHUFA-Auskunft | {Vorhanden, Datum: {date}} |
| Insolvenzverfahren | Nein |
| Mietschulden | Nein |

## Aktuelle Wohnsituation
| | |
|---|---|
| Aktueller Vermieter | {name} |
| Kündigungsgrund | {reason} |
| Verfügbar ab | {date} |
```

## Buyer Profile (Kauf)

For purchases, generate a buyer profile:

```markdown
# Käuferprofil

## Persönliche Daten
{same as above}

## Finanzierung
| | |
|---|---|
| Eigenkapital | {amount} EUR |
| Finanzierungszusage | {Ja/Nein, Bank} |
| Kaufpreisvorstellung | bis {max_price} EUR |

## Zeitrahmen
| | |
|---|---|
| Gewünschter Kaufzeitpunkt | {date range} |
| Notarpräferenz | {name or "Keine"} |
```

## Rules

- NEVER include data not present in profile.yml — ask user to fill in missing fields
- NEVER submit documents automatically
- ALWAYS show complete form to user before any action
- Flag if SCHUFA is older than 3 months (some landlords require recent)
- Flag if Gehaltsnachweise need updating (should be last 3 months)
