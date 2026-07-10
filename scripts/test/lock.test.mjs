import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, utimesSync, readdirSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { acquireLock, releaseLock, withLock } from '../lib/lock.mjs';

const freshRoot = () => mkdtempSync(join(tmpdir(), 'immo-lock-test-'));

test('acquire → release → re-acquire', async () => {
  const root = freshRoot();
  const h1 = await acquireLock('data', { root });
  releaseLock(h1);
  const h2 = await acquireLock('data', { root });
  releaseLock(h2);
});

test('release is idempotent', async () => {
  const root = freshRoot();
  const h = await acquireLock('data', { root });
  releaseLock(h);
  releaseLock(h);
  releaseLock(null);
  releaseLock(undefined);
});

test('withLock serializes two concurrent critical sections', async () => {
  const root = freshRoot();
  let inSection = 0, maxConcurrent = 0, runs = 0;
  const job = () => withLock('data', { root }, async () => {
    inSection++; maxConcurrent = Math.max(maxConcurrent, inSection);
    await new Promise((r) => setTimeout(r, 30));
    runs++; inSection--;
  });
  await Promise.all([job(), job(), job()]);
  assert.equal(runs, 3);
  assert.equal(maxConcurrent, 1);
});

test('stale lock by age is broken', async () => {
  const root = freshRoot();
  const h = await acquireLock('data', { root });
  // Backdate owner.json AND write a live pid so only the age criterion applies.
  const ownerPath = join(h.dir, 'owner.json');
  writeFileSync(ownerPath, JSON.stringify({ pid: process.pid, startedAt: 'old' }));
  const past = new Date(Date.now() - 3600_000);
  utimesSync(ownerPath, past, past);
  const h2 = await acquireLock('data', { root, staleMs: 1000, timeoutMs: 2000 });
  releaseLock(h2);
});

test('stale lock by dead pid is broken', async () => {
  const root = freshRoot();
  const h = await acquireLock('data', { root });
  writeFileSync(join(h.dir, 'owner.json'), JSON.stringify({ pid: 999999999, startedAt: new Date().toISOString() }));
  const h2 = await acquireLock('data', { root, timeoutMs: 2000 });
  releaseLock(h2);
});

test('held lock with live owner times out with an error (never silent)', async () => {
  const root = freshRoot();
  const h = await acquireLock('data', { root });
  await assert.rejects(
    () => acquireLock('data', { root, timeoutMs: 400 }),
    /still held/,
  );
  releaseLock(h);
});

test('withLock releases on exception', async () => {
  const root = freshRoot();
  await assert.rejects(
    () => withLock('data', { root }, () => { throw new Error('boom'); }),
    /boom/,
  );
  const h = await acquireLock('data', { root, timeoutMs: 500 }); // must not block
  releaseLock(h);
});

test('crashed-holder dir without owner.json is broken by dir age', async () => {
  const root = freshRoot();
  const dir = join(root, 'tmp', '.locks', 'data.lock');
  mkdirSync(dir, { recursive: true }); // simulate crash between mkdir and owner write
  const past = new Date(Date.now() - 3600_000);
  utimesSync(dir, past, past);
  const h = await acquireLock('data', { root, staleMs: 1000, timeoutMs: 2000 });
  releaseLock(h);
  assert.ok(!readdirSync(join(root, 'tmp', '.locks')).includes('data.lock'));
});
