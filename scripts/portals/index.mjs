// Portal registry: maps portal name patterns to extractor modules.

import { extract as immoscout24 } from './immoscout24.mjs';
import { extract as immowelt } from './immowelt.mjs';
import { extract as kleinanzeigen } from './kleinanzeigen.mjs';
import { extract as generic } from './generic.mjs';

const PORTAL_MAP = [
  { pattern: 'immoscout', extract: immoscout24 },
  { pattern: 'immowelt', extract: immowelt },
  { pattern: 'kleinanzeigen', extract: kleinanzeigen },
];

export function getExtractor(portalName) {
  const lower = portalName.toLowerCase();
  const match = PORTAL_MAP.find(p => lower.includes(p.pattern));
  if (match) return match.extract;
  return (page) => generic(page, portalName);
}
