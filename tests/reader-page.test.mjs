import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';
import actualGeometry from '../entry/src/main/js/MainAbility/common/geometry.js';
const p=new URL('../entry/src/main/js/MainAbility/pages/read/read.js',import.meta.url);
function load(info,range){assert.ok(fs.existsSync(p),'reader page missing');const states={font:'normal',positions:[],params:{id:'n1',source:'index',anchor:22},store:{read(id,cb){cb(null,{id,text:'原文全文',date:'2026-11-01',time:'17:15',version:3});}}};const sent=[];const events=[];const g=info?actualGeometry.reader(info,'normal'):{w:412,h:484,round:false,hx:40,hy:21,hw:332,hit:46,footerY:444,font:24,top:75,bottom:438,lineHeight:34,pad:19};const globals={console,context:{state:()=>states,params:()=>states.params},geometry:{reader:()=>g,band:actualGeometry.band},text:{paginate:(_text,_g,at)=>Object.assign({lines:[{text:'原文全文'}],start:at,end:at+10,anchor:at,prev:at?0:-1,next:at<40?at+10:-1,page:Math.floor(at/10),count:5},range||{})},life:{start(o,cb){if(o.active)return;o.active=true;o.generation=1;o.info={};cb(1)},alive:()=>true,apply(o,g){Object.assign(o,g)},focus(){},stop(o){o.active=false}},nav:(uri,args)=>sent.push({uri,args}),Storage:{get(o){o.success(o.default)},set(o){events.push(o);o.success?.()}}};let src=fs.readFileSync(p,'utf8').replace(/^import[^\n]*\n/gm,'').replace('export default','globalThis.page =');const ctx=vm.createContext(globals);vm.runInContext(src,ctx);const page=ctx.page;Object.assign(page,page.data);return {page,states,sent,events};}
test('reader loads exact record and has no initial full-text loss',()=>{const {page}=load();page.onInit();assert.equal(page.record.text,'原文全文');assert.equal(page.id,'n1');assert.equal(page.anchor,22);assert.equal(page.ready,true);});
test('reader approved counter pads current page and page count',()=>{const {page}=load();page.onInit();assert.equal(page.counter,'03 / 05');page.turn(1);assert.equal(page.counter,'04 / 05');page.turn(1);assert.equal(page.counter,'已读完 · 05 / 05');});
test('reader genuine next and previous change bounded text anchors',()=>{const {page,events}=load();page.onInit();page.turn(1);assert.equal(page.anchor,32);page.turn(-1);assert.equal(page.anchor,0);page.turn(-1);assert.equal(page.anchor,0);assert.ok(events.length>=2);});
test('reader more/back preserves current record and source',()=>{const {page,sent}=load();page.onInit();page.more();assert.equal(sent[0].uri,'pages/menu/menu');assert.equal(sent[0].args.id,'n1');assert.equal(sent[0].args.mode,'read-options');page.back();assert.equal(sent[1].uri,'pages/index/index');});
for(const [w,h,screenShape] of [[412,484,'rect'],[454,454,'circle'],[390,390,'circle'],[336,480,'rect']]){
  test(`reader counter has its own safe band at ${w}x${h} ${screenShape}`,()=>{
    const {page}=load({windowWidth:w,windowHeight:h,screenShape});page.onInit();
    const expected=actualGeometry.band(w,h,screenShape==='circle',page.footerY,page.footerY+16,8);
    assert.equal(page.counterX,expected.x,'counter still uses the short progress-track position');
    assert.equal(page.counterW,expected.width,'counter still uses the short progress-track width');
    assert.ok(page.counterW>page.trackW);
    assert.ok(page.counterX>=8 && page.counterX+page.counterW<=w-8);
    assert.equal(page.trackW,w*.27,'progress bar design must not change');
    assert.equal(page.trackX,(w-page.trackW)/2);
    assert.equal(page.progressW,page.trackW*3/5);
    page.turn(1);assert.equal(page.counterW,expected.width,'page turns retain the safe band');
  });
}
test('reader counter HML does not share progress-track geometry',()=>{
  const hml=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/pages/read/read.hml',import.meta.url),'utf8');
  const counter=hml.match(/<text class="counter"[^>]*>/)[0];
  assert.ok(counter.includes('left:{{counterX}}') && counter.includes('width:{{counterW}}'));
  assert.ok(!counter.includes('trackX') && !counter.includes('trackW'));
  assert.ok(hml.includes('<div class="track" style="left:{{trackX}};top:{{footerY+20}};width:{{trackW}};">'));
});
for(const count of [2,100,999]){
  test(`reader completed-page counter retains all digits for ${count} pages`,()=>{
    const {page}=load({windowWidth:336,windowHeight:480,screenShape:'rect'},{page:count-1,count,next:-1});
    page.onInit();const n=(count<10?'0':'')+count;
    assert.equal(page.counter,`已读完 · ${n} / ${n}`);
    assert.ok(page.counterW>250,'full narrow-window counter needs independent text width');
  });
}
