// Portal registry: maps portal name patterns to extractor modules.

import { extract as immoscout24, nextPage as immoscout24Next } from './immoscout24.mjs';
import { extract as immowelt, nextPage as immoweltNext } from './immowelt.mjs';
import { extract as kleinanzeigen, nextPage as kleinanzeigenNext } from './kleinanzeigen.mjs';
import { extract as ohneMakler, nextPage as ohneMaklerNext } from './ohne-makler.mjs';
import { extract as ivd24, nextPage as ivd24Next } from './ivd24.mjs';
import { extract as zvg, nextPage as zvgNext } from './zwangsversteigerung.mjs';
import { extract as generic, nextPage as genericNext } from './generic.mjs';

const PORTAL_MAP = [
  { pattern: 'immoscout', extract: immoscout24, nextPage: immoscout24Next },
  { pattern: 'immowelt', extract: immowelt, nextPage: immoweltNext },
  { pattern: 'kleinanzeigen', extract: kleinanzeigen, nextPage: kleinanzeigenNext },
  { pattern: 'ohne-makler', extract: ohneMakler, nextPage: ohneMaklerNext },
  { pattern: 'ivd24', extract: ivd24, nextPage: ivd24Next },
  { pattern: 'zwangsversteigerung', extract: zvg, nextPage: zvgNext },
];

export function getExtractor(portalName) {
  const lower = portalName.toLowerCase();
  const match = PORTAL_MAP.find(p => lower.includes(p.pattern));
  if (match) return { extract: match.extract, nextPage: match.nextPage };
  return { extract: (page) => generic(page, portalName), nextPage: genericNext };
}
