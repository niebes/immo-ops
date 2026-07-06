/**
 * geo.mjs — shared neighbourhood (Ortsteil) matching for duplicate detection.
 *
 * Used by dedup-listings.mjs (cross-portal dupe collapse) and duplicates.mjs
 * (cross-portal footprint of one flat). Comparing whole "Neighbourhood, City
 * (PLZ)" strings with fuzzy distance is unsafe: the common ", Potsdam" suffix
 * alone pushes two DIFFERENT Ortsteile (e.g. "Babelsberg Nord" vs "Nauener
 * Vorstadt", Levenshtein ratio 0.56) toward a match threshold.
 */

// Bare city/region names carry no neighbourhood signal → treated as unknown.
export const CITY = /^(potsdam|berlin|brandenburg|werder|teltow|kleinmachnow|stahnsdorf|nuthetal|michendorf|falkensee|nauen|caputh|ketzin|beelitz|schwielowsee)$/;

/**
 * Neighbourhood/locality token from a "Street, Neighbourhood, City (PLZ)"
 * string: split into comma fields, strip PLZ + punctuation, drop bare
 * city/region fields, and take the most specific remaining field (the one
 * before the city). '' = unknown.
 */
export function hood(loc) {
  const fields = (loc || '').toLowerCase()
    .split(',')
    .map((f) => f.replace(/\b\d{4,5}\b/g, ' ').replace(/[^a-zäöüß ]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((f) => f && !CITY.test(f));
  return fields.length ? fields[fields.length - 1] : '';
}

// Tokens that DISTINGUISH otherwise-similar Ortsteil names — "Waldstadt I" vs
// "Waldstadt II", "Babelsberg Nord" vs "Babelsberg Süd". A naive substring test
// ("waldstadt i" ⊂ "waldstadt ii") would wrongly merge these.
export const DISCRIMINATOR = /^(i{1,3}|iv|v|nord|n[öo]rdliche|süd|sued|s[üu]dliche|ost|[öo]stliche|west|westliche|mitte)$/;

/** true = same neighbourhood, false = clearly different, null = at least one unknown. */
export function locAgree(a, b) {
  const A = hood(a), B = hood(b);
  if (!A || !B) return null;
  if (A === B) return true;
  const ta = A.split(' ').filter(Boolean), tb = B.split(' ').filter(Boolean);
  const setA = new Set(ta), setB = new Set(tb);
  if (!ta.some((t) => setB.has(t))) return false;              // no shared token → different area
  const extraA = ta.filter((t) => !setB.has(t));
  const extraB = tb.filter((t) => !setA.has(t));
  if (extraA.some((t) => DISCRIMINATOR.test(t)) ||
      extraB.some((t) => DISCRIMINATOR.test(t))) return false; // conflicting Ortsteil qualifier
  if (extraA.length === 0 || extraB.length === 0) return true; // one is a more-detailed form of the other
  return null;                                                 // both add unique tokens → ambiguous
}
