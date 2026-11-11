import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=process.env.S_READ_SOURCE_ROOT?new URL('file://'+process.env.S_READ_SOURCE_ROOT+'/'):new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(n,imports,g={}){const src=fs.readFileSync(new URL(n,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,a,b)=>'var '+a+'=imports['+JSON.stringify(b)+'];').replace('export default','result=');const ctx={imports,result:null,console,Date,Math,JSON,...g};vm.runInNewContext(src,ctx,{filename:n});return ctx.result;}
function fixture(options={}){
 const timers=new Map(),devices=[],waiting=[],loads=[],drafts=[],puts=[],saves=[],nav=[],traces=[];let next=0,cached=options.session||null,created=0,disposed=0;
 const clock={setTimeout(f,ms){let id=++next;timers.set(id,{f,ms});return id;},clearTimeout(id){timers.delete(id);}};
 const layout=load('common/layout.js',{}),reader=load('common/reader.js',{'./layout':layout}),utf8=load('common/utf8.js',{});
 const store={load(id,cb){loads.push({id,cb});},draftGet(cb){drafts.push(cb);},draftPut(d,cb){puts.push({d,cb});},save(d,cb){saves.push({d,cb});},draftClear(cb){drafts.push(cb);}};
 const session={bind(){},get(){return cached;},set(s){cached=s;},clear(){cached=null;},clipboardGet(){return'';},clipboardPut(){}};
 const app={whenLiubaiReady(cb){waiting.push(cb);return ()=>{const i=waiting.indexOf(cb);if(i>=0)waiting.splice(i,1);};},getStore(){return store;},getSession(){return session;},getLiubaiParams(){return options.params||{action:'new'};},setLiubaiParams(){},getLiubaiStoreState(){return 'loading';},traceLiubai(s){traces.push(s);},errorLiubai(s,e){traces.push(s);}};
 const sp={bind(){}};for(const k of Object.keys(store))sp[k]=store[k];
 const shell=load('common/shell.js',{'./store-page':sp,'./session':session,'@system.device':{getInfo(o){devices.push(o);}},'@system.router':{replace(o){nav.push(o);}},'./layout':layout},{...clock,$app:app});
 const keyboard={create(o){created++;if(options.keyboardThrow)throw options.keyboardThrow;let text=o.text,cursor=o.cursor;return {snapshot(){return {text,cursor,type:o.type,pinyin:o.pinyin,candidates:[],image:'/common/keyboard/common/0.png',sheetWidth:440,sheetOffset:0};},insert(s){text+=s;cursor=text.length;o.onChange(this.snapshot());},dispose(){disposed++;}};}};
 const p=load('pages/edit/edit.js',{'../../common/shell':shell,'../../common/layout':layout,'../../common/reader':reader,'../../common/store-page':sp,'../../common/keyboard':keyboard,'../../common/session':session,'../../common/utf8':utf8},clock);Object.assign(p,JSON.parse(JSON.stringify(p.data)));
 const info=options.info||{windowWidth:412,windowHeight:484,screenShape:'rect'};
 return {p,shell,devices,waiting,loads,drafts,puts,saves,nav,traces,timers,info,created:()=>created,disposed:()=>disposed,cached:()=>cached,device(){devices[devices.length-1].success(info);},ready(){waiting[waiting.length-1](null);},tick(ms){for(const [i,row] of [...timers])if(row.ms<=ms){timers.delete(i);row.f();}}};
}
test('S editor device success leaves noneditable measured waiting shell until Store and boot complete',()=>{
 const f=fixture();f.p.onInit();f.device();assert.equal(f.p.ready,false,'device success alone cannot publish editable');assert.ok(f.p.message);assert.equal(f.p.w,412);assert.equal(f.p.h,484);assert.ok(f.p.hw>0);assert.ok(f.p.keyW>0);assert.ok(f.p.footW>0);assert.equal(f.created(),0);
 f.ready();assert.equal(f.p.ready,true);assert.equal(f.p.message,'');assert.equal(f.created(),1);assert.ok(f.p.lines.length>0);f.p.onDestroy();assert.equal(f.timers.size,0);
});
test('S editor Store fail retains positive error region and safe return without draft writes',()=>{
 const f=fixture();f.p.onInit();f.device();f.waiting[0](new Error('store failed'));assert.equal(f.p.ready,false);assert.ok(f.p.message);assert.ok(f.p.hw>0);assert.equal(f.created(),0);f.p.onBackPress();assert.equal(f.nav.length,1);assert.equal(f.nav[0].uri,'pages/index/index');assert.equal(f.puts.length,0);assert.equal(f.drafts.length,0);
});
test('S editor duplicate ready creates a single keyboard and never restarts boot',()=>{
 const f=fixture();f.p.onInit();f.device();const cb=f.waiting[0];cb(null);cb(null);assert.equal(f.created(),1);assert.equal(f.disposed(),0);f.p.onDestroy();
});
test('S destroyed editor never creates keyboard or timer when old ready arrives',()=>{
 const f=fixture();f.p.onInit();f.device();const cb=f.waiting[0];f.p.onDestroy();const n=f.timers.size;cb(null);assert.equal(f.created(),0);assert.equal(f.timers.size,n);assert.equal(f.puts.length,0);
});
test('S editor retry during wait does not register another Store waiter or another device request',()=>{
 const f=fixture();f.p.onInit();f.device();f.p.retry();f.p.retry();assert.equal(f.devices.length,1);assert.equal(f.waiting.length,1);f.p.onDestroy();
});
test('S editor old record callback cannot boot into a new retry generation',()=>{
 const f=fixture({params:{id:'existing'}});f.p.onInit();f.device();f.ready();const old=f.loads[0].cb;f.p.onInit();f.device();old(null,{created:1,body:'old body',revision:1});assert.equal(f.created(),0);assert.equal(f.p.ready,false);f.ready();f.loads[1].cb(null,{created:2,body:'new generation',revision:2});assert.equal(f.p.text,'new generation');assert.equal(f.p.ready,true);f.p.onDestroy();
});
test('S keyboard or refresh boot throw has visible error and no editable or ghost draft state',()=>{
 const sent=new Error('keyboard S'),f=fixture({keyboardThrow:sent});f.p.onInit();f.device();assert.doesNotThrow(()=>f.ready());assert.equal(f.p.ready,false);assert.ok(f.p.message);assert.equal(f.puts.length,0);assert.ok(f.p.hw>0);f.p.onDestroy();
});
test('S invalid device dimensions never use fallback measured sizes and late invalid callback cannot erase good state',()=>{
 const f=fixture();f.p.onInit();const request=f.devices[0];request.success({windowWidth:0,windowHeight:484,screenShape:'rect'});assert.equal(f.p.ready,false);assert.equal(f.p.w,0);assert.equal(f.created(),0);f.p.retry();f.device();f.ready();assert.equal(f.p.ready,true);request.success({windowWidth:0,windowHeight:0,screenShape:'rect'});assert.equal(f.p.ready,true);f.p.onDestroy();
});
test('S destroyed save waiting for draftClear cannot navigate or change Session',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('saved text');f.p.save();assert.equal(f.saves.length,1);f.saves[0].cb(null,{id:'saved'});assert.equal(f.drafts.length,1);f.p.onDestroy();f.drafts[0](null);assert.equal(f.nav.length,0);assert.equal(f.timers.size,0);
});
test('S edit loading and error use explicit measured container and visible back or retry controls',()=>{
 const h=fs.readFileSync(new URL('pages/edit/edit.hml',ROOT),'utf8');assert.ok(h.includes('shellReady'),'device-only shell must be separate from editable surface');assert.ok(h.includes('statusW'));assert.ok(h.includes('statusH'));assert.ok(h.includes('@click="waitingBack"'));assert.ok(h.includes('@click="retry"'));
});
test('S failed boot disposes partial keyboard and queued callbacks before error shell',()=>{
 const f=fixture();f.p.onInit();f.device();f.p.refresh=()=>{throw new Error('refresh failed');};f.ready();assert.equal(f.p.ready,false);assert.equal(f.p.kb,null);assert.equal(f.disposed(),1);assert.ok(f.p.shellReady);assert.ok(f.p.message);assert.equal(f.timers.size,0);f.p.onDestroy();
});
test('S editor hide during prepare invalidates readiness then show safely reinitializes',()=>{
 const f=fixture();f.p.onInit();f.device();const cb=f.waiting[0];f.p.onHide();cb(null);assert.equal(f.created(),0);assert.equal(f.timers.size,0);f.p.onShow();assert.equal(f.devices.length,2);f.device();f.ready();assert.equal(f.created(),1);f.p.onDestroy();
});
test('S destroyed editor discard callback has no ghost navigation or session mutation',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.discard();assert.equal(f.drafts.length,1);f.p.onDestroy();f.drafts[0](null);assert.equal(f.nav.length,0);assert.equal(f.timers.size,0);
});
test('S superseded draft-leave callback cannot clear later edit generation session',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('old draft');f.p.leaveDraft();const cb=f.puts[0].cb;f.p.onInit();f.device();f.ready();f.p.kb.insert('new draft');const current=f.cached();cb(null);assert.equal(f.cached(),current);assert.equal(f.nav.length,0);f.p.onDestroy();
});
test('S review new editor hide show retains full session without replaying new action',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('preserved complete draft');f.p.onHide();f.p.onShow();f.device();f.ready();assert.equal(f.p.text,'preserved complete draft');assert.equal(f.p.ready,true);f.p.onDestroy();
});
test('S review loading swipe with previous pg cannot refresh or access cleared keyboard',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('previous text');f.p.onHide();f.p.onShow();f.device();assert.equal(f.p.ready,false);const count=f.timers.size;assert.doesNotThrow(()=>f.p.bodySwipe({direction:'down'}));assert.equal(f.timers.size,count);f.p.onDestroy();
});
test('S round3 retry after resumed device failure preserves unsaved new text',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('unsaved before failure');f.p.onHide();f.p.onShow();f.devices.at(-1).fail();f.p.retry();f.device();f.ready();assert.equal(f.p.text,'unsaved before failure');f.p.onDestroy();
});
test('S round3 draft restore preserves learned record ID and latest edits through hide/show',()=>{
 const f=fixture({params:{draft:true}});f.p.onInit();f.device();f.ready();f.drafts[0](null,{id:'draft-existing',body:'disk draft',cursor:2});f.p.kb.insert(' newest');f.p.onHide();f.p.onShow();f.device();f.ready();assert.equal(f.drafts.length,1);assert.equal(f.p.id,'draft-existing');assert.equal(f.p.text,'disk draft newest');f.p.onDestroy();
});
test('S round3 hidden new save reconciles ID and blocks second create until completion',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('full new document');f.p.save();f.p.onHide();f.p.onShow();f.device();f.ready();f.p.save();assert.equal(f.saves.length,1,'inflight save stays mutually exclusive across resume');f.saves[0].cb(null,{id:'actual-saved-id',created:123,revision:1});assert.equal(f.p.id,'actual-saved-id');assert.equal(f.cached().id,'actual-saved-id');assert.equal(f.nav.length,0,'no late navigation');f.p.save();assert.equal(f.saves.length,2);assert.equal(f.saves[1].d.id,'actual-saved-id');f.p.onDestroy();
});
test('S round3 device throw settles request and cancels timer before any late callback',()=>{
 const sent=new Error('getInfo threw');let request;const layout=load('common/layout.js',{}),timers=new Map(),sp={bind(){}},session={bind(){}},app={getStore(){return sp;},getSession(){return session;},whenLiubaiReady(){throw new Error('must not boot');}};
 const sh=load('common/shell.js',{'./store-page':sp,'./session':session,'@system.device':{getInfo(o){request=o;throw sent;}},'@system.router':{},'./layout':layout},{$app:app,setTimeout(fn){timers.set(1,fn);return 1;},clearTimeout(i){timers.delete(i);}});const p={alive:true};let calls=0;assert.throws(()=>sh.init(p,()=>calls++),e=>e===sent);assert.equal(timers.size,0);request.success({windowWidth:412,windowHeight:484,screenShape:'rect'});request.fail();assert.equal(calls,0);assert.equal(p.ready,false);
});
test('S round3 destroyed editor save completion cannot mutate retained Session or navigate',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('unsaved retained text');f.p.save();const original=f.cached(),before=JSON.stringify(original);f.p.onDestroy();f.saves[0].cb(null,{id:'late-saved-id',created:123});assert.equal(f.cached(),original);const retained=JSON.parse(before),after=JSON.parse(JSON.stringify(f.cached()));assert.equal(after.id,'late-saved-id');assert.equal(after.created,123);assert.notEqual(after.original,retained.original);delete after.id;delete after.created;delete after.original;delete retained.id;delete retained.created;delete retained.original;assert.deepEqual(after,retained);assert.equal(f.nav.length,0);assert.equal(f.drafts.length,0);assert.equal(f.timers.size,0);
});
test('S round3 hidden completed save resumes its exact ID without losing text or replaying new',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('hidden successful save');f.p.save();f.p.onHide();f.saves[0].cb(null,{id:'saved-while-hidden',created:456});assert.equal(f.cached().id,'saved-while-hidden');assert.equal(f.nav.length,0);f.p.onShow();f.device();f.ready();assert.equal(f.p.id,'saved-while-hidden');assert.equal(f.p.text,'hidden successful save');f.p.save();assert.equal(f.saves.at(-1).d.id,'saved-while-hidden');f.p.onDestroy();
});
test('S round4 pending new save then edit and line tap keeps latest text and reconciles generated ID',()=>{
 const f=fixture();f.p.onInit();f.device();f.ready();f.p.kb.insert('saved original');f.p.save();f.p.kb.insert(' newest');f.p.kb.setCursor=()=>{};f.p.pickLine(0,{globalX:f.p.lines[0].x});f.p.onHide();f.saves[0].cb(null,{id:'exact-new-id',created:987});assert.equal(f.cached().id,'exact-new-id');f.p.onShow();f.device();f.ready();assert.equal(f.p.text,'saved original newest');assert.equal(f.p.id,'exact-new-id');assert.equal(f.loads.length,0);assert.equal(f.nav.length,0);f.p.onDestroy();
 // round16 standards segment3 original current-generation counterexample:
 // save a, accept onChange ab while callback held, then complete save/clear.
 const current=fixture();current.p.onInit();current.device();current.ready();current.p.kb.insert('a');current.p.save();assert.equal(current.saves[0].d.body,'a');current.p.kb.insert('b');assert.equal(current.p.text,'ab');assert.equal(current.cached().text,'ab');
 current.saves[0].cb(null,{id:'same-generation-id',created:123,revision:1});for(const cb of current.drafts.slice())cb(null);
 assert.equal(current.nav.length,0,'accepted newer text must not navigate to saved a');assert.ok(current.cached(),'recovery session remains');assert.equal(current.cached().text,'ab');assert.equal(current.cached().id,'same-generation-id');assert.equal(current.p.id,'same-generation-id');assert.equal(current.p.saving,false);
 current.tick(700);assert.equal(current.puts.length,1);assert.equal(current.puts[0].d.body,'ab');assert.equal(current.puts[0].d.id,'same-generation-id');current.puts[0].cb(null);
 current.p.save();assert.equal(current.saves.length,2);assert.equal(current.saves[1].d.body,'ab');assert.equal(current.saves[1].d.id,'same-generation-id');current.saves[1].cb(null,{id:'same-generation-id',created:123,revision:2});current.drafts.at(-1)(null);assert.equal(current.nav.length,1);assert.equal(current.cached(),null);current.p.onDestroy();
 // Same root at the second completion boundary: input after save succeeds
 // but before its draftClear callback must also survive and be re-drafted.
 const clearing=fixture();clearing.p.onInit();clearing.device();clearing.ready();clearing.p.kb.insert('a');clearing.p.save();clearing.saves[0].cb(null,{id:'during-clear-id',created:124,revision:1});assert.equal(clearing.drafts.length,1);clearing.p.kb.insert('b');clearing.drafts[0](null);
 assert.equal(clearing.nav.length,0);assert.equal(clearing.cached().text,'ab');assert.equal(clearing.cached().id,'during-clear-id');clearing.tick(700);assert.equal(clearing.puts.length,1);assert.equal(clearing.puts[0].d.body,'ab');clearing.puts[0].cb(null);clearing.p.onDestroy();
});
test('S round7b editor queued Retry during hidden device wait cannot create another request or resurrect page',()=>{
 const f=fixture();f.p.onInit();f.p.onHide();const count=f.devices.length;f.p.retry();assert.equal(f.p.alive,false);assert.equal(f.devices.length,count);assert.equal(f.timers.size,0);f.p.onDestroy();f.p.retry();assert.equal(f.devices.length,count);assert.equal(f.p.alive,false);
});
test('S round7b late editor Back Cancel and waitingBack after hide or destruction never navigate',()=>{
 const f=fixture();f.p.onInit();f.p.onHide();f.p.cancel();f.p.onBackPress();if(f.p.waitingBack)f.p.waitingBack();assert.equal(f.nav.length,0);f.p.onDestroy();f.p.onBackPress();f.p.cancel();if(f.p.waitingBack)f.p.waitingBack();assert.equal(f.nav.length,0);assert.equal(f.timers.size,0);
});
