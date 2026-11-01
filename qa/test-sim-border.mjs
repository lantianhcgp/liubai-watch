import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const s=fs.readFileSync('/data/data/com.termux/files/home/liubai-watch-ui-sim/js/css-adapter.js','utf8'),ctx={};vm.runInNewContext(s+';globalThis.styles=CSSAdapter.getWatchBaseStyles();',ctx);
test('native base border is solid with zero default width, so compiled border widths draw the specified rim',()=>{assert.match(ctx.styles,/border-style:\s*solid/);assert.match(ctx.styles,/border-width:\s*0/);});
