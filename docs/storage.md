# Bounded storage and pagination

Source: `entry/src/main/js/MainAbility/common/store.js`.

## Sorted pagination

The public offset/limit API and pinned-first, created-descending, ID tie-break
ordering are unchanged. One continuation stores only the previous last metadata
record, filter key, catalog sequence and next offset. Consecutive requests scan
each small index page once instead of repeating a scan for every skipped dozen.
All commits invalidate the continuation; changed filters and arbitrary offsets
fall back to the existing bounded top-12 selection. Arbitrary large offset jumps
still require repeated scans. No full catalog or bodies are cached in memory.
The metadata page bound remains six records, list limit 1–12, reads ≤4096 bytes,
and native operation watchdog remains 10000 ms.

## Immutable body garbage collection

Saved bodies and draft chunks remain immutable. Every body write first commits a
checksummed dual-generation `g0.json`/`g1.json` candidate journal in that body's
directory. Each entry is a token/count descriptor, not a directory enumeration.
The intent is durable before the first chunk write, so interruption and partial
writes leave known paths that can be retried without calling `file.list`.

GC treats **both valid index/draft generations** as roots. It never removes any
chunk referenced by either current or rollback metadata. Flag-only commits and
draft tombstones also run GC; the first clear keeps the previous draft, and a
second clear can reclaim it. Startup retries journals for catalogued pages,
the draft directory and the next unreachable page. Failed chunk deletes retain
the complete descriptor for retry. Cleanup is best effort after a body/metadata
commit; pre-write journal errors reject the new write. Corrupt journals or
uninterpretable valid root metadata fail closed rather than guessing reachability.

Candidate journals hold at most 32 descriptors, each at most 16 chunks. When
cleanup failures exhaust that bound, body writes reject before creating more
chunks. Normal steady state retains at most two six-record page generations
(12 body descriptors) or two draft generations. GC operates on one small page
at a time and never requests an unbounded native directory listing.

Existing pre-journal unreferenced files cannot be discovered safely through the
native API without an unbounded directory listing. They are preserved, not
silently claimed reclaimed. Existing referenced versions are enrolled on the
next body write; the new write path prevents continued revision/draft leakage.
Settings still use their existing dual-generation files and are not part of
body GC. Retention does not provide an atomic rename guarantee or replace
native-device crash/power-loss testing.

## Verification

```sh
node --experimental-vm-modules tests/store.test.mjs
node --experimental-vm-modules tests/store-performance.test.mjs
```

Both use the existing real on-disk callback host. Additional regressions cover
140-record cold sorted pagination and its index-read budget, repeated revisions,
large draft churn, rollback roots, interrupted candidate recovery, failed
cleanup retries and failed body writes. Existing tests are not modified.
