import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../entry/src/main/js/MainAbility');
const frozen=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'fixtures/diagnostic-k');

function clock(){
 let now=0,next=0;const timers=new Map();
 return {timers,setTimeout(fn,ms){const id=++next;timers.set(id,{fn,due:now+ms,ms});return id;},clearTimeout(id){timers.delete(id);},
 tick(ms){const end=now+ms;let steps=0;while(true){let first;for(const row of timers)if(row[1].due<=end&&(!first||row[1].due<first[1].due))first=row;if(!first)break;assert.ok(++steps<1000,'unbounded diagnostics timer');now=first[1].due;timers.delete(first[0]);first[1].fn();}now=end;}};
}
function moduleAt(source,imports,globals={}){
 const code=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=');
 const ctx={imports,result:null,console,Date,Math,JSON,...globals};vm.runInNewContext(code,ctx);return ctx.result;
}
function application(baseline=false,options={}){
 const business=[],logs=[],timer=clock(),pending=[];
 const L={init(c){business.push(['logger.init',c]);if(options.lInitThrows)throw options.lInitThrows;},page(p){business.push(['logger.page',p]);if(options.lPageThrows)throw options.lPageThrows;},stop(){business.push(['logger.stop']);if(options.lStopThrows)throw options.lStopThrows;},i(tag,msg){if(options.logThrows)throw options.logThrows;logs.push({level:'info',tag,msg});},e(tag,msg){if(options.logThrows)throw options.logThrows;logs.push({level:'error',tag,msg});},status(){return {pending:0,sent:0,failed:0,dropped:0,busy:0,seq:logs.length};}};
 const config={key:'diagnostic-unit-only',endpoint:'https://example.invalid/',app:'liubai',ver:'0.2.6'};
 const Store={init(cb){business.push(['store.init']);if(options.initThrows)throw options.initThrows;if(options.sync)cb(options.error||null);else pending.push(cb);},dispose(){business.push(['store.dispose']);if(options.disposeThrows)throw options.disposeThrows;}};
 const Session={identity:'session'};
 let pageVisible=true,hook=null;const shell={isVisible:()=>pageVisible,markVisible:v=>{pageVisible=v===true;try{if(hook)hook(pageVisible);}catch(ignored){}},setVisibilityHook:fn=>{hook=typeof fn==='function'?fn:null;}};
 const source=fs.readFileSync(baseline?path.join(frozen,'app.txt'):path.join(root,'app.js'),'utf8');
 const app=moduleAt(source,{'./common/logsink.js':L,'./common/log-config.js':config,'./common/store':Store,'./common/session':Session,'./common/shell':shell},{setTimeout:timer.setTimeout,clearTimeout:timer.clearTimeout});
 return {app,Store,Session,L,logs,business,pending,timer,config,shell};
}
function stages(f){return f.logs.filter(r=>r.tag==='stage').map(r=>r.msg.split(' ')[0]);}
function lifecycle(baseline,error){
 const f=application(baseline),route={id:'exact-route'};
 f.app.onCreate();f.app.setLiubaiParams(route);
 f.app.whenLiubaiReady(e=>f.business.push(['ready.first',e&&e.message||null,f.app.getLiubaiStoreState()]));
 f.app.whenLiubaiReady(e=>f.business.push(['ready.second',e&&e.message||null]));
 const loading=f.app.getLiubaiStoreState();f.pending.shift()(error);
 f.app.whenLiubaiReady(e=>f.business.push(['ready.immediate',e&&e.message||null]));
 assert.equal(f.app.getStore(),f.Store);assert.equal(f.app.getSession(),f.Session);assert.equal(f.app.getLiubaiParams(),route);
 const ready=f.app.getLiubaiStoreState();f.app.onDestroy();f.app.whenLiubaiReady(e=>f.business.push(['ready.destroyed',e.message]));
 return {business:JSON.parse(JSON.stringify(f.business)),loading,ready,destroyed:f.app.getLiubaiStoreState(),f};
}

test('L app emits startup stages while preserving K callback, route and disposal semantics',()=>{
 for(const error of [null,new Error('original store failure')]){
  const old=lifecycle(true,error),current=lifecycle(false,error);
  assert.deepEqual(current.business,old.business);assert.equal(current.loading,old.loading);assert.equal(current.ready,old.ready);assert.equal(current.destroyed,old.destroyed);
  const seen=stages(current.f);
  for(const marker of ['L/app.create.enter','L/app.store.init.enter','L/app.store.init.return','L/app.create.exit','L/app.store.callback.'+(error?'error':'ok'),'L/app.notify.'+(error?'failed':'ready')])assert.ok(seen.includes(marker),marker+' missing');
 }
});

test('L error hooks and caught app failures are bounded, isolated, and preserve exact throws',()=>{
 for(const name of ['onError','onerror']){
  const f=application();f.app.onCreate();const error=new Error('original diagnostic error');
  assert.equal(typeof f.app[name],'function',name+' missing');assert.equal(f.app[name](error),undefined);
  assert.ok(f.logs.some(r=>r.tag==='onerror'&&r.msg==='L/app.onerror type=object'));assert.ok(f.logs.every(r=>!r.msg.includes('original diagnostic error')));
  const hostile={get message(){throw Error('getter must stay isolated');},get stack(){throw Error('stack getter');}};
  assert.doesNotThrow(()=>f.app[name](hostile));f.app.onDestroy();
 }
 for(const [field,invoke] of [['initThrows',f=>f.app.onCreate()],['disposeThrows',f=>{f.app.onCreate();f.app.onDestroy();}]]){
  const exact={message:'original business throw',stack:'same object stack'};
  const old=application(true,{[field]:exact}),current=application(false,{[field]:exact});
  for(const f of [old,current]){let caught;try{invoke(f);}catch(e){caught=e;}assert.equal(caught,exact);}
  assert.deepEqual(current.business,old.business);assert.ok(current.logs.some(r=>r.tag==='onerror'&&r.msg.endsWith(' type=object')));assert.ok(current.logs.every(r=>!r.msg.includes('original business throw')&&!r.msg.includes('same object stack')));
 }
 const f=application(false,{logThrows:new Error('logger failure')});assert.doesNotThrow(()=>f.app.onCreate());
 assert.doesNotThrow(()=>f.app.onerror(new Error('original error')));f.pending.shift()(null);assert.equal(f.app.getLiubaiStoreState(),'ready');assert.doesNotThrow(()=>f.app.onDestroy());
});

test('L heartbeat has one bounded 5s timer, remaining-budget resume, and no hidden/destroyed work',()=>{
 const f=application();f.app.onCreate();
 assert.equal(typeof f.app.traceLiubai,'function','app diagnostic forwarding missing');
 const p={ready:true,allowed:true,loading:false,empty:true,w:412,h:484};
 f.app.traceLiubai('L/index.onShow',p);assert.equal(f.timer.timers.size,1);
 f.timer.tick(4999);assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,0);
 f.timer.tick(1);let beats=f.logs.filter(r=>r.tag==='heartbeat');assert.equal(beats.length,1);
 assert.ok(beats[0].msg.includes('L/hb 1')&&beats[0].msg.includes('state=loading')&&beats[0].msg.includes('last=L/index.onShow')&&beats[0].msg.includes('w=412 h=484'));
 f.app.traceLiubai('L/index.onHide',p);assert.equal(f.timer.timers.size,0);f.timer.tick(50000);assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,1);
 f.app.traceLiubai('L/index.onShow',p);f.app.traceLiubai('L/index.onShow',p);assert.equal(f.timer.timers.size,1);
 f.timer.tick(50000);assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,6);assert.equal(f.timer.timers.size,0);
 f.app.traceLiubai('L/index.onShow',p);f.timer.tick(50000);assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,6);
 f.app.onDestroy();assert.equal(f.timer.timers.size,0);f.app.traceLiubai('L/index.onShow',p);f.timer.tick(50000);assert.equal(f.timer.timers.size,0);
 const g=application();g.app.onCreate();g.app.onDestroy();assert.equal(g.timer.timers.size,0);g.timer.tick(50000);assert.equal(g.logs.filter(r=>r.tag==='heartbeat').length,0);
});

test('L diagnostic forwarding reads only safe scalars and isolates hostile getters/timer failure',()=>{
 const f=application();f.app.onCreate();const page={ready:true,allowed:false,loading:true,empty:false,w:336,h:480,body:'MUST_NOT_LOG',rows:['MUST_NOT_LOG']};
 const before=JSON.stringify(page);assert.doesNotThrow(()=>f.app.traceLiubai('L/index.probe',page));assert.equal(JSON.stringify(page),before);
 assert.ok(f.logs.at(-1).msg.includes('ready=true allowed=false loading=true empty=false w=336 h=480'));
 assert.ok(f.logs.every(r=>!r.msg.includes('MUST_NOT_LOG')));
 assert.doesNotThrow(()=>f.app.traceLiubai('L/index.hostile',{get ready(){throw Error('getter');}}));
 f.app.onDestroy();
});

function deviceShell(baseline=false,options={}){
 const business=[],logs=[],timer=clock(),requests=[];
 const store={},session={},params={id:'same-param'};
 const app={whenLiubaiReady(cb){business.push(['app.ready']);if(options.readyError)cb(options.readyError);else cb(null);},getStore(){business.push(['app.store']);return store;},getSession(){business.push(['app.session']);return session;},getLiubaiParams(){return params;},
 traceLiubai(stage,p){if(options.diagThrows)throw options.diagThrows;logs.push({tag:'stage',stage});},errorLiubai(stage,e){if(options.diagThrows)throw options.diagThrows;logs.push({tag:'onerror',stage,error:e});}};
 const imports={'./store-page':{bind(v){assert.equal(v,store);business.push(['bind.store']);}},'./session':{bind(v){assert.equal(v,session);business.push(['bind.session']);}},
 '@system.device':{getInfo(o){business.push(['device.request']);requests.push(o);if(options.deviceThrows)throw options.deviceThrows;}},'@system.router':{},
 './layout':{valid(d){business.push(['layout.valid']);return d.windowWidth>0&&d.windowHeight>0;}}};
 const shell=moduleAt(fs.readFileSync(baseline?path.join(frozen,'shell.txt'):path.join(root,'common/shell.js'),'utf8'),imports,{setTimeout:timer.setTimeout,clearTimeout:timer.clearTimeout,$app:options.noApp?{}:app});
 const page={ready:false,w:0,h:0,$refs:{crown:{rotation(v){business.push(['focus',v.focus]);}}}};
 return {shell,page,app,business,logs,timer,requests};
}
function deviceRun(baseline,mode,opts={}){
 const f=deviceShell(baseline,opts),info={windowWidth:412,windowHeight:484,screenShape:'rect'};
 let caught;
 try{f.shell.init(f.page,d=>{assert.equal(d,info);f.business.push(['device.callback']);if(mode==='callback-throw')throw new Error('original geometry error');f.shell.ensure(f.page,e=>f.business.push(['ready.callback',e&&e.message||null]));});
 if(mode==='ok'||mode==='callback-throw')f.requests[0].success(info);
 if(mode==='invalid')f.requests[0].success({windowWidth:0,windowHeight:484});
 if(mode==='fail')f.requests[0].fail();
 if(mode==='timeout')f.timer.tick(6000);
 }catch(e){caught=e;}
 return {...f,caught,snapshot:JSON.parse(JSON.stringify(f.page))};
}
test('L native device/readiness stages report request, callback, failure and timeout without K behavior changes',()=>{
 for(const mode of ['ok','invalid','fail','timeout','callback-throw']){
  const old=deviceRun(true,mode),current=deviceRun(false,mode);assert.deepEqual(current.business,old.business);assert.deepEqual(current.snapshot,mode==='callback-throw'?Object.assign({},old.snapshot,{ready:true,message:''}):old.snapshot);
  const seen=current.logs.filter(r=>r.tag==='stage').map(r=>r.stage);
  assert.ok(seen.includes('L/device.getInfo.enter'),'device request stage missing');
  if(mode==='ok')assert.ok(seen.includes('L/app.ready.wait')&&seen.includes('L/app.ready.dispatched'));
  if(mode==='fail')assert.ok(seen.includes('L/device.fail'));
  if(mode==='timeout')assert.ok(seen.includes('L/device.timeout'));
  if(mode==='callback-throw'){assert.equal(current.caught.message,'original geometry error');assert.ok(current.logs.some(r=>r.tag==='onerror'&&r.error===current.caught));}
 }
});
test('L device synchronous throws and failed trace sinks cannot change original exceptions or callbacks',()=>{
 const exact={message:'native synchronous throw'};
 const old=deviceRun(true,'throw',{deviceThrows:exact}),current=deviceRun(false,'throw',{deviceThrows:exact});
 assert.equal(old.caught,exact);assert.equal(current.caught,exact);assert.deepEqual(current.business,old.business);
 assert.ok(current.logs.some(r=>r.tag==='onerror'&&r.error===exact));
 const bad=deviceRun(false,'ok',{diagThrows:exact}),base=deviceRun(true,'ok');assert.deepEqual(bad.business,base.business);assert.deepEqual(bad.snapshot,base.snapshot);
 const noApp=deviceRun(false,'ok',{noApp:true});assert.equal(noApp.business.at(-1)[1],'App store readiness unavailable');
});

function listRun(baseline=false,options={}){
 const business=[],logs=[],pending=[],readiness=[];const info={windowWidth:412,windowHeight:484,screenShape:'rect'};
 const layout=moduleAt(fs.readFileSync(path.join(root,'common/layout.js'),'utf8'),{});
 const shell={params(){return{};},init(p,cb){business.push(['device']);p.ready=true;p.w=info.windowWidth;p.h=info.windowHeight;cb(info);},ensure(p,cb){business.push(['ensure']);readiness.push(cb);},focus(){business.push(['focus']);},clear(){business.push(['clear']);},nav(p,uri,q){business.push(['nav',uri,q]);},trace(p,stage,e){if(options.diagThrows)throw options.diagThrows;logs.push({stage,error:e});}};
 const store={list(q,cb){business.push(['list',JSON.parse(JSON.stringify(q))]);if(options.listThrows)throw options.listThrows;pending.push(cb);}};
 const list=moduleAt(fs.readFileSync(baseline?path.join(frozen,'list.txt'):path.join(root,'common/list-page.js'),'utf8'),{'./store-page':store,'./shell':shell,'./layout':layout});
 const p={ready:false,w:0,h:0,listGen:0,rows:[],days:[]};list.init(p,'index');
 return {p,list,business,logs,pending,readiness,snapshot(){return JSON.parse(JSON.stringify(p));}};
}
function listScenario(baseline,mode,options={}){
 const f=listRun(baseline,options);let caught;
 try{
  f.readiness.shift()(mode==='ready-error'?new Error('original readiness fail'):null);
  if(mode==='empty')f.pending.shift()(null,{items:[],hasMore:false});
  if(mode==='rows')f.pending.shift()(null,{items:[{id:'a',date:'2026-11-01',time:'12:00',title:'MUST_NOT_LOG',preview:'MUST_NOT_LOG',pinned:false}],hasMore:false});
  if(mode==='error')f.pending.shift()(new Error('original list fail'));
  if(mode==='invalid')f.pending.shift()(null,{items:'bad',hasMore:false});
  if(mode==='stale'){const cb=f.pending.shift();f.list.destroy(f.p);cb(null,{items:[],hasMore:false});}
 }catch(e){caught=e;}
 return {...f,caught};
}
test('L list and paint boundary diagnostics preserve K page state, reads, empty/error/stale outcomes',()=>{
 for(const mode of ['empty','rows','error','invalid','ready-error','stale']){
  const old=listScenario(true,mode),current=listScenario(false,mode);assert.deepEqual(current.business,old.business);assert.deepEqual(current.snapshot(),Object.assign({},old.snapshot(),{readyWaiting:false,readyCancel:null}));
  const seen=current.logs.map(r=>r.stage);assert.ok(seen.includes('L/geometry.enter')&&seen.includes('L/geometry.exit'),'geometry stages missing');
  if(mode==='empty'||mode==='rows')for(const phase of ['L/list.enter','L/list.callback','L/paint.enter','L/paint.exit'])assert.ok(seen.includes(phase),phase+' missing');
  if(mode==='error'||mode==='invalid'||mode==='ready-error')assert.ok(current.logs.some(r=>r.error),'original failure not reported');
 }
});
test('L list diagnostic failure cannot alter sync throw identity, callbacks or persistence requests',()=>{
 const exact={message:'original synchronous list throw'};
 const old=listScenario(true,'throw',{listThrows:exact}),current=listScenario(false,'throw',{listThrows:exact});assert.equal(old.caught,exact);assert.equal(current.caught,exact);assert.deepEqual(current.business,old.business);assert.deepEqual(current.snapshot(),Object.assign({},old.snapshot(),{readyWaiting:false,readyCancel:null,loading:false,message:'\u6ca1\u8bfb\u5230\uff0c\u70b9\u6309\u91cd\u8bd5',errorDetail:'original synchronous list throw'}));assert.ok(current.logs.some(r=>r.error===exact));
 const failing=listScenario(false,'rows',{diagThrows:exact}),base=listScenario(true,'rows');assert.deepEqual(failing.business,base.business);assert.deepEqual(failing.snapshot(),Object.assign({},base.snapshot(),{readyWaiting:false,readyCancel:null}));
});
test('L homepage module and lifecycle stages retain exact K returns, this, call order and data',()=>{
 const run=baseline=>{
  const business=[],logs=[];const shell={markVisible(){},trace(p,stage,e){logs.push({stage,error:e});},focus(p){business.push(['focus',p.marker]);}};
  const list={init(p,kind){business.push(['init',p.marker,kind]);return 99;},destroy(p){business.push(['destroy',p.marker]);return 88;}};
  const source=fs.readFileSync(baseline?path.join(frozen,'index.txt'):path.join(root,'pages/index/index.js'),'utf8');
  const p=moduleAt(source,{'../../common/list-page':list,'../../common/shell':shell});p.marker='exact-this';
  const before=JSON.stringify(p.data),returns=[p.onInit(),p.onShow(),p.onHide(),p.onDestroy()];assert.equal(JSON.stringify(p.data),before);return {business,logs,returns};
 };
 const old=run(true),current=run(false);assert.deepEqual(current.business,old.business);assert.deepEqual(current.returns,old.returns);
 for(const phase of ['L/index.module','L/index.onInit.enter','L/index.onInit.exit','L/index.onShow','L/index.onHide','L/index.onDestroy'])assert.ok(current.logs.some(r=>r.stage===phase),phase+' missing');
});

test('L readiness forwarding preserves the original receiver, args and return value without touching apply',()=>{
 const f=deviceShell();const receiver={exact:'original receiver'},error=null,value={exact:'result'};let saved;
 f.app.whenLiubaiReady=cb=>{saved=cb;};
 const cb=function(){assert.equal(this,receiver);assert.equal(arguments.length,2);assert.equal(arguments[0],error);assert.equal(arguments[1],value);return value;};
 Object.defineProperty(cb,'apply',{configurable:true,get(){throw new Error('apply property must not be touched');}});
 f.shell.ensure(f.page,cb);
 assert.equal(saved.call(receiver,error,value),value);
});

test('L queued readiness dispatch keeps K receiver semantics and reports throws',()=>{
 const f=application();f.app.onCreate();
 let seen=null;f.app.whenLiubaiReady(function(){seen=this;});
 f.pending.shift()(null);
 assert.equal(Array.isArray(seen),true);
 const g=application();g.app.onCreate();
 const sentinel=new Error('dispatch-sentinel');
 assert.throws(()=>{g.app.whenLiubaiReady(function(){throw sentinel;});g.pending.shift()(null);},e=>e===sentinel);
 assert.ok(g.logs.some(r=>r.tag==='onerror'),'dispatch throw must be reported before rethrow');
});

test('L invalid readiness callbacks retain the original application guard',()=>{
 const f=deviceShell();let exact='unset';f.app.whenLiubaiReady=cb=>{exact=cb;};
 for(const value of [null,undefined,0,'not-a-callback']){f.shell.ensure(f.page,value);assert.equal(exact,value);}
});

test('L heartbeat restarts its finite budget after destroy and recreate, isolating timer errors',()=>{
 const f=application();f.app.onCreate();f.app.onDestroy();f.app.onCreate();assert.equal(f.timer.timers.size,1);f.timer.tick(50000);assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,6);f.app.onDestroy();
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');const f2=application();const bad=moduleAt(source,{'./common/logsink.js':f2.L,'./common/log-config.js':f2.config,'./common/store':f2.Store,'./common/session':f2.Session,'./common/shell':{isVisible:()=>true,markVisible(){},setVisibilityHook(){},setDiagnosticOutlets(){}}},{setTimeout(){throw Error('diagnostic-only timer failure');},clearTimeout(){throw Error('diagnostic-only clear failure');}});
 assert.doesNotThrow(()=>bad.onCreate());f2.pending.shift()(null);assert.equal(bad.getLiubaiStoreState(),'ready');assert.doesNotThrow(()=>bad.onDestroy());
});

test('L hidden-page heartbeat stops through the direct module flag even with a broken app outlet',()=>{
 const f=application();f.app.onCreate();
 const beats=()=>f.logs.filter(r=>r.tag==='heartbeat').length;
 f.timer.tick(5000);assert.ok(beats()>=1,'visible heartbeat must beat');
 f.shell.markVisible(false);
 const before=beats();
 f.timer.tick(30000);
 assert.equal(beats(),before,'no hidden-page beats');
 assert.equal(f.timer.timers.size,0,'no hidden rearm');
 f.shell.markVisible(true);
 f.app.traceLiubai('L/index.onShow');
 f.timer.tick(5000);
 assert.ok(beats()>before,'remaining-budget resume after visible again');
});

test('L hide clears pending heartbeat through the direct hook when the trace outlet is unavailable',()=>{
 const f=application();f.app.onCreate();
 assert.equal(f.timer.timers.size,1,'heartbeat pending after create');
 f.timer.tick(5000);assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,1);
 delete f.app.traceLiubai;
 f.shell.markVisible(false);
 assert.equal(f.timer.timers.size,0,'hide must clear timer with missing outlet');
 f.timer.tick(50000);
 assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,1,'no hidden beats');
 const g=application();g.app.onCreate();
 g.app.traceLiubai=()=>{throw new Error('outlet failure');};
 assert.doesNotThrow(()=>g.shell.markVisible(false));
 assert.equal(g.timer.timers.size,0,'hide must clear timer with throwing outlet');
});

test('L visible again resumes remaining budget through the hook without the trace outlet',()=>{
 const f=application();f.app.onCreate();
 f.timer.tick(5000);
 const beats=()=>f.logs.filter(r=>r.tag==='heartbeat');
 assert.equal(beats().length,1);
 delete f.app.traceLiubai;
 f.shell.markVisible(false);
 assert.equal(f.timer.timers.size,0);
 f.shell.markVisible(true);
 assert.equal(f.timer.timers.size,1,'resume re-arms heartbeat');
 f.timer.tick(5000);
 assert.equal(beats().length,2);
 assert.ok(beats()[1].msg.includes('L/hb 2'),'budget continues from retained diagBeat');
 f.shell.markVisible(false);f.shell.markVisible(true);
 f.timer.tick(50000);
 assert.equal(beats().length,6,'full retained budget, no reset across hide/show');
 assert.equal(f.timer.timers.size,0);
});

test('L shell diagnostics never execute business getters while ensure keeps frozen-K first-read sentinel parity',()=>{
 const sentinel=new Error('business getter sentinel');
 const imports={'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(){}},'@system.router':{},'./layout':{valid(){return true;}}};
 const shellSrc=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
 const frozenSrc=fs.readFileSync(path.join(frozen,'shell.txt'),'utf8');
 function probe(src,mode){
  const reads={def:0,when:0,store:0,session:0};let bind=0,first=true;
  const appObj={traceLiubai:function(){},errorLiubai:function(){},
   getStore:function(){reads.store++;return {};},getSession:function(){reads.session++;return {};}};
  if(mode==='def')Object.defineProperty(appObj,'$def',{get(){reads.def++;if(first){first=false;throw sentinel;}return appObj;}});
  else Object.defineProperty(appObj,'whenLiubaiReady',{get(){reads.when++;if(first){first=false;throw sentinel;}return function(cb){cb(null);};}});
  const shell=moduleAt(src,imports,{setTimeout(){},clearTimeout(){},$app:appObj});
  let caught,unavailable,callbacks=0;
  // N observes the original unavailable dispatch. Keep a throwing callback so
  // the existing ensure catch remains exercised; rethrow the received Error.
  try{shell.ensure({},function(e){unavailable=e;callbacks++;assert.equal(e.name,'Error');assert.equal(e.message,'App store readiness unavailable');throw e;});}catch(e){caught=e;}
  return {caught,reads,bind,unavailable,callbacks};
 }
 for(const mode of ['def','when']){
  const old=probe(frozenSrc,mode),current=probe(shellSrc,mode);
  assert.equal(old.caught,sentinel,'frozen K must propagate first-read sentinel');
  assert.equal(current.callbacks,1,'N must dispatch the existing unavailable callback exactly once');
  assert.equal(old.callbacks,0,'frozen K fails before callback dispatch');
  assert.equal(current.caught,current.unavailable,'the callback rethrows the received unavailable Error unchanged');
  assert.equal(current.unavailable.message,'App store readiness unavailable','N root resolution fell back instead of propagating the business sentinel');
  const want={def:mode==='def'?1:0,when:mode==='when'?1:0,store:0,session:0};
  assert.deepEqual(old.reads,want);
  const curWant=Object.assign({},want);
  assert.deepEqual(current.reads,curWant,'business keeps the only accessor read; diagnostics skip accessor descriptors entirely');
  assert.equal(current.bind,old.bind);assert.equal(old.bind,0);
 }
 const reads={def:0,when:0,store:0,session:0},seen=[];
 const counted={traceLiubai:function(s){seen.push(s);},errorLiubai:function(s){seen.push(s);},
  $def:null,
  get whenLiubaiReady(){reads.when++;return function(){};},
  get getStore(){reads.store++;return {};},get getSession(){reads.session++;return {};}};
 counted.$def=counted;
 const sh=moduleAt(shellSrc,imports,{setTimeout(){},clearTimeout(){},$app:counted});
 sh.trace({},'L/a');sh.trace({},'L/b');sh.trace({},'L/c','boom');
 assert.deepEqual(seen,['L/a','L/b','L/c'],'forwards through the real global $app');
 assert.equal(reads.when,0,'readiness getter untouched');
 assert.equal(reads.store,0,'store getter untouched');
 assert.equal(reads.session,0,'session getter untouched');
});

test('L ensure propagates the identical first-read global $app sentinel like frozen K',()=>{
 const A=new Error('first $app read'),B=new Error('later $app read');
 function run(src){
  const code=src.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=').replace(/\$app\b/g,'__probeRead()');
  const imports={'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(){}},'@system.router':{},'./layout':{valid(){return true;}}};
  let reads=0;
  const ctx={imports,result:null,console,Date,Math,JSON,setTimeout(){},clearTimeout(){},__probeRead(){reads++;if(reads===1)throw A;throw B;}};
  vm.runInNewContext(code,ctx);
  let caught,unavailable,callbacks=0;
  // Preserve the original throwing-callback branch while observing N fallback.
  try{ctx.result.ensure({},function(e){unavailable=e;callbacks++;assert.equal(e.name,'Error');assert.equal(e.message,'App store readiness unavailable');throw e;});}catch(e){caught=e;}
  return {caught,reads,unavailable,callbacks};
 }
 const old=run(fs.readFileSync(path.join(frozen,'shell.txt'),'utf8'));
 const current=run(fs.readFileSync(path.join(root,'common/shell.js'),'utf8'));
 assert.equal(old.caught,A,'frozen K throws the first-read sentinel');
 assert.equal(current.callbacks,1,'N must dispatch the existing unavailable Error once');
 assert.equal(old.callbacks,0,'frozen K throws before the callback');
 assert.equal(current.caught,current.unavailable,'unavailable Error is rethrown unchanged by the observing callback');
 assert.equal(current.unavailable.message,'App store readiness unavailable');
 // Second authorization: only this first-read-throwing root fixture changes 2->4.
 // 1 shell.app: typeof $app at the original business root lookup throws A.
 // 2 app catch -> trace(L/app.resolve.throw) -> appRoot typeof $app throws B.
 // 3 ensure -> trace(L/app.ready.wait) -> appRoot typeof $app throws B.
 // 4 observing callback rethrows unavailable -> ensure catch ->
 //   trace(L/app.ready.throw) -> appRoot typeof $app throws B.
 // The root never returns an object: none of the four reads can pre-read
 // $def/when/getStore/getSession or any other business getter.
 assert.equal(old.reads,1);assert.equal(current.reads,4,'one original root read plus three guarded diagnostic attempts; no business getter pre-read');
});

test('L fresh creation clears stale shell visibility so the startup heartbeat is not suppressed',()=>{
 const f=application();f.app.onCreate();
 f.shell.markVisible(false);
 f.app.onDestroy();
 f.app.onCreate();
 assert.equal(f.timer.timers.size,1,'startup heartbeat armed despite stale hidden flag');
 f.timer.tick(5000);
 assert.equal(f.logs.filter(r=>r.tag==='heartbeat').length,1,'startup beat fires');
});

test('L deferred list error callback reports and rethrows the identical sentinel from error handling',()=>{
 const f=listRun(false);
 f.readiness.shift()(null);
 const sentinel=new Error('errorDetail sentinel');let armed=true,reads=0;
 const bad={get message(){reads++;if(armed){armed=false;throw sentinel;}return 'later';}};
 let caught;
 try{f.pending.shift()(bad,null);}catch(x){caught=x;}
 assert.equal(caught,sentinel,'sentinel must escape unchanged');
 assert.equal(reads,1,'single original message getter read');
 assert.ok(f.logs.some(r=>r.stage==='L/list.error.report'&&r.error===sentinel),'sentinel reported before rethrow');
 assert.equal(f.p.loading,false,'error state applied before throw');
});

test('L separately instantiated shell instances forward diagnostics and visibility through the real global $app',()=>{
 const src=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
 const imports={'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(){}},'@system.router':{},'./layout':{valid(){return true;}}};
 const stages=[],vis=[];
 const shared={traceLiubai:function(s){stages.push(s);},errorLiubai:function(s){stages.push('E:'+s);},diagVisibility:function(v){vis.push(v===true);}};
 const page=moduleAt(src,imports,{setTimeout(){},clearTimeout(){},$app:shared});
 const appSide=moduleAt(src,imports,{setTimeout(){},clearTimeout(){},$app:shared});
 let hooked=null;
 appSide.setVisibilityHook(function(v){hooked=v;});
 page.trace({},'L/page.stage');
 assert.deepEqual(stages,['L/page.stage'],'page-side instance delivers via the real global $app');
 page.markVisible(false);
 assert.deepEqual(vis,[false],'page-side visibility reaches application cleanup through $app.diagVisibility');
 assert.equal(hooked,null,'fallback used when no local hook is registered');
 appSide.markVisible(false);
 assert.equal(hooked,false,'local hook still fires on the registering instance');
});
test('L logger lifecycle failures are reported before rethrow with identity preserved',()=>{
 const pSent=new Error('page sentinel');
 const f=application(false,{lPageThrows:pSent});
 let caught;try{f.app.onCreate();}catch(e){caught=e;}
 assert.equal(caught,pSent,'L.page sentinel identity preserved');
 assert.ok(f.logs.some(r=>r.tag==='onerror'&&String(r.msg).indexOf('L/app.logger.page')===0),'L.page failure reported');
 assert.ok(!f.logs.some(r=>r.msg==='L/app.create.enter'),'create.enter not reached after failure');
 const iSent=new Error('init sentinel');
 const g=application(false,{lInitThrows:iSent});
 let c2;try{g.app.onCreate();}catch(e){c2=e;}
 assert.equal(c2,iSent,'L.init sentinel identity preserved');
 assert.ok(g.logs.some(r=>r.tag==='onerror'&&String(r.msg).indexOf('L/app.logger.init')===0),'L.init failure reported');
 const sSent=new Error('stop sentinel');
 const h=application(false,{lStopThrows:sSent});
 h.app.onCreate();
 let c3;try{h.app.onDestroy();}catch(e){c3=e;}
 assert.equal(c3,sSent,'L.stop sentinel identity preserved');
 assert.ok(h.logs.some(r=>r.tag==='onerror'&&String(r.msg).indexOf('L/app.logger.stop')===0),'L.stop failure reported');
});
test('L shell clear reports and rethrows identical timer-clear failures in order',()=>{
 const src=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
 const imports={'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(){}},'@system.router':{},'./layout':{valid(){return true;}}};
 const stages=[];
 const shared={traceLiubai:function(s){stages.push(s);},errorLiubai:function(s){stages.push('E:'+s);}};
 const sent=new Error('clear sentinel');
 let mode='device';
 const sh=moduleAt(src,imports,{setTimeout(){return 1;},clearTimeout(t){if(mode==='device'&&t===11)throw sent;if(mode==='focus'&&t===22)throw sent;},$app:shared});
 const page={deviceTimer:11,focusTimer:22,$refs:{}};
 let caught;
 try{sh.clear(page);}catch(e){caught=e;}
 assert.equal(caught,sent,'device timer failure identity preserved');
 assert.ok(stages.indexOf('E:L/focus.clear.timer.error')>=0,'device timer failure reported');
 stages.length=0;mode='focus';
 try{sh.clear(page);}catch(e){caught=e;}
 assert.equal(caught,sent,'focus timer failure identity preserved');
 assert.ok(stages.indexOf('E:L/focus.clear.timer.error')>=0,'focus timer failure reported');
 mode='none';
 sh.clear(page);
 assert.ok(stages.indexOf('L/focus.clear.timer.error')<0,'normal clear reports nothing');
});
test('L list fetch callback reports and rethrows an invalidation-guard sentinel',()=>{
 const f=listRun(false);
 f.readiness.shift()(null);
 const sent=new Error('alive sentinel');
 let armed=true;
 Object.defineProperty(f.p,'alive',{configurable:true,get(){if(armed){armed=false;throw sent;}return true;}});
 let caught;
 try{f.pending.shift()(null,{list:[],total:0});}catch(e){caught=e;}
 assert.equal(caught,sent,'guard sentinel identity preserved');
 assert.ok(f.logs.some(r=>r.stage==='L/list.guard.error'&&r.error===sent),'guard failure reported before rethrow');
});
test('L device getInfo and timeout callbacks report and rethrow guard sentinels',()=>{
 const src=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
 const stages=[];
 const shared={traceLiubai:function(s){stages.push(s);},errorLiubai:function(s){stages.push('E:'+s);}};
 let infoOpts=null,timeoutCb=null;
 const imports={'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(opts){infoOpts=opts;}},'@system.router':{},'./layout':{valid(){return true;}}};
 const sh=moduleAt(src,imports,{setTimeout(fn){timeoutCb=fn;return 7;},clearTimeout(){},$app:shared});
 const sent=new Error('gen sentinel');
 let reads=0;
 const p={};
 Object.defineProperty(p,'deviceGen',{configurable:true,get(){reads++;if(reads<=1)return 1;throw sent;},set(){}});
 sh.init(p,function(){});
 assert.equal(reads,1,'init consumed the first generation read');
 let caught;
 try{infoOpts.success(null);}catch(e){caught=e;}
 assert.equal(caught,sent,'success guard sentinel identity preserved');
 assert.ok(stages.indexOf('E:L/device.success.guard.error')>=0,'success guard failure reported');
 stages.length=0;
 try{infoOpts.fail({});}catch(e){caught=e;}
 assert.equal(caught,sent,'fail guard sentinel identity preserved');
 assert.ok(stages.indexOf('E:L/device.fail.guard.error')>=0,'fail guard failure reported');
 stages.length=0;
 try{timeoutCb();}catch(e){caught=e;}
 assert.equal(caught,sent,'timeout sentinel identity preserved');
 assert.ok(stages.indexOf('E:L/device.timeout.callback.error')>=0,'timeout failure reported');
 // fail 回调的 p.message 写入: setter 抛哨兵须先报告再原样重抛
 stages.length=0;
 const p2={deviceGen:1};
 let w=0;
 Object.defineProperty(p2,'message',{configurable:true,get(){return 'x';},set(v){w++;if(w>=2)throw sent;}});
 sh.init(p2,function(){});
 assert.equal(w,1,'init consumed the first message write');
 try{infoOpts.fail({});}catch(e){caught=e;}
 assert.equal(caught,sent,'fail message sentinel identity preserved');
 assert.ok(stages.indexOf('E:L/device.fail.message.error')>=0,'fail message write reported');
});
test('L month scan traces request and return stages for initial and recursive month requests',()=>{
 const f=listRun(false);
 f.readiness.shift()(null);
 f.pending.shift()(null,{items:[],hasMore:false});
 const before=f.business.filter(c=>c[0]==='list').length;
 f.list.month(f.p,1);
 assert.equal(f.business.filter(c=>c[0]==='list').length,before+1,'initial month request missing');
 assert.ok(f.logs.some(r=>r.stage==='L/month.enter'),'initial month request stage missing');
 assert.ok(f.logs.some(r=>r.stage==='L/month.return'),'month return stage missing');
 const row={id:'a',date:'2026-12-01',time:'12:00',title:'T',preview:'P',pinned:false};
 const page=[];
 for(let i=0;i<12;i++)page.push({id:'r'+i,date:row.date,time:row.time,title:row.title,preview:row.preview,pinned:false});
 f.pending.shift()(null,{items:page,hasMore:true});
 assert.equal(f.business.filter(c=>c[0]==='list').length,before+2,'recursive month request missing');
 assert.equal(f.logs.filter(r=>r.stage==='L/month.enter').length,2,'recursive month request stage missing');
 assert.equal(f.logs.filter(r=>r.stage==='L/month.return').length,2,'recursive month return stage missing');
 f.pending.shift()(null,{items:[],hasMore:false});
 assert.ok(f.logs.some(r=>r.stage==='L/month.callback'),'month callback stage missing');
});
test('L month scan request reports and rethrows a synchronous list sentinel',()=>{
 const opt={};
 const f=listRun(false,opt);
 f.readiness.shift()(null);
 f.pending.shift()(null,{items:[],hasMore:false});
 const sent=new Error('month list sentinel');
 opt.listThrows=sent;
 let caught;
 try{f.list.month(f.p,1);}catch(e){caught=e;}
 assert.equal(caught,sent,'month request sentinel identity preserved');
 assert.ok(f.logs.some(r=>r.stage==='L/month.throw'&&r.error===sent),'month request failure reported before rethrow');
});
test('diagnostic bridge skips an accessor $def so the one-shot business sentinel is never consumed',()=>{
 const sent=new Error('one-shot def');
 const defObj={whenLiubaiReady:function(){},getStore:function(){},getSession:function(){},getLiubaiParams:function(){return{};}};
 const imports={'./store-page':{bind:function(){}},'./session':{bind:function(){}},'@system.device':{},'@system.router':{},'./layout':{valid:function(){return true;}}};
 const mk=()=>{let reads=0;const $app={};Object.defineProperty($app,'$def',{configurable:true,get:function(){reads++;if(reads===1)throw sent;return defObj;}});return {$app:$app,reads:function(){return reads;}};};
 const cur=mk();
 const sh=moduleAt(fs.readFileSync(path.join(root,'common/shell.js'),'utf8'),imports,{$app:cur.$app,setTimeout:function(){},clearTimeout:function(){}});
 sh.trace(null,'L/probe.enter');
 assert.equal(cur.reads(),0,'diagnostic must not invoke the accessor $def');
 let caught,params;
 try{params=sh.params({});}catch(e){caught=e;}
 assert.equal(caught,undefined,'N catches the one-shot business sentinel');
 assert.deepEqual(JSON.parse(JSON.stringify(params)),{},'N params returns its authorized empty fallback with the accessor outlet unreachable');
 assert.equal(cur.reads(),1,'business performed the single getter read');
 const fr=mk();
 const sh0=moduleAt(fs.readFileSync(path.join(frozen,'shell.txt'),'utf8'),imports,{$app:fr.$app,setTimeout:function(){},clearTimeout:function(){}});
 let caught0;
 try{sh0.params({});}catch(e){caught0=e;}
 assert.equal(caught0,sent,'frozen baseline throws the identical sentinel');
});
test('L history pagination reports and rethrows paint sentinels from direct next and prev',()=>{
 const sent=new Error('rows setter');
 const setup=(baseline)=>{
  const f=listRun(baseline);
  f.readiness.shift()(null);
  f.pending.shift()(null,{items:[],hasMore:false});
  f.p.kind='history';f.p.loading=false;f.p.hasMore=true;f.p.hasPrev=true;f.p.offset=0;f.p.slots=7;
  f.p.days=[{id:'2026-12-01',date:'2026-12-01',num:'01',title:'12 月 01 日',count:'2 条',preview:'x',meta:'2 条 · x'}];
  Object.defineProperty(f.p,'rows',{configurable:true,set:function(){throw sent;}});
  return f;
 };
 const cur=setup(false);
 let caught;
 try{cur.list.next(cur.p);}catch(e){caught=e;}
 assert.equal(caught,sent,'next paint sentinel identity preserved');
 assert.ok(cur.logs.some(r=>r.stage==='L/monthPaint.error'&&r.error===sent),'direct next paint failure reported before rethrow');
 try{cur.list.prev(cur.p);}catch(e){caught=e;}
 assert.equal(caught,sent,'prev paint sentinel identity preserved');
 assert.equal(cur.logs.filter(r=>r.stage==='L/monthPaint.error'&&r.error===sent).length,2,'direct prev paint failure reported before rethrow');
 const fr=setup(true);
 let caught0;
 try{fr.list.next(fr.p);}catch(e){caught0=e;}
 assert.equal(caught0,sent,'frozen baseline throws the identical sentinel');
 assert.ok(!fr.logs.some(r=>r.stage==='L/monthPaint.error'),'frozen baseline keeps no new stage');
});
export {root,frozen,moduleAt,application,clock,stages};
