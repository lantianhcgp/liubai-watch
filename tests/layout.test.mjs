import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src = new URL('../entry/src/main/js/MainAbility/common/layout.js', import.meta.url);
let layout;
try { layout = (await import('data:text/javascript;base64,' + Buffer.from(await readFile(src, 'utf8')).toString('base64'))).default; } catch (_) {}
const windows = [
  {windowWidth:412,windowHeight:484,screenShape:'rect'},
  {windowWidth:454,windowHeight:454,screenShape:'circle'},
  {windowWidth:390,windowHeight:390,screenShape:'circle'},
  {windowWidth:336,windowHeight:480,screenShape:'rect'}
];
function safe(g,x,y,w,h) {
  assert.ok(w>0 && h>0 && x>=0 && y>=0 && x+w<=g.w+.001 && y+h<=g.h+.001);
  if(g.round) for(const px of [x,x+w]) for(const py of [y,y+h])
    assert.ok((px-g.w/2)**2+(py-g.h/2)**2<=(Math.min(g.w,g.h)/2)**2+.01, 'circle corner unsafe');
  else {
    const r=Math.min(g.w,g.h)*.25;
    for(const px of [x,x+w]) for(const py of [y,y+h]) {
      const dx=Math.max(0,r-px,px-(g.w-r)),dy=Math.max(0,r-py,py-(g.h-r));
      assert.ok(dx*dx+dy*dy<=r*r+.01, 'rounded rect unsafe');
    }
  }
}
test('public geometry module exists (RED seam)',()=>assert.ok(layout,'layout public API not implemented'));
test('invalid getInfo never invents a default window',()=>{
  for(const info of [undefined,{}, {windowWidth:412,windowHeight:484}, ...[0,NaN,Infinity,-1,'412'].map(x=>({...windows[0],windowWidth:x})), {...windows[0],windowHeight:0}, {...windows[0],screenShape:'unknown'}])
    for(const fn of ['valid','home','reader','editor']) assert.throws(()=>layout[fn](info),'invalid '+fn);
});
test('all four home layouts use whole safe slots and fixed hit targets',()=>{
  for(const info of windows) {
    assert.equal(layout.valid(info),true);
    const g=layout.home(info);
    assert.ok(g.hit>=46 && g.rowH>=50 && g.slots>=2);
    assert.ok(Math.abs(g.slots*g.rowH-g.listH)<.001);
    safe(g,g.hx,g.hy,g.hw,g.hit);safe(g,g.contentX,g.newY,g.contentW,g.newH);
    safe(g,g.contentX,g.sectionY,g.contentW,44);safe(g,g.contentX,g.listY,g.contentW,g.listH);
    safe(g,g.dockX,g.dockY,g.dockW,g.hit);
    assert.ok(g.listY+g.listH<=g.dockY-7+.001);
    if(info.windowWidth===412) assert.equal(g.slots,3);
    if(info.windowWidth===390) assert.equal(g.slots,2);
  }
});
test('V3 editor preserves body height, 141px keys and 44px merged slot',()=>{
  for(const info of windows) for(const open of [false,true]) {
    const g=layout.editor(info,open);
    assert.equal(g.open,open);assert.equal(g.hit,46);
    assert.ok(g.bottom-g.top>=2*g.lineHeight);
    assert.ok(Math.abs(g.footerBottom-g.footY-44)<.001);
    assert.ok(Math.abs(g.footY-g.keysY-145)<.001);
    const space=g.footW-3*44-3*5;assert.ok(space>=44,'original space key must not shrink');
    safe(g,g.hx,g.hy,g.hw,46);safe(g,g.footX,g.footY,g.footW,44);
    if(open) safe(g,g.keyX,g.keysY,g.keyW,141);
    if(info.windowWidth===412) {assert.ok(g.footerBottom<=410);assert.ok(g.bottom-g.top>=(open?131:271));}
    if(info.windowWidth===390) assert.ok(g.bottom-g.top>=(open?65:203));
  }
});
test('reader fonts and entire line rectangles stay in contour',()=>{
  for(const info of windows) for(const key of ['compact','normal','large']) {
    const g=layout.reader(info,key);safe(g,g.hx,g.hy,g.hw,g.hit);
    assert.ok(g.font>=({compact:20,normal:22,large:26})[key]);
    for(let y=g.top;y+g.lineHeight<=g.bottom;y+=g.lineHeight){const b=layout.shapeBand(g.w,g.h,g.round,y,y+g.lineHeight,g.pad);safe(g,b.x,y,b.width,g.lineHeight);}
  }
});
test('impossible geometry and reversed/outside bands throw instead of shrinking keys',()=>{
  assert.throws(()=>layout.editor({windowWidth:180,windowHeight:200,screenShape:'circle'},true));
  for(const args of [[0,484,false,1,3,10],[412,484,false,30,20,10],[412,484,false,-1,20,10],[412,484,false,20,500,10]]) assert.throws(()=>layout.shapeBand(...args));
  assert.throws(()=>layout.reader(windows[0],'huge'));
});
