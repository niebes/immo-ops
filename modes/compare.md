# Mode: compare — Compare Multiple Listings

Compares 2–5 listings side-by-side with score breakdowns and a recommendation.

## Input

One of:
- List of listing numbers: `compare 1 3 5`
- `compare top 3` — compare top 3 by score
- `compare Interested` — compare all listings with "Interested" status

## Workflow

1. Read `data/listings.md` to identify listings
2. Read each listing's report from `reports/`
3. Build comparison table
4. Highlight winner per dimension
5. Provide overall recommendation

## Output Format

```
Comparison: #{N1} vs #{N2} vs #{N3}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Dimension | #{N1} {location} | #{N2} {location} | #{N3} {location} |
|-----------|-----------------|-----------------|-----------------|
| **Score** | **{X.X}** ★ | {X.X} | {X.X} |
| Price (kalt) | {amt} EUR | {amt} EUR | {amt} EUR |
| Price/m² | {amt} EUR | {amt} EUR | {amt} EUR |
| Location | {area} | {area} | {area} |
| Commute | {N} min | {N} min | {N} min |
| Size | {N} m² | {N} m² | {N} m² |
| Rooms | {N} | {N} | {N} |
| Condition | {state} | {state} | {state} |
| Energy | {class} | {class} | {class} |
| Must-haves | {N}/{total} | {N}/{total} | {N}/{total} |
| Available | {date} | {date} | {date} |
| Scam risk | {tier} | {tier} | {tier} |

★ = best in category

**Recommendation:** #{N} is the strongest overall because {reason}.
{Trade-off notes if applicable.}
```
