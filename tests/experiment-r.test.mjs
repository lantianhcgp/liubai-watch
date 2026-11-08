import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const acorn=createRequire(import.meta.url)(path.join(root,'scripts/node_modules/acorn'));
const source=fs.readFileSync(path.join(root,'entry/src/main/js/MainAbility/common/list-page.js'),'utf8');
const tree=acorn.parse(source,{ecmaVersion:2022,sourceType:'module'});
const intrinsicReplace=String.prototype.replace;
const translated=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=');
const metadata=(date='2026-11-07')=>({id:'entry-a',date,time:'12:34',title:'Title',preview:'Preview',pinned:false,deleted:false,revision:1,bytes:12});
function environment(options={}){
 const records=[],calls=[],pending=[],writes=[];
 const sentinel=options.sentinel||new Error('Expected a function.');
 const state={listGen:0,ready:true,allowed:true,alive:true,loading:false,offset:0,slots:3,rows:[],days:[],month:'2026-11',kind:'index',filter:'all'};
 const page=new Proxy(state,{set(target,key,value){writes.push([key,value]);target[key]=value;return true;}});
 const store={list(query,cb){calls.push(['list',query]);pending.push(cb);}};
 const shell={trace(p,stage,error){records.push({stage,error});},params(){return options.route||{day:'',month:'2026-11'};},init(p,cb){calls.push(['shell.init']);},focus(){},ensure(p,cb){cb(null);},clear(){}};
 const context={imports:{'./store-page':store,'./shell':shell,'./layout':{}},result:null,sentinel,console};
 vm.createContext(context);
 // Only the actual current controller's VM is poisoned. The independent host oracle remains intact.
 vm.runInContext("Object.defineProperty(String.prototype,'replace',{configurable:true,get:function(){throw sentinel;}});",context);
 vm.runInContext(translated,context);
 return {list:context.result,context,page,state,records,calls,pending,writes,sentinel};
}
function errors(f){return f.records.filter(r=>r.error!==undefined);}
function originalTail(s){return intrinsicReplace.call(s.slice(5),'-',' / ');}
function originalMonth(s){return intrinsicReplace.call(s,'-',' 年 ')+' 月';}

test('R current real init completes captured date and month labels when VM replace lookup throws Expected a function',t=>{
 const f=environment();let caught;try{f.list.init(f.page,'index');}catch(e){caught=e;}
 t.diagnostic(JSON.stringify({path:'real list.init',error:caught&&caught.message,same_sentinel:caught===f.sentinel,error_stages:errors(f).map(r=>r.stage)}));
 assert.equal(caught,undefined,'real init must not depend on forbidden replace: '+(caught&&caught.message));
 assert.equal(f.state.dateLabel,originalTail(f.state.today));assert.equal(f.state.monthLabel,originalMonth('2026-11'));
 assert.equal(f.calls.filter(c=>c[0]==='shell.init').length,1);
 assert.equal(errors(f).length,0);assert.ok(f.records.some(r=>r.stage==='L/list.init.enter'));
});
test('R real metadata callback paints the original month/day label under hostile VM replace getter',t=>{
 const f=environment();f.list.refresh(f.page);assert.equal(f.pending.length,1);
 f.pending.shift()(null,{items:[metadata()],hasMore:false});
 t.diagnostic(JSON.stringify({path:'real refresh/store callback/metaRows',errors:errors(f).map(r=>({stage:r.stage,error:r.error&&r.error.message,same_sentinel:r.error===f.sentinel}))}));
 assert.equal(errors(f).length,0,'metadata must not call forbidden replace; observed '+errors(f).map(r=>r.error&&r.error.message).join(','));
 assert.equal(f.state.rows[0].meta,originalTail('2026-11-07')+' · 12:34  Preview');
 assert.equal(f.state.message,'');assert.equal(f.state.loading,false);
});
test('R real month action formats only the first hyphen without VM replace and keeps month request',t=>{
 const f=environment();let caught;try{f.list.month(f.page,1);}catch(e){caught=e;}
 t.diagnostic(JSON.stringify({path:'real list.month',error:caught&&caught.message,same_sentinel:caught===f.sentinel}));
 assert.equal(caught,undefined,'real month action must not call forbidden replace: '+(caught&&caught.message));
 assert.equal(f.state.month,'2026-12');assert.equal(f.state.monthLabel,originalMonth('2026-12'));
 assert.equal(f.pending.length,1);assert.equal(f.calls[0][1].filter,'month');assert.equal(f.calls[0][1].month,'2026-12');
});

function declaration(name){const n=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n,'real source function '+name+' is required');return source.slice(n.start,n.end);}
function formatter(){
 const context={result:null,String(){throw Error('String conversion forbidden');}};vm.createContext(context);
 vm.runInContext(declaration('formatDate')+'\nresult=formatDate;',context);return context.result;
}
function groupModule(){
 const f=environment();
 const init=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='init');
 const group=init.body.body.find(n=>n.type==='TryStatement'&&source.slice(n.handler.start,n.handler.end).includes('L/probe.o.g6.throw'));
 const c=group.block.body[4],ok=group.block.body[5];
 vm.runInContext('groupActual=function(p,todayStr){'+source.slice(c.start,c.end)+'\n'+source.slice(ok.start,ok.end)+'};',f.context);
 return {...f,actual:f.context.groupActual};
}
function exactFormatEvents(){return [['indexOf.get'],['indexOf.call',true,'-',1],['slice.get'],['slice.call',true,0,2,2],['slice.get'],['slice.call',true,3,undefined,1]];}
function methodTail(fail,sentinel){
 const events=[];let sliceGets=0,sliceCalls=0,conversions=0;
 const tail={};Object.defineProperty(tail,'replace',{get(){events.push(['replace.get']);throw Error('forbidden replace getter');}});
 tail.toString=tail.valueOf=()=>{conversions++;throw Error('unknown-object conversion');};
 Object.defineProperty(tail,'indexOf',{get(){events.push(['indexOf.get']);if(fail==='indexOf.get')throw sentinel;return function(search){events.push(['indexOf.call',this===tail,search,arguments.length]);if(fail==='indexOf.call')throw sentinel;return 2;};}});
 Object.defineProperty(tail,'slice',{get(){events.push(['slice.get']);sliceGets++;if(fail==='slice.get.'+sliceGets)throw sentinel;return function(start,end){events.push(['slice.call',this===tail,start,end,arguments.length]);sliceCalls++;if(fail==='slice.call.'+sliceCalls)throw sentinel;return sliceCalls===1?'11':'07';};}});
 return {tail,events,conversions:()=>conversions};
}

test('R real formatter is independently equal to host old first-replace for all primitive string edge domains and UTF16',()=>{
 const actual=formatter();
 const samples=['','short','-','--','---','no hyphen','a-b-c','a-','-b','2026-11-07','0000-00-00','-000001-01-01','100000-01-01','😀-文字-尾','\uD800-\uDC00','a\u0000-b','2026-11/07'];
 for(const s of samples)for(const separator of [' / ',' 年 '])assert.equal(actual(s,separator),intrinsicReplace.call(s,'-',separator));
 for(let code=0;code<=65535;code++){
  const u=String.fromCharCode(code);
  for(const s of [u+'-07','11-'+u,'11'+u+'07',u])for(const separator of [' / ',' 年 '])assert.equal(actual(s,separator),intrinsicReplace.call(s,'-',separator),'primitive UTF16 code unit '+code);
 }
});
test('R no-hyphen primitive returns the same string and does not access slice',()=>{
 const actual=formatter();let reads=0;
 const s={indexOf(search){assert.equal(search,'-');return -1;}};
 Object.defineProperty(s,'slice',{get(){reads++;throw Error('slice is not needed');}});
 assert.equal(actual(s,' / '),s,'method seam only: no claim that custom objects equal old replace');assert.equal(reads,0);
 assert.equal(actual('',' / '),'');assert.equal(actual('no-hyphen-free'.slice(0,2),' / '),'no');
});
test('R formatter method seam uses indexOf once and exactly two slice gets calls receivers arguments without coercion',()=>{
 const f=methodTail(),actual=formatter();assert.equal(actual(f.tail,' / '),'11 / 07');assert.deepEqual(f.events,exactFormatEvents());assert.equal(f.conversions(),0);
});
test('R new indexOf and either slice getter call errors keep the original object through format and original g6c catches',()=>{
 for(const fail of ['indexOf.get','indexOf.call','slice.get.1','slice.call.1','slice.get.2','slice.call.2']){
  const sentinel=new Error('Expected a function.'),tail=methodTail(fail,sentinel),g=groupModule(),input={slice(start){assert.equal(start,5);return tail.tail;}};
  let writes=0;const page={};Object.defineProperty(page,'dateLabel',{set(){writes++;},get(){throw Error('no field reread');}});
  assert.throws(()=>g.actual(page,input),e=>e===sentinel);
  assert.equal(writes,0);assert.equal(tail.conversions(),0);
  const stages=g.records.map(r=>r.stage);assert.deepEqual(stages,['L/probe.q.g6c.slice.ok t=object','L/probe.r.g6c.format.throw','L/probe.o.g6c.throw']);
  for(const r of g.records.filter(r=>r.error!==undefined))assert.equal(r.error,sentinel);
  const expectedLength={'indexOf.get':1,'indexOf.call':2,'slice.get.1':3,'slice.call.1':4,'slice.get.2':5,'slice.call.2':6}[fail];
  assert.deepEqual(tail.events,exactFormatEvents().slice(0,expectedLength),'full unfiltered formatter error trajectory');
 }
});
test('R g6c successful RHS performs one dateLabel write and never reads setter-normalized value',()=>{
 const g=groupModule();let writes=0,reads=0,value;
 const p={};Object.defineProperty(p,'dateLabel',{get(){reads++;throw Error('read forbidden');},set(v){writes++;value=v+' normalized';}});
 g.actual(p,'2026-11-07');assert.equal(writes,1);assert.equal(reads,0);assert.equal(value,'11 / 07 normalized');
 assert.deepEqual(g.records.map(r=>r.stage),['L/probe.q.g6c.slice.ok t=string','L/probe.r.g6c.format.ok t=string','L/probe.o.g6c.ok']);
});
test('R g6c setter failure reports and rethrows the same error after full string RHS without another write',()=>{
 const g=groupModule(),sentinel={};let writes=0;
 const p={};Object.defineProperty(p,'dateLabel',{set(v){writes++;assert.equal(v,'11 / 07');throw sentinel;}});
 assert.throws(()=>g.actual(p,'2026-11-07'),e=>e===sentinel);assert.equal(writes,1);
 assert.deepEqual(g.records.map(r=>r.stage),['L/probe.q.g6c.slice.ok t=string','L/probe.r.g6c.format.ok t=string','L/probe.q.g6c.set.throw','L/probe.o.g6c.throw']);
 assert.ok(g.records.filter(r=>r.error!==undefined).every(r=>r.error===sentinel));
});
test('R month formatting indexOf failure preserves the shift write and stops before label offset or store request',()=>{
 const f=environment();f.context.sentinel=f.sentinel;
 vm.runInContext("Object.defineProperty(String.prototype,'indexOf',{configurable:true,get:function(){throw sentinel;}});",f.context);
 assert.throws(()=>f.list.month(f.page,1),e=>e===f.sentinel);
 assert.equal(f.state.month,'2026-12');assert.deepEqual(f.writes,[['month','2026-12']]);assert.equal(f.pending.length,0);assert.equal(f.calls.length,0);
});
test('R monthLabel setter failure after init reports exact g6e and original g6 error identity and no shell init',()=>{
 const f=environment(),sentinel=f.sentinel;let writes=0;
 Object.defineProperty(f.state,'monthLabel',{set(v){writes++;assert.equal(v,'2026 年 11 月');throw sentinel;}});
 assert.throws(()=>f.list.init(f.page,'index'),e=>e===sentinel);assert.equal(writes,1);
 assert.deepEqual(errors(f).map(r=>r.stage),['L/probe.o.g6e.throw','L/probe.o.g6.throw']);
 assert.ok(errors(f).every(r=>r.error===sentinel));assert.equal(f.calls.length,0);assert.ok(!f.records.some(r=>r.stage==='L/list.init.enter'));
});
test('R metadata retains three original date reads validation-before-format and visible error without paint on invalid date',()=>{
 const f=environment(),row=metadata();let reads=0;Object.defineProperty(row,'date',{get(){reads++;return '2026-11-07';}});
 f.list.refresh(f.page);f.pending.shift()(null,{items:[row],hasMore:false});assert.equal(reads,3);assert.equal(f.state.rows[0].meta,'11 / 07 · 12:34  Preview');
 const bad=environment();bad.list.refresh(bad.page);bad.pending.shift()(null,{items:[metadata('2026-02-30')],hasMore:false});
 assert.equal(bad.state.rows.length,0);assert.equal(errors(bad).length,1);assert.equal(errors(bad)[0].stage,'L/list.error');assert.equal(errors(bad)[0].error.message,'Invalid day');assert.ok(bad.state.message);
});
test('R formatter successful diagnostic construction and forwarding failures cannot replace business success or original errors',()=>{
 for(const prefix of ['L/probe.q.g6c.slice.ok','L/probe.r.g6c.format.ok']){
  const g=groupModule();g.context.prefix=prefix;
  vm.runInContext("var originalRTrace=trace;trace=function(p,s,e){if(s.indexOf(prefix)===0)throw new Error('diagnostic-only');return arguments.length>2?originalRTrace(p,s,e):originalRTrace(p,s);};",g.context);
  const p={};g.actual(p,'2026-11-07');assert.equal(p.dateLabel,'11 / 07');assert.ok(g.records.some(r=>r.stage==='L/probe.o.g6c.ok'));assert.equal(errors(g).length,0);
 }
});
test('R actual producers reject unknown objects without conversion and return exact primitive day month strings',()=>{
 const f=environment();let conversions=0;const opaque={toString(){conversions++;throw Error('no conversion');},valueOf(){conversions++;throw Error('no conversion');}};
 for(const name of ['validMonth','validDay'])assert.throws(()=>f.list[name](opaque));assert.equal(conversions,0);
 for(const s of ['0001-01','0099-12','9999-12'])assert.equal(f.list.validMonth(s),s);
 for(const s of ['0001-01-01','2000-02-29','9999-12-31'])assert.equal(f.list.validDay(s),s);
 vm.runInContext('producer=today;',f.context);assert.equal(typeof f.context.producer(),'string');
});
test('R source uses one private first-hyphen helper at exactly four original date-display callsites and no substitute API',()=>{
 const helper=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='formatDate');assert.ok(helper);
 const calls=[],stack=[tree];while(stack.length){const n=stack.pop();if(!n||typeof n!=='object')continue;if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name==='formatDate')calls.push(n);for(const value of Object.values(n)){if(Array.isArray(value))stack.push(...value);else if(value&&typeof value==='object')stack.push(value);}}
 assert.equal(calls.length,4);assert.deepEqual(calls.map(n=>n.arguments[1].value).sort(),[' / ',' / ',' 年 ',' 年 '].sort());
 const exported=tree.body.find(n=>n.type==='ExportDefaultDeclaration');assert.ok(!exported.declaration.properties.some(p=>p.key.name==='formatDate'));
 assert.ok(!source.includes('.replace('));assert.ok(!source.includes('.split('));assert.ok(!source.includes('.join('));
 const actual=declaration('formatDate');assert.ok(!actual.includes('String('));assert.ok(!actual.includes('toString'));assert.ok(!actual.includes('try'));
});
