/**
 * email-report.mjs — pure helpers behind scripts/build-email.mjs.
 *
 * The notification email (immo-find Notify mode) used to be hand-typed HTML:
 * ~15k chars per cycle, easy to get wrong (approximate counts, a missing
 * bgcolor, a truncated ✓/✗ row). These helpers derive everything from the
 * tracker row + its report instead, so the email is reproducible.
 *
 * Nothing here touches the filesystem — the CLI reads files and passes text in.
 */

// ── number helpers ───────────────────────────────────────────────────────────

/** Parse a German- or dot-formatted number ("1.975,00", "1975.5", "445.000"). */
export function parseNum(s) {
  if (s == null) return NaN;
  let t = String(s).trim().replace(/[^\d.,-]/g, '');
  if (!t) return NaN;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d+,\d{3}$/.test(t)) t = t.replace(',', '');
  return parseFloat(t);
}

/** German integer format: 1975 → "1.975". */
export function fmtInt(n) {
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** German decimal format for m²: 77.97 → "77,97", 81 → "81". */
export function fmtDec(n) {
  if (!Number.isFinite(n)) return '';
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Strip the markdown the reports use (bold, italics, code, links) to plain text. */
export function stripMd(s) {
  return String(s ?? '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── report parsing ───────────────────────────────────────────────────────────

/** Return the body of a `## {name}` section (up to the next `## ` heading). */
export function section(md, name) {
  const re = new RegExp(`^##\\s+${name}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im');
  const m = String(md).match(re);
  return m ? m[1].trim() : '';
}

export function reportHeader(md, key) {
  const m = String(md).match(new RegExp(`^\\*\\*${key}:\\*\\*\\s*(.+)$`, 'im'));
  return m ? m[1].trim() : '';
}

/**
 * The report's `**Address:**` header → { text, precision } (precision is
 * exact | street | area, '' when the evaluator didn't state one). null when the
 * report has no Address line (reports before 2026-10-04 predate the field).
 */
export function reportAddress(md) {
  const v = reportHeader(md, 'Address');
  if (!v) return null;
  const m = v.match(/^(.*?)\s*\(\s*(exact|street|area)\b[^)]*\)\s*$/i);
  return m ? { text: stripMd(m[1]), precision: m[2].toLowerCase() } : { text: stripMd(v), precision: '' };
}

/** Short listing title from the `# Evaluation: …` heading. */
export function reportTitle(md, max = 80) {
  const m = String(md).match(/^#\s+(.+)$/m);
  if (!m) return '';
  let t = stripMd(m[1]);
  // Leading prefixes appear in any order: "#123 —", "🔄 SWAP —", "Evaluation:", "TAUSCHWOHNUNG".
  for (let prev = null; prev !== t;) {
    prev = t;
    t = t.replace(/^#\d+\s*[—-]\s*/, '')
      .replace(/^🔄\s*SWAP\s*[—:-]?\s*/i, '')
      .replace(/^Evaluation:\s*/i, '')
      .replace(/^(TAUSCHWOHNUNG|Wohnungstausch|Wohnungsswap)\s*[:—-]?\s*/i, '')
      .replace(/^[„"“]\s*/, '');
  }
  t = t.replace(/[“"]\s*(?=—|$)/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return t;
}

const AMOUNT = /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{3,4}(?:,\d{1,2})?/g;
const EST_RE = /\b(est\.?|estimat\w*|geschätzt|ca\.|approx\w*|rekonstru\w*|selbst berechnet|derived)|~|≈/i;

/**
 * Warmmiete from the report body. Prefers the labelled field line
 * ("- Warmmiete: **1.975,00 EUR**" / "| Warmmiete | …") and its first bold
 * amount — prose mentions ("in Warmmiete enthalten") are only a fallback.
 * Returns { value, estimated, range? } or null.
 */
export function extractWarm(md) {
  const lines = String(md).split('\n');
  for (const line of lines) {
    if (!/^\s*(?:[-*|]\s*)?\**\s*Warmmiete\b/i.test(line)) continue;
    const bolds = line.match(/\*\*([^*]+)\*\*/g) || [];
    for (const b of bolds) {
      const seg = b.replace(/\*\*/g, '');
      const nums = (seg.match(AMOUNT) || []).map(parseNum).filter(v => v >= 250 && v <= 10000);
      if (nums.length) {
        const before = line.slice(Math.max(0, line.indexOf(b) - 25), line.indexOf(b));
        const estimated = EST_RE.test(seg) || EST_RE.test(before);
        return nums.length > 1 && /[–-]/.test(seg)
          ? { value: nums[0], high: nums[1], estimated: true }
          : { value: nums[0], estimated };
      }
    }
    const nums = (line.match(AMOUNT) || []).map(parseNum).filter(v => v >= 250 && v <= 10000);
    if (nums.length) return { value: nums[0], estimated: EST_RE.test(line) };
  }
  for (const line of lines) {
    const i = line.search(/warmmiete/i);
    if (i === -1) continue;
    if (/in\s+(der\s+)?warmmiete\s+enthalten/i.test(line)) continue;
    const rest = line.slice(i);
    for (const n of rest.match(AMOUNT) || []) {
      const v = parseNum(n);
      if (v >= 250 && v <= 10000) return { value: v, estimated: EST_RE.test(rest.slice(0, rest.indexOf(n) + n.length)) };
    }
  }
  return null;
}

/**
 * ✓ pros / ✗ cons from the `## Summary` section. Reports use either
 * explicit ✓/✗ lines or plain prose; prose falls back to `text`.
 */
export function extractSummary(md) {
  const body = section(md, 'Summary');
  const pros = [];
  const cons = [];
  const prose = [];
  // Evaluators write three shapes: one "✓ item" per line; a "✓ Pros:" heading
  // followed by "- item" bullets; and a "✓ **Pro:** a · b ·" paragraph
  // hard-wrapped across lines. Rejoin wrapped lines first, then let a bare
  // heading claim the bullets under it (all three: #871/#873/#874).
  const logical = [];
  for (const raw of body.split('\n')) {
    if (!raw.trim()) { logical.push(null); continue; }
    const bullet = /^\s*(?:[-*]|\d+\.)\s+/.test(raw);
    const starts = bullet || /^\s*[✓✗✘]/.test(raw);
    const prev = logical[logical.length - 1];
    if (!starts && prev) prev.text += ' ' + raw.trim();
    else logical.push({ bullet, text: raw.replace(/^\s*(?:[-*]|\d+\.)\s+/, '').trim() });
  }
  const HEADING = /^(pros?|cons?|vorteile|nachteile)\s*:?$/i;
  let list = null;
  for (const l of logical) {
    if (!l) continue;
    // A line may carry several marked items ("✓ a · ✓ b. ✗ c · ✗ d").
    for (const seg of l.text.split(/(?=[✓✗✘])/)) {
      const s = stripMd(seg.replace(/^[✓✗✘]\s*/, '')).replace(/\s*[·;,]\s*$/, '').trim();
      const marked = /^✓/.test(seg) ? pros : /^[✗✘]/.test(seg) ? cons : null;
      if (marked) list = marked;
      if (!s || (marked && HEADING.test(s))) continue;
      if (marked) marked.push(s);
      else if (l.bullet && list) list.push(s);
      else { list = null; prose.push(s); }
    }
  }
  return { pros, cons, text: prose.join(' ') };
}

/**
 * First open action from `## Next Steps` (the `- [ ]` item, else first bullet),
 * with its indented continuation — wrapped lines and sub-bullets — so an item
 * like "In one message ask:" keeps the questions it introduces.
 */
export function extractAction(md) {
  const lines = section(md, 'Next Steps').split('\n');
  let i = lines.findIndex(l => /^\s*-\s*\[ \]\s*\S/.test(l));
  if (i < 0) i = lines.findIndex(l => /^\s*(?:-|\d+\.)\s+\S/.test(l));
  if (i < 0) return '';
  const parts = [lines[i].replace(/^\s*(?:-\s*\[ \]|-|\d+\.)\s*/, '')];
  for (const l of lines.slice(i + 1)) {
    if (!/^\s+\S/.test(l)) break;
    parts.push(l.replace(/^\s*(?:[-*]|\d+\.)?\s*/, ''));
  }
  return stripMd(parts.join(' '));
}

/**
 * Swap Suche checklist line. Evaluators write `**Suche-Check:** …` (see
 * modes/evaluate.md step 4); older reports may carry a plain `Suche: …` line
 * with ✓/✗ marks. Anything else → unknown.
 */
export function extractSucheCheck(md) {
  const m = String(md).match(/^\s*(?:[-*]\s*)?\*{0,2}Suche(?:-Check)?:?\*{0,2}:?\s*(.+)$/im);
  if (m && /[✓✗]|unbekannt|unknown/i.test(m[1])) return 'Suche: ' + stripMd(m[1]);
  return 'Suche: unbekannt — verify on contact';
}

// ── tracker rows ─────────────────────────────────────────────────────────────

/** Tracker cells (parseListingRow output) → a typed row. */
export function trackerRow(cols) {
  const report = (cols[10] || '').match(/reports\/[^\s)\]]+\.md/);
  return {
    num: cols[0],
    date: cols[1],
    portal: cols[2],
    type: cols[3],
    location: cols[4],
    price: parseNum(cols[5]),
    priceRaw: cols[5],
    m2: parseNum(cols[6]),
    m2Raw: cols[6],
    rooms: cols[7],
    score: parseNum(cols[8]),
    status: cols[9],
    reportPath: report ? report[0] : null,
    notes: cols[11] || '',
  };
}

const PROPERTY_HINTS = [
  ['freizeitgrundstueck', /freizeit|wochenend|erholung|kleingarten|schrebergarten|laube|pacht/i],
  ['grundstueck', /grundst|bauland|plot|acker/i],
  ['haus', /haus|dhh|efh|bungalow|villa|reihen/i],
  ['wohnung', /wohnung|apartment|maisonette|etage/i],
];

export function dealType(row, reportType = '') {
  const t = `${row.type} ${reportType}`;
  if (/kauf|purchase|versteiger/i.test(t)) return 'kauf';
  if (/miet|rent|miete/i.test(t)) return 'miete';
  return /^\d{5,}/.test(String(row.priceRaw).replace(/\./g, '')) ? 'kauf' : 'miete';
}

/**
 * Pick the search group for a tracker row. Config-driven: candidates are the
 * portals.yml groups listing this portal, narrowed by deal type (miete/kauf),
 * city in the location, and property type for purchases.
 *
 * `groups` = [{ name, portals: [names], type, property, city, enabled }]
 */
export function inferGroup(row, groups, reportText = '') {
  const reportType = reportHeader(reportText, 'Type');
  const deal = dealType(row, reportType);
  let cands = groups.filter(g => g.portals.includes(row.portal));
  if (cands.length === 0) cands = groups.slice();
  const byDeal = cands.filter(g => g.type === deal);
  if (byDeal.length) cands = byDeal;
  if (cands.length > 1) {
    const loc = `${row.location} ${reportText.slice(0, 400)}`;
    const byCity = cands.filter(g => g.city && new RegExp(g.city, 'i').test(row.location));
    if (byCity.length) cands = byCity;
    else {
      const byCityLoose = cands.filter(g => g.city && new RegExp(g.city, 'i').test(loc));
      if (byCityLoose.length) cands = byCityLoose;
    }
  }
  if (cands.length > 1 && deal === 'kauf') {
    // Most specific source first: the report's **Type:** header, then the tracker
    // Type cell, then the title, then notes. A house title often mentions its
    // "Grundstück", so a later source must not override an earlier hit.
    const sources = [reportType, row.type, reportTitle(reportText, 500), row.notes];
    let prop = null;
    for (const src of sources) {
      prop = PROPERTY_HINTS.find(([, re]) => re.test(src || ''));
      if (prop) break;
    }
    if (prop) {
      const byProp = cands.filter(g => g.property === prop[0]);
      if (byProp.length) cands = byProp;
    }
  }
  return cands[0] ? cands[0].name : null;
}

// ── rendering ────────────────────────────────────────────────────────────────

export const COLORS = { green: '#e8f5e9', yellow: '#fff8e1', red: '#ffebee', white: '#ffffff' };

export function scoreColor(score) {
  if (!Number.isFinite(score)) return COLORS.white;
  if (score >= 3.5) return COLORS.green;
  if (score >= 3.0) return COLORS.yellow;
  return COLORS.red;
}

export function sectionEmoji(g) {
  if (g.type === 'kauf' && g.property === 'haus') return '🏠';
  if (g.type === 'kauf') return '🌳';
  return '🏢';
}

function td(bg, html, extra = '') {
  return `<td bgcolor="${bg}" style="padding:6px;border:1px solid #ddd;background-color:${bg}${extra}">${html}</td>`;
}

/** Price cell by deal type. */
export function priceCell(item) {
  const { row, warm, deal, property } = item;
  if (deal === 'kauf') {
    const main = `${fmtInt(row.price)} €`;
    if (property && /grundst/.test(property) && Number.isFinite(row.m2) && row.m2 > 0 && Number.isFinite(row.price)) {
      return `${main}<br><span style="color:#777">${fmtDec(Math.round((row.price / row.m2) * 100) / 100)} €/m²</span>`;
    }
    return main;
  }
  const km = Number.isFinite(row.price) ? `${fmtInt(row.price)} KM` : `${escapeHtml(row.priceRaw)} KM`;
  const wm = !warm ? 'WM n/a'
    : warm.high ? `~${fmtInt(warm.value)}–${fmtInt(warm.high)} WM est.`
    : `~${fmtInt(warm.value)} WM${warm.estimated ? ' est.' : ''}`;
  return `${km}<br><span style="color:#777">${wm}</span>`;
}

/** "📍 street, PLZ Ort" under the listing title; non-exact addresses carry their precision. */
function addressLine(address) {
  if (!address?.text) return '';
  const p = address.precision && address.precision !== 'exact' ? ` <i>(${escapeHtml(address.precision)})</i>` : '';
  return `<br><span style="font-size:11px;color:#555">📍 ${escapeHtml(address.text)}${p}</span>`;
}

/** One listing: main row + ✓/✗ detail row (both colour-coded per cell). */
export function renderListing(item) {
  const { row, url, title, address, pros, cons, text, action, swap, suche, scam } = item;
  const bg = scoreColor(row.score);
  const flag = scam && !/legit/i.test(scam) ? '⚠ ' : '';
  const label = `${swap ? '🔄 SWAP ' : ''}${flag}${escapeHtml(title)}`;
  const size = Number.isFinite(row.m2) ? `${fmtDec(row.m2)} m²` : escapeHtml(row.m2Raw || '?');
  const cells = [
    td(bg, escapeHtml(row.num)),
    td(bg, `<b>${Number.isFinite(row.score) ? row.score.toFixed(1) : '–'}</b>`),
    td(bg, `<a href="${escapeHtml(url)}" target="_blank">${label}</a> <span style="color:#777">(${escapeHtml(row.portal)})</span>${addressLine(address)}`),
    td(bg, priceCell(item)),
    td(bg, size),
    td(bg, escapeHtml(row.rooms || '–')),
  ].join('');
  const main = `<tr bgcolor="${bg}" style="background-color:${bg}">${cells}</tr>`;

  const proList = pros.length ? pros : (text ? [text] : []);
  const conList = cons.slice();
  if (flag) conList.unshift(`SCAM CHECK: ${scam}`);
  if (action) conList.push(`→ ${action}`);
  const parts = [];
  if (proList.length) parts.push(`✓ ${escapeHtml(proList.join(' · '))}`);
  if (conList.length) parts.push(`✗ ${escapeHtml(conList.join(' · '))}`);
  if (swap) parts.push(`<b>${escapeHtml(suche)}</b>`);
  if (!parts.length) return main;
  const detail = `<tr bgcolor="${bg}" style="background-color:${bg}"><td colspan="6" bgcolor="${bg}" style="padding:4px 6px 8px;border:1px solid #ddd;background-color:${bg};font-size:11px;color:#555">${parts.join(' ')}</td></tr>`;
  return main + '\n' + detail;
}

const TH = s => `<th style="padding:6px;border:1px solid #ddd">${s}</th>`;

export function renderSection(group, items) {
  const disabled = group.enabled === false;
  const border = disabled ? '#bbb' : '#2e7d32';
  const color = disabled ? 'color:#888;' : '';
  const kind = `${group.type === 'kauf' ? 'Kauf' : 'Miete'} / ${group.property || ''}`;
  const badge = disabled ? '(disabled)' : items.length ? `(${kind} · ${items.length} listing${items.length === 1 ? '' : 's'})` : `(${kind} · no listings yet)`;
  const h2 = `<h2 style="font-size:16px;border-bottom:2px solid ${border};padding-bottom:4px;${color}">${sectionEmoji(group)} ${escapeHtml(group.name)} <span style="font-size:12px;color:#777;font-weight:normal">${escapeHtml(badge)}</span></h2>`;
  if (disabled || items.length === 0) return h2;
  const head = `<tr bgcolor="#f0f0f0" style="background-color:#f0f0f0">${['#', 'Score', 'Listing', 'Price', 'Size', 'Rooms'].map(TH).join('')}</tr>`;
  return `${h2}\n<table style="border-collapse:collapse;width:100%;font-size:13px">\n${head}\n${items.map(renderListing).join('\n')}\n</table>`;
}

export function renderOverdue(overdue) {
  if (!overdue || overdue.length === 0) return '';
  const rows = overdue.map(a => {
    const days = a.daysOverdue != null ? `${a.daysOverdue}d` : '';
    const ev = a.evidence ? `${a.evidence.file}${a.evidence.detail ? ` (${a.evidence.detail})` : ''}` : '';
    return `<tr>${[`<b>#${escapeHtml(a.listing)}</b>`, escapeHtml(a.summary), escapeHtml(days), escapeHtml(ev)]
      .map(c => `<td style="padding:4px 8px;border:1px solid #ddd">${c}</td>`).join('')}</tr>`;
  }).join('\n');
  return `<div style="border:2px solid #c62828;padding:8px 12px;margin:12px 0;background:#ffebee">
<h2 style="font-size:16px;color:#c62828;margin:4px 0">⚠ Overdue actions</h2>
<table style="border-collapse:collapse;font-size:12px">
${rows}
</table></div>`;
}

/** One-line reason for a Discarded/Expired row, taken from its tracker Notes. */
export function discardReason(notes, max = 140) {
  const n = stripMd(notes);
  // Priority order, not position: "DISCARDED swap-mismatch: …" should yield the swap clause.
  const m = [/swap-mismatch[^|]*/i, /HARD BLOCKER[^|]*/i, /DISCARDED[^|]*/i, /EXPIRED[^|]*/i]
    .map(re => n.match(re)).find(Boolean);
  const r = (m ? m[0] : n).trim();
  return r.length > max ? r.slice(0, max).replace(/\s+\S*$/, '') + '…' : r;
}

/** Subject: `immo-ops: {N} listing(s) — {breakdown} — {timestamp}`. */
export function buildSubject(count, breakdown, stamp) {
  return `immo-ops: ${count} listing(s) — ${breakdown || 'no new listings'} — ${stamp}`;
}

/** Short label per group for the subject breakdown. */
export function groupShort(g) {
  if (g.type === 'miete') return 'Miete';
  if (g.property === 'haus') return 'Haus';
  if (g.property === 'freizeitgrundstueck') return 'Freizeitgrundstück';
  if (g.property === 'grundstueck') return 'Grundstück';
  return g.name;
}
