/**
 * lock.mjs — cross-process mutual exclusion for the data files.
 *
 * Why: `scan auto` runs the Playwright pass and the invisible pass as separate
 * processes, and each process-scan.mjs child does read-modify-write on
 * pipeline.md / scan-history.tsv / scan-failures.json. writeAtomic makes each
 * single write crash-safe but is NOT a lock — overlapping writers lose updates.
 *
 * Mechanism: mkdir(2) is atomic on every filesystem, so the lock is a
 * directory `tmp/.locks/{name}.lock` containing an owner.json {pid, startedAt}
 * for diagnostics and stale detection. Callers use withLock() only, holding it
 * strictly around short read-modify-write sections — NEVER around browser work.
 *
 * Stale-break: a holder is presumed dead when owner.json is older than staleMs
 * OR its pid no longer exists (ESRCH). The pid check assumes all writers run on
 * the same host — true for this repo (single machine, no shared filesystem).
 *
 * One lock name — 'data' — covers pipeline.md + scan-history.tsv +
 * scan-failures.json + listings.md together: they are written as one logical
 * transaction, and separate locks would invite ordering deadlocks.
 */

import { mkdirSync, rmSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ownerDesc(dir) {
  try {
    const { pid, startedAt } = JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8'));
    return `pid ${pid} since ${startedAt}`;
  } catch {
    return 'unknown owner';
  }
}

function isStale(dir, staleMs) {
  try {
    const ownerPath = join(dir, 'owner.json');
    const st = statSync(ownerPath);
    if (Date.now() - st.mtimeMs > staleMs) return true;
    const { pid } = JSON.parse(readFileSync(ownerPath, 'utf8'));
    if (pid) {
      try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') return true; }
    }
    return false;
  } catch {
    // owner.json unreadable: either the holder is mid-acquire (a moment old) or
    // it crashed between mkdir and write. Judge by the dir's own age.
    try { return Date.now() - statSync(dir).mtimeMs > staleMs; } catch { return true; }
  }
}

export async function acquireLock(name, { root = process.cwd(), staleMs = 600_000, timeoutMs = 60_000 } = {}) {
  const locksDir = join(root, 'tmp', '.locks');
  const dir = join(locksDir, `${name}.lock`);
  mkdirSync(locksDir, { recursive: true });
  const deadline = Date.now() + timeoutMs;
  let delay = 100;
  for (;;) {
    try {
      mkdirSync(dir); // atomic: exactly one process wins
      writeFileSync(join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      return { dir, name };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (isStale(dir, staleMs)) {
        // Break the stale lock and retry immediately. If two waiters race here,
        // one wins the next mkdir and the other loops — safe.
        try { rmSync(dir, { recursive: true, force: true }); } catch { /* other waiter got it */ }
        continue;
      }
      if (Date.now() >= deadline) {
        // Never silently drop data: the caller must handle (record a failure).
        throw new Error(`lock '${name}' still held after ${timeoutMs}ms (${ownerDesc(dir)})`);
      }
      await sleep(delay + Math.random() * delay); // jittered backoff
      delay = Math.min(delay * 2, 2000);
    }
  }
}

export function releaseLock(handle) {
  if (!handle?.dir) return;
  try { rmSync(handle.dir, { recursive: true, force: true }); } catch { /* idempotent */ }
}

/** The only API callers should use: acquire → fn() → release, exception-safe. */
export async function withLock(name, opts, fn) {
  const handle = await acquireLock(name, opts);
  try {
    return await fn();
  } finally {
    releaseLock(handle);
  }
}
