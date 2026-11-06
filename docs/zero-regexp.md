# Whole-package zero-regexp gate (experiment J)

## Scope and inventory

Target: FIT3 installation lane, `feat/logsink`, by71x / 0.2.6 / code8, same
JS-only CLT6.1.1.280 build, seven business pages and full logsink retained.
This is a controlled candidate, not a claim that every JerryScript engine
forbids regular expressions. Real installation and watch-origin ACK remain
user acceptance steps.

Acorn ES5 AST inventory of the actual stage7 unsigned APP (`78107a441366741355d3fe65dc33e8af4d6378b4c41bc5fc4b9219a6e6ea0875`):

| Packaged member | Real regexp literals | Expressions |
| --- | ---: | --- |
| `assets/js/MainAbility/app.js` | 3 | title edge trim; preview whitespace collapse and edge trim |
| `assets/js/MainAbility/pages/edit/edit.js` | 1 | whitespace removal for empty document guard |
| other six page JS | 0 | none |

Whole APP contains eight JS; RegExp references/constructors = 0. Current
20 source JS (including ignored generated logger/config) contain the same
four literals. The earlier heuristic count of six was NOT six AST literals.
Frozen originals are only test oracles and are never packed.

## Equivalent algorithms

- Existing `common/utf8.js` supplies ES5 `var`/loops/charCodeAt helpers.
- WhiteSpace+LineTerminator exactly follows the existing ECMAScript oracle:
  codes9..13,32,160,5760,8192..8202,8232,8233,8239,8287,12288,65279.
  U+0085/U+180E/U+200B are NOT removed/treated as whitespace.
- `trimWhitespace` scans the two edges without altering internal whitespace.
- `compactWhitespace` copies non-space runs, inserts one ASCII32 between them
  and skips outer runs; equivalent to the old collapse+trim composition.
- `hasText` stops at the first non-space code unit. Store retains type/UTF8
  checks and callback ordering; editor retains kb/saving guards and save flow.
- Full original body remains untouched. Titles stay72UTF8 B, previews96B;
  UTF16 offsets/surrogate safety and3072B new-text limit remain unchanged.
- No parser/new watch dependency, large tables, asynchronous helper or changed
  timer/resource lifecycle. Compacting allocates a temporary string (bounded
  by the existing body ceiling), not a document-wide array.

## Hard gate

`npm ci --prefix scripts --ignore-scripts --no-audit --no-fund` installs the
host-only, lockfile-integrity-pinned `acorn@8.19.0`. CI installs it before
all tests and the unchanged SDK build. Root stays `type:commonjs`.

`verify-app.py` calls `scan-regexp.cjs` on every `.js` in EVERY inner HAP,
including rawfile/root/other abilities, plus any APP-level `.js`. The scanner
parses ES5, rejecting every regexp AST literal (even dead/unused), direct or
escaped RegExp identifiers and literal/computed static RegExp references.
Missing/mismatched parser, malformed/incomplete report, invalid UTF8 and
non-ES5/invalid source fail closed. Errors give member/count/line/column,
not source or credentials. Strings/comments/maps/URLs/division are not
regexp literals. The earlier byte-exact `.test(` rejection remains intact.
Arbitrary dynamic code or deliberately runtime-generated names are not a
literal parser guarantee; no such constructs are introduced by this change.

All old identity/version, CRC/BOM, seven pages,49152B budget/app-presence,
no-bytecode and sanitize-readback gates remain. Duplicate archive paths
also fail closed. Shared signing/strong verifier and configuration transformer
are unchanged; the same new scanner is additionally applied after configure,
signing and to the exact shared delivery target.

## Tests and evidence

Public seams: store.save/load/list and actual on-disk callback file host;
editor.save with real utf8 module; utf8 text helpers; archive verifier.

- New3 whitespace tests RED(old code executed103/65546 regex replacements,
  helper absent) -> GREEN. Independent ORIGINAL host regex oracle, all65536
  UTF16 code units in5 boundary/run contexts; all-space/CRLF/Unicode/body
  roundtrip/title/preview/byte budgets/editor guard order covered.
- Archive gate12 cases RED77 missing-gate assertions -> GREEN. Dead literals,
  whitespace/digit/non-space/ASCII-class/escaped-slash patterns, all regex
  consumer methods, computed method, constructors/aliases/escaped identifier,
  multi-HAP/root/rawfile/other ability/APP-level files, newline-after-map,
  invalidUTF8/nonES5/missing-parser negatives. No weakened budget assertion.
- All Node111/Python18 passed,0 skipped. Initial full Node110/111 failure was
  an old editor test mock lacking the new public helper; use actual utf8
  module instead (all original assertions retained), then full111PASS.
- Actual OLD stage7 APP now fails the gate at app.js literal3/edit.js literal1;
  it is not repackaged or delivered under the new name.
- Private execution evidence: `~/lw_build/liubai-logsink-stage10/`.
  Public repo/CI only contain placeholder logger credentials. Configured
  APP/HAP hold extractable write-key and remain strictly local.

Final CI, exact HAP hash/strong proofs and installer advice are recorded in
`docs/progress.md` after real execution, never inferred from these unit tests.
