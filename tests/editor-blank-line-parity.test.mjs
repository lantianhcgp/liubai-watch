import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const p='entry/src/main/js/MainAbility/common/';const layoutURL='data:text/javascript;base64,'+Buffer.from(fs.readFileSync(p+'layout.js','utf8')).toString('base64');const layout=(await import(layoutURL)).default;const s=fs.readFileSync(p+'reader.js','utf8').replace("from './layout'","from "+JSON.stringify(layoutURL));const reader=(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).default;
test('round editor collapses unselected paragraph separator to approved V3 short gap',()=>{
 const g=layout.editor({windowWidth:454,windowHeight:454,screenShape:'circle'},true);const text='明天带上那本书\n\n放在书桌左边的书。还有给朋友写好的那张便签。';const pg=reader.page(text,0,g,{editor:true,cursor:0});
 const blank=pg.lines.find(l=>l.start===text.indexOf('\n')+1);assert.ok(blank);assert.equal(blank.height,Math.max(6,g.font*.25));assert.equal(pg.lines.filter(l=>l.text).length,3);assert.ok(pg.lines.at(-1).text.endsWith('的那张便签。'));
});
test('selected paragraph separator reserves a complete editable caret row',()=>{
 const g=layout.editor({windowWidth:454,windowHeight:454,screenShape:'circle'},false);const text='标题\n\n正文';const cursor=text.indexOf('\n')+1;const pg=reader.page(text,0,g,{editor:true,cursor});assert.equal(pg.lines.find(l=>l.start===cursor).height,g.lineHeight);assert.equal(pg.end,text.length);
});
