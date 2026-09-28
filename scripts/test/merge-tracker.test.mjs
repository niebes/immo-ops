import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { acquireLock, releaseLock } from '../lib/lock.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'merge-tracker.mjs');
const run = (cwd) => promisify(execFile)('node', [SCRIPT], { cwd, encoding: 'utf8' });

const PIPELINE = [
  '# Pipeline', '', '## Pending',
  '- [ ] https://a.example/x/1?utm=1 | P | t1',
  '- [ ] https://a.example/x/2 | P | t2',
  '', '## Processed',
  '- [x] #5 | https://a.example/x/3 | P | old', '',
].join('\n');

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'immo-merge-test-'));
  for (const d of ['data', 'reports', 'batch/tracker-additions', 'batch/pipeline-updates']) {
    mkdirSync(join(root, d), { recursive: true });
  }
  const w = (p, c) => writeFileSync(join(root, p), c);
  w('data/listings.md', '| # | d |\n|---|---|\n');
  w('data/pipeline.md', PIPELINE);
  w('reports/900-a.md', '**URL:** https://a.example/x/1\n');
  w('batch/tracker-additions/900-a.tsv',
    'num\tdate\tportal\ttype\tlocation\tprice\tm2\trooms\tscore\tstatus\treport\tnotes\n' +
    '900\t2026-09-24\tP\tmiete\tLoc\t1\t2\t3\t4.0\tEvaluated\treports/900-a.md\tn\n');
  const stage = (nnn, obj) => w(`batch/pipeline-updates/${nnn}.json`, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return { root, stage, read: (p) => readFileSync(join(root, p), 'utf8') };
}

test('applies a staged pipeline update to the matching pending line (query string ignored)', async () => {
  const s = sandbox();
  s.stage('900', { url: 'https://a.example/x/1', line: '- [x] #900 | https://a.example/x/1 | P | t1 | 4.0/5' });
  await run(s.root);
  const lines = s.read('data/pipeline.md').split('\n');
  assert.ok(lines.includes('- [x] #900 | https://a.example/x/1 | P | t1 | 4.0/5'));
  assert.ok(lines.includes('- [ ] https://a.example/x/2 | P | t2'), 'other pending lines untouched');
  assert.match(s.read('data/listings.md'), /\| 900 \|/);
  assert.deepEqual(readdirSync(join(s.root, 'batch/pipeline-updates')), []);
});

test('drops an update whose URL is already processed; keeps invalid or unmatched ones', async () => {
  const s = sandbox();
  s.stage('901', { url: 'https://a.example/x/3', line: '- [x] #901 | late duplicate' });
  s.stage('902', { url: 'https://a.example/x/9', line: '- [x] #902 | not in pipeline' });
  s.stage('903', 'not json');
  s.stage('904', { url: 'https://a.example/x/2', line: 'missing checkbox' });
  await run(s.root);
  assert.equal(s.read('data/pipeline.md'), PIPELINE, 'pipeline.md unchanged');
  assert.deepEqual(readdirSync(join(s.root, 'batch/pipeline-updates')).sort(), ['902.json', '903.json', '904.json']);
});

test('parallel workers staging separate files all land; a second run is a no-op', async () => {
  const s = sandbox();
  s.stage('900', { url: 'https://a.example/x/1', line: '- [x] #900 | https://a.example/x/1 | done' });
  s.stage('901', { url: 'https://a.example/x/2', line: '- [x] #901 | https://a.example/x/2 | done' });
  await run(s.root);
  const after = s.read('data/pipeline.md');
  assert.equal((after.match(/^- \[ \]/gm) || []).length, 0);
  await run(s.root);
  assert.equal(s.read('data/pipeline.md'), after);
});

test('waits for the shared data lock before writing', async () => {
  const s = sandbox();
  s.stage('900', { url: 'https://a.example/x/1', line: '- [x] #900 | https://a.example/x/1 | done' });
  const held = await acquireLock('data', { root: s.root });
  const merge = run(s.root);
  await new Promise(r => setTimeout(r, 400));
  assert.equal(s.read('data/pipeline.md'), PIPELINE, 'no write while another process holds the lock');
  releaseLock(held);
  await merge;
  assert.match(s.read('data/pipeline.md'), /- \[x\] #900/);
});

test('normalises a comma-decimal score to dot-decimal', async () => {
  const s = sandbox();
  writeFileSync(join(s.root, 'batch/tracker-additions/900-a.tsv'),
    'num\tdate\tportal\ttype\tlocation\tprice\tm2\trooms\tscore\tstatus\treport\tnotes\n' +
    '900\t2026-09-24\tP\tmiete\tLoc\t1\t2\t3\t4,1\tEvaluated\treports/900-a.md\tn\n');
  await run(s.root);
  assert.match(s.read('data/listings.md'), /\| 900 \|.*\| 4\.1 \| Evaluated \|/);
});

test('applies tracker_notes to other rows; status only to Expired', async () => {
  const s = sandbox();
  writeFileSync(join(s.root, 'data/listings.md'),
    '| # | d |\n|---|---|\n' +
    '| 757 | 2026-09-12 | IS24 | miete | Fahrland | 1.350 | 97 | 3 | 3.9 | Evaluated | [757](reports/757.md) | old note |\n' +
    '| 365 | 2026-07-20 | IS24 | kauf | Marquardt | 495.000 | 120 | 6 | 4.2 | Evaluated | [365](reports/365.md) |  |\n');
  s.stage('900', {
    url: 'https://a.example/x/1', line: '- [x] #900 | https://a.example/x/1 | P | t1 | 4.0/5',
    tracker_notes: [
      { num: '757', append: '[superseded by #900]' },
      { num: '365', status: 'Expired', append: '[404, re-listed as #900]' },
      { num: '757', status: 'Rejected' },
    ],
  });
  const { stdout, stderr } = await run(s.root);
  const t = s.read('data/listings.md');
  assert.match(t, /\| 757 \|.*\| Evaluated \|.*old note \[superseded by #900\] \|/);
  assert.match(t, /\| 365 \|.*\| Expired \|.*\[404, re-listed as #900\] \|/);
  assert.match(stdout + stderr, /refusing status "Rejected"/);
  // idempotent: re-applying the same note does not duplicate it
  s.stage('901', { url: 'https://a.example/x/2', line: '- [x] #901 | https://a.example/x/2 | P | t2 | 3.0/5', tracker_notes: [{ num: '757', append: '[superseded by #900]' }] });
  await run(s.root);
  assert.equal(s.read('data/listings.md').split('[superseded by #900]').length, 2);
});

test('keeps the search group from the pending line in the processed line', async () => {
  const s = sandbox();
  writeFileSync(join(s.root, 'data/pipeline.md'), [
    '# Pipeline', '', '## Pending',
    '- [ ] https://a.example/x/1 | P | Potsdam flat rental | Nice flat | 1200 EUR | 80 m² | 3 Zi | Eiche',
    '', '## Processed', '',
  ].join('\n'));
  s.stage('900', { url: 'https://a.example/x/1', line: '- [x] #900 | https://a.example/x/1 | P | 3-Zi Eiche | 4.0/5' });
  await run(s.root);
  assert.match(s.read('data/pipeline.md'), /^- \[x\] #900 \| https:\/\/a\.example\/x\/1 \| P \| Potsdam flat rental \| 3-Zi Eiche \| 4\.0\/5$/m);
});
