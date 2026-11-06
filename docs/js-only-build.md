# JS-only release compiler: provenance and hard gates

## Confirmed source of the six `.bc` files

- Runs [42077906090](https://github.com/lantianhcgp/liubai-watch/actions/runs/42077906090) and [42129400696](https://github.com/lantianhcgp/liubai-watch/actions/runs/42129400696) each expose exactly one artifact (`liubai-unsigned-29`/`-30`); no wrong-artifact selection.
- Both use setup-ohos commit `4dbb63025116eb6165ceac58a4bf47cbdc5ac721`, CLT `6.1.1.280`, cache key `ohos-sdk-Linux-X64-6.1.1.280` and the same Hvigor task sequence. There is no observed CLT version/action/cache-key drift.
- Stage four's `LegacyCompileLiteJS` attempted snapshots but reported failure for **all eight** JS members. Current run reports failure for **edit and app only**; read/trash/menu/index/history/day produced nonempty JerryScript snapshots with header `JRRY`. JS-only was an accidental conversion-failure outcome, not a release guarantee. Changes to packaged validation code correlate with the six conversions succeeding; no claim is made that every earlier failure has one identical engine-level cause.
- SDK `webpack.lite.config.js` unconditionally adds `SnapshotPlugin` for `env.buildMode === 'release'`. Its snapshot plugin invokes `jerry-snapshot generate -o <page.bc> <page.js>` after webpack and merely logs failures. No separate snapshot boolean exists in this pinned factory; Terser minimization is independently selected by `hapMode`.
- Inspected published **same-version mac-arm64 CLT** source via ZIP HTTP Range, not a substituted SDK executable. SHA256 of webpack config: `7c22ea2478cf1ca83e40fe2289b1f9d350f35cd456152504d92b1ca46f3c5af6`. The CI Linux loader must match this exact fingerprint or fail closed.

| Current bytecode | BC bytes | Full same-name JS bytes |
|---|---:|---:|
| read/read.bc | 19404 | 21888 |
| trash/trash.bc | 21998 | 24054 |
| menu/menu.bc | 26880 | 32055 |
| index/index.bc | 23770 | 26439 |
| history/history.bc | 23318 | 26025 |
| day/day.bc | 22352 | 24629 |

## Minimal build-only adaptation

`scripts/js-only-compiler.cjs` is loaded only by the explicitly opted-in build (`LIUBAI_JS_ONLY=1`, scoped `NODE_OPTIONS`). It verifies the exact loader fingerprint, calls the unmodified release factory, removes exactly one instance of **that SDK's SnapshotPlugin**, and leaves mode/Terser/other plugins/source maps unchanged. No product runtime source is changed. Unknown SDK/factory/mode/plugin counts fail closed. Neither SDK files nor artifacts are rewritten to delete `.bc`.

`scripts/verify-js-only-compiler.py` requires evidence that this adapter actually executed with release/production/minimize and one removed plugin. `verify-app.py` additionally rejects every `.bc` member, including empty files and other abilities, before any public artifact is uploaded. Existing config/CRC/version/page budgets and full-JS `.test(` gate remain. The local configure bytecode precheck and shared strong verifier are untouched.

## Regression seams

- Public webpack release-config seam: unchanged pinned factory compared to adapted result, asserting only SnapshotPlugin differs. A fixture is the exact inspected SDK source, not an invented SDK response. Actual release config failure recorded before inserting the filter, then GREEN. Off-by-default and unknown-fingerprint negatives included.
- Archive verifier seam: JS-only fixture accepted; all six full-JS-plus-BC pairs and empty/other-ability BC rejected. Old gate was RED before the new assertion, then GREEN.
- Full existing business suites are rerun; Node/V8 behavior and host compiler-factory tests do not prove native JerryScript heap, FIT3 installation or watch-origin ACK.

Sanitized primary evidence: `~/lw_build/liubai-logsink-stage7/`. Credential-bearing configured APP/HAP remain local only, never Git/Actions artifacts.

## Actual result (2026-11-06 CST)

Final build `810d58da242ed2325b0a9165861e94b8d4fa4da5`, [CI42133827860](https://github.com/lantianhcgp/liubai-watch/actions/runs/42133827860) GREEN: Node108/108, Python10/10, no skips; Linux fingerprint/report assertion actually executed once, release build successful. Initial test-only Node18 incompatibility and clean-deleted evidence directory were separately reproduced and fixed without changing compiler/product semantics.

Artifact `liubai-unsigned-33`: 906756B APP, SHA256 `78107a441366741355d3fe65dc33e8af4d6378b4c41bc5fc4b9219a6e6ea0875`, 197 files, zero `.bc`, eight JS. All 197 non-bytecode resources are **byte-identical** to CI42129400696. No archive `.bc` deletion was used. Configure then changed only app.js, preserving all other bytes.

Exact by71x signature and version0.2.6/code8, legacy CMS, full shared strong including runtime-config/resource provenance and exclusive leaf/digest/1B negative all PASS locally and at the exact shared target. Independent signed.bin scan: eight JS, `.test(`0, `.bc`0, every JS≤49152B. A real repacked CRC-valid1B mutation passed legacyCMS but failed strong (exit1).

Delivered `/storage/emulated/0/haps/liubai-2026-11-06-日志版v2.hap`: **3941210B**, SHA256 `c1ad9397fa582ba1f8625a6ef94e07a93eef6e0c68fd4c7a8f609690f6e768d3`. Previous111haps unchanged, collector31518 alive. Manual installation through the user's installer UI only; FIT3/native JerryScript/watch-origin ACK remain unverified.
