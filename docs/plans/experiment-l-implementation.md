# 实验 L Implementation Plan

> **For Hermes:** Execute the user-authorized diagnostic plan task-by-task with TDD and two-pass review.

**Goal:** Produce a real new CI/signed diagnostic HAP preserving experiment K business behavior.

**Architecture:** app.js owns the original canonical logger and small scalar-only inline trace/error/heartbeat functions. shell/list/index safely forward to the actual app instance; no page logger reinitialization or new native imports.

**Tech Stack:** FA Lite HML/CSS/ES5-JerryScript subset; CLT6.1.1.280; Node VM tests; Acorn ES5 full-package scanner; exact by71x CMS/payload gates.

## Task 1: application trace
- Test `tests/diagnostic-startup.test.mjs` through application lifecycle and original Store callback APIs.
- Run `node --experimental-vm-modules --test tests/diagnostic-startup.test.mjs`: baseline must fail missing L/app.create.enter, not fixture errors.
- Modify only `entry/src/main/js/MainAbility/app.js`: trace stage + state, preserve route/listeners and Store callback/dispose semantics.
- Run specific test and `node --input-type=module --check < entry/src/main/js/MainAbility/app.js`.

## Task 2: error and heartbeat
- Add failing tests through app onError/onerror, Store init/dispose failures, timers and diagnostic public forwarding.
- Add small inline reportError, six 5s heartbeats per create, one timer, clear on hide/destroy and remaining-budget restart on show.
- Log any newly caught business exception then rethrow the exact error; failing log/string/timer must not change returns or callbacks.
- Run specific tests until green; preserve callback, object and exception identity against frozen K oracle.

## Task 3: native device, readiness and homepage
- Extend failing tests using shell.init/ensure and list.init/list callbacks/index lifecycle public seams.
- Add inline safe app forwarding in shell; list and index call forwarding without importing a second logger. Log request/return, success/fail/timeout, geometry, readiness, list result, paint/focus stages and original caught errors.
- Compare all page data and business effects against frozen K, including invalid device, stale callback, readiness failure, thrown callback and malformed list.

## Task 4: local acceptance/review
- Run all `node --experimental-vm-modules --test tests/*.test.mjs`, `python3 -m unittest discover -s tests -p 'test_*.py' -v`, pinned logger source/generated tests, source/syntax/diff checks and tracked scope audit.
- Confirm frozen K matches commit; unchanged HML/CSS/resources/storage/config/build/verifiers/profile/key and every old HAP hash.
- Review preservation and heap/timer/security, then commit explicit files and push only feat/logsink after audit.

## Task 5: fresh CI/unsigned
- Wait exact new head workflow success and read back head SHA/run/artifact; download one real fresh .app.
- Require all tests no skips, true JS-only adapter evidence, strict <49152B application and all pages, zero literal/reference/test/BC/JRRY and full resource origins/icon pixels.
- Preserve public placeholders and run source/history/artifact secret audit.

## Task 6: configure/sign/verify/deliver
- Existing configure script changes only real app.js; explicit write-only local config, exact by71x p7b/local key.
- Full unchanged strong local and exact target: `--bundle liubai.nexus.by71x --version-code 8 --app ... --runtime-config ... --negative`; no logger-page.
- Repacked CRC-valid 1B mutation: legacy 0 / strong 1 / SHA256 mismatch. Signed payload exact configured files, full ES5 zero-regexp inventory.
- Exclusive-new `/storage/emulated/0/haps/实验L-诊断打点.hap`, fsync/readback/SHA256/old-haps hash audit. Create sanitized evidence/operating guide and concise actual-result summary, explicitly leave FIT3/root cause/automatic error hook/native heap/ACK unverified.
