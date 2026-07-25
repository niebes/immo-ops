---
name: sparkasse-immobilien
description: Portal quirks for immobilien.sparkasse.de (Sparkasse Immobilien) listing evaluation
metadata:
  type: reference
---

# Portal: Sparkasse Immobilien (immobilien.sparkasse.de)

Client-side SPA. Use the stealth browser (invisible-playwright) — headless plain fetch
may not render.

- **Expose URL pattern:** `/expose/FIO-{id}.html`.
- **Expired detection (reliable):** a removed listing returns **HTTP 410** and
  `navigate_page` reports `title: "Dieses Angebot ist nicht verfügbar"`. Body text:
  "Es wurde entweder gelöscht oder ist nicht mehr verfügbar." → mark **EXPIRED**, no
  scoring. The status code alone (410) is enough; no need to hunt selectors.
  *Why:* saves a full extraction attempt on dead links (websearch-sourced Sparkasse
  hints go stale fast).

## invisible-playwright driver note (not Sparkasse-specific)
On a cold call, `new_page(url=...)` and `navigate_page` may hang/error with
"browsingContext is undefined" for ~one call. Recovery: call `new_page` with an EMPTY
url (opens about:blank, wakes the driver), then `navigate_page` to the target. Worked
first try after that.
