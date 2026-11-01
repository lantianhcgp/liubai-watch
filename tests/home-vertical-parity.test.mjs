import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const h=fs.readFileSync('entry/src/main/js/MainAbility/pages/index/index.hml','utf8');
test('home section uses intrinsic text heights inside 44px row and 46px tap target',()=>{
 assert.match(h,/class="section-label"[^>]*height:\{\{24\*w\/412\}\}/);
 assert.match(h,/class="filter"[^>]*height:\{\{25\*w\/412\}\}/);
});
test('empty home keeps both approved padding and paragraph margin before vertically centred prompt',()=>{
 assert.match(h,/listY\+16\+16\*w\/412/);
 assert.match(h,/class="quiet"[^>]*height:\{\{28\.3\*w\/412\}\}/);
});
