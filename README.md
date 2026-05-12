# immo-ops

AI-powered real estate search command center for the German market. Evaluate listings, score neighborhoods, scan portals, detect scams, generate documents, and track applications.

Built for [Claude Code](https://claude.ai/code).

## Quick Start

```bash
# 1. Set up your profile
cp config/profile.example.yml config/profile.yml
cp modes/_profile.template.md modes/_profile.md
cp templates/portals.example.yml portals.yml

# 2. Edit config/profile.yml with your search criteria

# 3. Use the skills
/immo-ops                    # Show command menu
/immo-ops {URL}              # Evaluate a listing
/immo-scan                   # Scan portals for new listings
/immo-research {area}        # Deep research on an area
```

## Skills

| Skill | Purpose |
|-------|---------|
| `/immo-ops` | Main router — evaluate, compare, track, contact, viewings, scam check, documents, Selbstauskunft |
| `/immo-scan` | Scan configured portals for new listings |
| `/immo-research` | Deep area/landlord/building research |

## Scoring

8-block weighted system (1–5 scale): Price, Location, Size, Condition, Amenities, Availability, Rules, Landlord.

## Supported Search Types

- **Miete** — Rental apartments and houses
- **Kauf** — Purchase apartments, houses, and land
- **Grundstück** — Land plots
