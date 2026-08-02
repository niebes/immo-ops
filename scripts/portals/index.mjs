// Portal registry: maps portal name patterns to extractor modules.

import { extract as immoscout24, nextPage as immoscout24Next } from './immoscout24.mjs';
import { extract as immowelt, nextPage as immoweltNext } from './immowelt.mjs';
import { extract as kleinanzeigen, nextPage as kleinanzeigenNext } from './kleinanzeigen.mjs';
import { extract as ohneMakler, nextPage as ohneMaklerNext } from './ohne-makler.mjs';
import { extract as ivd24, nextPage as ivd24Next } from './ivd24.mjs';
import { extract as zvg, nextPage as zvgNext } from './zwangsversteigerung.mjs';
import { extract as engelVoelkers, nextPage as engelVoelkersNext } from './engel-voelkers.mjs';
import { extract as dga, nextPage as dgaNext } from './dga.mjs';
import { extract as bvbi, nextPage as bvbiNext } from './bvbi.mjs';
import { extract as bvvg, nextPage as bvvgNext } from './bvvg.mjs';
import { extract as blb, nextPage as blbNext } from './blb.mjs';
import { extract as bbg, nextPage as bbgNext } from './bbg.mjs';
import { extract as stadtPotsdam, nextPage as stadtPotsdamNext } from './stadt-potsdam.mjs';
import { extract as propotsdam, nextPage as propotsdamNext } from './propotsdam.mjs';
import { extract as dibag, nextPage as dibagNext } from './dibag.mjs';
import { extract as semmelhaack, nextPage as semmelhaackNext } from './semmelhaack.mjs';
import { extract as wgKarlMarx, nextPage as wgKarlMarxNext } from './wg-karl-marx.mjs';
import { extract as sueddeutsche, nextPage as sueddeutscheNext } from './sueddeutsche.mjs';
import { extract as schoba, nextPage as schobaNext } from './schoba.mjs';
import { extract as abInsZuhause, nextPage as abInsZuhauseNext } from './ab-ins-zuhause.mjs';
import { extract as immobilienDe, nextPage as immobilienDeNext } from './immobilien-de.mjs';
import { extract as generic, nextPage as genericNext } from './generic.mjs';

// ⚠ SUPERSEDED (2026-08-02) — `engel`, `blb` and `bbg` below are DEAD for normal scans.
// Those three portals moved to `scan_method: invisible-playwright` in portals.yml and are now
// served by scripts/portals/{engel-voelkers,blb-brandenburg,bbg-brandenburg}-extract.js, which
// this map does NOT index (the scan workflow derives snippet paths from the portal name).
// The .mjs extractors are kept only as a fallback if a portal is ever moved back to headless
// playwright — but each of them returned 0 cards on the live page, which is exactly why the
// portals were migrated. Re-verify against the live DOM before relying on any of them again.
const PORTAL_MAP = [
  { pattern: 'immoscout', extract: immoscout24, nextPage: immoscout24Next },
  { pattern: 'immowelt', extract: immowelt, nextPage: immoweltNext },
  { pattern: 'kleinanzeigen', extract: kleinanzeigen, nextPage: kleinanzeigenNext },
  { pattern: 'ohne-makler', extract: ohneMakler, nextPage: ohneMaklerNext },
  { pattern: 'ivd24', extract: ivd24, nextPage: ivd24Next },
  { pattern: 'zwangsversteigerung', extract: zvg, nextPage: zvgNext },
  { pattern: 'engel', extract: engelVoelkers, nextPage: engelVoelkersNext },
  { pattern: 'dga', extract: dga, nextPage: dgaNext },
  { pattern: 'bvbi', extract: bvbi, nextPage: bvbiNext },
  { pattern: 'bvvg', extract: bvvg, nextPage: bvvgNext },
  { pattern: 'blb', extract: blb, nextPage: blbNext },
  { pattern: 'bbg', extract: bbg, nextPage: bbgNext },
  { pattern: 'stadt potsdam', extract: stadtPotsdam, nextPage: stadtPotsdamNext },
  { pattern: 'propotsdam', extract: propotsdam, nextPage: propotsdamNext },
  { pattern: 'dibag', extract: dibag, nextPage: dibagNext },
  { pattern: 'semmelhaack', extract: semmelhaack, nextPage: semmelhaackNext },
  { pattern: 'karl marx', extract: wgKarlMarx, nextPage: wgKarlMarxNext },
  { pattern: 'wgkarlmarx', extract: wgKarlMarx, nextPage: wgKarlMarxNext },
  { pattern: 'süddeutsche', extract: sueddeutsche, nextPage: sueddeutscheNext },
  { pattern: 'schoba', extract: schoba, nextPage: schobaNext },
  { pattern: 'ab ins zuhause', extract: abInsZuhause, nextPage: abInsZuhauseNext },
  { pattern: 'ab-ins-zuhause', extract: abInsZuhause, nextPage: abInsZuhauseNext },
  { pattern: 'immobilien.de', extract: immobilienDe, nextPage: immobilienDeNext },
];

export function getExtractor(portalName) {
  const lower = portalName.toLowerCase();
  const match = PORTAL_MAP.find(p => lower.includes(p.pattern));
  if (match) return { extract: match.extract, nextPage: match.nextPage };
  return { extract: (page) => generic(page, portalName), nextPage: genericNext };
}
