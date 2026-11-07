import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../entry/src/main/js/MainAbility');
const shellSrc=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
const listSrc=fs.readFileSync(path.join(root,'common/list-page.js'),'utf8');
const indexSrc=fs.readFileSync(path.join(root,'pages/index/index.js'),'utf8');
// Exact two-function M oracle from db79e2d. No git history or new fixture dependency in CI.
const M_APP="function app(p){var a=typeof $app==='undefined'?null:$app;a=a&&a.$def?a.$def:a;return a&&typeof a.whenLiubaiReady==='function'&&typeof a.getStore==='function'&&typeof a.getSession==='function'?a:null;}";
const M_PARAMS="function params(p){var a=app(p);if(a&&typeof a.getLiubaiParams==='function')return a.getLiubaiParams()||{};return {};}";
const mShell=shellSrc.replace(/^function app\(p\).*$/m,M_APP).replace(/^function params\(p\).*$/m,M_PARAMS);
function moduleAt(source,imports,globals={},globalRead){
 const code=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=');
 const ctx={imports,result:null,console,Date,Math,JSON,setTimeout(){return 1;},clearTimeout(){},...globals};
 if(globalRead)Object.defineProperty(ctx,'$app',{configurable:true,get:globalRead});
 vm.runInNewContext(code,ctx);return {module:ctx.result,app:ctx.app,ctx};
}
function imports(device){return {'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':device||{getInfo(){}},'@system.router':{replace(){}},'./layout':{valid(){return true;},home(){return {};}}};}
function application(logs){return {whenLiubaiReady(){},getStore(){},getSession(){},traceLiubai(stage){logs.push({stage});},errorLiubai(stage,error){logs.push({stage,error});}};}
function throwing(slot,source){
 const logs=[],sentinel=new Error('Expected a function.');let reads=0;
 const app=application(logs);
 Object.defineProperty(app,slot,{configurable:true,get(){reads++;throw sentinel;}});
 const f=moduleAt(source,imports(),{$app:app});return {...f,logs,sentinel,reads:()=>reads};
}
test('N direct-root throwing parameter getter falls back and reports the identical error; M throws',()=>{
 const cur=throwing('getLiubaiParams',shellSrc);
 assert.equal(JSON.stringify(cur.module.params({})),'{}');assert.equal(cur.reads(),1);
 assert.deepEqual(cur.logs.map(r=>r.stage),['L/params.call.throw']);assert.equal(cur.logs[0].error,cur.sentinel);
 const old=throwing('getLiubaiParams',mShell);assert.throws(()=>old.module.params({}),e=>e===old.sentinel);assert.equal(old.reads(),1);
});
test('N app resolution catches each readiness/store/session getter and returns null, with M counterexamples',()=>{
 for(const slot of ['whenLiubaiReady','getStore','getSession']){
  const cur=throwing(slot,shellSrc);assert.equal(cur.app({}),null);assert.equal(cur.reads(),1);
  assert.deepEqual(cur.logs.map(r=>r.stage),['L/app.resolve.throw']);assert.equal(cur.logs[0].error,cur.sentinel);
  const old=throwing(slot,mShell);assert.throws(()=>old.app({}),e=>e===old.sentinel);assert.equal(old.reads(),1);
 }
});
test('N swallowed root-resolution failure uses ensure existing error callback without binding',()=>{
 const cur=throwing('whenLiubaiReady',shellSrc);let error,called=0;
 assert.equal(cur.module.ensure({},e=>{error=e;called++;}),undefined);
 assert.equal(called,1);assert.equal(error.message,'App store readiness unavailable');assert.equal(cur.reads(),1);
 assert.ok(cur.logs.some(r=>r.stage==='L/app.resolve.throw'&&r.error===cur.sentinel));
 assert.ok(cur.logs.some(r=>r.stage==='L/app.ready.wait'));
});
test('N one-shot $def failure is not pre-read by diagnostics, then params returns its authorized fallback',()=>{
 function fixture(source){let reads=0;const sentinel=new Error('one-shot def');const app={};
  Object.defineProperty(app,'$def',{get(){reads++;throw sentinel;}});
  const f=moduleAt(source,imports(),{$app:app});return {...f,sentinel,reads:()=>reads};}
 const cur=fixture(shellSrc);cur.module.trace(null,'L/probe.enter');assert.equal(cur.reads(),0);
 assert.equal(JSON.stringify(cur.module.params({})),'{}');assert.equal(cur.reads(),1);
 const old=fixture(mShell);assert.throws(()=>old.module.params({}),e=>e===old.sentinel);assert.equal(old.reads(),1);
});
test('N stable direct and $def happy paths retain exact M getter counts, receiver and return identity',()=>{
 function run(source,wrapped){
  const counts={global:0,def:0,when:0,store:0,sess:0,params:0,called:0},events=[],route={id:'exact'};
  const app={};
  for(const [slot,label] of [['whenLiubaiReady','when'],['getStore','store'],['getSession','sess']])Object.defineProperty(app,slot,{get(){counts[label]++;return function(){};}});
  Object.defineProperty(app,'getLiubaiParams',{get(){counts.params++;return function(){assert.equal(this,app);assert.equal(arguments.length,0);counts.called++;return route;};}});
  const global=wrapped?{}:app;Object.defineProperty(global,'$def',{get(){counts.def++;return wrapped?app:undefined;}});
  const f=moduleAt(source,imports(),{},()=>{counts.global++;return global;});const result=f.module.params({});assert.equal(result,route);
  return {counts,events};
 }
 for(const wrapped of [false,true]){
  const old=run(mShell,wrapped),cur=run(shellSrc,wrapped);assert.deepEqual(cur,old);
  assert.equal(cur.counts.global,2);assert.equal(cur.counts.def,wrapped?2:1);assert.equal(cur.counts.params,2);assert.equal(cur.counts.called,1);
 }
});
test('N missing roots and falsey parameter returns retain M defaults without new error stages',()=>{
 for(const value of [null,undefined,false,0,'']){
  const logs=[],app=application(logs);app.getLiubaiParams=()=>value;
  const cur=moduleAt(shellSrc,imports(),{$app:app});assert.equal(JSON.stringify(cur.module.params({})),'{}');assert.deepEqual(logs,[]);
 }
 for(const globals of [{},{$app:null},{$app:{}},{$app:{$def:{}}}])assert.equal(JSON.stringify(moduleAt(shellSrc,imports(),globals).module.params({})),'{}');
});
test('N VM onInit probes precede list first, throwing params fallback, enter and real device request',()=>{
 const logs=[];let reads=0,device=0;const app=application(logs);
 Object.defineProperty(app,'getLiubaiParams',{get(){reads++;throw new Error('Expected a function.');}});
 const shell=moduleAt(shellSrc,imports({getInfo(){device++;}}),{$app:app}).module;
 const list=moduleAt(listSrc,{'./store-page':{bind(){}},'./shell':shell,'./layout':{home(){return {};}}}).module;
 const idx=moduleAt(indexSrc,{'../../common/list-page':list,'../../common/shell':shell},{$app:app}).module;
 assert.equal(idx.onInit(),undefined);assert.equal(reads,1,'descriptor probes must not consume the business getter');assert.equal(device,1);
 const stages=logs.map(r=>r.stage);let last=-1;
 for(const prefix of ['L/index.onInit.enter','L/probe.def ','L/probe.keys[','L/probe.app ','L/call.pre init=function','L/list.init.first','L/params.call.throw','L/list.init.enter','L/device.getInfo.enter','L/index.onInit.exit']){
  const at=stages.findIndex(s=>s.indexOf(prefix)===0);assert.ok(at>last,prefix+' missing or out of order: '+JSON.stringify(stages));last=at;
 }
 assert.ok(!stages.includes('L/index.onInit.throw'));
});
test('N probeApp inspects seven inherited and empty accessor descriptors without business getter execution',()=>{
 const names=['getLiubaiParams','setLiubaiParams','whenLiubaiReady','getStore','getSession','traceLiubai','errorLiubai'];
 function inspect(app){const logs=[];const idx=moduleAt(indexSrc,{'../../common/list-page':{init(){}},'../../common/shell':{trace(p,s){logs.push(s);}}},{$app:app}).module;
  idx.onInit();const probes=logs.filter(s=>s.indexOf('L/probe.app ')===0);assert.ok(probes.length,'app probe missing');for(const probe of probes)assert.ok(String(probe).length<=60,'raw app stage exceeds real tracePage cap: '+probe);return probes.join(' ');}
 let reads=0;const parent={};for(const n of names)Object.defineProperty(parent,n,{get(){reads++;throw new Error('business getter');}});
 const inherited=inspect(Object.create(parent));assert.equal(reads,0);for(const label of ['getL','setL','when','store','sess','trace','err'])assert.ok(inherited.includes(label+'=acc'),inherited);
 const empty={};for(const n of names)Object.defineProperty(empty,n,{get:undefined,set:undefined});
 const probe=inspect(empty);for(const label of ['getL','setL','when','store','sess','trace','err'])assert.ok(probe.includes(label+'=acc'),probe);
});

test('N app.resolve records the exact sentinel through a data-property $def and the unchanged real bridge',()=>{
 const logs=[],sentinel=new Error('business getter sentinel');let reads=0;
 const fail=function(){reads++;throw sentinel;};
 const def=application(logs);Object.defineProperty(def,'whenLiubaiReady',{get:fail});
 const root={$def:def};assert.equal(Object.getOwnPropertyDescriptor(root,'$def').value,def);
 const cur=moduleAt(shellSrc,imports(),{$app:root});
 assert.equal(cur.app({}),null);assert.equal(reads,1);
 assert.deepEqual(logs.map(r=>r.stage),['L/app.resolve.throw']);assert.equal(logs[0].error,sentinel);
 assert.equal(logs[0].error.message,'business getter sentinel');
 const old=moduleAt(mShell,imports(),{$app:root});assert.throws(()=>old.app({}),e=>e===sentinel);
 assert.equal(reads,2,'one business readiness getter read per invocation; bridge never pre-reads it');
});

test('N params.call records the exact throwing data-function sentinel through data $def and the unchanged real bridge',()=>{
 const logs=[],sentinel=new Error('Expected a function.');let calls=0;
 const def=application(logs);const fail=function(){assert.equal(this,def);assert.equal(arguments.length,0);calls++;throw sentinel;};
 Object.defineProperty(def,'getLiubaiParams',{value:fail});const root={$def:def};
 assert.equal(Object.getOwnPropertyDescriptor(root,'$def').value,def);
 assert.equal(Object.getOwnPropertyDescriptor(def,'getLiubaiParams').value,fail);
 const cur=moduleAt(shellSrc,imports(),{$app:root});assert.equal(JSON.stringify(cur.module.params({})),'{}');assert.equal(calls,1);
 assert.deepEqual(logs.map(r=>r.stage),['L/params.call.throw']);assert.equal(logs[0].error,sentinel);
 const old=moduleAt(mShell,imports(),{$app:root});assert.throws(()=>old.module.params({}),e=>e===sentinel);assert.equal(calls,2);
});

test('N all seven full-word descriptor kinds and $def type survive the real tracePage slice(0,60) channel',()=>{
 const appSrc=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.ok(appSrc.includes('stage = String(stage).slice(0, 60);'));
 const names=['getLiubaiParams','setLiubaiParams','whenLiubaiReady','getStore','getSession','traceLiubai','errorLiubai'];
 const labels=['getL','setL','when','store','sess','trace','err'];
 for(const mode of ['function','undefined','acc','m','E'])for(const defType of ['undefined','function','object']){
  const output=[],L={i(tag,msg){output.push({tag,msg});},e(tag,msg){output.push({tag,msg});}};
  const channel=moduleAt(appSrc,{'./common/logsink.js':L,'./common/log-config.js':{},'./common/store':{},'./common/session':{},'./common/shell':{isVisible(){return true;}}}).module;
  let reads=0;const observed={};
  for(const n of names){if(mode==='function')Object.defineProperty(observed,n,{value:function(){}});
   else if(mode==='undefined')Object.defineProperty(observed,n,{value:undefined});
   else if(mode==='acc')Object.defineProperty(observed,n,{get(){reads++;throw Error('descriptor probe must never read');}});
  }
  if(defType==='function')observed.$def=function(){};else if(defType==='object')observed.$def={};
  const target=mode==='E'?new Proxy(observed,{getOwnPropertyDescriptor(){throw Error('descriptor unavailable');}}):observed;
  const bridgeRoot={$def:channel};const shell=moduleAt(shellSrc,imports(),{$app:bridgeRoot}).module;
  const raw=[];const idx=moduleAt(indexSrc,{'../../common/list-page':{init(){}},'../../common/shell':shell},{$app:target});
  // Capture the submitted stages and forward every one into the real shell->appRoot->tracePage->L.i path.
  const realTrace=shell.trace;shell.trace=function(p,s,e){raw.push(s);if(arguments.length>2)realTrace(p,s,e);else realTrace(p,s);};
  idx.module.onInit();const submitted=raw.filter(s=>s.indexOf('L/probe.app ')===0);
  assert.equal(submitted.length,3,'all three app probe stages must be emitted');
  const emitted=output.filter(r=>r.tag==='stage'&&r.msg.indexOf('L/probe.app ')===0);assert.equal(emitted.length,3);
  for(let i=0;i<submitted.length;i++){assert.ok(String(submitted[i]).length<=60,submitted[i]);assert.equal(String(submitted[i]).slice(0,60),submitted[i]);assert.equal(emitted[i].msg,submitted[i]+' state=idle ready= allowed= loading= empty= w= h=','real channel retains its prior index-enter snapshot; assert the complete stage and real suffix');}
  const fields=emitted.map(r=>r.msg).join(' ');for(const label of labels)assert.ok(fields.includes(label+'='+mode+' '),'missing complete '+label+'='+mode+' in '+fields);
  assert.ok(fields.includes('def='+defType+' '),'$def type must remain complete');assert.equal(reads,0);
 }
});
