/**
 * fsx.mjs — filesystem helpers.
 */

import { writeFileSync, renameSync } from 'fs';

/**
 * Atomic full-file write: write to `${path}.tmp-${pid}` then rename over the
 * target, so a crash mid-write never leaves a truncated pipeline.md /
 * scan-history.tsv / scan-failures.json behind. (rename(2) is atomic on the
 * same filesystem; the tmp file sits next to the target.)
 */
export function writeAtomic(path, content) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}
