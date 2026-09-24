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
