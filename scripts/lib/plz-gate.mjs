/**
 * plz-gate.mjs — objective postcode-region gate for NATIONWIDE portal feeds.
 *
 * Some portals can't be scoped to our region at the search URL (Semmelhaack lists
 * its whole Northern-Germany stock, DGA auctions all of Germany, a geo-bbox search
 * still returned "53949 Dahlem" in the Eifel). Their out-of-region rows used to
 * reach AI triage every cycle (14 discards on 2026-09-28).
 *
 * This is NOT a location-keyword filter (those dropped real Golm listings, see
 * scan.mjs filterCriteria): it only acts on a 5-digit postcode the portal itself
 * printed, and only for portals that opt in via `plz_prefixes:` in portals.yml.
 * A listing whose location carries no postcode is KEPT (fail open).
 */

/** portals.yml → the opted-in prefixes of one portal in one group, or null. */
export function plzPrefixesFor(portalsConfig, groupName, portalName) {
  const group = (portalsConfig?.search_groups || []).find(g => g.name === groupName);
  const portal = (group?.portals || []).find(p => p.name === portalName);
  const prefixes = portal?.plz_prefixes;
  return Array.isArray(prefixes) && prefixes.length ? prefixes.map(String) : null;
}

/**
 * true when the location names at least one postcode and NONE of its postcodes
 * starts with an allowed prefix. No prefixes configured / no postcode → false.
 */
export function outsidePlzRegion(location, prefixes) {
  if (!prefixes || prefixes.length === 0) return false;
  const plzs = String(location || '').match(/(?<!\d)\d{5}(?!\d)/g);
  if (!plzs) return false;
  return !plzs.some(plz => prefixes.some(p => plz.startsWith(p)));
}
