# Keyboard controller API

Import the default from `common/keyboard.js`. The controller owns editing state, not page data. Parent handlers assign the returned snapshot to **top-level** page fields; there is no DOM, browser IME, router or page instance dependency.

```js
var controller = keyboard.create({
  text: existingText,
  cursor: existingCursor,
  type: 0,
  pinyin: '',
  onChange: function (s) { /* assign parent top-level fields */ },
  onError: function (code) { /* display bounded error message */ }
});
var initial = controller.snapshot();
```

## Snapshot

`{text, cursor, type, pinyin, candidates:[{text, matchLength}], image, sheetWidth, sheetOffset}`.

- `cursor` is a UTF-16 offset, clamped away from surrogate / combining / emoji-cluster interiors.
- Types: `0` Chinese pinyin, `1` lowercase English, `2` uppercase English, `3` digits/symbols. Original CrabKeyboard mappings are preserved.
- `image` is `/common/keyboard/common/0.png` through `3.png`; `key0.png` through `key3.png` are the original type icons, not the large keyboard sheets.
- Key viewport height is **141 px**. The original sheet uses 57 px columns, 60 px rows and 29 px per-row stagger, scaled by `141/180`. Sheet widths are `570*141/180` (types 0..2) and `741*141/180` (type 3). Render the whole image at this width and **141 px height**, clipped inside the parent's actual-device key viewport, translated by `sheetOffset`.
- The approved merged candidate/composition slot remains **44 px**; this controller does not restore the original wide space bar.
- Snapshots copy candidate objects; parent mutations cannot change controller state.

## Methods

`setCursor(index)`, `insert(text)`, `typeNext()`, `choose(index)`, `backspace()`, `move(delta)`, `home()`, `end()`, `space()`, `newline()`, `copy()`, `paste(index)`, `dispose()`.

Editing methods return `true` on accepted edits, `false` on invalid/rejected/no-op calls. `insert` is literal (use it for test seams and paste), not a pinyin keystroke. `move(delta)` moves by Unicode editing clusters; home/end address the whole document. Cursor navigation preserves composition. Type switches, shifted punctuation, space and newline first commit any remaining pinyin literally, atomically; space/newline with composition perform that commit only, matching the reference. Choosing a candidate consumes only its `matchLength`, retaining/relooking-up the remaining pinyin.

New insertion is limited to **3072 UTF-8 bytes** for the entire document. Every literal insert, candidate and paste is accepted or rejected as a whole; no truncation or partial pinyin consumption. Existing oversized text is preserved and can be deleted/copied only within clipboard limits; additional insertion is rejected. Invalid Unicode is rejected. Candidate results are asynchronous, bounded to 20, and old/disposed requests cannot publish or continue reads.

`copy()` copies the whole document into an application-local clipboard; no OS clipboard access. `paste(index)` defaults to the newest entry (`0`). Clipboard entries are deduplicated, at most eight, at most 3072 UTF-8 bytes each, at most 8192 UTF-8 bytes total; oldest entries are evicted. An additional `clipboard()` method returns a copied array for the parent's clipboard picker. Preferences are bounded in memory and do not load a large JSON file.

## Touch contract

`touchStart(e,g)`, `touchMove(e,g)`, `touchEnd(e,g)`, `longPress(e,g)`.

`e` carries original global coordinates `{globalX,globalY}` (or `touches[0]` / `changedTouches[0]` with those fields). `g={keyX,keysY,keyW}` is supplied by the parent from **actual device layout**: global viewport left/top and visible width. Missing/invalid geometry is rejected, never replaced with a hardcoded device size. Use the same geometry for all phases.

A tap enters the original lower character. An upward swipe or long press enters its upper character exactly once (the trailing end event is suppressed). Horizontal drag scrolls the sheet; overscrolling left/right edges by the scaled original threshold changes type, cycling forward/backward. A sheet drag never also inserts a character. Clip to actual `keyW`; do not rescale the sheet horizontally to viewport width. Bind touch phases on the viewport and do not also bind a duplicate click-insert handler.

## Errors and lifecycle

`onError(code)` uses ASCII codes: `LIMIT`, `UNICODE`, `PINYIN_LIMIT`, `GEOMETRY`, `DICT_IO`, `DICT_DATA`, `DICT_TIMEOUT`, `CLIPBOARD_LIMIT`. Invalid indices/no-op actions return false without a callback. `onChange(snapshot)` occurs after accepted state changes and current async candidate updates. Read initial state with `snapshot()`; creation need not synchronously call `onChange`.

`dispose()` is idempotent, cancels lookup watchdogs and invalidates all in-flight callbacks. After disposal, mutation methods return false and no callbacks fire. The parent must dispose on page destruction/replacement and retain composition/cursor in its draft snapshot when hiding the keyboard.

## Reference / verification boundaries

Adapted from read-only CrabKeyboard (crabKun), MIT, reviewed HEAD `656f8ad842a8692bc3b2b975d6b648880232c592`. License is retained under `common/keyboard/LICENSE`. The original flash Trie files are copied unchanged into `resources/rawfile/pinyinDictV5_flash1001`, never imported as JS. Lookup reads only a bounded node/value at byte offsets via callback `@system.file.readText`; no whole-dictionary load, Promise or TypedArray in watch code.

Host tests use the existing `tests/file-host.mjs` real on-disk FileHost with packaged flash paths. They prove editing/gesture/read-offset behavior and failure/race guards, not native file offsets, JerryScript heap, decoded image release or true device coordinates. Parent owns built-page `<49152` checks and GUI/real-device acceptance.
