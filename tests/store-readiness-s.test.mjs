import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {FileHost,moduleFor,call,seal} from './file-host.mjs';
// HOST callback seams, with actual source and real disk except explicit hostile callbacks.
async function fixture(t){const host=await FileHost.temporary(),m=await moduleFor(host);t.after(async()=>{m.store.dispose();await host.cleanup();});return {host,...m};}
const mkdirSeed=async(h,files)=>{await fs.mkdir(h.root+'/lb1');for(const [n,v] of Object.entries(files))await fs.writeFile(h.root+'/lb1/'+n,v);};
const bytes=async(h)=>{const out={};async function walk(dir){for(const n of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+n.name;if(n.isDirectory())await walk(p);else out[p.slice(h.root.length)]=await fs.readFile(p,'utf8');}}await walk(h.root);return out;};

test('S init concurrent callers share one actual mkdir and one result',async t=>{
 const {host:h,store:s}=await fixture(t);h.inject('mkdir',null,'stall');const got=[];
 s.init((e,v)=>got.push([0,e,v]));await h.waitForStall();s.init((e,v)=>got.push([1,e,v]));
 assert.deepEqual(got,[],'second caller must wait, not report busy');assert.equal(h.calls.filter(c=>c.method==='mkdir').length,1);
 await h.release();await h.idle();assert.equal(got.length,2);assert.ok(got.every(r=>r[1]===null&&r[2]===true));
});
test('S already-ready init is idempotent without mkdir catalog or recovery IO',async t=>{
 const {host:h,store:s}=await fixture(t);await call(s,'init');const n=h.calls.length;assert.equal(await call(s,'init'),true);assert.equal(h.calls.length,n);
});
test('S sync native read throw keeps exact error identity and completes failed init',async t=>{
 const {host:h,store:s}=await fixture(t),sentinel=new Error('sync-native-S');h.readText=()=>{throw sentinel;};let received;
 s.init(e=>{received=e;});await h.idle();assert.equal(received,sentinel);
});
test('S read result getter throw is an error completion rather than lost callback',async t=>{
 const {host:h,store:s}=await fixture(t),pending=[],sentinel=new Error('text-getter-S');h.mkdir=o=>o.success();h.readText=o=>pending.push(o);let received,count=0;
 s.init(e=>{received=e;count++;});assert.equal(pending.length,2);
 const result={};Object.defineProperty(result,'text',{get(){throw sentinel;}});
 assert.doesNotThrow(()=>pending[0].success(result));assert.equal(count,0,'both independent reads must drain');pending[1].fail('missing',301);
 assert.equal(count,1);assert.equal(received,sentinel);pending[0].success({text:seal(0,{pages:0})});assert.equal(count,1);
});
test('S mkdir never-callback watchdog fails at original 10s without follow-up get or duplicate init',async t=>{
 const {host:h,store:s}=await fixture(t);h.inject('mkdir',null,'stall');let count=0,last;
 s.init(e=>{count++;last=e;});await h.waitForStall();h.clock.advance(9999);assert.equal(count,0);h.clock.advance(1);await h.idle();
 assert.equal(count,1);assert.ok(String(last).includes('timeout'));assert.deepEqual(h.calls.map(c=>c.method),['mkdir'],'timeout does not mean native mkdir was canceled');
 const n=h.calls.length;let retry;s.init(e=>{retry=e;});assert.ok(retry);assert.equal(h.calls.length,n,'retry cannot create a second in-flight mkdir');
 await h.release();await h.idle();assert.equal(count,1);await call(s,'init');assert.deepEqual(Array.from((await call(s,'list',{})).items),[]);
});
test('S two held catalog reads fail once and fence re-init until both original callbacks return',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{});h.inject('readText',/\/c[01]\.json$/,'stall',2);let count=0,last;
 s.init(e=>{count++;last=e;});await h.waitForStall();await h.idle();assert.equal(h.pending.length,2);h.clock.advance(10000);assert.equal(count,1);assert.ok(last);
 const n=h.calls.length;let retry;s.init(e=>retry=e);assert.ok(retry);assert.equal(h.calls.length,n);
 const original=h.pending.splice(0);await original[0]();s.init(e=>retry=e);assert.equal(h.calls.length,n,'one outstanding native read still blocks init');await original[1]();assert.equal(count,1);
 await call(s,'init');assert.equal((await call(s,'list',{})).total,0);
});
test('S first catalog write stall remains failure and refuses retry until existing late-write rollback',async t=>{
 const {host:h,store:s}=await fixture(t);h.inject('writeText',/\/c0\.json$/,'stall');const failure=assert.rejects(call(s,'init'),/timeout/);
 await h.waitForStall();h.clock.advance(10000);await failure;const n=h.calls.length;await assert.rejects(call(s,'init'));assert.equal(h.calls.length,n);
 await h.release();await h.idle();await call(s,'init');assert.equal((await call(s,'list',{})).total,0);
});
test('S catalog read-back failure preserves failure and inactive cleanup without empty success',async t=>{
 const {host:h,store:s}=await fixture(t);h.inject('writeText',/\/c0\.json$/,'corrupt');await assert.rejects(call(s,'init'),/verification/);await assert.rejects(call(s,'list',{}),/initialized/);await call(s,'init');
});
for(const [label,files] of [
 ['new library',{}],['one missing catalog',{'c0.json':seal(2,{pages:0})}],
 ['valid double catalog',{'c0.json':seal(2,{pages:0}),'c1.json':seal(1,{pages:0})}],
 ['one damaged catalog',{'c0.json':'broken','c1.json':seal(1,{pages:0})}]
])test('S normal readiness: '+label,async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,files);assert.equal(await call(s,'init'),true);assert.equal((await call(s,'list',{})).total,0);
 for(const [n,v] of Object.entries(files))assert.equal(await fs.readFile(h.root+'/lb1/'+n,'utf8'),v,'existing slot bytes stay unchanged');
});
test('S two damaged catalog slots fail read-only and preserve every byte on retry',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{'c0.json':'damaged0','c1.json':'damaged1','private-record.txt':'synthetic-preserved-body'});const before=await bytes(h);
 await assert.rejects(call(s,'init'),/Corrupt/);await assert.rejects(call(s,'init'),/Corrupt/);assert.deepEqual(await bytes(h),before);assert.equal(h.calls.filter(c=>c.method==='writeText'||c.method==='delete').length,0);
});
test('S both native catalog failures are not absence and never initialize empty storage',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{'c0.json':seal(2,{pages:0}),'c1.json':seal(1,{pages:0})});const before=await bytes(h);
 h.inject('readText',/\/c[01]\.json$/,'fail',2);await assert.rejects(call(s,'init'));assert.deepEqual(await bytes(h),before);assert.equal(h.calls.filter(c=>c.method==='writeText'||c.method==='delete').length,0);
});
test('S destroy existing-catalog init suppresses late recovery and never publishes ready',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{'c0.json':seal(0,{pages:0})});const before=await bytes(h);h.inject('readText',/\/c0\.json$/,'stall');let count=0,err;
 s.init(e=>{count++;err=e;});await h.waitForStall();await h.idle();s.dispose();assert.equal(count,1);assert.ok(err);const n=h.calls.length;await h.release();await h.idle();assert.equal(h.calls.length,n);assert.equal(count,1);assert.deepEqual(await bytes(h),before);await assert.rejects(call(s,'init'),/disposed/);
});
test('S throwing init subscriber cannot suppress others and callback throw is not native failure',async t=>{
 const {host:h,store:s}=await fixture(t),sentinel=new Error('subscriber-S');const pending=[];h.mkdir=o=>pending.push(o);h.get=o=>o.fail('missing',301);h.readText=o=>o.fail('missing',301);h.writeText=o=>o.success();let second=0,got;
 // Force first commit verification failure without an unrelated host read stub.
 s.init(()=>{throw sentinel;});s.init(e=>{second++;got=e;});assert.equal(second,0);
 assert.throws(()=>pending[0].fail('native-failure',300),e=>e===sentinel);assert.equal(second,1);assert.ok(got);assert.notEqual(got,sentinel);
});
test('S disposed preparation drains both pending reads even when observer throws',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{});h.inject('readText',/\/c[01]\.json$/,'stall',2);const sent=new Error('dispose observer');let count=0;
 s.init(()=>{count++;throw sent;});await h.waitForStall();await h.idle();assert.throws(()=>s.dispose(),e=>e===sent);assert.equal(count,1);assert.equal(h.clock.timers.size,0);await h.release();await h.idle();assert.equal(count,1);
});
test('S native original error with hostile message getter completes init without consuming getter',async t=>{
 const {host:h,store:s}=await fixture(t);const sent={};let reads=0,got;Object.defineProperty(sent,'message',{get(){reads++;throw new Error('diagnostic coercion');}});h.readText=()=>{throw sent;};s.init(e=>got=e);await h.idle();assert.equal(got,sent);assert.equal(reads,0);
});
test('S review recovery delete timeout fails prep until original native delete completion',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{'c0.json':seal(0,{pages:0}),'g0.json':seal(0,{blobs:[{token:'orphan',count:1}]}),'borphan_0.txt':'kept-until-existing-GC'});h.inject('delete',/borphan_0/,'stall');let result;
 s.init(e=>result=e);await h.waitForStall();h.clock.advance(10000);await h.idle();assert.ok(result,'native GC timeout cannot publish ready');const n=h.calls.length;await assert.rejects(call(s,'draftPut',{body:'new'}));await assert.rejects(call(s,'init'));assert.equal(h.calls.length,n);await h.release();await h.idle();await call(s,'init');
});
test('S review async valid-checksum null index roots fails without orphaned preparation callback',async t=>{
 const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{'c0.json':seal(0,{pages:1})});await fs.mkdir(h.root+'/lb1/p0');await fs.writeFile(h.root+'/lb1/p0/i0.json',seal(0,{items:[null]}));let received,count=0;
 // Use deferred originals, so processing really runs outside initial task.work catch.
 const read=h.readText.bind(h);h.readText=o=>{if(o.uri.endsWith('/p0/i0.json')){const success=o.success;o.success=v=>{try{success(v);}catch(e){received=e;}};}read(o);};s.init(e=>{received=e;count++;});await h.idle();assert.equal(count,1,'checksummed corrupt roots must complete error once');assert.ok(received);await assert.rejects(call(s,'list',{}));
});
test('S round3 mkdir fallback descriptor failure delivers exact error after async completion',async t=>{
 const {host:h,store:s}=await fixture(t),sent=new Error('directory getter'),requests=[];h.mkdir=o=>o.fail('already exists',300);h.get=o=>requests.push(o);let count=0,result;
 s.init(e=>{result=e;count++;});assert.equal(requests.length,1);const info={};Object.defineProperty(info,'type',{get(){throw sent;}});assert.doesNotThrow(()=>requests[0].success(info));assert.equal(result,sent);assert.equal(count,1);assert.equal(h.clock.timers.size,0);
});
test('S round3 mkdir native error timeout accessor is not read or substituted',async t=>{
 const {host:h,store:s}=await fixture(t);let reads=0,result;const sent=new Error('native mkdir original');Object.defineProperty(sent,'timeout',{get(){reads++;throw new Error('accessor substitute');}});h.mkdir=()=>{throw sent;};h.get=o=>o.fail('missing',301);s.init(e=>result=e);assert.ok(result);assert.equal(reads,0);
});
test('S round4 retained native write then synchronous throw fences cleanup and retry until actual completion',async t=>{
 const {host:h,store:s}=await fixture(t),sent=new Error('started write threw'),writes=[],deletes=[];h.mkdir=o=>o.success();h.readText=o=>o.fail('missing',301);h.writeText=o=>{writes.push(o);throw sent;};h.delete=o=>{deletes.push(o);o.success();};let result,count=0;s.init(e=>{result=e;count++;});assert.equal(result,sent);assert.equal(count,1);assert.equal(writes.length,1);assert.equal(deletes.length,0,'cannot remove c0 while original write is active');let retry;s.init(e=>retry=e);assert.ok(retry);assert.equal(writes.length,1);writes[0].success();assert.equal(count,1);assert.equal(deletes.length,1,'late completion uses existing rollback only');
 // round16 standards segment2 original counterexample, outside initialization:
 // ready Store -> c0 accepted/retained then throws -> no delete or same-URI retry
 // until that actual native completion and the original rollback both finish.
 const f=await fixture(t),rh=f.host,rs=f.store,nativeError=new Error('accepted ready write threw');
 const c0=seal(0,{pages:0}),c1=seal(1,{pages:0});await mkdirSeed(rh,{'c0.json':c0,'c1.json':c1});await call(rs,'init');
 const nativeWrite=rh.writeText.bind(rh);let held=null,received,calls=0;
 rh.writeText=o=>{if(!held&&o.uri==='internal://app/lb1/c0.json'){held=o;throw nativeError;}nativeWrite(o);};
 rs.save({id:'ready-race',body:'first saved body'},e=>{received=e;calls++;});await rh.idle();
 assert.ok(held,'counterexample reached actual c0 commit');assert.equal(received,nativeError);assert.equal(calls,1);
 assert.equal(rh.calls.filter(c=>c.method==='delete'&&c.uri===held.uri).length,0,'ready accepted write must not be deleted before its real completion');
 const beforeRetry=rh.calls.length;await assert.rejects(call(rs,'save',{id:'ready-race',body:'second saved body'}),/Uncertain/);assert.equal(rh.calls.length,beforeRetry,'no new native work while uncertain ready write is active');
 assert.equal(await fs.readFile(rh.root+'/lb1/c0.json','utf8'),c0);assert.equal(await fs.readFile(rh.root+'/lb1/c1.json','utf8'),c1);
 nativeWrite(held);await rh.idle();assert.equal(calls,1,'late original completion cannot redeliver user result');
 assert.equal(rh.calls.filter(c=>c.method==='delete'&&c.uri===held.uri).length,1,'only actual completion triggers existing rollback');
 await assert.rejects(fs.readFile(rh.root+'/lb1/c0.json','utf8'),e=>e.code==='ENOENT');assert.equal(await fs.readFile(rh.root+'/lb1/c1.json','utf8'),c1,'active generation untouched');
 const m=await call(rs,'save',{id:'ready-race',body:'second saved body'});assert.equal(m.id,'ready-race');assert.equal((await call(rs,'load',m.id)).body,'second saved body');
});
test('S33 native failure formatting cannot forge code301 catalog absence',async t=>{
 const {host:h,store:s}=await fixture(t),sent=Object.assign(new Error('format failure'),{code:301});
 const original=seal(7,{pages:0});await mkdirSeed(h,{'c0.json':original,'untouched.txt':'synthetic existing data'});
 const before=await bytes(h),nativeRead=h.readText.bind(h);let reads=0,called=0,received;
 h.readText=o=>{if(o.uri.endsWith('/c0.json')){reads++;o.fail({toString(){throw sent;}},500);}else nativeRead(o);};
 s.init(e=>{called++;received=e;});await h.idle();
 assert.equal(called,1);assert.equal(received,sent,'non301 native failure must retain the formatting sentinel, not publish ready');
 assert.equal(reads,1);assert.equal(h.calls.filter(c=>c.method==='writeText'||c.method==='delete').length,0);
 assert.deepEqual(await bytes(h),before);await assert.rejects(call(s,'list',{}),/initialized/);
});
test('S33 actual 3xx and hostile native status cannot authorize absence through thrown code301',async t=>{
 for(const nativeCode of [202,300,302,399,{toString(){throw Object.assign(new Error('status format'),{code:301});}}]){
  const {host:h,store:s}=await fixture(t);await mkdirSeed(h,{'c0.json':seal(0,{pages:0})});const before=await bytes(h);
  const sent=Object.assign(new Error('description format'),{code:301}),nativeRead=h.readText.bind(h);let received,called=0;
  h.readText=o=>o.uri.endsWith('/c0.json')?o.fail({toString(){throw sent;}},nativeCode):nativeRead(o);
  s.init(e=>{called++;received=e;});await h.idle();assert.equal(called,1);assert.ok(received);
  if(typeof nativeCode==='number')assert.equal(received,sent);
  assert.equal(h.calls.filter(c=>c.method==='writeText'||c.method==='delete').length,0);assert.deepEqual(await bytes(h),before);
 }
});
test('S round4 async recovery delete synchronous throw never consumes timeout accessor or loses completion',async t=>{
 const {host:h,store:s}=await fixture(t),sent=new Error('delete original');let reads=0,result,count=0;Object.defineProperty(sent,'timeout',{get(){reads++;throw new Error('timeout accessor substituted');}});await mkdirSeed(h,{'c0.json':seal(0,{pages:0}),'g0.json':seal(0,{blobs:[{token:'orphan',count:1}]}),'borphan_0.txt':'existing unreachable chunk'});h.delete=()=>{throw sent;};s.init(e=>{result=e;count++;});await h.idle();assert.equal(reads,0);assert.equal(count,1);assert.equal(result,sent);const n=h.calls.length;s.init(e=>result=e);assert.equal(h.calls.length,n);
});
for(const existing of [false,true])test('S round7b settled preparation never resumes deferred catalog after mkdir success then throw '+(existing?'existing':'new'),async t=>{
 const {host:h,store:s}=await fixture(t),sent=new Error('accepted mkdir callback then throw'),reads=[],writes=[],deletes=[];let mkdirCount=0;
 h.mkdir=o=>{mkdirCount++;o.success();throw sent;};h.readText=o=>reads.push(o);h.writeText=o=>writes.push(o);h.delete=o=>{deletes.push(o);o.success();};
 let count=0,received;s.init(e=>{count++;received=e;});assert.equal(count,1);assert.equal(received,sent);assert.equal(reads.length,2);
 let retry;s.init(e=>retry=e);assert.ok(retry);assert.equal(mkdirCount,1,'retry waits for actual old read callbacks');
 if(existing){reads[0].success({text:seal(0,{pages:0})});reads[1].fail('missing',301);}else{reads[0].fail('missing',301);reads[1].fail('missing',301);}
 assert.equal(reads.length,2,'settled catalog cannot enter old recovery');assert.equal(writes.length,0,'settled catalog cannot start a first commit');assert.equal(deletes.length,0);assert.equal(count,1);
 let listError;s.list({},e=>listError=e);assert.ok(listError,'late catalog callbacks cannot publish ready');
 h.mkdir=o=>{mkdirCount++;o.success();};s.init(()=>{});assert.equal(mkdirCount,2);assert.equal(reads.length,4,'one explicit fresh owner may now read catalog');assert.equal(writes.length,0);
});

const falsyS36=[0,-0,false,'',null,undefined,NaN];
function exactFailureS36(e,value){assert.ok(e,'caught falsy value is not callback success');const d=Object.getOwnPropertyDescriptor(e,'cause');assert.ok(d&&'value' in d,'retain actual thrown value without coercion');assert.ok(Object.is(d.value,value));}
test('S36 mkdir fail formatting throw0 still checks directory before any success',async t=>{
 const {host:h,store:s}=await fixture(t),gets=[],reads=[];let count=0,result;
 h.mkdir=o=>o.fail({toString(){throw 0;}},201);h.get=o=>gets.push(o);h.readText=o=>reads.push(o);
 s.init(e=>{count++;result=e;});assert.equal(gets.length,1,'mkdir failure must not bypass get');assert.equal(reads.length,0);assert.equal(count,0);
 const info={};Object.defineProperty(info,'type',{get(){throw 0;}});gets[0].success(info);
 assert.equal(count,1);exactFailureS36(result,0);assert.equal(reads.length,0);assert.equal(h.clock.timers.size,0);
});
for(const field of ['type','length'])test('S36 full4096 read stat '+field+' falsy throw cannot bypass size validation',async t=>{
 for(const value of falsyS36){
  const {host:h,store:s}=await fixture(t),requests=[],original=seal(3,{pages:0}).padEnd(4096,' ');await mkdirSeed(h,{'c0.json':original,'kept.txt':'unchanged'});const before=await bytes(h),nativeGet=h.get.bind(h);
  h.get=o=>o.uri.endsWith('/c0.json')?requests.push(o):nativeGet(o);let result,count=0;s.init(e=>{result=e;count++;});await h.idle();
  assert.equal(requests.length,1);assert.equal(count,0);const info={type:'file',length:4096};Object.defineProperty(info,field,{get(){throw value;}});
  requests[0].success(info);await h.idle();assert.equal(count,1);exactFailureS36(result,value);
  assert.equal(h.calls.filter(c=>c.method==='writeText'||c.method==='delete').length,0);assert.deepEqual(await bytes(h),before);assert.equal(h.clock.timers.size,0);
  await assert.rejects(call(s,'list',{}),/initialized/);
 }
});
test('S36 text getter falsy throw drains both reads without requesting stat or publishing ready',async t=>{
 for(const value of falsyS36){
  const {host:h,store:s}=await fixture(t),reads=[],gets=[];h.mkdir=o=>o.success();h.readText=o=>reads.push(o);h.get=o=>gets.push(o);let result,count=0;
  s.init(e=>{result=e;count++;});assert.equal(reads.length,2);const data={};Object.defineProperty(data,'text',{get(){throw value;}});
  reads[0].success(data);assert.equal(gets.length,0,'invalid text cannot enter stat');assert.equal(count,0);reads[1].fail('missing',301);
  assert.equal(count,1);exactFailureS36(result,value);reads[0].success({text:seal(0,{pages:0})});assert.equal(count,1);assert.equal(h.clock.timers.size,0);
 }
});
test('S36 native read falsy throw retains cause and cannot be confused with missing301',async t=>{
 for(const value of falsyS36){
  const {host:h,store:s}=await fixture(t),reads=[];h.mkdir=o=>o.success();h.readText=o=>{reads.push(o);throw value;};let result,count=0;
  s.init(e=>{result=e;count++;});assert.equal(count,1);assert.equal(reads.length,2);exactFailureS36(result,value);
  let blocked;s.init(e=>blocked=e);assert.ok(blocked);assert.equal(reads.length,2);for(const r of reads)r.fail('missing',301);assert.equal(count,1);assert.equal(h.clock.timers.size,0);
 }
});
test('S36 native mkdir success then falsy throw fails owner and suppresses pending continuation',async t=>{
 for(const value of falsyS36){
  const {host:h,store:s}=await fixture(t),reads=[],writes=[];h.mkdir=o=>{o.success();throw value;};h.readText=o=>reads.push(o);h.writeText=o=>writes.push(o);let result,count=0;
  s.init(e=>{result=e;count++;});assert.equal(reads.length,2);assert.equal(count,1);exactFailureS36(result,value);
  reads[0].success({text:seal(0,{pages:0})});reads[1].fail('missing',301);assert.equal(count,1);assert.equal(reads.length,2);assert.equal(writes.length,0);assert.equal(h.clock.timers.size,0);
  let blocked;s.list({},e=>blocked=e);assert.ok(blocked);
 }
});
test('S36 timer setup falsy throw fails before any native operation',async t=>{
 for(const value of falsyS36){
  const h=await FileHost.temporary();h.clock.setTimeout=()=>{throw value;};const {store:s}=await moduleFor(h);t.after(async()=>{s.dispose();await h.cleanup();});let result,count=0;
  s.init(e=>{result=e;count++;});assert.equal(count,1);exactFailureS36(result,value);assert.equal(h.calls.length,0);assert.equal(h.clock.timers.size,0);
 }
});
test('S36 falsy subscriber throw is rethrown exactly after remaining observers receive real failure',async t=>{
 for(const value of falsyS36){
  const {host:h,store:s}=await fixture(t),mkdir=[];h.mkdir=o=>mkdir.push(o);h.get=o=>o.fail('missing',301);let count=0,result;
  s.init(()=>{throw value;});s.init(e=>{count++;result=e;});let thrown=false,caught;try{mkdir[0].fail('native fail',300);}catch(e){thrown=true;caught=e;}
  assert.equal(thrown,true);assert.ok(Object.is(caught,value));assert.equal(count,1);assert.ok(result);assert.equal(h.clock.timers.size,0);
 }
});

test('S40 startup GC failure formatting keeps original error without consuming code getter',async t=>{
 const {host:h,store:s}=await fixture(t),deletes=[];
 await mkdirSeed(h,{'c0.json':seal(0,{pages:0}),'g0.json':seal(0,{blobs:[{token:'orphan',count:1}]}),'borphan_0.txt':'unreachable original'});
 const before=await bytes(h),first=new Error('S40 GC original'),second=new Error('S40 code getter');let codeGets=0,result,count=0;
 Object.defineProperty(first,'code',{get(){codeGets++;throw second;}});
 h.delete=o=>deletes.push(o);s.init(e=>{result=e;count++;});await h.idle();
 assert.equal(deletes.length,1);assert.equal(deletes[0].uri,'internal://app/lb1/borphan_0.txt');assert.equal(count,0);
 let escaped;try{deletes[0].fail({toString(){throw first;}},500);}catch(e){escaped=e;}
 await h.idle();assert.equal(codeGets,0,'error accessor is not a native status field');
 assert.equal(escaped,undefined,'formatting error is delivered by original error-first boundary');
 assert.equal(count,1);assert.equal(result,first);assert.equal(h.clock.timers.size,0);
 assert.deepEqual(await bytes(h),before);assert.equal(h.calls.filter(c=>c.method==='writeText').length,0);
 let listError;s.list({},e=>listError=e);assert.ok(listError,'failed GC cannot publish ready');
 deletes[0].success();deletes[0].fail('late missing',301);assert.equal(count,1);assert.equal(deletes.length,1);
});

