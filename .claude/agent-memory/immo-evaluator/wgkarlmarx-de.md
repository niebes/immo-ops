# WG Karl Marx eG (wgkarlmarx.de) — Potsdam housing cooperative

Portal-family match: `wgkarlmarx.de`. Genossenschaft's own site, expose URLs like
`/fuer-wohnungssucher/expose/{slug}`.

## Access
- **WebFetch works cleanly** — static server-rendered expose, no consent wall, no JS gate.
  A single WebFetch with a field-by-field prompt returns the whole expose (Kaltmiete /
  Nebenkosten / Heizkosten / Warmmiete broken out, m², Zimmer, Baujahr, Ausstattung,
  Verfügbarkeit, Genossenschaftsanteile, contact). Prefer WebFetch here — faster, no
  permission prompt.
- **CiC navigate was permission-denied this session** (3x) despite the caller's hint that
  "navigate works this session". Don't burn calls retrying — fall back to WebFetch, which
  is enough for this portal. *Why:* without the fallback the eval stalls on a page that
  doesn't actually need a browser.

## Portal specifics
- **No classic Kaution.** Instead requires refundable **Genossenschaftsanteile** (equity
  share, ~2.000 EUR for a 3-Raum). Treat as legal/modest in Block G — NOT a hard blocker,
  NOT a deposit >3-NKM violation.
- **Zero Eigenbedarf risk** — cooperative can't terminate for personal use → Block H = 5.0
  for the coop itself (established, ~7.500 Wohnungen). Rents to non-members too (no WBS by
  default).
- Cooperative pricing runs **well below** private Neubau asking rents (Kahleberg 2025
  Erstbezug at ~14 EUR/m² kalt vs 18–21 typical). Block A tends to score high.
- Gallery on Neubau expose = architectural **renders/Visualisierungen**, not real interiors
  — normal for pre-completion, Neubau exception → no Block D cap.
- Near-identical Neubau units are listed as separate exposes (`-1/-3/-4`); treat as a
  cluster, eval one.
