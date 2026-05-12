# Mode: scam-check — Standalone Scam Detection

Performs a focused scam analysis on a listing. Can be run standalone or is automatically included in every evaluation.

## Input

One of:
- Listing URL
- Listing # from tracker
- Pasted listing text or message from a landlord

## Workflow

1. **Get listing data**:
   - If URL: navigate with Playwright, extract all visible details
   - If listing #: read report from `reports/`
   - If text: analyze the pasted content

2. **Check red flags** (from `_shared.md` scam detection section):

   **High reliability signals:**
   - [ ] Price >20% below Mietspiegel for area/size
   - [ ] Advance payment requested before viewing (Kaution, "reservation fee", "deposit")
   - [ ] No in-person viewing offered ("I'll send the key", "view from outside")
   - [ ] Broken German with deposit/payment narrative
   - [ ] Email address doesn't match portal profile

   **Medium reliability signals:**
   - [ ] Landlord claims to be abroad (business trip, missionary, etc.)
   - [ ] Photos appear stock or from a different property
   - [ ] New portal account with single listing
   - [ ] Listing reposted at different prices or by different agents
   - [ ] Contact only via WhatsApp or foreign phone number
   - [ ] Unusually detailed sob story in listing description

   **Low reliability signals (flag but don't alarm):**
   - [ ] Documents requested before any personal contact
   - [ ] Missing Energieausweis data
   - [ ] No exact address given (normal for many listings)
   - [ ] Professional photos for a modest apartment

3. **Cross-reference**:
   - WebSearch the landlord/agency name for complaints
   - WebSearch the address for other listings (same address, different price = suspicious)
   - Check if price is plausible for the area (use Mietspiegel data)

4. **Classify**:
   - **Legitimate**: 0 high + ≤1 medium signals
   - **Proceed with Caution**: 1 high OR 2+ medium signals
   - **Likely Scam**: 2+ high signals OR 1 high + 2+ medium

## Output Format

```markdown
# Scam Analysis: {Title / Address}

**Date:** {YYYY-MM-DD}
**URL:** {url}
**Assessment:** {Legitimate | Proceed with Caution | Likely Scam}

## Red Flags Detected

### High Reliability
{list or "None"}

### Medium Reliability
{list or "None"}

### Low Reliability
{list or "None"}

## Price Plausibility
- Listed price: {amount} EUR/m²
- Mietspiegel for area: {amount} EUR/m²
- Deviation: {+/-N%}
- Assessment: {plausible / suspicious}

## Landlord/Agency Check
{WebSearch findings or "No concerning results"}

## Recommendation
{Specific advice: proceed normally / proceed with extra caution and steps / do not engage}

### If proceeding with caution:
- Never pay anything before a physical viewing
- Meet only at the property, never at a separate location
- Verify landlord identity (Grundbuchauszug)
- Use portal's internal messaging (creates a paper trail)
- If in doubt, consult your local Mietverein
```

## Common Scam Patterns in German Rental Market

### Advance Fee Scam
Scammer posts attractive listing below market price. Claims to be abroad. Asks for Kaution or "reservation fee" via wire transfer before viewing. Key phrases: "Ich bin beruflich im Ausland", "Airbnb wird die Schlüssel schicken", "Bitte überweisen Sie die Kaution".

### Identity Theft Scam
Legitimate-looking listing requests Personalausweis copies, SCHUFA, and bank statements before any contact or viewing. Collected documents are used for identity fraud. Red flag: requesting documents BEFORE any conversation.

### Fake Listing Scam
Real photos from a legitimate listing (possibly expired) are reused on a new listing at a lower price. The address may exist but the apartment is not actually available. Cross-reference: search for the same photos on other portals.

### Viewing Fee Scam
Agent or "service" charges a fee to arrange viewings. This is NOT legal under Bestellerprinzip for rentals. Flag immediately.
