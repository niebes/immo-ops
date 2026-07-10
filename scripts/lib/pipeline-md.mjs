/**
 * pipeline-md.mjs — the single owner of the pipeline.md entry format and the
 * '## Pending' insertion logic. Previously duplicated in scan.mjs and
 * process-scan.mjs, which is how the two drifted and how the splice bug lived
 * in both.
 */

/** A fresh pipeline file skeleton. */
export const EMPTY_PIPELINE = '# Pipeline\n\n## Pending\n\n## Processed\n';

// A '|' inside a free-text field would shift every field after it for the
// positional parsers (dedup-core). Same defense tsv.mjs applies to TSV cells.
function sanitizeField(s) {
  return String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
}

/**
 * One pipeline entry line. Format (fields after title are conditional on the
 * portal having the data):
 *   - [ ] URL | portal | group | title | 1500 EUR | 86 m² | 3 Zi | Babelsberg, Potsdam
 * rooms + location exist so cross-portal dedup can fuzzy-match pending entries
 * (location for the neighbourhood check, rooms for the numeric fallback).
 */
export function toPipelineLine(l, groupName) {
  // EVERY interpolated string is sanitized — portal and groupName included:
  // groupName comes from user-edited profile.yml / a CLI arg, and a '|' in any
  // field shifts every positional field for the dedup parser.
  return `- [ ] ${l.url} | ${sanitizeField(l.portal || '')} | ${sanitizeField(groupName || '')} | ${sanitizeField(l.title || '')}`
    + (l.price ? ` | ${sanitizeField(l.price)} EUR` : '')
    + (l.m2 ? ` | ${sanitizeField(l.m2)} m²` : '')
    + (l.rooms ? ` | ${sanitizeField(l.rooms)} Zi` : '')
    + (l.location ? ` | ${sanitizeField(l.location)}` : '');
}

/**
 * Insert entry lines directly under '## Pending'. Guards:
 *  - missing '## Pending' header → section appended
 *  - '## Pending' as the LAST line without a trailing newline → without the
 *    newline-normalization below, indexOf('\n', pendingIdx) returns -1 and
 *    insertIdx becomes 0, splicing entries before the file header (the
 *    corruption bug this lib exists to kill)
 *  - empty/undefined input → fresh skeleton
 */
export function insertPendingEntries(pipelineText, entryLines) {
  let p = pipelineText || EMPTY_PIPELINE;
  if (!entryLines || entryLines.length === 0) return p;
  if (!p.includes('## Pending')) p += (p.endsWith('\n') ? '' : '\n') + '\n## Pending\n';
  if (!p.endsWith('\n')) p += '\n'; // makes the newline after the header always findable
  const insertIdx = p.indexOf('\n', p.indexOf('## Pending')) + 1;
  return p.slice(0, insertIdx) + entryLines.join('\n') + '\n' + p.slice(insertIdx);
}
