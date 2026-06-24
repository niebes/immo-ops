/**
 * search-url.mjs — resolve {placeholder} tokens in a portal search_url from the
 * profile, so the search query is derived from config/profile.yml instead of
 * being hardcoded per portal (which silently drifts out of sync — see the
 * 2026-06 case where ImmoScout24 was capped at €1.500 while the profile allowed
 * €1.900, hiding the entire 1.5–1.9k band).
 *
 * Single source of truth for BOTH scan paths:
 *   - Playwright (scan.mjs) resolves before page.goto()
 *   - CiC (immo-find skill) resolves via scripts/portal-url.mjs before navigate
 *
 * Supported placeholders (substituted only when a profile value exists; an
 * unresolvable placeholder is left literal and reported by callers):
 *   {price_max}  → search.price.max_kaltmiete ?? max_kaufpreis
 *   {price_min}  → search.price.min_kaltmiete ?? min_kaufpreis
 *   {rooms_min}  → search.size.min_rooms
 *   {rooms_max}  → search.size.max_rooms
 *   {size_min}   → search.size.min_m2
 *   {size_max}   → search.size.max_m2
 *
 * NOTE on portal price-param behaviour (verified 2026-06-24, keep in mind before
 * assuming a value "works"):
 *   - ImmoScout24 `price=-{n}.0` is a FREE numeric range filter — honoured exactly
 *     (count 67→81 going 1500→1900, 0 results over the cap). Templating works.
 *   - Immowelt `pma={n}` is IGNORED — the search redirects to an SEO hash URL that
 *     drops query params; both 1500 and 1900 return the same unfiltered 197. Its
 *     real filter is the client-side criteria post-filter (max × 1.1). Templating
 *     is a harmless no-op there but keeps the config self-documenting.
 *   - Neither is a fixed-bucket dropdown that snaps to preset steps. If a future
 *     portal IS bucketed, verify the injected value isn't rounded DOWN (which
 *     would silently narrow the band) before trusting it.
 */

export function findProfileSearch(profile, groupName) {
  if (!profile || !Array.isArray(profile.searches)) return null;
  return (
    profile.searches.find((s) => s.name === groupName && s.enabled !== false) ||
    profile.searches.find((s) => s.enabled !== false) ||
    null
  );
}

function buildSubs(search) {
  const price = (search && search.price) || {};
  const size = (search && search.size) || {};
  const pick = (...vals) => {
    for (const v of vals) if (v !== undefined && v !== null && v !== '') return v;
    return undefined;
  };
  return {
    price_max: pick(price.max_kaltmiete, price.max_kaufpreis),
    price_min: pick(price.min_kaltmiete, price.min_kaufpreis),
    rooms_min: pick(size.min_rooms),
    rooms_max: pick(size.max_rooms),
    size_min: pick(size.min_m2),
    size_max: pick(size.max_m2),
  };
}

/**
 * Resolve {placeholder} tokens in `url` using the given profile search entry.
 * Returns { url, unresolved: [tokens that had no profile value] }.
 * A token with no value is left intact so the breakage is visible, not silent.
 */
export function resolveSearchUrl(url, search) {
  if (!url || !url.includes('{')) return { url, unresolved: [] };
  const subs = buildSubs(search);
  const unresolved = [];
  const resolved = url.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in subs && subs[key] !== undefined) return String(subs[key]);
    unresolved.push(key);
    return match;
  });
  return { url: resolved, unresolved };
}
