import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root='entry/src/main/js/MainAbility/pages/';
test('row dividers use real one-pixel nodes because Lite strips side-border CSS',()=>{
 for(const p of ['index','history','day','trash'])assert.match(fs.readFileSync(root+p+'/'+p+'.hml','utf8'),/class="row-divider"/);
 assert.match(fs.readFileSync(root+'menu/menu.hml','utf8'),/class="row-divider"/);
});
test('four original tool icons share their actual hit cells instead of an ignored image transform',()=>{
 const h=fs.readFileSync(root+'menu/menu.hml','utf8');
 assert.doesNotMatch(h,/scaleX\(/,'official native frames prove the whole-image transform did not fill its shell');
 const hit=h.match(/<div class="tool-hit"[^>]*>([\s\S]*?)<\/div>/)[1];
 assert.match(hit,/<image class="tool-icon"[^>]*src="\{\{c.icon\}\}"/);
 const css=fs.readFileSync(root+'menu/menu.css','utf8');assert.match(css,/\.tool-icon\{width:23px;height:23px;/);
});
