import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNum, fmtInt, extractWarm, extractSummary, extractAction, extractSucheCheck,
  reportTitle, inferGroup, scoreColor, renderListing, trackerRow, discardReason,
} from '../lib/email-report.mjs';

test('parseNum handles German, dot and plain formats', () => {
  assert.equal(parseNum('1.975,00'), 1975);
  assert.equal(parseNum('445.000'), 445000);
  assert.equal(parseNum('1559.4'), 1559.4);
  assert.equal(parseNum('66,47'), 66.47);
  assert.equal(fmtInt(1870.91), '1.871');
});

test('extractWarm prefers the labelled bold field over prose mentions', () => {
  const md = [
    '- Heizkosten: Preisblock sagt „**in Warmmiete enthalten**" (wie #826)',
    '- Warmmiete laut Exposé: **2.355,00 EUR** (2.050 + 305)',
  ].join('\n');
  assert.deepEqual(extractWarm(md), { value: 2355, estimated: false });
});

test('extractWarm marks ranges and ca. values as estimates', () => {
  const md = '- Warmmiete: ~700 EUR + Gas. Rekonstruiert: **ca. 790–830 EUR/Monat**.';
  const w = extractWarm(md);
  assert.equal(w.value, 790);
  assert.equal(w.high, 830);
  assert.equal(w.estimated, true);
});

test('extractWarm: "no reconstruction needed" prose is not an estimate', () => {
  const md = '- Warmmiete: **1.870,91 EUR**, a real all-in figure. No heating reconstruction is needed.';
  assert.deepEqual(extractWarm(md), { value: 1870.91, estimated: false });
});

test('extractSummary splits inline ✓/✗ items and keeps prose separately', () => {
  const md = '## Summary\nScore: 4,3/5. Good flat.\n✓ Balkon · ✓ Keller. ✗ no photos · ✗ no EA\n\n## Next Steps\n- [ ] Ask for Suche\n';
  const s = extractSummary(md);
  assert.deepEqual(s.pros, ['Balkon', 'Keller.']);
  assert.deepEqual(s.cons, ['no photos', 'no EA']);
  assert.equal(s.text, 'Score: 4,3/5. Good flat.');
  assert.equal(extractAction(md), 'Ask for Suche');
});

test('extractSucheCheck reads a Suche-Check line, else unknown', () => {
  assert.equal(extractSucheCheck('**Suche-Check:** Teltow ✗(Golm) · ≤1.200 ✓(1.025)'), 'Suche: Teltow ✗(Golm) · ≤1.200 ✓(1.025)');
  assert.equal(extractSucheCheck('no suche here'), 'Suche: unbekannt — verify on contact');
});

test('reportTitle strips SWAP / Evaluation / TAUSCHWOHNUNG prefixes in any order', () => {
  assert.equal(reportTitle('# Evaluation: 🔄 SWAP — TAUSCHWOHNUNG 4-Raumwohnung — Bornstedt'), '4-Raumwohnung — Bornstedt');
  assert.equal(reportTitle('# 🔄 SWAP — Evaluation: TAUSCHWOHNUNG Schöne DG-Wohnung'), 'Schöne DG-Wohnung');
});

const GROUPS = [
  { name: 'Potsdam flat rental', portals: ['ImmoScout24', 'Kleinanzeigen', 'eBay.de Grundstücke'], type: 'miete', property: 'wohnung', city: 'Potsdam' },
  { name: 'Berlin Grunewald flat rental', portals: ['ImmoScout24', 'Immowelt'], type: 'miete', property: 'wohnung', city: 'Berlin' },
  { name: 'House purchase', portals: ['ImmoScout24', 'Kleinanzeigen'], type: 'kauf', property: 'haus', city: 'Potsdam' },
  { name: 'Plot purchase', portals: ['ImmoScout24', 'Kleinanzeigen'], type: 'kauf', property: 'grundstueck', city: 'Potsdam' },
  { name: 'Freizeit', portals: ['eBay.de Grundstücke'], type: 'kauf', property: 'freizeitgrundstueck', city: 'Brandenburg' },
];
const row = (portal, type, location, price = '1000') =>
  trackerRow(['1', '2026-09-28', portal, type, location, price, '80', '3', '4.0', 'Evaluated', '', '']);

test('inferGroup: rental routed by city', () => {
  assert.equal(inferGroup(row('ImmoScout24', 'miete', 'Charlottenburg, Berlin'), GROUPS), 'Berlin Grunewald flat rental');
  assert.equal(inferGroup(row('ImmoScout24', 'miete', 'Eiche, Potsdam'), GROUPS), 'Potsdam flat rental');
});

test('inferGroup: a house whose title mentions its Grundstück stays a house (Type header wins)', () => {
  const md = '# Evaluation: Einfamilienhaus auf 892 m² Grundstück\n**Type:** Haus (Kauf)\n';
  assert.equal(inferGroup(row('Kleinanzeigen', 'kauf', 'Fahrland, Potsdam', '520.000'), GROUPS, md), 'House purchase');
});

test('inferGroup: Kleingarten goes to the Freizeit group', () => {
  const md = '# Evaluation: Kleingarten mit Gartenhaus\n**Type:** Grundstück — Kleingarten-Nachpacht\n';
  assert.equal(inferGroup(row('eBay.de Grundstücke', 'kauf', 'Brandenburg an der Havel', '4.850'), GROUPS, md), 'Freizeit');
});

test('scoreColor bands', () => {
  assert.equal(scoreColor(3.5), '#e8f5e9');
  assert.equal(scoreColor(3.2), '#fff8e1');
  assert.equal(scoreColor(2.9), '#ffebee');
});

test('renderListing sets bgcolor on every cell and emits a ✓/✗ detail row', () => {
  const html = renderListing({
    row: row('ImmoScout24', 'miete', 'Eiche, Potsdam'), url: 'https://x', title: 'T', warm: { value: 1300, estimated: false },
    deal: 'miete', pros: ['Balkon'], cons: ['no EA'], text: '', action: 'call', swap: true,
    suche: 'Suche: unbekannt — verify on contact', scam: 'Proceed with Caution',
  });
  const cells = html.match(/<td /g).length;
  const colored = html.match(/<td[^>]*bgcolor="#e8f5e9"/g).length;
  assert.equal(cells, colored);
  assert.match(html, /🔄 SWAP ⚠ T/);
  assert.match(html, /✓ Balkon/);
  assert.match(html, /✗ SCAM CHECK: Proceed with Caution · no EA · → call/);
  assert.match(html, /<b>Suche: unbekannt — verify on contact<\/b>/);
});

test('discardReason extracts the swap-mismatch clause', () => {
  assert.equal(discardReason('TAUSCHWOHNUNG (Anbieter-ID 1). DISCARDED swap-mismatch: Berlin only'), 'swap-mismatch: Berlin only');
});
