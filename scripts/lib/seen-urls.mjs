/**
 * seen-urls.mjs — shared URL dedup set for scan.mjs / process-scan.mjs.
 *
 * The "seen" set is the union of every URL that appears in scan-history.tsv,
 * pipeline.md, and listings.md. Dedup keys are CANONICALIZED (query + hash
 * stripped) on BOTH sides — at load time (history contains legacy URLs with
 * query strings) and at lookup/add time — while the ORIGINAL URL is what gets
 * stored in pipeline/history lines. Some extractors (immoscout24.mjs) already
 * strip query/hash at extraction; canonicalizing here is belt-and-braces for
 * the portals that don't.
 */

import { readFileSync, existsSync } from 'fs';

/** Strip ?query and #hash. null/undefined pass through unchanged. */
export function canonicalizeUrl(url) {
  if (!url) return url;
  return String(url).split('#')[0].split('?')[0];
}

/**
 * Union of canonicalized URL matches in data/scan-history.tsv,
 * data/pipeline.md, data/listings.md under `root`.
 */
export function loadSeenUrls(root) {
  const seen = new Set();
  const paths = [
    `${root}/data/scan-history.tsv`,
    `${root}/data/pipeline.md`,
    `${root}/data/listings.md`,
  ];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    // `]` ends a URL too: tracker Notes carry aliases as "[re-list seen DATE: URL]", and a
    // key with the bracket attached never matches (2026-10-22: #954's alias of Immowelt
    // 265c98zmg7z8 was ignored and the flat was evaluated a third time as #985).
    for (const m of readFileSync(path, 'utf8').matchAll(/https?:\/\/[^\s|)\]]+/g)) {
      seen.add(canonicalizeUrl(m[0]));
    }
  }
  return seen;
}
