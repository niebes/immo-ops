---
name: immo-research
description: Deep research on a specific listing -- area quality, landlord reputation, price comparison, risks
user_invocable: true
args: target
argument-hint: "[listing # or URL or area name]"
---

# immo-research -- Deep Research

Performs in-depth research on a specific listing, address, or area. Produces a research report covering landlord/Hausverwaltung reputation, neighborhood quality, price context, and risk factors.

## Execution

This skill runs as a subagent due to heavy WebSearch usage:

```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/research.md]\n\n[listing context from reports/ or data/listings.md]\n\nResearch target: {{target}}",
  description="immo-research {{target}}"
)
```

## Steps

1. Read `modes/research.md`
2. If `{{target}}` is a listing #, read its report from `reports/` and listing entry from `data/listings.md`
3. If `{{target}}` is a URL, fetch the listing details
4. If `{{target}}` is an area name, research the area broadly
5. Execute research workflow from `modes/research.md`
6. Write report to `research/{target-slug}-{date}.md`
