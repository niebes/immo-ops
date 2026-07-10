import test from 'node:test';
import assert from 'node:assert/strict';
import { insertPendingEntries, toPipelineLine, EMPTY_PIPELINE } from '../lib/pipeline-md.mjs';

const ENTRY = '- [ ] https://x.de/1 | PortalA | Group | Title | 1500 EUR';

test('insertPendingEntries: entries land directly under the header', () => {
  const out = insertPendingEntries('# Pipeline\n\n## Pending\n- [ ] old\n\n## Processed\n- [x] done\n', [ENTRY]);
  const lines = out.split('\n');
  assert.equal(lines[lines.indexOf('## Pending') + 1], ENTRY);
  // Existing content preserved, Processed untouched
  assert.ok(out.includes('- [ ] old'));
  assert.ok(out.includes('## Processed\n- [x] done'));
});

test('insertPendingEntries: "## Pending" as last line WITHOUT trailing newline (the splice bug)', () => {
  const out = insertPendingEntries('# Pipeline\n\n## Pending', [ENTRY]);
  // Must NOT splice before the file header…
  assert.ok(out.startsWith('# Pipeline'));
  // …and the entry must sit after the header.
  assert.ok(out.indexOf(ENTRY) > out.indexOf('## Pending'));
});

test('insertPendingEntries: missing "## Pending" section is created', () => {
  const out = insertPendingEntries('# Pipeline\n\n## Processed\n', [ENTRY]);
  assert.ok(out.includes('## Pending'));
  assert.ok(out.indexOf(ENTRY) > out.indexOf('## Pending'));
});

test('insertPendingEntries: empty/undefined input yields a valid skeleton', () => {
  const out = insertPendingEntries('', [ENTRY]);
  assert.ok(out.startsWith('# Pipeline'));
  assert.ok(out.indexOf(ENTRY) > out.indexOf('## Pending'));
  assert.equal(insertPendingEntries(undefined, []), EMPTY_PIPELINE);
});

test('insertPendingEntries: no entries → text unchanged', () => {
  const text = '# Pipeline\n\n## Pending\n';
  assert.equal(insertPendingEntries(text, []), text);
});

test('insertPendingEntries: multiple entries keep their order', () => {
  const e2 = ENTRY.replace('/1', '/2');
  const out = insertPendingEntries('# Pipeline\n\n## Pending\n', [ENTRY, e2]);
  assert.ok(out.indexOf(ENTRY) < out.indexOf(e2));
});

test('toPipelineLine: full listing emits all fields in order', () => {
  const line = toPipelineLine(
    { url: 'https://x.de/1', portal: 'ImmoScout24', title: 'Schöne Wohnung', price: 1500, m2: 86, rooms: 3, location: 'Babelsberg, Potsdam' },
    'Potsdam flat rental',
  );
  assert.equal(line, '- [ ] https://x.de/1 | ImmoScout24 | Potsdam flat rental | Schöne Wohnung | 1500 EUR | 86 m² | 3 Zi | Babelsberg, Potsdam');
});

test('toPipelineLine: missing fields are omitted, not emitted empty', () => {
  const line = toPipelineLine({ url: 'https://x.de/1', portal: 'P', title: 'T', price: 690 }, 'G');
  assert.equal(line, '- [ ] https://x.de/1 | P | G | T | 690 EUR');
});

test('toPipelineLine: "|" in ANY free-text field cannot shift columns (incl. group + portal)', () => {
  const line = toPipelineLine(
    { url: 'https://x.de/1', portal: 'P | Q', title: 'A | B', price: 1, location: 'X | Y' }, 'G | H');
  assert.equal(line.split('|').length, 6); // '- [ ] url', portal, group, title, price, location
  assert.ok(line.includes('P / Q'));
  assert.ok(line.includes('G / H'));
});
