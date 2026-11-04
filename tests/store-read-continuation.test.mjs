import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDiskHost} from './store-disk-host.mjs';

// Explicit test data and callback faults only; never product defaults or FIT3 evidence.
const ROOT='internal://app/lb2/';
const sourcePath=process.env.LB_SOURCE_BASE ? new URL('file://'+process.env.LB_SOURCE_BASE+'/entry/src/main/js/MainAbility/common/store.js') : new URL('../entry/src/main/js/MainAbility/common/store.js',import.meta.url);
const source=fs.readFileSync(sourcePath,'utf8').replace('export default createStore;','this.createStore=createStore;');
const plain=x=>JSON.parse(JSON.stringify(x));
const checksum=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h;};
const envelope=data=>JSON.stringify({data,c:checksum(JSON.stringify(data))});
function load(){const ctx=vm.createContext({console:{error(){}}});vm.runInContext(source,ctx);return ctx;}
function root(q=0){return {q,n:0,p:[],d:0};}
function host({async=false,faults={},duplicate=false}={}){
  const files=new Map([['a.json',envelope(root(1))],['b.json',envelope(root(2))]].map(([n,s])=>[ROOT+n,s]));
  const calls=[],queue=[],getters=[],snapshots=[];let store;
  const api={};
  for(const method of ['mkdir','access','readText','writeText'])api[method]=o=>{
    calls.push({method,uri:o.uri});
    const run=()=>{
      if(method==='mkdir'){o.fail('test directory already exists',300);return;}
      if(method==='access'){if(o.uri==='internal://app/lb2'||files.has(o.uri))o.success();else o.fail('test missing',301);return;}
      if(method==='writeText'){files.set(o.uri,o.text);o.success();return;}
      if(!files.has(o.uri)){o.fail('test missing',301);return;}
      let response={text:files.get(o.uri)},reads=0;
      const type=faults[o.uri.slice(ROOT.length)];
      if(type==='getter-throw'||type==='read-once')response=Object.defineProperty({},'text',{get(){
        getters.push(o.uri);reads++;snapshots.push(plain(store.initState()));
        if(type==='getter-throw'||reads>1)throw Error('synthetic native property exception');
        return files.get(o.uri);
      }});
      o.success(response);
      if(duplicate){o.success(response);o.fail('synthetic duplicate',300);}
    };
    if(async)queue.push(run);else run();
  };
  return {api,calls,files,queue,getters,snapshots,bind(value){store=value;},drain(){let n=0;while(queue.length){assert.ok(++n<100,'test must be bounded');assert.doesNotThrow(queue.shift(),'no callback exception may escape');}}};
}
for(const async of [false,true]){
  test(`read continuation: ${async?'queued':'synchronous'} native text getter exception ends shared init without writes`,()=>{
    const h=host({async,faults:{'a.json':'getter-throw','b.json':'getter-throw'},duplicate:true}),ctx=load(),s=ctx.createStore(h.api);h.bind(s);
    const original=[...h.files];let calls=0,error;
    s.init(e=>{calls++;error=e;});h.drain();
    assert.equal(calls,1,'init must terminate rather than stay at RD_A_OK');
    assert.equal(error,'ROOT_DATA_TXT_THROW');
    assert.deepEqual(plain(s.initState()),{pending:false,phase:'FAILED',waiters:0});
    assert.equal(h.calls.some(x=>x.method==='writeText'),false);
    assert.deepEqual([...h.files],original,'read failure must preserve exact root bytes');
  });
}
test('read continuation: one failing native response uses the existing valid alternate root without repair writes',()=>{
  const h=host({faults:{'a.json':'getter-throw'}}),s=load().createStore(h.api);h.bind(s);let calls=0,error;
  s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,null);
  assert.equal(s.initState().pending,false);assert.equal(h.calls.some(x=>x.method==='writeText'),false);
});
test('read continuation: native text is captured once, before parsing, even when duplicate callbacks arrive',()=>{
  const h=host({faults:{'a.json':'read-once','b.json':'read-once'},duplicate:true}),s=load().createStore(h.api);h.bind(s);let calls=0,error;
  s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,null);
  assert.deepEqual(h.getters,[ROOT+'a.json',ROOT+'b.json'],'never touch an already-consumed native response property twice');
  assert.deepEqual(h.snapshots.map(x=>x.phase),['RD_A_TEXT','RD_B_TEXT']);
});
test('read continuation: validation exception is an init callback error, not a second parse/data callback',()=>{
  const h=host(),ctx=load(),s=ctx.createStore(h.api);h.bind(s);
  vm.runInContext('Math.ceil=function(){throw Error("synthetic runtime validation exception")};',ctx);
  let calls=0,error;s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,'INIT_CB_RD_A_ROOT');
  assert.deepEqual(plain(s.initState()),{pending:false,phase:'FAILED',waiters:0});
  assert.equal(h.calls.some(x=>x.uri===ROOT+'b.json'),false,'a handler failure must not reclassify parse output or launch alternate-root recovery');
  assert.equal(h.calls.some(x=>x.method==='writeText'),false);
});
test('read continuation: queued validation exception notifies all init observers once and normal retry uses native I/O',()=>{
  const h=host({async:true,duplicate:true}),ctx=load(),s=ctx.createStore(h.api);h.bind(s);
  vm.runInContext('this.ceilOriginal=Math.ceil;Math.ceil=function(){throw Error("synthetic validation exception")};',ctx);
  const errors=[];for(let i=0;i<8;i++)s.init(e=>errors.push(e));h.drain();
  assert.deepEqual(errors,Array(8).fill('INIT_CB_RD_A_ROOT'));
  assert.equal(s.initState().pending,false);assert.equal(s.initState().waiters,0);
  vm.runInContext('Math.ceil=ceilOriginal;',ctx);
  const count=h.calls.length;let retry=0,retryError;s.init(e=>{retry++;retryError=e;});h.drain();
  assert.equal(retry,1);assert.equal(retryError,null);
  assert.ok(h.calls.length>count,'a new safe retry follows fresh, genuinely completed native I/O');
  assert.equal(h.calls.some(x=>x.method==='writeText'),false);
});
test('read continuation: genuine parse failure still selects valid alternate root and never emits callback error',()=>{
  const h=host();h.files.set(ROOT+'a.json','{synthetic broken json');const original=[...h.files];
  const s=load().createStore(h.api);h.bind(s);let calls=0,error;s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,null);assert.deepEqual([...h.files],original);
  assert.equal(h.calls.some(x=>x.method==='writeText'),false);
});
test('read continuation: stages truthfully bracket JSON parse, checksum stringify and root validation',()=>{
  const h=host(),ctx=load(),s=ctx.createStore(h.api);h.bind(s);const markers=[];
  ctx.note=kind=>markers.push([kind,s.initState().phase]);
  vm.runInContext('var parseOriginal=JSON.parse,stringifyOriginal=JSON.stringify,ceilOriginal=Math.ceil;JSON.parse=function(s){note("parse");return parseOriginal(s);};JSON.stringify=function(s){note("sum");return stringifyOriginal(s);};Math.ceil=function(n){note("root");return ceilOriginal(n);};',ctx);
  let error;s.init(e=>{error=e;});assert.equal(error,null);
  assert.deepEqual(markers,[['parse','RD_A_JSON'],['sum','RD_A_SUM'],['root','RD_A_ROOT'],['parse','RD_B_JSON'],['sum','RD_B_SUM'],['root','RD_B_ROOT']]);
  assert.equal(s.initState().phase,'DONE');
});
test('read continuation: root metadata page response faults keep exact bounded code and preserve files',()=>{
  const h=host({faults:{'p0_1.json':'getter-throw'},duplicate:true});
  const r={q:1,n:1,p:[1],d:0};h.files.set(ROOT+'a.json',envelope(r));h.files.set(ROOT+'b.json',envelope(r));h.files.set(ROOT+'p0_1.json',envelope({r:[]}));
  const before=[...h.files],s=load().createStore(h.api);h.bind(s);let calls=0,error;s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,'ROOT_CONTENT_TXT_THROW');assert.ok(error.length<=26);
  assert.equal(s.initState().pending,false);assert.deepEqual([...h.files],before);assert.equal(h.calls.some(x=>x.method==='writeText'),false);
});
test('read continuation: pending recovery page response faults keep exact bounded code with no writes',()=>{
  const h=host({faults:{'p0_1.json':'getter-throw'}});h.files.set(ROOT+'txn.json',envelope({pending:true,root:{q:1,n:1,p:[1],d:0},slot:'a'}));h.files.set(ROOT+'p0_1.json',envelope({r:[]}));
  const before=[...h.files],s=load().createStore(h.api);h.bind(s);let calls=0,error;s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,'RECOVERY_CONTENT_TXT_THROW');assert.ok(error.length<=26);
  assert.equal(s.initState().pending,false);assert.deepEqual([...h.files],before);assert.equal(h.calls.some(x=>x.method==='writeText'),false);
});
test('read continuation: existing recovery write-verification fault keeps bounded code, retained journal and identical old root',()=>{
  const h=host({faults:{'b.json':'getter-throw'}});h.files.set(ROOT+'a.json',envelope(root(1)));h.files.set(ROOT+'b.json',envelope(root(1)));h.files.set(ROOT+'txn.json',envelope({pending:true,root:root(1),slot:'a'}));
  const before=[...h.files],s=load().createStore(h.api);h.bind(s);let calls=0,error;s.init(e=>{calls++;error=e;});
  assert.equal(calls,1);assert.equal(error,'RECOVERY_FAILED_TXT_THROW');assert.ok(error.length<=26);
  assert.equal(s.initState().pending,false);assert.deepEqual([...h.files],before);
  assert.deepEqual(h.calls.filter(x=>x.method==='writeText').map(x=>x.uri),[ROOT+'b.json'],'only existing recovery rewrites its target old root, never clears pending journal');
});

test('read continuation: real disk roots are byte-identical after response-property faults on both slots',async t=>{
  const disk=createDiskHost();t.after(()=>disk.close());
  await disk.write(ROOT+'a.json',envelope(root(1)));await disk.write(ROOT+'b.json',envelope(root(2)));
  const names=await disk.files(),before=await Promise.all(names.map(n=>disk.read(ROOT+n)));const api={...disk.api};
  api.readText=o=>disk.api.readText({...o,success(){o.success(Object.defineProperty({},'text',{get(){throw Error('synthetic response getter exception');}}));}});
  const s=load().createStore(api);
  const result=await Promise.race([new Promise(resolve=>s.init(e=>resolve({e}))),new Promise(resolve=>{const timer=setTimeout(()=>resolve({unsettled:true}),300);timer.unref();})]);
  assert.equal(result.unsettled,undefined,'real disk callback must not hang');
  assert.equal(result.e,'ROOT_DATA_TXT_THROW');
  assert.deepEqual(await disk.files(),names);assert.deepEqual(await Promise.all(names.map(n=>disk.read(ROOT+n))),before);
  assert.equal(disk.calls.some(x=>x.method==='writeText'),false);
});
