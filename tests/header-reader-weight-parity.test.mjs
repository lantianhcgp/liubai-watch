import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root='entry/src/main/js/MainAbility/pages/';
test('list page titles stay vertically centred with intrinsic line height, not 46px top-aligned text boxes',()=>{
 for(const p of ['history','day','trash']){const h=fs.readFileSync(root+p+'/'+p+'.hml','utf8');assert.match(h,/class="head-title"[^>]*height:\{\{35\*w\/412\}\}/);}
});
test('reader heading uses native duplicate glyph weight seam only for bold title, not Web font-weight',()=>{
 const h=fs.readFileSync(root+'read/read.hml','utf8');assert.match(h,/class="reading-weight"/);assert.match(h,/line\.bold/);assert.match(h,/line\.x\+0\.45/);
});
