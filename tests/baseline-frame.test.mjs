import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
let alignment={};try{alignment=await import('../qa/baseline_frame.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
function host(w,h,stale=false){
 const frame={style:{transform:'scale(0.96)'}},holder={style:{}},header={textContent:'11 / 01'};
 const watch={scrollIntoView(){},getBoundingClientRect(){const scale=stale||frame.style.transform!=='none'?.96:1;return{x:20,y:30,width:w*scale,height:h*scale}}};
 const context=vm.createContext({ui:{page:'home'},document:{getElementById(id){return({'watch-frame':frame,'watch-holder':holder,watch})[id]},querySelector(){return header}}});
 return{frame,holder,header,eval:async source=>vm.runInContext(source,context)};
}
for(const [w,h] of [[412,484],[454,454],[390,390],[336,480]])test('reference capture uses unscaled active window '+w+'x'+h,async()=>{
 assert.equal(typeof alignment.alignBaseline,'function','reference pixel coordinate gate missing');
 const c=host(w,h);const result=await alignment.alignBaseline(c,w,h,'11 / 03');
 assert.equal(c.frame.style.transform,'none');assert.equal(result.width,w);assert.equal(result.height,h);assert.equal(result.scale,1);assert.equal(c.header.textContent,'11 / 03');
});
test('reference mismatch is rejected instead of silently resizing evidence',async()=>{
 assert.equal(typeof alignment.alignBaseline,'function','reference pixel coordinate gate missing');
 await assert.rejects(alignment.alignBaseline(host(412,484,true),412,484,'11 / 03'),/window|dimension/i);
});
