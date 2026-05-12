# immo-ops

AI-powered real estate search command center for the German market. Evaluate listings, score neighborhoods, scan portals, detect scams, generate documents, and track applications.

Built for [Claude Code](https://claude.ai/code).

## Setup

### Prerequisites

- [Claude Code](https://claude.ai/code) installed (CLI, desktop app, or IDE extension)
- Node.js 18+ (for utility scripts)
- Git

### 1. Install dependencies

```bash
npm install
```

### 2. Create your configuration files

Configuration and data files need to be copied from templates. All are gitignored — they contain your personal data and never leave your machine.

```bash
# Configuration
cp config/profile.example.yml config/profile.yml
cp modes/_profile.template.md modes/_profile.md
cp templates/portals.example.yml portals.yml

# Data scaffolding
cp templates/data/listings.md data/listings.md
cp templates/data/pipeline.md data/pipeline.md
cp templates/data/viewings.md data/viewings.md
cp templates/data/documents.md data/documents.md
```

### 3. Configure each file

#### `config/profile.yml` — Your search criteria and identity

This is the main configuration file. It drives scoring, filtering, scanning, and document generation.

| Section | What to fill in | Used by |
|---------|----------------|---------|
| `searcher` | Your name, email, phone | Contact drafts, Selbstauskunft |
| `searches` | One or more search definitions (city, type, price range, size, must-haves, deal-breakers) | Scoring, scanning, filtering |
| `commute` | Work address(es) and max commute time | Location scoring (Block B) |
| `documents` | Income, employer, employment type, SCHUFA status, pets, household size, smoker | Selbstauskunft generation, document tracker |
| `buyer` | Equity, financing, notary preference (uncomment if buying) | Buyer profile generation |

**Minimum to get started:** Fill in `searcher`, one entry in `searches` with your city and price range, and one `commute` destination. Everything else can be added later.

<details>
<summary>Key fields explained</summary>

- **`searches[].type`**: `miete` (rent) or `kauf` (buy)
- **`searches[].property`**: `wohnung` (flat), `haus` (house), or `grundstueck` (land)
- **`searches[].must_haves`**: Hard requirements — listings missing these get a heavy score penalty. Use identifiers like `balkon_or_terrasse`, `einbaukueche`, `haustiere_erlaubt`
- **`searches[].nice_to_haves`**: Soft preferences — having these boosts the score but missing them doesn't kill it
- **`searches[].deal_breakers`**: Automatic disqualifiers like `no_wbs_required`, `no_zwischenmiete`
- **`commute.destinations[].mode`**: `transit`, `bike`, or `car`
- **`documents.employment_type`**: `unbefristet` (permanent), `befristet` (fixed-term), or `selbststaendig` (self-employed)

</details>

#### `modes/_profile.md` — Your personal preferences and knowledge

Optional but recommended. This file lets you:

- Override scoring weights (e.g., make location 30% instead of 20%)
- Add personal notes about specific neighborhoods ("Oranienstraße is noisy at night")
- Record landlord knowledge ("Vonovia has slow repairs")
- Set your contact style for drafted messages ("formal German, mention stable employment early")
- Add soft preferences beyond what's in profile.yml ("prefer Altbau with high ceilings")

Everything in this file is in commented-out examples — uncomment and edit what's relevant to you. Skip it entirely if the default scoring weights work for you.

#### `portals.yml` — Which portals to scan

Controls which real estate portals `/immo-find scan` checks. The template comes pre-configured with major German portals (ImmoScout24, Immowelt, Kleinanzeigen, Degewo, Howoge, Gesobau, Vonovia, Deutsche Wohnen, Sparkasse).

| Field | What to configure |
|-------|------------------|
| `scan_defaults` | Default city, price, rooms, size — should match your primary search |
| `portals[].enabled` | Toggle portals on/off |
| `portals[].search_url` | Pre-built search URL with your filters baked in |
| `title_filter.negative` | Keywords that auto-discard listings (WBS, Zwischenmiete, etc.) |

**To customize search URLs:** Go to each portal in your browser, set your filters (city, price, rooms, size), and copy the resulting URL into `search_url`. The template URLs use Berlin defaults.

### 4. Verify setup

```bash
node scripts/verify-pipeline.mjs
```

This checks that all required files exist and data formats are correct. Warnings about missing optional files (profile.yml, _profile.md, portals.yml) mean you haven't completed step 2–3 yet.

## Usage

```
# Find — discover new listings
/immo-find scan               # Scan configured portals (or: npm run scan)
/immo-find pipeline           # Process pending URLs from inbox

# Assess — analyze listings
/immo-assess {URL}            # Evaluate a listing (paste any portal URL)
/immo-assess compare 1 3 5    # Compare listings side-by-side
/immo-assess scam-check {URL} # Standalone scam detection
/immo-assess market Kreuzberg # Market analysis for an area

# Apply — act on listings
/immo-apply contact 3         # Draft a message to the landlord
/immo-apply selbstauskunft    # Generate Mieterselbstauskunft
/immo-apply documents         # Track submitted documents

# Track — manage your search
/immo-track                   # Show listing tracker overview
/immo-track viewing 3         # Generate viewing checklist for listing #3

# Research — deep-dive
/immo-research Kreuzberg      # Deep research on an area
/immo-research 3              # Deep research on listing #3
```

## Skills

| Skill | Phase | Purpose |
|-------|-------|---------|
| `/immo-find` | Discover | Scan portals, process pipeline, batch discovery |
| `/immo-assess` | Analyze | Evaluate, compare, scam-check, market analysis |
| `/immo-apply` | Act | Contact landlords, Selbstauskunft, document tracking |
| `/immo-track` | Manage | Listing tracker, viewing schedule |
| `/immo-research` | Deep-dive | Area, landlord, and building research |

## Scoring

8-block weighted system (1.0–5.0 scale):

| Block | Dimension | Default Weight |
|-------|-----------|---------------|
| A | Price (Kaltmiete, EUR/m², Mietspiegel) | 20% |
| B | Location (area preference, commute) | 20% |
| C | Size (m², rooms) | 15% |
| D | Condition (age, renovation, Energieausweis) | 10% |
| E | Amenities (must-haves, nice-to-haves) | 10% |
| F | Availability (move-in date) | 10% |
| G | Rules (WBS, pets, Befristung, Kaution) | 10% |
| H | Landlord (reputation, Eigenbedarf risk) | 5% |

Weights are adjustable in `modes/_profile.md`.

## Supported Search Types

- **Miete** — Rental apartments and houses
- **Kauf** — Purchase apartments, houses, and land
- **Grundstück** — Land plots

## File Overview

```
config/profile.yml          ← YOUR search criteria (gitignored)
modes/_profile.md           ← YOUR scoring overrides (gitignored)
portals.yml                 ← YOUR portal config (gitignored)
data/listings.md            ← Listing tracker
data/pipeline.md            ← URL inbox
data/viewings.md            ← Viewing schedule
data/documents.md           ← Document submission tracker
reports/                    ← Evaluation reports
research/                   ← Deep research reports
```
