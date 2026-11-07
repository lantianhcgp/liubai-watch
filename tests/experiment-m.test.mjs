import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../entry/src/main/js/MainAbility');
const frozen=path.resolve(here,'fixtures/diagnostic-k');
const shellSrc=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
const frozenShell=fs.readFileSync(path.join(frozen,'shell.txt'),'utf8');
const listSrc=fs.readFileSync(path.join(root,'common/list-page.js'),'utf8');
function moduleAt(source,imports,globals={}){
 const code=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=');
 const ctx={imports,result:null,console,Date,Math,JSON,...globals};vm.runInNewContext(code,ctx);return ctx.result;
}
function shellImports(router,device){return {'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':device||{getInfo(){}},'@system.router':router||{replace(){}},'./layout':{valid(){return true;},home(){return {};}}};}
function appDef(extra){return Object.assign({whenLiubaiReady(){},getStore(){},getSession(){}},extra||{});}
test('M params tolerates truthy non-callable getLiubaiParams while frozen K throws',()=>{
 const d=appDef({getLiubaiParams:'not-a-function'});
 const g={$app:{$def:d},setTimeout(){},clearTimeout(){}};
 const cur=moduleAt(shellSrc,shellImports(),g);
 assert.equal(JSON.stringify(cur.params({})),'{}');
 const old=moduleAt(frozenShell,shellImports(),g);
 assert.throws(()=>old.params({}));
});
test('M nav skips non-callable setLiubaiParams and still forwards Router.replace while frozen throws',()=>{
 const replaced=[];
 const router={replace(v){replaced.push(v);}};
 const d=appDef({setLiubaiParams:'nope'});
 const g={$app:{$def:d},setTimeout(){},clearTimeout(){}};
 const cur=moduleAt(shellSrc,shellImports(router),g);
 cur.nav({},'read',{id:'x'});
 assert.equal(replaced.length,1);
 assert.equal(replaced[0].uri,'pages/read/read');
 const old=moduleAt(frozenShell,shellImports(router),g);
 assert.throws(()=>old.nav({},'read',{id:'x'}));
 assert.equal(replaced.length,1);
});
test('M focus and clear tolerate a page without $refs and report no error stage',()=>{
 const stages=[];
 const d=appDef({traceLiubai(s){stages.push(s);},errorLiubai(s){stages.push('E:'+s);}});
 let tick=null;
 const g={$app:{$def:d},setTimeout(fn){tick=fn;return 1;},clearTimeout(){}};
 const cur=moduleAt(shellSrc,shellImports(),g);
 const page={};
 cur.focus(page);
 assert.equal(typeof tick,'function');
 tick();
 assert.ok(stages.indexOf('L/focus.enter')>=0&&stages.indexOf('L/focus.exit')>=0);
 assert.ok(!stages.some(s=>s.indexOf('L/focus.error')>=0));
 stages.length=0;
 cur.clear(page);
 assert.ok(!stages.some(s=>s.indexOf('L/focus.clear.error')>=0));
});
test('M list init reaches the device request under non-callable getLiubaiParams; frozen throws before device',()=>{
 const stages=[];let device=0;
 const d=appDef({getLiubaiParams:'not-a-function',traceLiubai(s){stages.push(s);},errorLiubai(s){stages.push('E:'+s);}});
 const g={$app:{$def:d},setTimeout(){return 2;},clearTimeout(){}};
 const dev={getInfo(){device++;}};
 const shellCur=moduleAt(shellSrc,shellImports(null,dev),g);
 const listCur=moduleAt(listSrc,{'./store-page':{bind(){}},'./shell':shellCur,'./layout':{home(){return{};},valid(){return true;}}});
 listCur.init({},'index');
 assert.equal(device,1,'device request must be reached');
 assert.ok(stages.indexOf('L/list.init.enter')>=0,'list init stage missing');
 const shellOld=moduleAt(frozenShell,shellImports(null,dev),g);
 const listOld=moduleAt(listSrc,{'./store-page':{bind(){}},'./shell':shellOld,'./layout':{home(){return{};},valid(){return true;}}});
 assert.throws(()=>listOld.init({},'index'),'frozen K reproduces the device black-screen class');
 assert.equal(device,1,'frozen K must throw before any additional device request');
});
test('M index probe reports $def kinds and $refs type without executing business getters',()=>{
 const logs=[];
 const shell={markVisible(){},trace(p,s){logs.push(s);},focus(){}};
 const list={init(){},destroy(){}};
 let reads=0;
 const d={whenLiubaiReady(){},getStore(){},getSession(){},traceLiubai(){}};
 Object.defineProperty(d,'getLiubaiParams',{configurable:true,get(){reads++;return {};}});
 const idx=moduleAt(fs.readFileSync(path.join(root,'pages/index/index.js'),'utf8'),{'../../common/list-page':list,'../../common/shell':shell},{$app:{$def:d}});
 idx.onInit();
 const probe=logs.find(s=>typeof s==='string'&&s.indexOf('L/probe.def ')===0);
 assert.ok(probe,'probe stage missing');
 assert.ok(probe.indexOf('getL=acc')>=0,probe);
 assert.equal(reads,0,'probe must not execute business getters');
 assert.ok(!logs.some(s=>s.indexOf('L/probe.def.throw')>=0));
 assert.ok(logs.some(s=>s.indexOf('L/probe.keys[')===0));
 idx.onShow();
 assert.ok(logs.some(s=>s.indexOf('L/index.refs=undefined')===0));
 idx.$refs={};
 idx.onShow();
 assert.ok(logs.some(s=>s.indexOf('L/index.refs=object')===0));
});
test('M probe classifies empty and inherited accessors without reading any queried business getter',()=>{
 const source=fs.readFileSync(path.join(root,'pages/index/index.js'),'utf8');
 const names=['getLiubaiParams','setLiubaiParams','whenLiubaiReady','getStore','getSession'];
 const labels=['getL','setL','when','store','sess'];
 function inspect(d){
  const logs=[];
  const shell={markVisible(){},trace(p,s){logs.push(s);},focus(){}};
  const list={init(){},destroy(){}};
  const idx=moduleAt(source,{'../../common/list-page':list,'../../common/shell':shell},{$app:{$def:d}});
  idx.onInit();
  assert.ok(!logs.some(s=>s.indexOf('L/probe.def.throw')>=0));
  const probe=logs.find(s=>s.indexOf('L/probe.def ')===0);
  assert.ok(probe,'probe stage missing');
  return probe;
 }
 const empty={};
 names.forEach(n=>Object.defineProperty(empty,n,{get:undefined,set:undefined,enumerable:true}));
 const emptyProbe=inspect(empty);
 labels.forEach(n=>assert.ok(emptyProbe.indexOf(n+'=acc')>=0,emptyProbe));
 const reads=Object.fromEntries(names.map(n=>[n,0]));
 const parent={};
 names.forEach(n=>Object.defineProperty(parent,n,{enumerable:true,get(){reads[n]++;throw new Error('business getter executed');}}));
 const inheritedProbe=inspect(Object.create(parent));
 labels.forEach(n=>assert.ok(inheritedProbe.indexOf(n+'=acc')>=0,inheritedProbe));
 assert.deepEqual(Object.values(reads),[0,0,0,0,0]);
 const missingProbe=inspect({});
 labels.forEach(n=>assert.ok(missingProbe.indexOf(n+'=m')>=0,missingProbe));
 const data=Object.fromEntries(names.map(n=>[n,undefined]));
 const dataProbe=inspect(data);
 labels.forEach(n=>assert.ok(dataProbe.indexOf(n+'=undefined')>=0,dataProbe));
});
