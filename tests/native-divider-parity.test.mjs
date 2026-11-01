import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root='entry/src/main/js/MainAbility/pages/';
test('row dividers use real one-pixel nodes because Lite strips side-border CSS',()=>{
 for(const p of ['index','history','day','trash'])assert.match(fs.readFileSync(root+p+'/'+p+'.hml','utf8'),/class="row-divider"/);
 assert.match(fs.readFileSync(root+'menu/menu.hml','utf8'),/class="row-divider"/);
});
test('original toolbar fills the original V3 non-square slot via supported scaleX, not browser-only object-fit',()=>{
 const h=fs.readFileSync(root+'menu/menu.hml','utf8');assert.match(h,/toolBar\.png/);assert.match(h,/scaleX\(/);
});
