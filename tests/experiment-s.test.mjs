import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(n,imports,g={}){const src=fs.readFileSync(new URL(n,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,a,b)=>'var '+a+'=imports['+JSON.stringify(b)+'];').replace('export default','result=');const ctx={imports,result:null,console,Date,Math,JSON,setTimeout(){return 1;},clearTimeout(){},...g};vm.runInNewContext(src,ctx,{filename:n});return ctx.result;}
function application(options={}){const pending=[],logs=[];let calls=0;const store={init(cb){calls++;if(options.throw)throw options.throw;pending.push(cb);},dispose(){},};const shell={setVisibilityHook(){},markVisible(){},isVisible(){return true;}};const app=load('app.js',{'./common/logsink.js':{init(){},page(){},stop(){},i(t,s){logs.push(s);},e(t,s){logs.push(s);}},'./common/log-config.js':{},'./common/store':store,'./common/session':{},'./common/shell':shell});return {app,pending,store,logs,calls:()=>calls};}

test('S app notifies every subscriber before rethrowing the first identical observer error',()=>{
 const f=application(),sent=new Error('first observer S');f.app.onCreate();const events=[];
 f.app.whenLiubaiReady(e=>{events.push(['first',e]);throw sent;});f.app.whenLiubaiReady(e=>events.push(['second',e]));
 assert.throws(()=>f.pending[0](null),e=>e===sent);assert.deepEqual(events,[['first',null],['second',null]]);assert.equal(f.app.getLiubaiStoreState(),'ready');
});
test('S app synchronous Store init throw changes loading to failed and preserves exact original error',()=>{
 const sent=new Error('init S'),f=application({throw:sent});assert.throws(()=>f.app.onCreate(),e=>e===sent);assert.equal(f.app.getLiubaiStoreState(),'failed');let got;f.app.whenLiubaiReady(e=>got=e);assert.equal(got,sent);
 // round12 spec: Store.init throws 0 before its callback; caught failures must never notify null success.
 for(const value of [0,false,'',null,undefined,NaN]){
  const x=application(),seen=[];x.store.init=function(){throw value;};x.app.whenLiubaiReady(e=>seen.push(e));
  let threw=false,caught;try{x.app.onCreate();}catch(e){threw=true;caught=e;}
  assert.equal(threw,true);assert.ok(Object.is(caught,value),'exact original falsy thrown value');
  assert.equal(x.app.getLiubaiStoreState(),'failed','falsy synchronous failure must not become ready');
  assert.equal(seen.length,1);assert.ok(seen[0],'queued readiness receives failure, not null success');
  let immediate;x.app.whenLiubaiReady(e=>immediate=e);assert.equal(immediate,seen[0]);
 }
});
test('S app duplicate and stale generation callbacks cannot change ready or recreated state',()=>{
 const f=application();f.app.onCreate();const old=f.pending[0];old(null);old(new Error('late fail'));assert.equal(f.app.getLiubaiStoreState(),'ready');
 f.app.onDestroy();f.app.onCreate();old(null);assert.equal(f.app.getLiubaiStoreState(),'loading');f.pending[1](new Error('new failed'));old(null);assert.equal(f.app.getLiubaiStoreState(),'failed');
 // round12 standards: A destroys/recreates synchronously; old B must not observe obsolete success.
 const x=application(),events=[];x.app.onCreate();const first=x.pending[0];
 x.app.whenLiubaiReady(e=>{events.push(['A',e]);x.app.onDestroy();x.app.onCreate();});
 x.app.whenLiubaiReady(e=>events.push(['obsolete B',e]));first(null);
 assert.equal(x.app.getLiubaiStoreState(),'loading');assert.equal(x.pending.length,2);
 assert.deepEqual(events,[['A',null]],'old dispatch batch is canceled by destroy/recreate');
 x.app.whenLiubaiReady(e=>events.push(['new C',e]));first(null);assert.equal(events.length,1);
 x.pending[1](null);assert.deepEqual(events,[['A',null],['new C',null]]);assert.equal(x.app.getLiubaiStoreState(),'ready');
});
test('S page subscription cancellation releases waiting closure and prevents dispatch',()=>{
 const f=application();f.app.onCreate();let count=0;const cancel=f.app.whenLiubaiReady(()=>count++);assert.equal(typeof cancel,'function');cancel();cancel();f.pending[0](null);assert.equal(count,0);
});
test('S app retry is explicit failed-only and loading retries never spawn another init',()=>{
 const f=application();f.app.onCreate();assert.equal(typeof f.app.retryLiubaiStore,'function');f.app.retryLiubaiStore();assert.equal(f.calls(),1);f.pending[0](new Error('failure'));
 f.app.retryLiubaiStore();assert.equal(f.calls(),2);f.app.retryLiubaiStore();assert.equal(f.calls(),2);f.pending[1](null);f.app.retryLiubaiStore();assert.equal(f.calls(),2);
});
test('S app waiting subscriptions are bounded and immediate overflow delivers one visible error',()=>{
 const f=application();f.app.onCreate();const results=[];for(let i=0;i<9;i++)f.app.whenLiubaiReady(e=>results.push([i,e]));assert.equal(results.length,1);assert.equal(results[0][0],8);assert.ok(results[0][1]);f.pending[0](null);assert.equal(results.length,9);
});
function listFixture(kind='index',options={}){const pending=[],waiting=[],calls=[],logs=[];const info={windowWidth:412,windowHeight:484,screenShape:'rect'};
 const layout=load('common/layout.js',{}),store={list(q,cb){calls.push(q);if(options.throw)throw options.throw;pending.push(cb);}};
 const shell={params(){return{};},init(p,cb){p.ready=true;p.w=info.windowWidth;p.h=info.windowHeight;cb(info);},ensure(p,cb){waiting.push(cb);return ()=>{};},focus(){},clear(){},trace(p,s,e){logs.push({s,e});},nav(){}};
 const list=load('common/list-page.js',{'./store-page':store,'./shell':shell,'./layout':layout}),p={listGen:0};list.init(p,kind);return {list,p,pending,waiting,calls,logs};}
test('S repeated refresh during Store wait has one subscription and one subsequent list request',()=>{
 const f=listFixture();f.list.refresh(f.p);f.list.refresh(f.p);assert.equal(f.waiting.length,1);f.waiting[0](null);assert.equal(f.calls.length,1);f.waiting[0](null);assert.equal(f.calls.length,1);
});
test('S refresh during live month scan neither restarts nor preloads history',()=>{
 const f=listFixture('history');f.waiting[0](null);assert.equal(f.calls.length,1);f.list.refresh(f.p);f.list.refresh(f.p);assert.equal(f.calls.length,1);assert.equal(f.calls[0].limit,12);assert.equal(f.calls[0].filter,'month');
 f.pending[0](null,{items:[],hasMore:false});assert.equal(f.p.loading,false);assert.equal(f.p.days.length,0);
});
test('S synchronous list throw applies visible failed state then rethrows same error',()=>{
 const sent=new Error('list sync S'),f=listFixture('index',{throw:sent});assert.throws(()=>f.waiting[0](null),e=>e===sent);assert.equal(f.p.loading,false);assert.ok(f.p.message);assert.equal(f.p.ready,true);
});
test('S synchronous month throw applies visible failed state without empty-success paint',()=>{
 const sent=new Error('month sync S'),f=listFixture('history',{throw:sent});assert.throws(()=>f.waiting[0](null),e=>e===sent);assert.equal(f.p.loading,false);assert.ok(f.p.message);assert.equal(f.p.empty,false);
});
test('S destroyed or reinitialized list ignores old ready without rereading metadata',()=>{
 const f=listFixture('history'),old=f.waiting[0];f.list.init(f.p,'history');old(null);assert.equal(f.calls.length,0);f.list.destroy(f.p);f.waiting[1](null);assert.equal(f.calls.length,0);
});
test('S list notification condition is native boolean for loading empty and nonempty error',()=>{
 for(const kind of ['index','history']){const h=fs.readFileSync(new URL('pages/'+kind+'/'+kind+'.hml',ROOT),'utf8');const expression=h.match(/class="notice" if="{{(.*?)}}"/)[1];const value=vm.runInNewContext(expression,{empty:false,message:'read failure',loading:false});assert.equal(value,true,'Lite if must be boolean, not a truthy string');}
});
test('S target page boot stages are short fixed labels without arbitrary month body or file path',()=>{
 for(const kind of ['index','history']){const f=listFixture(kind);f.waiting[0](null);f.pending[0](null,{items:[],hasMore:false});assert.ok(f.logs.some(r=>r.s==='S/'+kind+'.wait'));assert.ok(f.logs.some(r=>r.s==='S/'+kind+'.done'));for(const row of f.logs.filter(r=>r.s.startsWith('S/'))){assert.ok(row.s.length<=40);assert.ok(!row.s.includes('internal://'));assert.ok(!row.s.includes(f.p.month));}}
});
test('S failed notification keeps original error for all observers across reentrant retry',()=>{
 const f=application(),sent=new Error('original failure');f.app.onCreate();const got=[];
 f.app.whenLiubaiReady(e=>{got.push(e);f.app.retryLiubaiStore();});f.app.whenLiubaiReady(e=>got.push(e));f.pending[0](sent);
 assert.deepEqual(got,[sent,sent]);assert.equal(f.app.getLiubaiStoreState(),'loading');assert.equal(f.calls(),2);
});
test('S canceled interior readiness slots are reusable without growing eight-slot bound',()=>{
 const f=application();f.app.onCreate();const cancels=[],got=[];for(let i=0;i<8;i++)cancels.push(f.app.whenLiubaiReady(e=>got.push([i,e])));cancels[0]();f.app.whenLiubaiReady(e=>got.push([8,e]));assert.equal(got.length,0);f.pending[0](null);assert.equal(got.length,8);assert.ok(got.every(r=>r[1]===null));assert.ok(!got.some(r=>r[0]===0));
});
test('S synchronous readiness registration throw leaves visible error and allows retry',()=>{
 const layout=load('common/layout.js',{}),p={listGen:0},sent=new Error('registration failed');const shell={params(){return{};},init(p,cb){p.ready=true;cb({windowWidth:412,windowHeight:484,screenShape:'rect'});},ensure(){throw sent;},trace(){},focus(){},clear(){}};
 const list=load('common/list-page.js',{'./store-page':{},'./shell':shell,'./layout':layout});assert.throws(()=>list.init(p,'index'),e=>e===sent);assert.equal(p.loading,false);assert.equal(p.readyWaiting,false);assert.ok(p.message);
});
test('S waiting filter click never queues metadata before application readiness',()=>{
 const f=listFixture();f.list.toggle(f.p);assert.equal(f.calls.length,0);assert.equal(f.waiting.length,1);f.waiting[0](null);assert.equal(f.calls.length,1);assert.equal(f.calls[0].filter,'pinned');
});
test('S list page retry invokes application-owned failed preparation once before refresh',()=>{
 for(const kind of ['index','history']){const events=[],shell={trace(){},retryStore(){events.push('retry');}},list={init(){events.push('init');},refresh(){events.push('refresh');}};const p=load('pages/'+kind+'/'+kind+'.js',{'../../common/list-page':list,'../../common/shell':shell});p.ready=true;p.loading=false;p.allowed=false;p.retry();assert.deepEqual(events,['retry','refresh']);}
});
test('S visible list loading retry does not invoke preparation or restart query',()=>{
 for(const kind of ['index','history']){const events=[],shell={trace(){},retryStore(){events.push('retry');}},list={init(){events.push('init');},refresh(){events.push('refresh');}};const p=load('pages/'+kind+'/'+kind+'.js',{'../../common/list-page':list,'../../common/shell':shell});p.ready=true;p.loading=true;p.allowed=false;p.retry();assert.deepEqual(events,[]);}
});
function retryChainS33(first,second){
 let reads=0,init=0;const records=[],route={day:''},page={listGen:0};
 Object.defineProperty(route,'month',{get(){reads++;throw reads===1?first:second;}});
 const shell={trace(p,stage,error){records.push({stage,error});},params(){return route;},init(){init++;}};
 const list=load('common/list-page.js',{'./store-page':{},'./shell':shell,'./layout':{}});
 let caught,threw=false;try{list.init(page,'index');}catch(e){caught=e;threw=true;}
 assert.equal(threw,true);assert.ok(Object.is(caught,first));assert.equal(reads,2);assert.equal(init,0);
 assert.equal(Object.hasOwn(page,'month'),false);assert.equal(records.filter(r=>r.stage==='L/probe.o.g5.throw').length,1);
 assert.ok(Object.is(records.find(r=>r.stage==='L/probe.o.g5.throw').error,first));
 return records;
}
function chainHasS33(first,target){
 const pending=[first],seen=new Set();
 while(pending.length){const value=pending.pop();if(Object.is(value,target))return true;
  if(!value||(typeof value!=='object'&&typeof value!=='function')||seen.has(value))continue;seen.add(value);
  for(const key of ['cause','next']){const d=Object.getOwnPropertyDescriptor(value,key);if(d&&'value' in d)pending.push(d.value);}
 }
 return false;
}
test('S33 retry retains second when own writable cause and next already hold undefined',()=>{
 const first=new Error('first'),second=new Error('second');first.cause=undefined;first.next=undefined;
 retryChainS33(first,second);assert.ok(chainHasS33(first,second),'second must be in the thrown first cause/next chain, not only logs');
});
test('S33 retry retains occupied earlier cause and next plus every new second on first reuse',()=>{
 const oldCause=new Error('old cause'),oldNext=Object.freeze(new Error('old next'));
 const first=new Error('first',{cause:oldCause});first.next=oldNext;
 const seconds=[new Error('second A'),new Error('second B'),new Error('second C')];
 for(const second of seconds){retryChainS33(first,second);assert.ok(chainHasS33(first,second));}
 assert.equal(first.cause,oldCause);assert.ok(chainHasS33(first,oldNext));
 for(const second of seconds)assert.ok(chainHasS33(first,second),'reuse cannot drop earlier retry evidence');
});
test('S33 retry preserves cause accessor without invoking it while retaining occupied next evidence',()=>{
 let reads=0;const first=new Error('first'),oldNext=Object.freeze(new Error('old next')),second=new Error('second');
 const getter=()=>{reads++;throw Error('unsafe cause');};Object.defineProperty(first,'cause',{get:getter});first.next=oldNext;
 retryChainS33(first,second);assert.equal(reads,0);assert.equal(Object.getOwnPropertyDescriptor(first,'cause').get,getter);
 assert.ok(chainHasS33(first,oldNext));assert.ok(chainHasS33(first,second));
});
test('S33 retry can preserve a non-writable next via writable cause without erasing either earlier value',()=>{
 const first=new Error('first',{cause:'earlier cause'}),second=new Error('second');
 Object.defineProperty(first,'next',{value:'earlier next',writable:false,configurable:false});
 retryChainS33(first,second);assert.equal(first.next,'earlier next');assert.ok(chainHasS33(first,'earlier cause'));assert.ok(chainHasS33(first,second));
});
test('S33 nonextensible first still uses its existing writable next slot without changing descriptor flags',()=>{
 const first=new Error('first'),second=new Error('second');
 Object.defineProperty(first,'next',{value:'earlier next',writable:true,configurable:false,enumerable:true});Object.preventExtensions(first);
 retryChainS33(first,second);const d=Object.getOwnPropertyDescriptor(first,'next');
 assert.ok(chainHasS33(first,second));assert.ok(chainHasS33(first,'earlier next'));
 assert.equal(d.writable,true);assert.equal(d.configurable,false);assert.equal(d.enumerable,true);
});
test('S33 retry links distinct falsy thrown second values without reading their properties',()=>{
 for(const second of [0,false,'',null,undefined,NaN]){const first=new Error('first');retryChainS33(first,second);assert.ok(Object.hasOwn(first,'cause'));assert.ok(Object.is(Object.getOwnPropertyDescriptor(first,'cause').value,second));}
});
test('S review list foreground resumes application wait once after hidden destruction',()=>{
 for(const kind of ['index','history']){let count=0;const events=[],shell={trace(){},markVisible(){},focus(){}},list={init(p){count++;events.push('init');p.alive=true;},resume(p){count++;events.push('resume');p.alive=true;},destroy(p){p.alive=false;}};const p=load('pages/'+kind+'/'+kind+'.js',{'../../common/list-page':list,'../../common/shell':shell});p.onInit();p.onHide();p.onShow();assert.equal(count,2);assert.deepEqual(events,['init','resume']);assert.equal(p.alive,true);}
});
test('S review too-small valid device rejects visible layout instead of early-ready blank',()=>{
 const p={listGen:0},layout=load('common/layout.js',{}),info={windowWidth:412,windowHeight:300,screenShape:'rect'},shell={params(){return{};},init(p,cb){p.ready=true;p.w=412;p.h=300;cb(info);},trace(){},ensure(){},focus(){},clear(){}};const list=load('common/list-page.js',{'./store-page':{},'./shell':shell,'./layout':layout});assert.throws(()=>list.init(p,'index'));assert.equal(p.ready,false);assert.equal(p.loading,false);assert.ok(p.message);
});
test('S review shared day trash controllers do not label their phases as index',()=>{
 for(const kind of ['day','trash']){const f=listFixture('index');f.p.kind=kind;f.waiting[0](null);f.pending[0](null,{items:[],hasMore:false});assert.ok(!f.logs.some(r=>r.s==='S/index.done'),'wrong page attribution');}
});
test('S round3 list resume preserves current filter and page offset rather than init defaults',()=>{
 const f=listFixture();f.waiting[0](null);f.pending[0](null,{items:[],hasMore:false});f.p.filter='pinned';f.p.offset=6;f.p.sectionTitle='pinned label';f.list.destroy(f.p);assert.equal(typeof f.list.resume,'function');f.list.resume(f.p,'index');f.waiting[1](null);assert.equal(f.calls.at(-1).filter,'pinned');assert.equal(f.calls.at(-1).offset,6);assert.equal(f.p.sectionTitle,'pinned label');
});
test('S round3 history resume preserves selected month and summary page offset',()=>{
 const f=listFixture('history');f.waiting[0](null);f.pending[0](null,{items:[],hasMore:false});f.p.month='2024-02';f.p.monthLabel='2024 label';f.p.offset=2;f.list.destroy(f.p);assert.equal(typeof f.list.resume,'function');f.list.resume(f.p,'history');f.waiting[1](null);assert.equal(f.calls.at(-1).month,'2024-02');assert.equal(f.p.monthLabel,'2024 label');const items=[1,2,3,4].map(d=>({id:'id'+d,date:'2024-02-0'+d,time:'12:00',title:'Title',preview:'Preview',pinned:false}));f.pending.at(-1)(null,{items,hasMore:false});assert.equal(f.p.offset,2);assert.equal(f.p.rows[0].date,'2024-02-02');
 // Verbatim strictly completed round11 finding, resp_036d6f42bc825433006af09848256881969704b6d307a03db5.
 const finding="entry/src/main/js/MainAbility/common/list-page.js (monthFetch/monthPaint): the new retained paintOffset is not range-checked after rescanning. Minimal counterexample: history has slots=k, offset=k (second page), and after its final day's records are removed, the rescan returns exactly k remaining day summaries. monthPaint(p,k) passes an empty slice to paint, setting rows=[] and empty=true despite a nonempty month. Refresh/resume therefore produces an invalid, false-empty page.";
 for(const route of ['refresh','resume']){
  const c=listFixture('history');c.p.month='2024-02';c.p.monthLabel='2024 label';c.waiting[0](null);const k=c.p.slots;
  const original=Array.from({length:k+1},(_,i)=>({id:'day'+(i+1),date:'2024-02-'+String(i+1).padStart(2,'0'),time:'12:00',title:'Title',preview:'Preview',pinned:false}));
  c.pending[0](null,{items:original,hasMore:false});assert.equal(c.p.days.length,k+1);c.list.next(c.p);assert.equal(c.p.offset,k);assert.equal(c.p.rows.length,1);assert.equal(c.p.rows[0].date,'2024-02-01');
  const remaining=original.slice(1);assert.equal(remaining.length,k);
  if(route==='resume'){c.list.destroy(c.p);c.list.resume(c.p,'history');c.waiting[1](null);}else c.list.refresh(c.p);
  assert.equal(c.calls.at(-1).offset,0);assert.equal(c.calls.at(-1).month,'2024-02');c.pending.at(-1)(null,{items:remaining,hasMore:false});
  assert.equal(c.p.days.length,k);assert.equal(c.p.rows.length,k,route+': '+finding);assert.equal(c.p.empty,false);assert.equal(c.p.offset,0);assert.equal(c.p.hasPrev,false);assert.equal(c.p.hasMore,false);assert.equal(c.p.pageText,'1');assert.equal(c.p.month,'2024-02');assert.equal(c.p.monthLabel,'2024 label');
 }
});
test('S round3 invalid resumed device retry uses query-preserving resume rather than init',()=>{
 for(const kind of ['index','history']){const events=[],shell={trace(){},retryStore(){events.push('retry');}},list={init(){events.push('init');},resume(){events.push('resume');},refresh(){events.push('refresh');}};const p=load('pages/'+kind+'/'+kind+'.js',{'../../common/list-page':list,'../../common/shell':shell});p.kind=kind;p.ready=false;p.loading=true;p.allowed=false;p.alive=true;p.retry();assert.deepEqual(events,['retry','resume']);}
});
test('S round3 query-preserving resume reports synchronous device failure and retains query',()=>{
 const f=listFixture();f.waiting[0](null);f.pending[0](null,{items:[],hasMore:false});f.p.filter='pinned';f.p.offset=6;f.list.destroy(f.p);const sent=new Error('resume device failure'),shell={params(){return{};},init(){throw sent;},trace(){},clear(){},focus(){}};const list=load('common/list-page.js',{'./store-page':{},'./shell':shell,'./layout':load('common/layout.js',{})});assert.throws(()=>list.resume(f.p,'index'),e=>e===sent);assert.equal(f.p.loading,false);assert.ok(f.p.message);assert.equal(f.p.filter,'pinned');assert.equal(f.p.offset,6);
});
test('S round4 hidden history queued paging and open cannot focus route or restart query',()=>{
 const effects=[],layout=load('common/layout.js',{}),shell={params(){return{};},init(p,cb){p.ready=true;cb({windowWidth:412,windowHeight:484,screenShape:'rect'});},ensure(){},focus(){effects.push('focus');},nav(){effects.push('nav');},clear(){},trace(){}};const list=load('common/list-page.js',{'./store-page':{list(){effects.push('read');}},'./shell':shell,'./layout':layout}),p={listGen:0};list.init(p,'history');p.allowed=true;p.loading=false;p.hasMore=true;p.hasPrev=true;p.offset=2;list.destroy(p);list.next(p);list.prev(p);list.open(p,{id:'2024-02-01',date:'2024-02-01'});list.month(p,-1);list.toggle(p);assert.deepEqual(effects,[]);assert.equal(p.offset,2);
});
test('S round4 new resume failure diagnostic is fixed label and never forwards raw exception',()=>{
 const sent=new Error('private-synthetic-canary/path?secret=synthetic'),logs=[],shell={init(){throw sent;},trace(p,stage,e){logs.push({stage,e});}},list=load('common/list-page.js',{'./store-page':{},'./shell':shell,'./layout':{}}),p={kind:'index',month:'2024-02',alive:false,listGen:0,offset:0};assert.throws(()=>list.resume(p,'index'),e=>e===sent);assert.ok(logs.some(r=>r.stage==='S/list.resume.failed'));assert.ok(logs.every(r=>r.e===undefined));assert.ok(!JSON.stringify(logs).includes('private-synthetic-canary'));
});
for(const kind of ['index','history'])test('S round7b initial '+kind+' native device synchronous throw reports visible failure with exact identity',()=>{
 const sent=new Error('first device synchronous failure'),timers=new Map();let request;
 const layout=load('common/layout.js',{}),store={bind(){}},session={bind(){}},shell=load('common/shell.js',{'./store-page':store,'./session':session,'./layout':layout,'@system.router':{},'@system.device':{getInfo(o){request=o;throw sent;}}},{setTimeout(f){timers.set(1,f);return 1;},clearTimeout(i){timers.delete(i);}});
 const list=load('common/list-page.js',{'./store-page':store,'./shell':shell,'./layout':layout}),p={listGen:0};
 assert.throws(()=>list.init(p,kind),e=>e===sent);assert.equal(p.ready,false);assert.equal(p.loading,false);assert.ok(p.message);assert.notEqual(p.message,'\u6b63\u5728\u8bfb\u53d6\u8bbe\u5907');assert.equal(timers.size,0);
 request.success({windowWidth:412,windowHeight:484,screenShape:'rect'});assert.equal(p.ready,false,'late success cannot reverse the error');
});
for(const params of [{month:'2024-13'},{month:'0000-01'},{month:'2024-02',day:'2024-02-31',kind:'day'}])test('S round7b invalid date Retry retains original validation '+JSON.stringify(params),()=>{
 const kind=params.kind||'history',calls=[],layout=load('common/layout.js',{}),shell={params(){return params;},init(p,cb){p.ready=true;p.w=412;p.h=484;cb({windowWidth:412,windowHeight:484,screenShape:'rect'});},ensure(p,cb){cb(null);},clear(){},focus(){},trace(){}},store={list(q,cb){calls.push(q);cb(null,{items:[],hasMore:false});}};
 const list=load('common/list-page.js',{'./store-page':store,'./shell':shell,'./layout':layout}),p={listGen:0};list.init(p,kind);assert.equal(p.ready,false);assert.ok(p.message);list.resume(p,kind);assert.equal(p.ready,false,'resume must not bypass invalid date');assert.ok(p.message);assert.equal(calls.length,0,'shape-only Store validation cannot authorize invalid UI month/day');assert.equal(p.month,params.month);
});
for(const kind of ['index','history'])test('S round7b queued '+kind+' Retry while hidden or destroyed cannot resurrect readiness',()=>{
 const events=[],shell={trace(){},markVisible(){},focus(){},retryStore(){events.push('retryStore');}},list={init(p){p.alive=true;p.ready=false;p.allowed=false;p.loading=true;},resume(p){events.push('device request');p.alive=true;},refresh(){events.push('read');},destroy(p){p.alive=false;p.loading=false;}};
 const p=load('pages/'+kind+'/'+kind+'.js',{'../../common/list-page':list,'../../common/shell':shell});p.onInit();p.onHide();p.retry();assert.equal(p.alive,false);assert.deepEqual(events,[]);p.onDestroy();p.retry();assert.equal(p.alive,false);assert.deepEqual(events,[]);
});

test('S36 configurable readonly own chain slots retain second and both old values',()=>{
 const first=new Error('first'),second=new Error('second');
 Object.defineProperties(first,{cause:{value:1,configurable:true},next:{value:2,configurable:true}});
 const before=Object.getOwnPropertyDescriptors(first);retryChainS33(first,second);
 assert.ok(chainHasS33(first,second),'configurable readonly data slot can retain second, not only log it');
 for(const value of [1,2])assert.ok(chainHasS33(first,value),'all earlier own chain values retained');
 for(const key of ['cause','next']){const d=Object.getOwnPropertyDescriptor(first,key);for(const flag of ['writable','enumerable','configurable'])assert.equal(d[flag],before[key][flag]);}
});
test('S36 configurable readonly data fallback never consumes or replaces configurable accessor',()=>{
 const first=new Error('first'),second=new Error('second');let gets=0,sets=0;
 const get=()=>{gets++;throw Error('unsafe getter');},set=()=>{sets++;throw Error('unsafe setter');};
 Object.defineProperty(first,'next',{get,set,enumerable:true,configurable:true});
 Object.defineProperty(first,'cause',{value:'earlier',writable:false,enumerable:true,configurable:true});
 const accessor=Object.getOwnPropertyDescriptor(first,'next');retryChainS33(first,second);
 assert.ok(chainHasS33(first,second));assert.ok(chainHasS33(first,'earlier'));
 assert.deepEqual(Object.getOwnPropertyDescriptor(first,'next'),accessor);assert.equal(gets,0);assert.equal(sets,0);
 const data=Object.getOwnPropertyDescriptor(first,'cause');assert.equal(data.writable,false);assert.equal(data.enumerable,true);assert.equal(data.configurable,true);
});
test('S36 frozen first retains second through existing mutable own data chain without touching root',()=>{
 for(const key of ['cause','next']){
  const child={},first=new Error('first'),second=new Error('second');first[key]=child;Object.freeze(first);
  const before=Object.getOwnPropertyDescriptors(first);retryChainS33(first,second);
  assert.ok(chainHasS33(first,second),'frozen first has a reachable mutable child');
  assert.deepEqual(Object.getOwnPropertyDescriptors(first),before);assert.equal(first[key],child);
 }
});
test('S36 frozen first traverses cyclic frozen branches to mutable descendant with zero accessor consumption',()=>{
 const first=new Error('first'),blocked={},branch={},leaf={},second=new Error('second');let gets=0,sets=0;
 const get=()=>{gets++;throw Error('unsafe getter');},set=()=>{sets++;throw Error('unsafe setter');};
 Object.defineProperty(leaf,'cause',{get,set,configurable:true});leaf.next='earlier';
 first.cause=blocked;first.next=branch;blocked.cause=first;blocked.next=branch;
 branch.cause=blocked;branch.next=leaf;Object.freeze(first);Object.freeze(blocked);Object.freeze(branch);
 const before=[first,blocked,branch].map(x=>Object.getOwnPropertyDescriptors(x)),accessor=Object.getOwnPropertyDescriptor(leaf,'cause');
 retryChainS33(first,second);assert.ok(chainHasS33(first,second));assert.ok(chainHasS33(first,'earlier'));
 for(const [i,x] of [first,blocked,branch].entries())assert.deepEqual(Object.getOwnPropertyDescriptors(x),before[i]);
 assert.deepEqual(Object.getOwnPropertyDescriptor(leaf,'cause'),accessor);assert.equal(gets,0);assert.equal(sets,0);
});
test('S36 frozen root child reuse retains every previous second and child value',()=>{
 const child={cause:'old cause',next:'old next'},first=Object.freeze(Object.assign(new Error('first'),{cause:child}));
 const seconds=[new Error('second A'),new Error('second B'),new Error('second C')];
 for(const second of seconds)retryChainS33(first,second);
 for(const value of [...seconds,'old cause','old next'])assert.ok(chainHasS33(first,value));
 assert.equal(first.cause,child);
});

test('S40 toggle fetch preserves original storage throw when loading getter throws',()=>{
 const original=new Error('S40 storage original'),secondary=new Error('S40 loading getter');
 const writes=[],calls=[],logs=[];let gets=0;
 const p={alive:true,allowed:true,filter:'all',listGen:0,slots:1};
 Object.defineProperty(p,'loading',{get(){gets++;throw secondary;},set(v){writes.push(v);}});
 const list=load('common/list-page.js',{'./store-page':{list(q){calls.push(q);throw original;}},'./shell':{trace(p,s,e){logs.push({s,e});}},'./layout':{}});
 let caught,threw=false;try{list.toggle(p);}catch(e){caught=e;threw=true;}
 assert.equal(threw,true);assert.equal(caught,original,'best-effort loading guard must not replace storage exception');
 assert.equal(gets,1);assert.deepEqual(writes,[true]);assert.equal(calls.length,1);
 assert.equal(calls[0].offset,0);assert.equal(calls[0].filter,'pinned');assert.equal(p.listGen,1);
 assert.ok(logs.some(r=>r.s==='L/list.throw'&&r.e===original));assert.ok(!logs.some(r=>r.s==='L/list.return'));
});


test('S41 history scan preserves original storage throw when loading getter throws',()=>{
 const outcomes=[];
 for(const mode of ['setter-arms-getter','store-redefines-getter']){
  const original=new Error('S41 storage original'),secondary=new Error('S41 loading getter');
  const writes=[],calls=[],logs=[];let gets=0,armed=false;
  const p={ready:true,alive:true,allowed:true,kind:'history',month:'2024-02',offset:0,listGen:0,slots:1};
  Object.defineProperty(p,'loading',{configurable:true,get(){gets++;if(armed)throw secondary;return false;},set(v){writes.push(v);if(mode==='setter-arms-getter'&&v===true)armed=true;}});
  const list=load('common/list-page.js',{'./store-page':{list(q){calls.push(q);if(mode==='store-redefines-getter')Object.defineProperty(p,'loading',{get(){gets++;throw secondary;}});throw original;}},'./shell':{trace(p,s,e){logs.push({s,e});}},'./layout':{}});
  let caught,threw=false;try{list.refresh(p);}catch(e){caught=e;threw=true;}
  outcomes.push({mode,original,caught,threw,gets,writes,calls,logs,p});
 }
 for(const r of outcomes){
  assert.equal(r.threw,true);assert.equal(r.caught,r.original,r.mode+': loading getter must not replace original month storage exception');
  assert.equal(r.gets,2);assert.deepEqual(r.writes,[true]);assert.equal(r.calls.length,1);
  assert.equal(r.calls[0].offset,0);assert.equal(r.calls[0].limit,12);assert.equal(r.calls[0].filter,'month');assert.equal(r.calls[0].month,'2024-02');assert.equal(r.p.listGen,1);
  assert.ok(r.logs.some(v=>v.s==='L/month.throw'&&v.e===r.original));assert.ok(!r.logs.some(v=>v.s==='L/month.return'));assert.equal(r.p.days.length,0);
 }
});
