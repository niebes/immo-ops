/**
 * listings-md.mjs — shared parser for data/listings.md markdown table rows.
 *
 * Parse a `| a | b | c |` row into cells WITHOUT dropping empty interior
 * cells. The naive split('|').map(trim).filter(Boolean) drops interior blanks
 * (e.g. an empty Rooms cell for a Grundstück), which silently shifts
 * Status/Report/Notes onto the wrong columns — a live column-shift bug that
 * bit listing-expiry-check and dedup-listings. Instead: strip the outer
 * delimiters, then split; cell indices are stable (0 = #, 1 = Date, …).
 */
export function parseListingRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}
