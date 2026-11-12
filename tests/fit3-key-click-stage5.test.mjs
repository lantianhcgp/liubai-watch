import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(name,imports={}){
 const source=fs.readFileSync(new URL(name,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
 const ctx={imports,result:null,console,Date,setTimeout,clearTimeout};vm.runInNewContext(source,ctx,{filename:name});return ctx.result;
}
const u=load('common/utf8.js');
function fixture(type=1){const errors=[],changes=[];const k=load('common/keyboard.js',{'./utf8':u,'./session':{},'./lookupDictV5':{lookupDict(){return ()=>{};}}});const c=k.create({type,onError:e=>errors.push(e),onChange:s=>changes.push(s)});return {c,errors,changes};}
const g={keyX:24,keysY:210,keyW:364},scale=141/180;
const key=(r,c,o=0)=>({globalX:g.keyX+o+(c*57+r*29+28)*scale,globalY:g.keysY+(r*60+30)*scale});
test('W native stationary click has a real editor binding, without forged touch events',()=>{
 const hml=fs.readFileSync(new URL('pages/edit/edit.hml',ROOT),'utf8');
 const viewport=hml.match(/<stack class="key-viewport"[^>]*>/)[0];
 assert.match(viewport,/@click="clickKey"/);assert.match(viewport,/@touchcancel="cancelKey"/);
 const f=fixture(),events=[];const page=load('pages/edit/edit.js',{'../../common/shell':{trace:(p,s)=>events.push(s)}});
 Object.assign(page,{kb:f.c,g,alive:true,ready:true,open:true});page.clickKey(key(0,0));
 assert.equal(f.c.snapshot().text,'q');assert.ok(events.includes('W/key.click'));f.c.dispose();
});
test('W stationary clicks type repeatedly and respect row geometry and current horizontal offset',()=>{
 const {c}=fixture();assert.equal(typeof c.click,'function');c.click(key(0,0),g);c.click(key(0,0),g);c.click(key(1,0),g);assert.equal(c.snapshot().text,'qqa');
 const begin=key(0,3),end={globalX:begin.globalX-80,globalY:begin.globalY};c.touchStart(begin,g);c.touchMove(end,g);c.touchEnd(end,g);
 c.click(end,g);assert.equal(c.snapshot().text,'qqa','drag release click is not a letter');
 c.click(key(0,3,c.snapshot().sheetOffset),g);assert.equal(c.snapshot().text,'qqar');c.dispose();
});
test('W touch-capable host does not double insert on a following click',()=>{
 const {c}=fixture(),e=key(0,1);c.touchStart(e,g);c.touchEnd(e,g);assert.equal(c.snapshot().text,'w');
 c.click(e,g);assert.equal(c.snapshot().text,'w');c.click(e,g);assert.equal(c.snapshot().text,'ww');c.dispose();
});
test('W native longpress does not require a preceding drag and ignores release click',()=>{
 const {c}=fixture(),e=key(0,0);assert.equal(c.longPress(e,g),true);assert.equal(c.snapshot().text,'1');
 c.touchEnd(e,g);c.click(e,g);assert.equal(c.snapshot().text,'1');c.click(key(0,1),g);assert.equal(c.snapshot().text,'1w');c.dispose();
});
test('W canceled gesture, invalid release and disposed keyboard never create a character',()=>{
 const {c}=fixture(),e=key(0,0);assert.equal(typeof c.touchCancel,'function');
 c.touchStart(e,g);c.touchMove({globalX:e.globalX-60,globalY:e.globalY},g);c.touchCancel();c.touchEnd(e,g);c.click(e,g);assert.equal(c.snapshot().text,'');
 c.click(key(0,1),g);assert.equal(c.snapshot().text,'w');c.touchStart(e,g);c.touchEnd({},g);c.click(e,g);assert.equal(c.snapshot().text,'w');
 c.dispose();assert.equal(c.click(key(0,2),g),false);assert.equal(c.longPress(e,g),false);assert.equal(c.snapshot().text,'w');
});
test('W out-of-bounds click is rejected before any row lookup, and never throws',()=>{
 const {c}=fixture();assert.equal(typeof c.click,'function');
 for(const e of [{},{globalX:NaN,globalY:210},{globalX:25,globalY:351},{globalX:24,globalY:210},{globalX:388,globalY:230},{globalX:25,globalY:209}])assert.doesNotThrow(()=>c.click(e,g));
 assert.equal(c.snapshot().text,'q','only the exact top-left key belongs to the viewport');c.dispose();
});
