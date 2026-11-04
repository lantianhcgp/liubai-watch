import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';
const p=new URL('../entry/src/main/js/MainAbility/pages/edit/edit.js',import.meta.url);
function load(snapshot=null,realLifecycle=false){assert.ok(fs.existsSync(p),'editor page missing');const state={editor:snapshot,params:{id:null,open:true},clipboard:[],store:{save(_id,s,cb){cb(null,{id:'n1',text:s,version:1})},clearDraft(cb){cb(null,true)},saveDraft(s,cb){cb(null,true)},read(id,cb){cb(null,{id,text:'原有正文',version:2,date:'2026-11-01',time:'12:00'})}}};const sent=[];const g={w:412,h:484,round:false,hx:40,hy:21,hw:332,hit:46,top:73,bottom:200,footY:366,footX:24,footW:364,keysY:220,keyX:24,keyW:364,font:22,lineHeight:29,pad:19};const globals={console,context:{state:()=>state,params:()=>state.params},geometry:{editor:()=>g,band:(_w,_h,_r,_y0,_y1,pad)=>({x:pad,width:412-2*pad})},text:{bytes:s=>Buffer.byteLength(s),boundary:(_s,n)=>n,move:(s,n,d)=>Math.min(s.length,Math.max(0,n+d)),width:(s,f)=>s.length*f,insert:(s,p,a,m)=>Buffer.byteLength(s+a)<=m?{ok:true,text:s.slice(0,p)+a+s.slice(p),cursor:p+a.length}:{ok:false,error:'LIMIT',text:s,cursor:p},paginate:(s,_g,a,_e,c)=>({lines:[{text:s,x:19,y:73,width:374,height:29,font:22,start:0,end:s.length}],start:0,end:s.length,prev:-1,next:-1,page:0,count:1,anchor:a})},life:{start(o,cb){if(o.active)return;o.active=true;o.generation=1;o.info={};cb(1)},alive:()=>true,apply(o,g){Object.assign(o,g)},focus(){},stop(o){o.active=false}},nav:(uri,args)=>sent.push({uri,args}),File:{},createKeyboard:()=>({lookup(s,cb){cb(null,{pinyin:s,matched:s,candidates:[{text:'你',len:s.length}]})},charAt(){return 'a'},keyAt(){return {row:0,col:0,char:'a',shift:'1'}},dispose(){}}),setTimeout,clearTimeout};let src=fs.readFileSync(p,'utf8').replace(/^import[^\n]*\n/gm,'').replace('export default','globalThis.page =');const ctx=vm.createContext(globals);if(realLifecycle){const lifePath=new URL('../entry/src/main/js/MainAbility/common/life.js',import.meta.url);ctx.Device={getInfo(o){o.success({windowWidth:412,windowHeight:484,screenShape:'rect'})}};ctx.geometry.valid=()=>true;vm.runInContext(fs.readFileSync(lifePath,'utf8').replace(/^import[^\n]*\n/gm,'').replace('export default','globalThis.life ='),ctx);}vm.runInContext(src,ctx);const page=ctx.page;Object.assign(page,page.data);return {page,state,sent};}
test('new editor immediately exposes original keyboard and full text field',()=>{const {page}=load();page.onInit();assert.equal(page.open,true);assert.equal(page.text,'');assert.equal(page.ready,true);page.onDestroy();});
test('editing existing record restores same id and begins text-first',()=>{const {page,state}=load();state.params={id:'old',open:false,anchor:2};page.onInit();assert.equal(page.id,'old');assert.equal(page.text,'原有正文');assert.equal(page.cursor,2);assert.equal(page.open,false);page.onDestroy();});
test('fold-expand does not lose confirmed text cursor or composing pinyin',()=>{const {page}=load();page.onInit();page.insert('a');page.pinyin='ni';const c=page.cursor;page.toggle();assert.equal(page.open,false);page.toggle();assert.equal(page.text,'a');assert.equal(page.pinyin,'ni');assert.equal(page.cursor,c);page.onDestroy();});
test('candidate atomically inserts and consumes matched prefix, save navigates real stored id',()=>{const {page,sent}=load();page.onInit();page.pinyin='ni';page.candidates=[{text:'你',len:2,width:44}];page.choose(0);assert.equal(page.text,'你');assert.equal(page.pinyin,'');page.save();assert.equal(sent[0].uri,'pages/read/read');assert.equal(sent[0].args.id,'n1');page.onDestroy();});
test('candidate selection publishes one complete input state without intermediate active list',()=>{const {page}=load();page.onInit();page.pinyin='ni';page.candidates=[{text:'你',len:2,width:44}];let renders=0;const old=page.reflow;page.reflow=function(f){renders++;assert.equal(this.pinyin,'');assert.equal(this.text,'你');old.call(this,f)};page.choose(0);assert.equal(renders,1);page.onDestroy();});
test('overbudget candidate does not consume pinyin or mutate input',()=>{const {page}=load();page.onInit();page.text='a'.repeat(3071);page.cursor=3071;page.pinyin='ni';page.candidates=[{text:'你',len:2,width:44}];page.choose(0);assert.equal(page.text.length,3071);assert.equal(page.pinyin,'ni');assert.equal(page.cursor,3071);page.onDestroy();});
test('save keeps the admission lock until its draft cleanup callback is acknowledged',()=>{const {page,state,sent}=load();let saves=0,finishSave,finishClear;state.store.save=(_id,s,cb)=>{saves++;finishSave=cb};state.store.clearDraft=cb=>{finishClear=cb};page.onInit();page.insert('retained body');page.save();assert.equal(page.saving,true);finishSave(null,{id:'n1',text:page.text,version:1});page.save();assert.equal(saves,1);assert.equal(page.saving,true);assert.equal(sent.length,0);finishClear(null,true);assert.equal(page.saving,false);assert.equal(sent.length,1);assert.equal(sent[0].uri,'pages/read/read');page.onDestroy();});
test('duplicate save and clear callbacks produce one cleanup and one navigation',()=>{const {page,state,sent}=load();let finishSave,finishClear,clears=0;state.store.save=(_id,s,cb)=>{finishSave=cb};state.store.clearDraft=cb=>{clears++;finishClear=cb};page.onInit();page.insert('keep exactly once');page.save();const record={id:'n1',text:page.text,version:1};finishSave(null,record);finishSave(null,record);assert.equal(clears,1);finishClear(null,true);finishClear(null,true);assert.equal(sent.length,1);page.onDestroy();});
test('repeated longpress in one touch gesture emits only one shifted key',()=>{const {page}=load();page.onInit();const event={globalX:60,globalY:245};page.startKey(event);page.longKey(event);page.longKey(event);assert.equal(page.text,'1');page.endKey(event);assert.equal(page.text,'1');page.startKey(event);page.longKey(event);assert.equal(page.text,'11');page.onDestroy();});
test('real lifecycle clear completion while hidden releases lock and returns saved identity on show',()=>{const {page,state,sent}=load(null,true);let clear;state.store.clearDraft=cb=>{clear=cb};page.onInit();page.insert('real lifecycle keep');page.save();const storedText=page.text;page.onHide();clear(null,true);assert.equal(sent.length,0,'hidden pages never navigate');page.onShow();assert.equal(page.saving,false);assert.equal(page.id,'n1');assert.equal(page.text,storedText);assert.equal(sent.length,1);assert.equal(sent[0].args.id,'n1');page.onDestroy();});
test('real lifecycle hide/show while save is pending does not lose input or admit a duplicate save',()=>{const {page,state,sent}=load(null,true);let finish,saves=0;state.store.save=(_id,s,cb)=>{saves++;finish=cb};page.onInit();page.insert('pending unchanged');page.save();page.onHide();page.onShow();assert.equal(page.text,'pending unchanged');assert.equal(page.saving,true);page.save();assert.equal(saves,1);finish(null,{id:'n1',text:'pending unchanged',version:1});assert.equal(page.saving,false);assert.equal(page.id,'n1');assert.equal(sent.length,1);page.onDestroy();});
test('real lifecycle pending draft drains the queued save exactly once even after hide/show',()=>{const {page,state,sent}=load(null,true);let doneDraft,saveCount=0;state.store.saveDraft=(_s,cb)=>{doneDraft=cb};state.store.save=(_id,s,cb)=>{saveCount++;cb(null,{id:'n1',text:s,version:1})};page.onInit();page.insert('draft waiting');page.writeDraft();page.save();page.onHide();page.onShow();assert.equal(page.text,'draft waiting');assert.equal(page.saving,true);doneDraft(null,true);assert.equal(saveCount,1);assert.equal(page.saving,false);assert.equal(sent.length,1);page.onDestroy();});
test('real lifecycle failure while hidden resumes retained editable text, not a blank new record',()=>{const {page,state,sent}=load(null,true);let finish;state.store.save=(_id,s,cb)=>{finish=cb};page.onInit();page.insert('failure retained');page.save();page.onHide();finish('IO_300');assert.equal(sent.length,0);page.onShow();assert.equal(page.saving,false);assert.equal(page.text,'failure retained');assert.equal(page.id,null);assert.equal(page.insert('!'),true);page.onDestroy();});
test('cancel keeps editor snapshot and routes to explicit exit confirmation',()=>{const {page,state,sent}=load();page.onInit();page.insert('keep');page.cancel();assert.equal(state.editor.text,'keep');assert.equal(sent[0].args.mode,'exit');page.onDestroy();});

test('candidate receiver iterates permanent slots with guarded top-level bindings',()=>{
  const hml=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/pages/edit/edit.hml',import.meta.url),'utf8');
  const item=hml.match(/<list-item class="candidate"[^>]*>/)[0];
  assert.match(item,/for="\{\{\(i,slot\) in candidateSlots\}\}"/,'candidate receiver must iterate permanent slots, not candidates');
  assert.match(item,/@click="choose\(slot\)"/);
  assert.match(item,/show="\{\{slot\s+(?:&lt;|&#60;|&#x3[cC];)\s+candidates\.length\}\}"/);
  assert.doesNotMatch(item,/\sif=/);
  assert.ok(item.includes('width:{{candidates[slot]?candidates[slot].width:0}};'));
  assert.ok(hml.includes('<text class="candidate-text" style="width:{{candidates[slot]?candidates[slot].width:0}};color:{{slot===0?\'#70b5ff\':\'#f1f0e8\'}};">{{candidates[slot]?candidates[slot].text:\'\'}}</text>'));
  assert.doesNotMatch(hml,/for="\{\{[^"\n]*\bin candidates\}\}"/);
  assert.doesNotMatch(fs.readFileSync(p,'utf8'),/\bcandidateSlots\s*=(?!=)/,'slot source must never be reassigned');
});

test('candidate and ordinary keybars stay mounted and switch only with show',()=>{
  const hml=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/pages/edit/edit.hml',import.meta.url),'utf8');
  for(const [name,condition] of [['candidate-keybar','open && hasPinyin'],['keybar','open && !hasPinyin']]){
    const tag=hml.match(new RegExp('<div class="'+name+'"[^>]*>'))[0];
    assert.ok(tag.includes('show="{{'+condition+'}}"'),name+' must remain mounted via show');
    assert.doesNotMatch(tag,/\sif=/,name+' must not destroy its receiver');
  }
});

test('twenty fixed slots survive full selection, residual pinyin and overbudget rejection',()=>{
  const {page}=load(null,true);
  try{
    page.onInit();
    const slots=page.candidateSlots;
    assert.deepEqual(Array.from(slots||[]),Array.from({length:20},(_,i)=>i),'twenty permanent candidate slots are required');
    page.pinyin='ni';page.hasPinyin=true;
    page.candidates=Array.from({length:20},()=>({text:'你',len:2,width:44}));
    page.choose(slots[19]);
    assert.equal(page.text,'你');assert.equal(page.cursor,1);assert.equal(page.pinyin,'');assert.equal(page.hasPinyin,false);
    assert.equal(page.candidates.length,0);assert.equal(page.candidateSlots,slots);
    page.choose(slots[19]);assert.equal(page.text,'你','hidden empty slots do nothing');

    let finishLookup,lookedUp;
    page.kbd.lookup=(s,cb)=>{lookedUp=s;finishLookup=cb};
    page.pinyin='nihao';page.hasPinyin=true;page.candidates=[{text:'你',len:2,width:44}];
    page.choose(slots[0]);
    assert.equal(page.text,'你你');assert.equal(page.cursor,2);assert.equal(page.pinyin,'hao');assert.equal(page.hasPinyin,true);
    assert.equal(page.candidates.length,0);assert.equal(lookedUp,'hao');assert.equal(page.candidateSlots,slots);
    finishLookup(null,{pinyin:'hao',candidates:[{text:'好',len:3}]});
    assert.equal(page.candidates.length,1);assert.equal(page.candidates[0].text,'好');assert.ok(page.candidates[0].width>=44);
    page.choose(slots[19]);assert.equal(page.text,'你你');assert.equal(page.pinyin,'hao');assert.equal(page.candidateSlots,slots);

    const body='a'.repeat(3071),candidates=[{text:'你',len:2,width:44}];
    page.text=body;page.cursor=body.length;page.pinyin='ni';page.hasPinyin=true;page.candidates=candidates;
    page.choose(slots[0]);
    assert.equal(page.text,body);assert.equal(page.cursor,body.length);assert.equal(page.pinyin,'ni');assert.equal(page.hasPinyin,true);
    assert.equal(page.candidates,candidates);assert.equal(page.message,'输入已达上限，原文保留');assert.equal(page.candidateSlots,slots);
    page.onHide();page.onShow();assert.equal(page.candidateSlots,slots,'lifecycle never replaces the slot source');
  }finally{page.onDestroy();}
});

test('draft cleanup throwing after a committed save unlocks and opens that exact saved record once',()=>{
  const {page,state,sent}=load(null,true);let saves=0,clears=0;const logs=[],previousError=console.error;
  state.store.save=(id,text,cb)=>{saves++;cb(null,{id:'n1',text,version:1});};
  state.store.clearDraft=()=>{clears++;throw new Error('cleanup API unavailable');};
  try{console.error=(...args)=>logs.push(args.join(' '));page.onInit();page.insert('committed body must remain one record');page.save();
    assert.equal(saves,1);assert.equal(clears,1);assert.equal(page.saving,false);assert.equal(page.original,'committed body must remain one record');
    assert.equal(sent.length,1);assert.equal(sent[0].uri,'pages/read/read');assert.equal(sent[0].args.id,'n1');assert.equal(state.editor,null);
    assert.ok(logs.some(x=>x.includes('LB2 DRAFT clear fail STORE_EXCEPTION')));
  }finally{console.error=previousError;page.onDestroy();}
});
test('duplicate init callbacks and rapid save taps cannot create a second stored body',()=>{
  const {page,state,sent}=load(null,true);let ready=false,inits=0,saves=0,ack;
  state.store.init=cb=>{inits++;ack=cb;};state.store.save=(id,text,cb)=>{saves++;cb(ready?null:'STORE_NOT_READY',ready?{id:'n1',text,version:1}:null);};
  page.onInit();page.insert('single saved identity');page.save();page.save();assert.equal(inits,1);assert.equal(saves,1);assert.equal(page.saving,true);
  ready=true;ack(null,true);ack(null,true);assert.equal(saves,2);assert.equal(sent.length,1);assert.equal(page.saving,false);
});
test('an unready store is initialized once and the same input is saved without a second tap',()=>{
  const {page,state,sent}=load(null,true);let initialized=false,inits=0,saves=0;
  state.store.init=cb=>{inits++;initialized=true;cb(null,true)};
  state.store.save=(_id,s,cb)=>{saves++;if(!initialized)cb('STORE_NOT_READY');else cb(null,{id:'n1',text:s,version:1})};
  try{page.onInit();page.insert('recover retained input');page.save();assert.equal(inits,1);assert.equal(saves,2);assert.equal(page.text,'recover retained input');assert.equal(page.saving,false);assert.equal(sent.length,1);assert.equal(sent[0].uri,'pages/read/read');}finally{page.onDestroy();}
});
test('failed store initialization remains bounded, retains input, and publishes the actual error code',()=>{
  const {page,state,sent}=load(null,true);let inits=0,saves=0;
  state.store.init=cb=>{inits++;cb('ROOT_DATA_IO_300')};
  state.store.save=(_id,_s,cb)=>{saves++;cb('STORE_NOT_READY')};
  try{page.onInit();page.insert('never discard this');page.save();assert.equal(inits,1);assert.equal(saves,1);assert.equal(state.editor.text,'never discard this');assert.equal(page.saving,false);assert.equal(sent[0].args.error,'ROOT_DATA_IO_300');assert.equal(sent[0].args.kind,'save');}finally{page.onDestroy();}
});
test('save callback failures publish their exact code without exposing user text in routing',()=>{
  const {page,state,sent}=load(null,true);state.store.save=(_id,_s,cb)=>cb('IO_302');
  try{page.onInit();page.insert('private retained body');page.save();assert.equal(sent[0].args.error,'IO_302');assert.equal(sent[0].args.kind,'save');assert.equal(JSON.stringify(sent[0].args).includes('private retained body'),false);assert.equal(state.editor.text,'private retained body');}finally{page.onDestroy();}
});
test('empty save retains input and rejection message, sends nothing and logs its negative semantic marker',()=>{
  const {page,state,sent}=load(null,true),logs=[],originalInfo=console.info;
  let saves=0,clears=0;
  state.store.save=()=>{saves++};state.store.clearDraft=()=>{clears++};
  try{
    console.info=(...args)=>logs.push(args.join(' '));
    page.onInit();
    for(const body of ['',' \n\t\u3000']){
      page.text=body;page.cursor=body.length;page.message='prior';page.reflow(true);
      page.save();
      assert.equal(page.text,body);assert.equal(page.cursor,body.length);assert.equal(page.pinyin,'');assert.equal(page.id,null);
      assert.equal(page.message,'空记录不保存');assert.equal(page.saving,false);assert.equal(page.doneLabel,'完成');
      assert.equal(page.ready,true);assert.equal(page.open,true);assert.equal(sent.length,0);assert.equal(saves,0);assert.equal(clears,0);
      assert.ok(logs.includes('LB2 SAVE empty chars=0 pinyin='),'empty save needs an observable negative semantic marker');
    }
  }finally{console.info=originalInfo;page.onDestroy();}
});
