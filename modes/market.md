# Mode: market — Market Analysis

Analyzes the real estate market for a specific area, city, or segment.

## Input

One of:
- Area name: `market Kreuzberg` or `market Berlin`
- Segment: `market 3-Zimmer Berlin-Kreuzberg`
- Comparison: `market Kreuzberg vs Neukölln`

## Research Topics

### Price Overview
- Current Mietspiegel for the area (WebSearch for latest data)
- Average Kaltmiete per m² by room count
- Price range (10th to 90th percentile)
- Year-over-year trend
- Comparison to city average

### Supply & Demand
- Approximate number of listings currently available
- Average time a listing stays online (turnover speed)
- Competition level (how fast do listings get taken?)
- Seasonal patterns (more available in certain months?)

### Area Profile
- Demographics overview
- Key infrastructure (transit score, schools, shopping)
- Planned developments (new construction, transit extensions)
- Gentrification indicators

### For Purchases
- Average purchase price per m² by property type
- Bodenrichtwert (land value index)
- Rental yield estimates
- Price trend (last 1, 3, 5 years)

## Output Format

```markdown
# Market Analysis: {Area}

**Date:** {YYYY-MM-DD}
**Segment:** {property type, room count, rental/purchase}

## Price Overview
{data and trends}

## Supply & Demand
{availability, competition, timing}

## Area Profile
{demographics, infrastructure, development}

## Recommendation
{how this area fits user's criteria, best timing, strategy suggestions}

## Sources
- {list of sources with dates}
```

## Data Sources

Derive the city from the request or from `config/profile.yml` (the active search's location). Use WebSearch with pattern-based queries — never assume a hardcoded city:
- Mietspiegel data: WebSearch `"{city} Mietspiegel {year}"` (most cities publish an official one; use the qualified Mietspiegel where available)
- Market reports (empirica, bulwiengesa, immobilienscout24 market reports) for the target city/region
- City planning data: WebSearch `"{city} Stadtentwicklung"` / the city's official planning portal
- Price statistics (destatis.de for federal data)
