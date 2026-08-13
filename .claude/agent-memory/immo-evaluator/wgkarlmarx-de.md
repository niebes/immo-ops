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
- **Official membership terms (from `/fuer-wohnungssucher`, checked 2026-08-13):** Beitritt =
  **3 Geschäftsanteile für 615,00 EUR**, PLUS **wohnungsbezogene Geschäftsanteile nach Satzung
  § 17 Abs. 2 (Anlage)** — that second figure is NOT on the website, always ask. All refundable.
  Hard gate: *„zurzeit grundsätzlich keine Neuaufnahme von Mitgliedern **ohne konkrete
  Wohnraumüberlassung**"* → you cannot join first and queue; membership only comes with an
  allocation. Required docs: Personalausweis, 3 Einkommensnachweise (explicitly accepts a
  **Bewilligungsbescheid vom Arbeits-/Sozialamt** — fits Amanda), Bestätigung des vorherigen
  Vermieters über pünktliche Mietzahlungen (→ Arztberg reference).
- **Their stock reaches us mostly via PRIVATE Nachmieter ads on IS24, not via their own site.**
  #585 (IS24 expose 169969806, Zum Jagenstein, private tenant „Herr S. F.", 1.500 EUR Möbel-Ablöse)
  was NOT dual-listed by the coop — `/fuer-wohnungssucher` carried only Gewerbe. So the CLAUDE.md
  "pursue the landlord channel to dodge the Ablöse" move does **not** work here; the coop simply
  doesn't advertise flats. Still verify with one `curl -sL https://wgkarlmarx.de/fuer-wohnungssucher`
  (plain curl + tag-strip works, page lists Mietwohnung + Gewerbe together).
- **Vergabe risk:** the outgoing tenant can only *propose* a Nachmieter — the coop decides. Make
  that contact question #1 and score it in Block G, not H.
- **Their buildings:** Zum Jagenstein / Saarmunder Str. (Waldstadt II, ~2018/19, 113 WE — see
  [[potsdam-mietspiegel]] anchor), Zum Kahleberg, Ahornstr. 20, Potsdamer Mitte (Alter Markt 5a /
  Erika-Wolf-Str. / Friedrich-Ebert-Str. 1). ~7.500 Wohnungen total.
- **Zero Eigenbedarf risk** — cooperative can't terminate for personal use → Block H = 5.0
  for the coop itself (established, ~7.500 Wohnungen). Rents to non-members too (no WBS by
  default).
- Cooperative pricing runs **well below** private Neubau asking rents (Kahleberg 2025
  Erstbezug at ~14 EUR/m² kalt vs 18–21 typical). Block A tends to score high.
- Gallery on Neubau expose = architectural **renders/Visualisierungen**, not real interiors
  — normal for pre-completion, Neubau exception → no Block D cap.
- Near-identical Neubau units are listed as separate exposes (`-1/-3/-4`); treat as a
  cluster, eval one.
