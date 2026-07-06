/**
 * tsv.mjs — shared TSV serialization helpers for scan-history.tsv.
 *
 * scan-history.tsv is a tab-separated file parsed with split('\t') all over the
 * repo, so a tab or newline inside a free-text field (portal titles routinely
 * contain them) silently corrupts the row AND every row after it. Every field
 * that carries free text must pass through tsvField() before joining.
 */

/** Collapse tab/newline/CR runs to a single space; null/undefined → ''. */
export function tsvField(s) {
  if (s == null) return '';
  return String(s).replace(/[\t\r\n]+/g, ' ');
}

/**
 * Serialize one scan-history row (9 columns, tab-joined):
 *   url, first_seen, portal, title, location, price, m2, rooms, status
 * Free-text fields are sanitized via tsvField(). `today` is the first_seen
 * date string (YYYY-MM-DD).
 */
export function toHistoryLine(listing, status, today) {
  return [
    tsvField(listing.url),
    today,
    tsvField(listing.portal),
    tsvField(listing.title),
    tsvField(listing.location),
    listing.price || '',
    listing.m2 || '',
    listing.rooms || '',
    status,
  ].join('\t');
}
