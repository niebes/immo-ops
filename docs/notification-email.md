# Notification email — format spec

Implemented by `scripts/build-email.mjs` (+ `scripts/lib/email-report.mjs`, tested in
`scripts/test/email-report.test.mjs`). This is the spec the script follows; change the script
and this file together. Moved here from `.claude/skills/immo-find/SKILL.md` on 2026-09-28 so the
skill doesn't load ~85 lines of HTML detail on every run.

**What to include:** Scored listings from `data/pipeline.md` with score ≥ 3.0 (max 50). Exclude DISCARDED, DUPE, and sub-3.0 entries — these are not actionable and waste the reader's attention. Sort by score descending within each section. Mention the count of excluded sub-3.0 listings in the footer.

**Enrichment from reports:** For each listing with a report in `reports/`, read the `## Summary` section and extract:
- The bold assessment phrase (e.g., "Strong candidate, worth pursuing")
- ✓ pros: ALL positive points from the summary
- ✗ cons: ALL concerns (after "However:" / "Main concerns:" / "Key concern:" / the ✗ items)
- If the listing has no real photos (or renders/example photos only — see Block D photo rule in `modes/_shared.md`), always include "no photos" in the ✗ con.
- Any action note from the summary/next steps (e.g. "apply immediately", "Sammelbesichtigung vorbei — neuen Termin anfragen").
Include these as a second row under each listing in the table (smaller font, gray text).
**The detail row does NOT need to be short (user rule 2026-07-15): completeness beats brevity.**
It is the report's stand-in in the email — carry every relevant pro, con, and action note from
the report summary so the user can decide from the row alone whether to open the full report.
Do not truncate to "first pro / first con"; only leave out what the summary itself doesn't state.

**Email structure — grouped by search target:**

Header block (before the sections):
- `<h1 style="border-bottom:2px solid #1a73e8;padding-bottom:8px">immo-ops scan results</h1>`
- Subtitle `<p style="color:#666">`: `{timestamp} • {N} new listings evaluated • {M} scoring 3.0+`
- Scan note `<p style="color:#888;font-size:12px">`: which portals were scanned (Playwright vs browser), which search groups are disabled, anything skipped (CAPTCHA etc.). MUST name EVERY enabled portal that was not processed and its exact blocker (see the Coverage report RULE in Step 5) — never let a blocked portal go unmentioned.

The email body is organized into sections, one per search target from `config/profile.yml`. Each section has a header and its own table.

**Section header:** `<h2 style="font-size:16px;border-bottom:2px solid #2e7d32;padding-bottom:4px">` with emoji, search name, and a gray count badge:
```html
<h2 ...>🏢 Potsdam flat rental <span style="font-size:12px;color:#777;font-weight:normal">(Miete / Wohnung · {N} listings)</span></h2>
```
- `🏠` house purchase (Kauf/Haus), `🏢` flat rental (Miete/Wohnung), `🌳` plot purchase (Kauf/Grundstück)
- Active section with zero scored listings: show header with "(no listings yet)", skip the table
- **Disabled search groups: still show the header**, grayed out — border `#bbb`, `color:#888`, badge text `(disabled)` — so the reader sees the full search scope at a glance

**Matching listings to sections:** Use the search group tag from the pipeline entry (added during scan). For older pipeline entries without a tag, infer from listing type (miete/kauf) and property type (wohnung/haus/grundstück) based on the report or URL.

**Table format per section:** HTML with `htmlBody` parameter. Columns: #, Score, Listing (linked to portal URL), Price, Size, Rooms. The # column shows the listing number from the tracker. Score is `<b>{score}</b>` without "/5" (e.g. `<b>4.6</b>`). Header row: `#f0f0f0` background, all cells `border:1px solid #ddd`.

**Listing cell:** linked short descriptive title, portal name inline after the link in gray:
```html
<a href="{url}" target="_blank">{short title — area}</a> <span style="color:#777">({Portal})</span>
```

Color-code rows:
- Green background (`#e8f5e9`): score 3.5+ (worth pursuing)
- Yellow background (`#fff8e1`): score 3.0–3.4 (compromises)
- Red background (`#ffebee`): score below 3.0 (not recommended)
- White: no score yet

**Swap candidates (Tauschwohnung, `Swap-candidate` status):** color-code by THEIR-flat score
as above, and prefix the listing title with **🔄 SWAP**. The `✓/✗` detail row must state the
two-sided verdict plus the consent caveat, AND — mandatory (user rule 2026-07-15) — include the
partner's Suche as a compact per-criterion checklist judged against our offer, so a weak match
can be skimmed in the email without opening the report. One line, ` · `-separated, each
criterion followed by ✓/✗ with our value in parens:
`Suche: Teltow+10km ✗(Golm ~20km) · ≤1.200 ✓(1.025) · ≥55m² ✗(54,19) · ≥2,5 Zi ✗(2) · Balkon ✗(nur Garten) · Garten ✓`
If their Suche is unknown/vague, say exactly that (`Suche: unbekannt — verify on contact`).
Even multi-criteria near-miss swaps stay IN the results (manual review beats silent discard) —
the checklist is what makes that reviewable. Do not list `Discarded` swap-mismatches in
the email (same as sub-3.0 exclusion — don't waste attention).

**CRITICAL — Gmail strips row-level styles in the draft composer.** Set the background on EVERY cell, not just the row, and use both the legacy attribute and inline style. The `bgcolor` attribute survives every email sanitizer:
```html
<tr bgcolor="#e8f5e9" style="background-color:#e8f5e9">
  <td bgcolor="#e8f5e9" style="padding:6px;border:1px solid #ddd;background-color:#e8f5e9">...</td>
  ...
</tr>
```
All styles inline on the elements — do not rely on a `<style>` block alone (stripped by Gmail).

**Price column adapts to type:**
- Miete: Kaltmiete and Warmmiete on two lines — `{KM} KM<br><span style="color:#777">~{WM} WM</span>`. If WM is estimated or a range, say so (`~1.830 WM est.`). Use German number format with `€` or bare numbers + KM/WM, never "EUR".
- Kauf/Haus: show Kaufpreis
- Kauf/Grundstück: show Kaufpreis + price/m²

Below each listing row, add a detail row (same `bgcolor`/background on the cell, `font-size:11px;color:#555`):
```
✓ {all pros}  ✗ {all cons + action note}
```
Only include the detail row if a report exists for that listing. Length is NOT a constraint
(user rule 2026-07-15) — include everything relevant from the report summary.

**MANDATORY — both features, every email.** Each listing MUST have BOTH (1) color-coded cells AND (2) its own `✓ pro / ✗ con` detail row beneath it. Do NOT compact the detail row into the listing cell or drop it to save space/effort — the per-listing ✓/✗ row is the point of the email, and it should carry ALL relevant pros/cons/action notes from the report summary (see "Enrichment from reports" above). Reference gold-standard format: the 2026-05-20 scan-report email.

Subject: `immo-ops: {N} listing(s) — {summary, e.g. '5 Miete, 2 Haus, 1 Grundstück'} — {current date and time from system clock, NEVER guessed}`

**RULE: Always get the current timestamp from the system (e.g., `new Date().toISOString()` or `date` command) before composing the email. Never hardcode or guess the time.**

Footer (`<p style="margin-top:18px;font-size:12px;color:#777">`): excluded sub-3.0 listings with ID, score, and one-line reason (e.g. `#117 (2.5/5 — stale Bestandsmiete price fiction)`); discarded/duped counts per section; reports path (e.g. `reports/113–121-*.md`); link to immo-ops repo.
