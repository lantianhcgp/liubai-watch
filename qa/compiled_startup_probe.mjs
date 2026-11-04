/* Read-only differential probe: execute genuine compiled APP with the upstream
 * OpenHarmony Subject/Observer/ViewModel. No synthetic successful app output. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const evidence=path.resolve(process.argv[2]);
const reference=path.join(evidence,'native-reference');
const compiled=path.resolve(process.argv[3]||path.join(evidence,'compiled'));
const candidate=process.argv[4]==='candidate';
const sha=s=>createHash('sha256').update(s).digest('hex');
const info={windowWidth:412,windowHeight:484,screenShape:'rect'};
function strip(text){return text.replace(/^import\s+[\s\S]*?;\s*$/gm,'').replace(/\bexport\s+/g,'');}
function scenario(name,{holdInit=false,throwFont=false,holdList=false}={}){
 const timers=new Map(),device=[],calls=[],logs=[],fileCallbacks=[];let id=1;
 const context=vm.createContext({console:{info(...a){logs.push(a.join(' '))},error(...a){logs.push(a.join(' '))}},setTimeout(fn,ms){const n=id++;timers.set(n,{fn,ms});return n},clearTimeout(n){timers.delete(n)},global:null,module:{exports:{}},exports:{},require(){throw Error('external require')},__appVing__:true});context.global=context;
 vm.runInContext(['utils.js','observer.js','subject.js','core-index.js'].map(n=>strip(fs.readFileSync(path.join(reference,n),'utf8'))).join('\n').replace(/\b(startTracing|stopTracing)\([^;]*\);/g,''),context);
 const app=vm.runInContext(fs.readFileSync(path.join(compiled,'app.js'),'utf8'),context);context.$app=app;app.onCreate();context.__appVing__=false;context.module={exports:{}};
 const records=new Map();const file={};let holdQueries=false;
 for(const method of ['mkdir','access','readText','writeText'])file[method]=args=>{
  calls.push({method,uri:args.uri});
  const run=()=>{
   if(method==='mkdir')args.success();
   else if(method==='access'){records.has(args.uri)?args.success():args.fail('missing',301)}
   else if(method==='writeText'){records.set(args.uri,args.text);args.success()}
   else if(method==='readText'){records.has(args.uri)?args.success({text:records.get(args.uri)}):args.fail('missing',301)}
  };
  if(holdInit&&method==='mkdir')fileCallbacks.push(run);
  else if(holdQueries&&method==='readText'&&/\/p\d+_\d+\.json$/.test(args.uri))fileCallbacks.push(run);
  else run();
 };
 context.requireNative=name=>{
  if(name==='system.device')return {getInfo(o){device.push(o)}};
  if(name==='system.storage')return {get(o){if(throwFont)throw Error('deliberate optional font API throw');o.success(o.default)}};
  if(name==='system.file')return file;
  if(name==='system.router')return {replace(o){calls.push({method:'router.replace',uri:o.uri})}};
  throw Error('Unknown real native import '+name);
 };
 context.initStyleSheet=()=>{};
 const page=vm.runInContext(fs.readFileSync(path.join(compiled,'index.js'),'utf8'),context);
 assert.equal(typeof page.onInit,'function','real compiled page must export lifecycle');
 page.onInit();const before={ready:page.ready,message:page.message};let exception=null;
 try{device[0].success(info)}catch(e){exception=String(e)}
 if(holdList){
  assert.equal(page.ready,true,'prepare actual record through working compiled API');
  let saved=null;app.getState().store.save(null,'qa-only startup regression record',(err,value)=>{assert.equal(err,null);saved=value});assert.ok(saved&&saved.id);
  page.onHide();page.onShow();holdQueries=true;device.at(-1).success(info);
 }
 const after={ready:page.ready,message:page.message,error:page.error,store:!!page.store,initTimer:page.initTimer,initCancelType:typeof page.initCancel};
 for(const task of [...timers.values()]){try{task.fn()}catch(e){exception=String(e)}}
 const deadline={ready:page.ready,message:page.message,error:page.error,routerCalls:calls.filter(x=>x.method==='router.replace')};
 return{name,before,after,deadline,exception,calls,logs,nativeWaitCallbacks:fileCallbacks.length};
}
const reports=[scenario('held real initial native callback',{holdInit:true}),scenario('optional font API asynchronous throw',{throwFont:true}),scenario('normal unseeded empty app'),scenario('real record query callback stall after successful startup',{holdList:true})];
const result={scope:'Genuine exact signed-input compiled JS executed by Node with upstream OpenHarmony ViewModel/Subject/Observer; API hold/throw deliberately injected. This is not FIT3 firmware or heap proof.',compiledHashes:{app:sha(fs.readFileSync(path.join(compiled,'app.js'))),index:sha(fs.readFileSync(path.join(compiled,'index.js')))},reports};
assert.equal(reports[0].after.ready,false);
assert.equal(reports[2].after.ready,true,'harness must permit normal startup');
if(candidate){
 assert.ok(reports[0].after.message,'initial wait must retain visible loading');
 assert.equal(reports[1].exception,null,'optional API exception must be contained');
 assert.equal(reports[1].after.ready,true,'optional font failure must not block main page');
 assert.ok(reports[3].after.message,'real saved record list wait must stay visible');
 assert.equal(reports[3].deadline.ready,false);
 assert.match(reports[3].deadline.message,/LIST_WAIT/);
 assert.ok(reports[3].deadline.error);
}else{
 assert.equal(reports[0].after.message,'','baseline black interval must be reproduced, not invented');
 assert.ok(reports[1].exception,'baseline callback escape must be reproduced');
 assert.equal(reports[3].deadline.message,'','baseline permanent list blank must be reproduced');
}
result.ok=true;
fs.writeFileSync(path.join(evidence,candidate?'compiled-candidate-probe.json':'compiled-negative-probe.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ok:true,candidate,compiledHashes:result.compiledHashes,reports:reports.map(r=>({name:r.name,after:r.after,deadline:r.deadline,exception:r.exception}))}));
