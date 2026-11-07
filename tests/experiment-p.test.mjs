import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../entry/src/main/js/MainAbility');
const source=fs.readFileSync(path.join(root,'common/list-page.js'),'utf8');
const shellSource=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'app.js'),'utf8');
function moduleAt(text,imports,globals={}){
 const code=text.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=');
 const context={imports,result:null,console,Date,Math,JSON,Object,String,Number,setTimeout(){return 1;},clearTimeout(){},...globals};
 vm.runInNewContext(code,context);return context.result;
}
function run(options={}){
 const sentinel=options.sentinel||new Error('Expected a function.'),records=[],events=[],reads={},state={listGen:0},values=options.routeValues||{day:'',month:'2026-11'};
 let written=false,conversions=0;
 const channel=moduleAt(appSource,{'./common/logsink.js':{i(tag,msg){records.push({tag,msg});events.push(['record',tag,msg]);},e(tag,msg){records.push({tag,msg});events.push(['record',tag,msg]);}},'./common/log-config.js':{},'./common/store':{},'./common/session':{},'./common/shell':{isVisible(){return true;}}});
 const realShell=moduleAt(shellSource,{'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(){}},'@system.router':{replace(){}},'./layout':{valid(){return true;}}},{$app:{$def:channel}});
 const opaque={toString(){conversions++;throw Error('do not coerce private object');},valueOf(){conversions++;throw Error('do not coerce private object');}};
 const page=new Proxy(state,{
  get(target,key,receiver){events.push(['get',String(key)]);reads[key]=(reads[key]||0)+1;
   if(options.fail&&options.fail.type==='get'&&options.fail.key===key&&(!options.fail.at||options.fail.at===reads[key]))throw sentinel;
   if(key==='today'){
    if(options.today==='always-throw'||options.today==='post-throw'&&written)throw sentinel;
    if(options.today==='post-boolean'&&written)return false;
    if(options.today==='opaque')return opaque;
    if(options.today==='synthetic')return 'sensitive-synthetic-canary-0123456789';
   }
   return Reflect.get(target,key,receiver);
  },
  set(target,key,value,receiver){events.push(['set',String(key),typeof value==='object'?'<object>':value]);
   if(options.fail&&options.fail.type==='set'&&options.fail.key===key)throw sentinel;
   if(key==='today')written=true;
   return Reflect.set(target,key,value,receiver);
  }
 });
 let qmReads=0;
 const route=new Proxy({...values},{get(target,key,receiver){events.push(['route-get',String(key)]);
  if(key==='month'){qmReads++;if(options.qmFirstThrow&&qmReads===1)throw sentinel;}
  if(options.fail&&options.fail.type==='route-get'&&options.fail.key===key)throw sentinel;
  return Reflect.get(target,key,receiver);
 }});
 const shell={trace:realShell.trace,params(p){assert.equal(this,shell);assert.equal(p,page);assert.equal(arguments.length,1);events.push(['shell.params']);return route;},init(p,cb){assert.equal(this,shell);assert.equal(p,page);assert.equal(arguments.length,2);assert.equal(typeof cb,'function');events.push(['shell.init']);},focus(){},clear(){},ensure(){}};
 class Clock extends Date{
  constructor(){events.push(['today.new']);super('2026-11-07T12:00:00+08:00');}
  getFullYear(){events.push(['today.year']);return super.getFullYear();}
  getMonth(){events.push(['today.month']);return super.getMonth();}
  getDate(){events.push(['today.day']);return super.getDate();}
 }
 const list=moduleAt((options.prefix||'')+source,{'./store-page':{},'./shell':shell,'./layout':{}},{Date:Clock});
 let caught,returned;try{returned=list.init(page,options.kind||'index');}catch(e){caught=e;}
 const stages=records.filter(r=>r.tag==='stage').map(r=>r.msg.split(' state=')[0]);
 return {sentinel,caught,returned,state,reads,qmReads,events,records,stages,conversions,errorRecords:records.filter(r=>r.tag==='onerror')};
}
function ok(result){assert.equal(result.caught,undefined);assert.equal(result.returned,undefined);assert.ok(result.stages.includes('L/probe.o.g5.ok t=string'));for(const g of ['a','b','c','d','e'])assert.ok(result.stages.includes('L/probe.o.g6'+g+'.ok'));assert.ok(result.stages.includes('L/probe.o.g6.ok'));assert.ok(result.stages.includes('L/list.init.enter'));assert.equal(result.events.filter(e=>e[0]==='shell.init').length,1);}
function errors(result,stage){return result.errorRecords.filter(r=>r.msg.startsWith(stage+' '));}

test('P H1: both authorized today reads throw but captured local date formats and init continues',()=>{
 const result=run({today:'always-throw'});ok(result);assert.equal(result.reads.today,2);
 assert.equal(errors(result,'L/probe.p.today0.read.throw').length,1);assert.equal(errors(result,'L/probe.p.today.read.throw').length,1);
 assert.equal(errors(result,'L/probe.o.g5.throw').length,0);assert.equal(errors(result,'L/probe.o.g6.throw').length,0);
 assert.equal(result.state.today,'2026-11-07');assert.equal(result.state.dateLabel,'11 / 07');assert.equal(result.state.monthLabel,'2026 年 11 月');
});
test('P H2: pre-write read passes, post-write getter throws, and no business getter can derail g6',()=>{
 const result=run({today:'post-throw'});ok(result);assert.ok(result.stages.includes('L/probe.p.today0 t=undefined'));assert.equal(errors(result,'L/probe.p.today0.read.throw').length,0);assert.equal(errors(result,'L/probe.p.today.read.throw').length,1);assert.equal(result.state.dateLabel,'11 / 07');
});
test('P H2: post-write non-string is type-only diagnostic while local source date remains exact',()=>{
 const result=run({today:'post-boolean'});ok(result);assert.ok(result.stages.includes('L/probe.p.today t=boolean'));assert.equal(result.state.dateLabel,'11 / 07');assert.equal(result.reads.today,2);assert.equal(result.conversions,0);
});
test('P day/month labels use captured route RHS without the removed formatting getters',()=>{
 const result=run({kind:'day',routeValues:{day:'2026-11-07',month:'2026-11'},fail:{type:'get',key:'day',at:2}});ok(result);assert.equal(result.reads.day,1);assert.equal(result.state.headerTitle,'11 月 07 日');
 const month=run({fail:{type:'get',key:'month',at:2}});ok(month);assert.equal(month.reads.month,1);assert.equal(month.state.monthLabel,'2026 年 11 月');
});
test('P writes, date expressions, labels and all list modes remain the independently specified values',()=>{
 for(const [kind,header,empty] of [['index','留白','今天想留下什么？'],['history','按日回看','这月还没有记录'],['trash','回收站','没有删掉的记录'],['day','11 月 07 日','这天还没有记录']]){
  const result=run({kind,routeValues:{day:kind==='day'?'2026-11-07':'',month:'2026-11'}});ok(result);
  assert.equal(result.state.headerTitle,header);assert.equal(result.state.sectionTitle,'最近记录');assert.equal(result.state.emptyText,empty);assert.equal(result.state.dateLabel,'11 / 07');assert.equal(result.state.monthLabel,'2026 年 11 月');assert.equal(result.state.today,'2026-11-07');
  assert.equal(result.state.filter,kind==='trash'?'trash':kind==='day'?'day':kind==='history'?'month':'all');assert.equal(result.events.filter(e=>e[0]==='today.new').length,1);
 }
});
test('P exact qm/today0/today ordering brackets g5 and precedes unchanged validation',()=>{
 const result=run({routeValues:{day:'',month:''}});ok(result);assert.equal(result.qmReads,2);assert.equal(result.reads.today,2);
 const prefixes=['L/probe.o.g4.ok t=','L/probe.p.qm t=','L/probe.p.today0 t=','L/probe.o.g5.ok t=','L/probe.p.today t=','L/probe.o.g6a.ok','L/probe.o.g6b.ok','L/probe.o.g6c.ok','L/probe.o.g6d.ok','L/probe.o.g6e.ok','L/probe.o.g6.ok'];
 let cursor=-1;for(const prefix of prefixes){const at=result.stages.findIndex((s,i)=>i>cursor&&s.startsWith(prefix));assert.ok(at>cursor,prefix);cursor=at;}
 const at=(stage)=>result.events.findIndex(e=>e[0]==='record'&&e[1]==='stage'&&e[2].startsWith(stage+' state='));
 assert.ok(at('L/probe.p.today0 t=undefined')<result.events.findIndex(e=>e[0]==='today.new'));
 assert.ok(at('L/probe.p.today t=string')>result.events.findIndex(e=>e[0]==='set'&&e[1]==='filter'));
 assert.ok(at('L/probe.p.today t=string')<result.events.findIndex(e=>e[0]==='get'&&e[1]==='month'));
});
test('P five g6 setter failures report exact substage and same error, never later assignments or ok',()=>{
 const fields=['headerTitle','sectionTitle','dateLabel','emptyText','monthLabel'];
 for(let i=0;i<fields.length;i++){
  const suffix=['a','b','c','d','e'][i],result=run({fail:{type:'set',key:fields[i]}});assert.equal(result.caught,result.sentinel);
  assert.equal(errors(result,'L/probe.o.g6'+suffix+'.throw').length,1);assert.equal(errors(result,'L/probe.o.g6.throw').length,1);
  assert.ok(errors(result,'L/probe.o.g6'+suffix+'.throw')[0].msg.includes('message=Expected a function.'));
  for(let j=0;j<i;j++)assert.ok(result.stages.includes('L/probe.o.g6'+['a','b','c','d','e'][j]+'.ok'));
  for(let j=i;j<fields.length;j++){assert.ok(!result.stages.includes('L/probe.o.g6'+['a','b','c','d','e'][j]+'.ok'));if(j>i)assert.ok(!result.events.some(e=>e[0]==='set'&&e[1]===fields[j]));}
  assert.ok(!result.stages.includes('L/probe.o.g6.ok'));assert.ok(!result.stages.includes('L/list.init.enter'));
 }
});
test('P read-probe exceptions never coerce sentinel accessors or become business failures',()=>{
 for(const sentinel of [{},function opaqueError(){}]){
  let reads=0,coercions=0;for(const key of ['message','stack','code'])Object.defineProperty(sentinel,key,{get(){reads++;throw Error('no diagnostic getter');}});sentinel.toString=()=>{coercions++;throw Error('no diagnostic conversion');};
  const result=run({today:'always-throw',sentinel});ok(result);assert.equal(reads,0);assert.equal(coercions,0);assert.equal(errors(result,'L/probe.p.today0.read.throw')[0].msg,'L/probe.p.today0.read.throw error');assert.equal(errors(result,'L/probe.p.today.read.throw')[0].msg,'L/probe.p.today.read.throw error');
 }
});
test('P unknown today values are labels only, no object conversion or user string leakage',()=>{
 for(const today of ['opaque','synthetic']){
  const result=run({today});ok(result);assert.equal(result.conversions,0);
  const label=today==='opaque'?'object':'string';assert.ok(result.stages.includes('L/probe.p.today0 t='+label));assert.ok(result.stages.includes('L/probe.p.today t='+label));
  for(const stage of result.stages.filter(s=>s.startsWith('L/probe.p.'))){assert.ok(stage.length<=40);assert.ok(!stage.includes('sensitive-synthetic-canary'));}
 }
});
test('P whole qm/today0/today construction failures are independently swallowed, not read-throw evidence',()=>{
 for(const prefix of ['L/probe.p.qm t=','L/probe.p.today0 t=','L/probe.p.today t=']){
  const seam="var pTestTrace=trace;trace=function(p,s,e){if(s.indexOf("+JSON.stringify(prefix)+")===0)throw new Error('diagnostic-only');return arguments.length>2?pTestTrace(p,s,e):pTestTrace(p,s);};\n";
  const result=run({prefix:seam});ok(result);assert.ok(!result.stages.some(s=>s.startsWith(prefix)));assert.ok(!result.errorRecords.some(r=>r.msg.includes('diagnostic-only')||r.msg.startsWith('L/probe.p.today0.read.throw')||r.msg.startsWith('L/probe.p.today.read.throw')));
 }
});
test('P qm diagnostic read is independent from original g5 route read, never substitutes its value',()=>{
 const result=run({qmFirstThrow:true});ok(result);assert.equal(result.qmReads,2);assert.ok(!result.stages.some(s=>s.startsWith('L/probe.p.qm t=')));assert.equal(result.state.month,'2026-11');assert.equal(errors(result,'L/probe.o.g5.throw').length,0);
});
test('P original validation still reads day/month, returns invalid state, and runs no g6 assignments',()=>{
 for(const options of [{kind:'day',routeValues:{day:'2026-11-99',month:'2026-11'}},{routeValues:{day:'',month:'invalid'}},{fail:{type:'get',key:'month'}}]){
  const result=run(options);assert.equal(result.caught,undefined);assert.equal(result.state.ready,false);assert.equal(result.state.message,'日期参数无效');assert.equal(errors(result,'L/list.params.error').length,1);assert.ok(!result.stages.some(s=>s.startsWith('L/probe.o.g6')));assert.ok(!result.events.some(e=>e[0]==='set'&&e[1]==='headerTitle'));assert.ok(!result.events.some(e=>e[0]==='shell.init'));assert.ok(result.stages.includes('L/probe.p.today t=string'));
 }
});
test('P pre/write/post diagnostics add only bounded authorized reads and preserve scalar stage budget',()=>{
 const result=run();ok(result);const expected=['L/probe.p.qm t=string','L/probe.p.today0 t=undefined','L/probe.p.today t=string'];assert.deepEqual(result.stages.filter(s=>s.startsWith('L/probe.p.')),expected);
 for(const stage of result.stages.filter(s=>s.startsWith('L/probe.p.')||s.startsWith('L/probe.o.'))){assert.equal(typeof stage,'string');assert.ok(stage.length<=40,stage);}
 assert.equal(result.qmReads,2);assert.equal(result.reads.today,2);assert.equal(result.reads.month,1);
});
