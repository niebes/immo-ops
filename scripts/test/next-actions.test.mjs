import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseViewings, parseDocuments, parseTracker, parseCorrespondence,
  nextOwner, nextDue, computeActions,
} from '../lib/next-actions-lib.mjs';

// Fixtures mirror REAL production data (the #216 case from the 2026-07 audit).
const NOW = new Date('2026-07-11T12:00:00');

const VIEWINGS = `# Viewings

| # | Listing | Date | Time | Address | Contact | Status | Notes |
|---|---------|------|------|---------|---------|--------|-------|
| 216 | [Esplanade Living Bornstedt](../reports/216-x.md) | 2026-07-05 | 17:30 | Georg-Hermann-Allee 98a | Horst Driever | Confirmed | apply AFTER fast |
| 204 | [Maisonette Nauener Vorstadt](../reports/204-x.md) | 2026-06-29 | 17:00 | Zum Exerzierhaus 1A | Jan-Frank N. | Confirmed | ask re Indexmiete |
| 300 | [Future flat](../reports/300-x.md) | 2026-08-01 | 10:00 | Somewhere 1 | X | Confirmed | upcoming |
| 301 | [Cancelled one](../reports/301-x.md) | 2026-07-01 | 10:00 | Somewhere 2 | Y | Cancelled | — |
`;

const DOCUMENTS = `# Document Tracker

| Listing # | Document | Prepared | Submitted | Confirmed | Expires | Notes |
|-----------|----------|----------|-----------|-----------|---------|-------|
| 216 | selbstauskunft | 2026-07-05 | - | - | - | Filled HMD form |
| 216 | schufa | 2026-07-05 | - | - | 2026-09-23 | BOTH ready |
| 216 | gehaltsnachweise | 2026-07-05 | - | - | - | bundled |
| 250 | selbstauskunft | 2026-07-01 | 2026-07-02 | - | - | submitted fine |
| 251 | schufa | 2026-06-20 | - | - | 2026-07-15 | expiring soon |
`;

const TRACKER = `# Listing Tracker

| # | Date | Portal | Type | Location | Price | m² | Rooms | Score | Status | Report | Notes |
|---|------|--------|------|----------|-------|-----|-------|-------|--------|--------|-------|
| 216 | 2026-06-27 | ImmoScout24 | miete | Bornstedt, Potsdam | 1.158 | 84 | 3 | 4.4 | Viewing | [216](reports/216-x.md) | esplanade |
| 204 | 2026-06-24 | Immowelt | miete | Nauener Vorstadt | 1.500 | 90 | 3 | 4.2 | Contacted | [204](reports/204-x.md) | maisonette |
| 250 | 2026-06-30 | ImmoScout24 | miete | Golm | 1.200 | 75 | 3 | 4.1 | Contacted | [250](reports/250-x.md) | fine |
| 251 | 2026-06-15 | Immowelt | miete | Potsdam | 1.100 | 70 | 3 | 3.9 | Evaluated | [251](reports/251-x.md) | old |
| 260 | 2026-07-01 | ImmoScout24 | miete | Babelsberg | 1.300 | 80 | 3 | 4.6 | Evaluated | [260](reports/260-x.md) | hot, uncontacted |
| 261 | 2026-07-10 | ImmoScout24 | miete | Golm | 1.250 | 78 | 3 | 4.7 | Evaluated | [261](reports/261-x.md) | too fresh |
| 262 | 2026-06-01 | Immowelt | miete | Potsdam | 1.000 | 65 | 3 | 2.5 | Evaluated | [262](reports/262-x.md) | low score |
| 300 | 2026-07-01 | ImmoScout24 | miete | Potsdam | 1.400 | 85 | 3 | 4.0 | Viewing | [300](reports/300-x.md) | future viewing |
| 301 | 2026-06-25 | ImmoScout24 | miete | Potsdam | 1.350 | 82 | 3 | 4.0 | Discarded | [301](reports/301-x.md) | dead |
`;

const CORR_216 = `# 216 — Esplanade Living Bornstedt

## 2026-06-27 20:26 · ImmoScout24 messenger · ← received
Viewing OFFER. Must confirm within 2 days.
**Next:** ⏰ CONFIRM the 05.07 17:30 slot ASAP (2-day deadline) → reply to info@hmd-property.de.

## 2026-06-27 · email · → sent
Confirmed the viewing appointment.
**Next:** attend viewing, pre-stage application PDFs.

## Viewing checklist — Sat 05.07 17:30

**On site:** bring nothing.
`;

// ── parser tests ─────────────────────────────────────────────────────

test('parseViewings: rows incl. status; header rows skipped', () => {
  const v = parseViewings(VIEWINGS);
  assert.equal(v.length, 4);
  assert.equal(v[0].num, '216');
  assert.equal(v[0].time, '17:30');
  assert.equal(v[3].status, 'Cancelled');
});

test('parseDocuments: "-" cells become null', () => {
  const d = parseDocuments(DOCUMENTS);
  assert.equal(d.length, 5);
  assert.equal(d[0].submitted, null);
  assert.equal(d[1].expires, '2026-09-23');
  assert.equal(d[3].submitted, '2026-07-02');
});

test('parseTracker: comma and dot scores both parse', () => {
  const t = parseTracker(TRACKER.replace('| 4.4 |', '| 4,4 |'));
  assert.equal(t.find((x) => x.num === '216').score, 4.4);
});

test('parseCorrespondence: conforming + no-time blocks parsed, checklist section ignored', () => {
  const c = parseCorrespondence(CORR_216, '216-potsdam-bornstedt-3r.md');
  assert.equal(c.listing, '216');
  assert.equal(c.blocks.length, 2);
  assert.equal(c.blocks[0].direction, 'received');
  assert.equal(c.blocks[0].time, '20:26');
  assert.equal(c.blocks[1].time, null);
  assert.ok(c.blocks[0].next.startsWith('⏰ CONFIRM'));
});

test('parseCorrespondence: arrow-word deviation "→ confirmed" still parses as sent', () => {
  const c = parseCorrespondence('## 2026-06-27 · email/phone · → confirmed\nsummary\n', '204-x.md');
  assert.equal(c.blocks.length, 1);
  assert.equal(c.blocks[0].direction, 'sent');
});

// ── heuristics ───────────────────────────────────────────────────────

test('nextOwner: imperative verbs → us; await → them; received-fallback → us', () => {
  assert.equal(nextOwner('Confirm the slot', 'received'), 'us');
  assert.equal(nextOwner('⏰ CONFIRM the 05.07 slot', 'received'), 'us');
  assert.equal(nextOwner('await their reply', 'sent'), 'them');
  assert.equal(nextOwner('unclear prose', 'received'), 'us');
  assert.equal(nextOwner('unclear prose', 'sent'), 'them');
});

test('nextDue: all date formats', () => {
  assert.equal(nextDue('reply by 2026-07-15', '2026-07-01'), '2026-07-15');
  assert.equal(nextDue('bis 15.07.2026 antworten', '2026-07-01'), '2026-07-15');
  assert.equal(nextDue('confirm by 5.7. latest', '2026-07-01'), '2026-07-05');
  assert.equal(nextDue('confirm within 2 days', '2026-06-27'), '2026-06-29');
  assert.equal(nextDue('⏰ ASAP', '2026-06-27'), '2026-06-27');
  assert.equal(nextDue('someday maybe', '2026-06-27'), null);
});

// ── rules engine ─────────────────────────────────────────────────────

function run(overrides = {}) {
  return computeActions({
    tracker: parseTracker(TRACKER),
    viewings: parseViewings(VIEWINGS),
    documents: parseDocuments(DOCUMENTS),
    correspondenceByListing: new Map([['216', parseCorrespondence(CORR_216, '216-x.md')]]),
    now: NOW,
    ...overrides,
  });
}

test('THE #216 CASE: apply-after-viewing fires, 6 days overdue', () => {
  const { actions } = run();
  const a = actions.find((x) => x.rule === 'apply-after-viewing' && x.listing === '216');
  assert.ok(a, 'apply-after-viewing must fire for #216');
  assert.equal(a.severity, 'overdue');
  assert.equal(a.daysOverdue, 6);
  assert.match(a.summary, /none Submitted/);
});

test('safeAdvances: ONLY Viewing→Viewed for passed+Confirmed viewings', () => {
  const { safeAdvances } = run();
  assert.deepEqual(safeAdvances.map((s) => `${s.num}:${s.from}→${s.to}`), ['216:Viewing→Viewed']);
  // #204 is Contacted (double-jump forbidden), #300 is future, #301 viewing row is Cancelled.
});

test('viewing-passed flags Contacted-with-passed-viewing (#204), never advances it', () => {
  const { actions, safeAdvances } = run();
  const a = actions.find((x) => x.rule === 'viewing-passed' && x.listing === '204');
  assert.ok(a);
  assert.equal(a.severity, 'overdue');
  assert.ok(!safeAdvances.some((s) => s.num === '204'));
});

test('future and cancelled viewings fire nothing', () => {
  const { actions } = run();
  assert.ok(!actions.some((x) => x.listing === '300' && x.rule.startsWith('viewing')));
  assert.ok(!actions.some((x) => x.listing === '301'));
});

test('terminal statuses are excluded from every rule', () => {
  const { actions, livenessQueue } = run();
  assert.ok(!actions.some((x) => x.listing === '301'));
  assert.ok(!livenessQueue.some((x) => x.num === '301'));
});

test('doc-expiry: 2026-07-15 SCHUFA is due-soon at NOW (4 days left)', () => {
  const { actions } = run();
  const a = actions.find((x) => x.rule === 'doc-expiry' && x.listing === '251');
  assert.ok(a);
  assert.equal(a.severity, 'due-soon');
  const past = run({ now: new Date('2026-07-20T12:00:00') });
  const b = past.actions.find((x) => x.rule === 'doc-expiry' && x.listing === '251');
  assert.equal(b.severity, 'overdue');
});

test('docs-stalled skips submitted docs and listings already covered by apply-after-viewing', () => {
  const { actions } = run();
  assert.ok(!actions.some((x) => x.rule === 'docs-stalled' && x.listing === '250')); // submitted
  assert.ok(!actions.some((x) => x.rule === 'docs-stalled' && x.listing === '216')); // covered
  assert.ok(actions.some((x) => x.rule === 'docs-stalled' && x.listing === '251')); // 21d stale
});

test('next-action-due: unanswered received block older than 5d nags; our sent block does not', () => {
  // Last block in CORR_216 is '→ sent' from 06-27 with Next "attend viewing…" → owner-fallback them?
  // "attend" is a US verb → owner us, no due → sent-direction blocks the age fallback… verify precise behavior:
  const { actions } = run();
  const a = actions.filter((x) => x.rule === 'next-action-due' && x.listing === '216');
  // Owner is 'us' (imperative "attend") but direction is 'sent' and no due parses ("pre-stage… PDFs") → no nag.
  assert.equal(a.length, 0);
  // Flip: make the last block received & old → nag fires.
  const corr = parseCorrespondence('## 2026-07-01 10:00 · email · ← received\ntext\n**Next:** reply with documents\n', '216-x.md');
  const r2 = run({ correspondenceByListing: new Map([['216', corr]]) });
  const b = r2.actions.find((x) => x.rule === 'next-action-due' && x.listing === '216');
  assert.ok(b);
  assert.equal(b.severity, 'overdue');
});

test('never-contacted: respects score floor, age floor, correspondence existence, and cap', () => {
  const { actions } = run();
  const nums = actions.filter((x) => x.rule === 'never-contacted').map((x) => x.listing);
  assert.ok(nums.includes('260'));   // 4.6, 10d old, no correspondence
  assert.ok(!nums.includes('261'));  // 1d old — too fresh
  assert.ok(!nums.includes('262'));  // 2.5 below floor
  assert.ok(!nums.includes('216'));  // has correspondence + not Evaluated
  const capped = run({ opts: { neverContactedCap: 0 } });
  assert.equal(capped.actions.filter((x) => x.rule === 'never-contacted').length, 0);
});

test('livenessQueue: active >7d listings, never-verified first, recheck window respected, capped', () => {
  const { livenessQueue } = run();
  const nums = livenessQueue.map((x) => x.num);
  assert.ok(nums.includes('251')); // Evaluated, 26d, never verified
  assert.ok(!nums.includes('261')); // 1d old
  assert.ok(!nums.includes('301')); // terminal
  // Recently verified drops out:
  const r2 = run({ verified: { 251: '2026-07-10' } });
  assert.ok(!r2.livenessQueue.some((x) => x.num === '251'));
  // Cap:
  const r3 = run({ opts: { livenessCap: 1 } });
  assert.equal(r3.livenessQueue.length, 1);
});

test('ordering: overdue before due-soon before info, most-overdue first', () => {
  const { actions } = run();
  const sev = actions.map((a) => a.severity);
  const firstDueSoon = sev.indexOf('due-soon');
  const firstInfo = sev.indexOf('info');
  assert.ok(sev.lastIndexOf('overdue') < (firstDueSoon === -1 ? Infinity : firstDueSoon));
  if (firstDueSoon !== -1 && firstInfo !== -1) assert.ok(firstDueSoon < firstInfo);
});
