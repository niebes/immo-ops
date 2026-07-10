/**
 * next-actions-lib.mjs — parsers + rules engine for the follow-through step.
 *
 * Why this exists: the 2026-07 audit found 236/306 listings stuck at
 * 'Evaluated' and application #216 with every document prepared but nothing
 * submitted SIX DAYS after a viewing whose recorded strategy was "apply same
 * day" — the auto cycle only ever looked at NEW listings, never backward.
 * This lib turns viewings.md, documents.md, correspondence/*.md and the
 * tracker into a list of overdue/dueSoon actions, a liveness-check queue, and
 * the (single) mechanically safe status advance.
 *
 * Pure: every function takes content strings / parsed rows and an injectable
 * `now` — no fs, fully unit-testable (scripts/test/next-actions.test.mjs).
 */

import { parseListingRow } from './listings-md.mjs';

const DAY = 86_400_000;
const daysPast = (dateStr, now) => Math.floor((now - new Date(dateStr)) / DAY);
const daysUntil = (dateStr, now) => Math.ceil((new Date(dateStr) - now) / DAY);
const NEVER = 99_999; // JSON-safe "never verified" sentinel (Infinity → null in JSON)

// Dot-tolerant AND comma-tolerant score ("4,5" exists in old rows).
const toScore = (s) => {
  const n = parseFloat(String(s ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// ── Parsers ──────────────────────────────────────────────────────────

const isTableRow = (l) => l.startsWith('|') && !/^\|\s*#|^\|---|^\|\s*Listing #/i.test(l);

/** data/viewings.md → [{ num, listing, date, time, address, contact, status, notes }] */
export function parseViewings(md) {
  return (md || '').split('\n').filter(isTableRow).map((line) => {
    const c = parseListingRow(line);
    return { num: c[0], listing: c[1], date: c[2], time: c[3], address: c[4], contact: c[5], status: c[6] || '', notes: c[7] || '' };
  }).filter((v) => v.num && /^\d{4}-\d{2}-\d{2}$/.test(v.date || ''));
}

/** data/documents.md → [{ listing, doc, prepared, submitted, confirmed, expires, notes }]; '-' → null */
export function parseDocuments(md) {
  const dash = (s) => (!s || s === '-' ? null : s);
  return (md || '').split('\n').filter(isTableRow).map((line) => {
    const c = parseListingRow(line);
    return { listing: c[0], doc: c[1], prepared: dash(c[2]), submitted: dash(c[3]), confirmed: dash(c[4]), expires: dash(c[5]), notes: c[6] || '' };
  }).filter((d) => d.listing && /^\d+$/.test(d.listing));
}

/** data/listings.md rows → tracker records */
export function parseTracker(md) {
  return (md || '').split('\n')
    .filter((l) => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'))
    .map((line) => {
      const c = parseListingRow(line);
      if (c.length < 11) return null;
      const reportPath = (c[10] || '').replace(/^\[.*?\]\(/, '').replace(/\)$/, '');
      return { line, num: c[0], date: c[1], portal: c[2], location: c[4], score: toScore(c[8]), status: c[9], reportPath, notes: c[11] || '' };
    })
    .filter(Boolean);
}

/**
 * One correspondence/*.md → { listing, blocks }. Real files deviate from the
 * convention (`→ confirmed` arrow-words, headers without a time, checklist
 * `##` sections) — anything not matching the block-header shape is ignored.
 */
const BLOCK_HEADER = /^## (\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*·\s*([^·]+?)\s*·\s*(→|←)/;

export function parseCorrespondence(md, filename) {
  const listing = (String(filename || '').match(/^(\d+)/) || [])[1] || '';
  const lines = (md || '').split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(BLOCK_HEADER);
    if (m) {
      current = { date: m[1], time: m[2] || null, channel: m[3].trim(), direction: m[4] === '→' ? 'sent' : 'received', next: null };
      blocks.push(current);
      continue;
    }
    if (line.startsWith('## ')) { current = null; continue; } // checklist etc.
    if (current && current.next === null) {
      const n = line.match(/^\*\*Next:\*\*\s*(.+)/);
      if (n) current.next = n[1].trim();
    }
  }
  return { listing, blocks };
}

// ── Next-line heuristics ─────────────────────────────────────────────
// The "(action · owner · due)" convention is aspirational; real Next lines are
// freeform prose. These heuristics only ever SURFACE items (never act), so the
// cheap failure direction is a false nag.

const US_VERBS = /^\s*(?:⏰\s*)?(?:confirm|reply|send|submit|apply|attend|obtain|pre-stage|prepare|call|ask|schedule|request|antworten|bestätigen|senden|einreichen|anrufen|nachfragen|besichtigen)/i;
const THEM_HINTS = /^\s*(?:await|waiting|wait for|they|landlord|vermieter|hv)\b/i;

export function nextOwner(nextText, lastDirection) {
  if (!nextText) return null;
  if (US_VERBS.test(nextText)) return 'us';
  if (THEM_HINTS.test(nextText)) return 'them';
  // Ball is in our court when the last message came TO us.
  return lastDirection === 'received' ? 'us' : 'them';
}

/** Extract a due date from a freeform Next line. Returns 'YYYY-MM-DD' or null. */
export function nextDue(nextText, blockDate) {
  if (!nextText) return null;
  let m = nextText.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  m = nextText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = nextText.match(/(\d{1,2})\.(\d{1,2})\.(?!\d)/); // dd.mm. → block year
  if (m && blockDate) return `${blockDate.slice(0, 4)}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = nextText.match(/within\s+(\d+)\s+days?|innerhalb(?:\s+von)?\s+(\d+)\s+Tagen?/i);
  if (m && blockDate) {
    const d = new Date(blockDate); d.setDate(d.getDate() + parseInt(m[1] || m[2], 10));
    return d.toISOString().slice(0, 10);
  }
  if (/ASAP|⏰|sofort|umgehend/i.test(nextText) && blockDate) return blockDate;
  return null;
}

// ── Rules engine ─────────────────────────────────────────────────────

const DEFAULTS = {
  applyGraceDays: 1,       // "apply same day" strategy → overdue after 1 day
  docsStalledDays: 4,
  nextActionAgeDays: 5,    // Next with no parsable due: nag when block older
  expiryWarnDays: 14,
  minScore: 4.0,           // never-contacted threshold
  neverContactedDays: 3,
  neverContactedCap: 5,
  livenessAgeDays: 7,
  livenessRecheckDays: 14,
  livenessCap: 10,
};

const TERMINAL = new Set(['Discarded', 'Expired', 'Rejected', 'Accepted']);
const LIVENESS_STATUSES = new Set(['Evaluated', 'Interested', 'Contacted', 'Viewing', 'Viewed', 'Swap-candidate']);

const viewingDateTime = (v) => new Date(`${v.date}T${/^\d{2}:\d{2}$/.test(v.time || '') ? v.time : '23:59'}:00`);

/**
 * @returns {{ actions: [{listing, rule, severity, summary, daysOverdue, evidence}],
 *             livenessQueue: [{num, reportPath, status, daysSinceVerified}],
 *             safeAdvances: [{num, from, to, reason}] }}
 */
export function computeActions({ tracker = [], viewings = [], documents = [], correspondenceByListing = new Map(), verified = {}, now = new Date(), opts = {} }) {
  const o = { ...DEFAULTS, ...opts };
  const actions = [];
  const safeAdvances = [];
  const byNum = new Map(tracker.map((t) => [String(t.num), t]));
  const active = (t) => t && !TERMINAL.has(t.status);
  const push = (listing, rule, severity, summary, daysOverdue, evidence) =>
    actions.push({ listing: String(listing), rule, severity, summary, daysOverdue, evidence });

  // ── viewing-driven rules ──
  const appliedRuleFired = new Set();
  for (const v of viewings) {
    const t = byNum.get(String(v.num));
    if (!active(t)) continue;
    if (/cancel/i.test(v.status)) continue;
    const passed = viewingDateTime(v) < now;
    if (!passed) continue;
    const days = daysPast(v.date, now);

    // The ONLY mechanically safe advance: the viewing calendar-factually
    // happened. One step, non-terminal, reversible.
    if (t.status === 'Viewing' && /confirm/i.test(v.status)) {
      safeAdvances.push({ num: String(v.num), from: 'Viewing', to: 'Viewed', reason: `viewing ${v.date} ${v.time || ''} passed`.trim() });
    } else if (t.status === 'Contacted') {
      // Stuck two steps back — flag, never double-jump.
      push(v.num, 'viewing-passed', 'overdue',
        `viewing ${v.date} passed but tracker still 'Contacted' — update status`, days,
        { file: 'data/viewings.md', detail: v.listing });
    }

    // Docs ready but never submitted after the viewing (the #216 failure).
    const docs = documents.filter((d) => d.listing === String(v.num));
    const prepared = docs.filter((d) => d.prepared && !d.submitted);
    if (docs.length > 0 && prepared.length > 0 && days >= o.applyGraceDays) {
      appliedRuleFired.add(String(v.num));
      push(v.num, 'apply-after-viewing', 'overdue',
        `viewing ${v.date} passed ${days}d ago, ${prepared.length}/${docs.length} docs Prepared, none Submitted — send the application`, days,
        { file: 'data/documents.md', detail: prepared.map((d) => d.doc).join(', ') });
    }
  }

  // ── docs-stalled (no viewing involved / not already covered above) ──
  const docsByListing = new Map();
  for (const d of documents) {
    if (!docsByListing.has(d.listing)) docsByListing.set(d.listing, []);
    docsByListing.get(d.listing).push(d);
  }
  for (const [listing, docs] of docsByListing) {
    if (appliedRuleFired.has(listing)) continue;
    const t = byNum.get(listing);
    if (!active(t)) continue;
    const hasPendingViewing = viewings.some((v) => String(v.num) === listing && viewingDateTime(v) >= now);
    if (hasPendingViewing) continue; // docs legitimately wait for the viewing
    const stalled = docs.filter((d) => d.prepared && !d.submitted && daysPast(d.prepared, now) > o.docsStalledDays);
    if (stalled.length > 0) {
      push(listing, 'docs-stalled', 'overdue',
        `${stalled.length} document(s) Prepared >${o.docsStalledDays}d ago, never Submitted`, daysPast(stalled[0].prepared, now),
        { file: 'data/documents.md', detail: stalled.map((d) => d.doc).join(', ') });
    }
  }

  // ── doc-expiry ──
  for (const d of documents) {
    if (!d.expires) continue;
    const t = byNum.get(d.listing);
    if (!active(t)) continue;
    const daysLeft = daysUntil(d.expires, now);
    if (daysLeft < 0) {
      push(d.listing, 'doc-expiry', 'overdue', `${d.doc} EXPIRED ${-daysLeft}d ago (${d.expires})`, -daysLeft, { file: 'data/documents.md', detail: d.doc });
    } else if (daysLeft <= o.expiryWarnDays) {
      push(d.listing, 'doc-expiry', 'due-soon', `${d.doc} expires in ${daysLeft}d (${d.expires})`, 0, { file: 'data/documents.md', detail: d.doc });
    }
  }

  // ── next-action-due (correspondence) ──
  for (const [listing, corr] of correspondenceByListing) {
    const t = byNum.get(String(listing));
    if (!active(t)) continue;
    const last = corr.blocks[corr.blocks.length - 1];
    if (!last) continue;
    const owner = nextOwner(last.next, last.direction);
    if (owner !== 'us') continue;
    const due = nextDue(last.next, last.date);
    const blockAge = daysPast(last.date, now);
    if (due) {
      const overdueDays = daysPast(due, now);
      if (overdueDays > 0) {
        push(listing, 'next-action-due', 'overdue', `open action ${overdueDays}d past due (${due}): ${last.next}`, overdueDays,
          { file: `correspondence/`, detail: last.next });
      } else if (overdueDays >= -2) {
        push(listing, 'next-action-due', 'due-soon', `action due ${due}: ${last.next}`, 0, { file: `correspondence/`, detail: last.next });
      }
    } else if (last.direction === 'received' && blockAge > o.nextActionAgeDays) {
      push(listing, 'next-action-due', 'overdue', `their message from ${last.date} (${blockAge}d) unanswered${last.next ? `: ${last.next}` : ''}`, blockAge,
        { file: `correspondence/`, detail: last.next || 'reply' });
    }
  }

  // ── never-contacted (top of the Evaluated pile only) ──
  const candidates = tracker
    .filter((t) => t.status === 'Evaluated' && (t.score ?? 0) >= o.minScore
      && daysPast(t.date, now) >= o.neverContactedDays
      && !correspondenceByListing.has(String(t.num)))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, o.neverContactedCap);
  for (const t of candidates) {
    push(t.num, 'never-contacted', 'info',
      `scored ${t.score}/5 ${daysPast(t.date, now)}d ago, never contacted (${t.location})`, 0,
      { file: 'data/listings.md', detail: t.reportPath });
  }

  // ── verify-liveness queue ──
  const livenessQueue = tracker
    .filter((t) => LIVENESS_STATUSES.has(t.status) && daysPast(t.date, now) > o.livenessAgeDays)
    .map((t) => {
      const lastVerified = verified[String(t.num)] || null;
      return { num: String(t.num), reportPath: t.reportPath, status: t.status, score: t.score, daysSinceVerified: lastVerified ? daysPast(lastVerified, now) : NEVER };
    })
    .filter((t) => t.daysSinceVerified > o.livenessRecheckDays)
    .sort((a, b) => b.daysSinceVerified - a.daysSinceVerified || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, o.livenessCap);

  const sevRank = { overdue: 0, 'due-soon': 1, info: 2 };
  actions.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.daysOverdue - a.daysOverdue);
  return { actions, livenessQueue, safeAdvances };
}
