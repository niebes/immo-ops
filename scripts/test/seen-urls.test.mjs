import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalizeUrl, loadSeenUrls } from '../lib/seen-urls.mjs';

test('canonicalizeUrl strips query and hash', () => {
  assert.equal(canonicalizeUrl('https://x.de/expose/1?utm=abc'), 'https://x.de/expose/1');
  assert.equal(canonicalizeUrl('https://x.de/expose/1#gallery'), 'https://x.de/expose/1');
  assert.equal(canonicalizeUrl('https://x.de/expose/1?a=b#c'), 'https://x.de/expose/1');
  assert.equal(canonicalizeUrl('https://x.de/expose/1'), 'https://x.de/expose/1');
  assert.equal(canonicalizeUrl(null), null);
  assert.equal(canonicalizeUrl(''), '');
});

test('loadSeenUrls unions canonicalized URLs from the three data files', () => {
  const root = mkdtempSync(join(tmpdir(), 'immo-seen-'));
  try {
    mkdirSync(join(root, 'data'));
    // Historical rows may carry query strings — must match their clean form.
    writeFileSync(join(root, 'data/scan-history.tsv'),
      'url\tfirst_seen\tportal\ttitle\tlocation\tprice\tm2\trooms\tstatus\n' +
      'https://a.de/expose/1?src=mail\t2026-01-01\tP\tT\tL\t1\t2\t3\tadded\n');
    writeFileSync(join(root, 'data/pipeline.md'),
      '# Pipeline\n\n## Pending\n- [ ] https://b.de/wohnung/2 | P | G | Title\n');
    // listings.md deliberately absent.
    const seen = loadSeenUrls(root);
    assert.ok(seen.has('https://a.de/expose/1'));
    assert.ok(seen.has('https://b.de/wohnung/2'));
    assert.ok(!seen.has('https://a.de/expose/1?src=mail'));
    assert.equal(seen.size, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('loadSeenUrls returns an empty set when no data files exist', () => {
  const root = mkdtempSync(join(tmpdir(), 'immo-seen-empty-'));
  try {
    assert.equal(loadSeenUrls(root).size, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
