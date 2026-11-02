r15 Native Parser Investigation

Purpose: reproduce the exact compiled Liubai JS parse behavior using the same CLT 6.1.1.280 SDK native ace-loader JerryScript binary. This is not an installation fix and not a full feature delivery.

Pinned baseline: 65433fc396b8290e1edfe71474fab46fced00222 (r11 diagnostic branch); V3 entry/src/main must remain identical to 7333d413fb6aa0349a48db0c52855012eddb6695.

Fixtures: exact app.js and boot/index compiler output from the failed r12/r14 startup APP; exact app.js and index/detail from r13 periodic positive control. provenance.json records source hashes and entry names. No credential or profile is copied.

Native parse probes: ordinary ES5, regexp literal, regexp in a dead branch. Failures and stderr must be retained, including infrastructure failures. Success in V8/Acorn is not a success in this SDK parser. A native parse discrepancy is a reason to test a controlled payload; it does not by itself prove the cause of device error 34.

Only the new diag/r15-jerry branch is changed. build.yml excludes this branch to avoid an unrelated full build. No V3 source changes, profile changes, log collection or destructive device actions.
