# Mode: contact — Draft Landlord/Agency Messages

Drafts messages to landlords, Hausverwaltungen, or Makler for a specific listing.

## Input

- Listing # from tracker
- Message type: `initial` | `viewing` | `followup` | `custom`

## Workflow

1. Read listing evaluation from `reports/`
2. Read `config/profile.yml` for personal details and documents
3. Read `modes/_profile.md` for contact style preferences
4. Read appropriate template from `templates/contact-templates/`
5. Generate personalized message in German (formal Sie)
6. Show draft to user for review — NEVER send automatically
7. Update listing status to `Contacted` (if user approves)

## Message Types

### Initial Inquiry (`anfrage`)
- Formal introduction
- Express specific interest in the property (reference details from listing)
- Briefly mention: employment, household size, pets
- Ask about Besichtigungstermin
- Offer to provide Selbstauskunft and documents

### Viewing Request (`besichtigung`)
- Request specific viewing appointment
- Suggest 2–3 time slots
- Confirm who will attend
- Ask what documents to bring

### Follow-up (`nachfassen`)
- Reference previous contact/viewing
- Reaffirm interest
- Ask about status of application
- Offer additional documents if needed

## Rules

- ALWAYS draft in German (formal Sie) unless user specifies otherwise
- NEVER include phone number unless user explicitly authorizes
- NEVER mention specific income figures in initial contact
- NEVER send without user review and approval
- Keep messages concise (max 150 words for initial, 100 for follow-up)
- Reference specific listing details to show genuine interest
- Mention relevant profile strengths early (stable employment, non-smoker, etc.)
