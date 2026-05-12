# Mode: viewing — Viewing Management + Checklist

Manages the viewing schedule and generates tailored checklists for property viewings.

## Commands

- **schedule {#} {date} {time}**: Schedule a viewing for a listing
- **checklist {#}**: Generate a tailored viewing checklist
- **show**: Show all scheduled/completed viewings
- **update {viewing#} {status}**: Update viewing status (Scheduled → Completed / Cancelled)
- **notes {viewing#} {text}**: Add notes after a viewing

## Schedule Workflow

1. Read listing # from `data/listings.md` and its report from `reports/`
2. Add entry to `data/viewings.md`
3. Update listing status to `Viewing` in `data/listings.md`
4. Auto-generate checklist (see below)

## Checklist Generation

Read the listing's evaluation report and generate a checklist tailored to the specific property.

### General Items (always included)

**Before arriving:**
- [ ] Confirm address and access instructions
- [ ] Bring: Personalausweis, Selbstauskunft, Gehaltsnachweise, SCHUFA
- [ ] Check current documents status via `/immo-ops documents`
- [ ] Note questions for landlord/Makler

**Outside the building:**
- [ ] Building exterior condition (facade, roof, entrance)
- [ ] Mailbox area (secure, labeled)
- [ ] Bicycle storage
- [ ] Trash/recycling area (clean, organized)
- [ ] Parking situation on street
- [ ] Noise level (traffic, construction, neighbors)

**Common areas:**
- [ ] Stairwell condition (clean, well-lit)
- [ ] Elevator (if applicable)
- [ ] Keller access and condition

**Inside the apartment:**
- [ ] Phone/mobile reception in all rooms
- [ ] Natural light in each room
- [ ] Window condition (seals, double-glazed, open/close smoothly)
- [ ] Wall condition (cracks, damp spots, mold signs)
- [ ] Floor condition
- [ ] Outlet count and placement per room
- [ ] Water pressure (run kitchen and bathroom taps)
- [ ] Hot water response time
- [ ] Heating system (check radiators, thermostat)
- [ ] Kitchen: space, connections (Starkstrom for oven?)
- [ ] Bathroom: ventilation, condition
- [ ] Storage space (Abstellraum, built-in closets)
- [ ] Internet: ask about available providers and speeds

**Questions to ask:**
- [ ] Reason the previous tenant left
- [ ] Nebenkosten breakdown (what's included)
- [ ] Any planned renovations or rent increases
- [ ] When was the last Nebenkostenabrechnung? Any Nachzahlung?
- [ ] Pet policy specifics
- [ ] Hausordnung rules (quiet hours, washing machine times)
- [ ] How many applicants expected?
- [ ] Timeline for decision

### Conditional Items (based on evaluation report)

**If Altbau (pre-1949):**
- [ ] Ceiling height (advertised vs actual)
- [ ] Dielen (wooden floors) condition — creaky, gaps, level
- [ ] Stucco condition
- [ ] Kastenfenster insulation quality
- [ ] Lead pipes? (ask about water pipe material)

**If Erdgeschoss (ground floor):**
- [ ] Window security (Einbruchsicherung)
- [ ] Street noise with windows closed
- [ ] Privacy from street/courtyard
- [ ] Dampness risk (check corners, basement proximity)

**If Dachgeschoss (top floor):**
- [ ] Summer heat (south-facing windows, insulation)
- [ ] Roof condition visible from inside
- [ ] Water stains on ceiling (leak history)

**If energy rating E or worse:**
- [ ] Ask about heating costs from last winter
- [ ] Check window insulation quality
- [ ] Ask about planned energy improvements

**If Makler-listed:**
- [ ] Confirm Bestellerprinzip (no tenant fee)
- [ ] Ask who the actual landlord is

### Neighborhood Walk (suggest before/after viewing)

- [ ] Walk the block: noise, cleanliness, vibe
- [ ] Check nearest supermarket distance
- [ ] Check nearest transit stop distance
- [ ] Visit at different times if possible (morning vs evening)
