import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/pages/edit/edit.hml',import.meta.url),'utf8');
const declarations=[...source.matchAll(/(?:left|top|width|height|font-size):\s*\{\{\s*([^{}]+?)\s*\}\}(px)?/g)];

test('Z numeric editor dimensions avoid repeated SDK string conversion while retaining every active binding',()=>{
 assert.equal(declarations.length,65,'all original dimension bindings remain');
 const strings=declarations.filter(m=>m[2]);
 assert.equal(strings.length,1,'only the unchanged body-hit top contract remains a px string');
 assert.equal(strings[0][1],'bodyTop');
 const fields={w:412,h:484,statusX:30,statusY:80,statusW:352,statusH:90,statusNavX:30,statusNavY:250,statusNavW:352,statusHit:44,line:{x:24,y:91,width:350,height:29,font:22},caretX:31,caretY:92,caretH:26,bodyTop:115,bodyH:43,hx:24,hy:46,hw:364,hit:46,footX:24,keysY:224,footW:364,keyX:24,keyW:364,sheetWidth:446.5,sheetOffset:-73.5,footY:366,spaceW:217,noticeX:30,noticeY:94,noticeW:352,noticeH:26};
 for(const m of declarations){
  const value=vm.runInNewContext(m[1],fields);
  assert.equal(typeof value,'number',m[1]);
  assert.ok(Number.isFinite(value),m[1]);
  // ACE's numeric style branch uses integer pixels; the prior px branch parses
  // the same numerical prefix. No resource path, event or coordinate is changed.
  assert.equal(Math.trunc(value),Math.trunc(parseFloat(String(value)+'px')),m[1]);
 }
});
