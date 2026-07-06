# Mode: research — Deep Area/Landlord/Building Research

Performs in-depth research on a specific listing, address, or area. Produces a comprehensive research report.

## Input

One of:
- Listing # from tracker → research that specific property
- URL → research that listing
- Area name (e.g., "Kreuzberg", "Prenzlauer Berg") → broad area research

## Research Blocks

### 1. Landlord / Hausverwaltung Research

If a landlord or Hausverwaltung name is known (from the listing or evaluation report):
- WebSearch for reviews, complaints, legal disputes
- Check for Mietverein (tenant association) warnings
- Look for Eigentümer history (ownership changes)
- For corporate landlords (Vonovia, Deutsche Wohnen, etc.): check recent press, class actions, repair complaint patterns
- For municipal landlords (Degewo, Howoge, etc.): generally reliable, note competition level

### 2. Neighborhood / Area Quality

- **Safety**: Crime statistics for the PLZ/Bezirk — WebSearch the official crime stats for the profile's city (the state police's Kriminalitätsatlas/statistics portal; city from `config/profile.yml` or the listing address)
- **Noise**: Flight paths, train lines, nightlife areas, construction sites
- **Demographics**: Age distribution, international mix, family-friendliness
- **Green spaces**: Parks, playgrounds, lakes within walking distance
- **Transit**: U-Bahn, S-Bahn, tram, bus lines. Night transit options
- **Amenities**: Supermarkets, pharmacies, doctors, schools, daycare (Kita)
- **Development**: Planned construction, gentrification trends, urban planning projects

### 3. Price Context

- **Mietspiegel comparison**: Official rent index for the area/street/PLZ
- **Recent comparable listings**: What similar properties cost on the same portal
- **Trend**: Are prices in this area rising, stable, or falling?
- **Mietpreisbremse applicability**: Is this area in a regulated zone? Is the listing compliant?
- For purchases: recent sale prices per m² in the area, Bodenrichtwert (land value)

### 4. Building / Address Research

If a specific address is known:
- **Building age and history**: Gründerzeit, Plattenbau, postwar, Neubau
- **Previous listings at the same address**: High turnover = potential problem
- **Building energy rating**: If Energieausweis details available
- **Denkmalschutz** (heritage protection): May limit renovations
- **Flood/environmental risks**: Check the city/state environmental atlas for flood zones and contaminated sites — WebSearch `"{city} Umweltatlas"` / `"{Bundesland} Hochwassergefahrenkarte"`

### 5. Risk Assessment

Compile all findings into a risk profile:
- **Low risk**: Municipal landlord, good area, fair price, no red flags
- **Medium risk**: Some concerns (private landlord, price at limit, noisy street)
- **High risk**: Multiple concerns (problematic landlord, overpriced, bad building condition)

## Output Format

Write to `research/{target-slug}-{date}.md`:

```markdown
# Research Report: {Target}

**Date:** {YYYY-MM-DD}
**Listing:** #{NNN} (if applicable)
**Address:** {address} (if known)
**Area:** {Bezirk/Stadtteil}

---

## 1. Landlord / Hausverwaltung
{findings or "Not applicable / No data found"}

## 2. Neighborhood
### Safety
{findings}
### Transport
{findings}
### Amenities
{findings}
### Green Spaces & Recreation
{findings}
### Development & Trends
{findings}

## 3. Price Context
{Mietspiegel data, comparables, trends}

## 4. Building / Address
{findings or "No specific address available"}

## 5. Risk Assessment
**Overall Risk:** {Low | Medium | High}
**Key Concerns:** {list}
**Key Strengths:** {list}

---

## Sources
- {list of sources consulted with dates}
```
