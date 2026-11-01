import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const l=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('entry/src/main/js/MainAbility/common/layout.js')).toString('base64'))).default;
const src=fs.readFileSync('entry/src/main/js/MainAbility/common/reader.js','utf8').replace(/from ['"]\.\/layout['"]/,'from '+JSON.stringify('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('entry/src/main/js/MainAbility/common/layout.js')).toString('base64')));
const r=(await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))).default;
test('reading title uses approved 1.12 sizing, 1.3 row, 0.34-font paragraph gap',()=>{
 const g=l.reader({windowWidth:412,windowHeight:484,screenShape:'rect'}),p=r.page('Title\n\nBody text',0,g),h=p.lines[0];assert.equal(h.font,g.font*1.12);assert.equal(h.height,h.font*1.3);assert.ok(Math.abs(p.lines[1].y-(h.y+h.height+g.font*.34))<.001);
});
