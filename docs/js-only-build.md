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
