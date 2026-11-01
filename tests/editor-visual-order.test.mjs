import fs from 'node:fs';import assert from 'node:assert/strict';
const h=fs.readFileSync('entry/src/main/js/MainAbility/pages/edit/edit.hml','utf8');
assert.ok(h.indexOf('<list class="crown"')<h.indexOf('<div class="header"'),'crown sensor must be under all editor content, never an opaque cover over text');
assert.match(h,/space\.png/,'approved V3 space key keeps original graphic, not a restored text-button redesign');
console.log('PASS editor content stacking + frozen original space graphic');
