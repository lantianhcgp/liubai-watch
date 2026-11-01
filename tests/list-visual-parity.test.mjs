import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root='entry/src/main/js/MainAbility/';
const source=(p)=>fs.readFileSync(root+p,'utf8');
const layout={};vm.runInNewContext(source('common/layout.js').replace('export default','layout.value='),{layout});
function geometry(kind,info={windowWidth:412,windowHeight:484,screenShape:'rect'}){
 const api={};vm.runInNewContext(source('common/list-page.js').replace(/^import .*$/gm,'').replace('export default','api.value='),{api,layout:layout.value});
 const p={};api.value.geometry(p,info,kind);return p;
}
test('home uses actual V3 brand and CTA weight assets, small warm header dots',()=>{
 const h=source('pages/index/index.hml');
 for(const f of ['type/app_name.png','type/write_note.png','icons/plus_cta_ink.png','icons/dots_header_warm.png'])assert.ok(h.includes('/common/'+f),f+' missing');
 assert.doesNotMatch(source('pages/index/index.css'),/font-weight\s*:|letter-spacing\s*:/);
});
test('pinned records retain warm text and get a separate pin icon',()=>{
 for(const name of ['index','day']){const h=source('pages/'+name+'/'+name+'.hml');assert.match(h,/pin_row_gold\.png/);assert.doesNotMatch(h,/color:\s*\{\{\$item\.pinColor\}\}/);}
});
test('three shared navigation bars have exact 20px book/calendar assets and a real divider',()=>{
 for(const name of ['index','history','day']){const h=source('pages/'+name+'/'+name+'.hml');assert.match(h,/book_nav_/);assert.match(h,/calendar_nav_/);assert.match(h,/class="dock-divider"/);assert.match(h,/dockHalfW/);}
});
test('history arrows use vertical back/right source SVG instead of a text chevron',()=>{
 const h=source('pages/history/history.hml');assert.match(h,/right_warm\.png/);assert.match(h,/class="day-num"[^>]*height:/);assert.doesNotMatch(h,/&#x203A;/i);
});
test('all safe native list geometry exposes exact V3 typography and inner border sizes',()=>{
 for(const kind of ['index','history','day','trash'])for(const info of [
 {windowWidth:412,windowHeight:484,screenShape:'rect'},
 {windowWidth:390,windowHeight:390,screenShape:'circle'},
 {windowWidth:454,windowHeight:454,screenShape:'circle'},
 {windowWidth:336,windowHeight:480,screenShape:'rect'}]){
 const p=geometry(kind,info),u=info.windowWidth/412;
 assert.ok(Math.abs(p.dockHalfW*2+1-(p.dockW-2))<.001);
 assert.equal(p.dockInnerH,p.hit-2);
 assert.equal(p.rowIcon,23*u);assert.equal(p.pinSize,17*u);assert.equal(p.headFont,(info.screenShape==='circle'&&info.windowWidth<420?20:24)*u);
 if(kind==='index')assert.equal(p.sectionFont,16*u);
 assert.ok(p.emptyY>=p.hy+p.hit+28);assert.ok(p.emptyW>0);assert.ok(p.emptyH>0);
 }
});
test('history/trash keep approved empty title, explanation and gold icon, home remains a quiet single line',()=>{
 for(const name of ['history','trash']){const h=source('pages/'+name+'/'+name+'.hml');assert.match(h,/class="quiet-empty"/);assert.match(h,/emptyPrompt/);assert.match(h,/emptyIcon/);}
 const h=source('pages/index/index.hml');assert.match(h,/class="quiet-status"/);assert.doesNotMatch(h,/class="quiet-empty"/);
});
