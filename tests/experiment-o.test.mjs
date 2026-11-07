import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../entry/src/main/js/MainAbility');
const listSource=fs.readFileSync(path.join(root,'common/list-page.js'),'utf8');
const shellSource=fs.readFileSync(path.join(root,'common/shell.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'app.js'),'utf8');
// Exact N init from bd39a379; CI needs neither git history nor an additional fixture.
const N_INIT="function init(p,kind) {\n  trace(p,'L/list.init.first');\n  p.kind=kind;p.alive=true;p.allowed=false;p.listGen=(p.listGen||0)+1;p.rows=[];p.days=[];p.offset=0;p.hasMore=false;p.hasPrev=false;p.empty=false;p.busy=false;p.message='';var q=shell.params(p);p.today=today();p.day=q.day||'';p.month=q.month||p.today.slice(0,7);p.filter=kind==='trash'?'trash':kind==='day'?'day':kind==='history'?'month':'all';\n  try{if(kind==='day')validDay(p.day);validMonth(p.month);}catch(e){trace(p,'L/list.params.error',e);p.ready=false;p.message='\\u65e5\\u671f\\u53c2\\u6570\\u65e0\\u6548';return;}\n  p.headerTitle=kind==='history'?'\\u6309\\u65e5\\u56de\\u770b':kind==='day'?p.day.slice(5,7)+' \\u6708 '+p.day.slice(8)+' \\u65e5':kind==='trash'?'\\u56de\\u6536\\u7ad9':'\\u7559\\u767d';p.sectionTitle='\\u6700\\u8fd1\\u8bb0\\u5f55';p.dateLabel=p.today.slice(5).replace('-',' / ');p.emptyText=kind==='history'?'\\u8fd9\\u6708\\u8fd8\\u6ca1\\u6709\\u8bb0\\u5f55':kind==='trash'?'\\u6ca1\\u6709\\u5220\\u6389\\u7684\\u8bb0\\u5f55':kind==='day'?'\\u8fd9\\u5929\\u8fd8\\u6ca1\\u6709\\u8bb0\\u5f55':'\\u4eca\\u5929\\u60f3\\u7559\\u4e0b\\u4ec0\\u4e48\\uff1f';p.monthLabel=p.month.replace('-',' \\u5e74 ')+' \\u6708';\n  trace(p,'L/list.init.enter');\n  try{shell.init(p,function(info){trace(p,'L/geometry.enter');geometry(p,info,kind);trace(p,'L/geometry.exit');var gen=p.listGen;p.loading=true;shell.ensure(p,function(e){if(!p.alive||gen!==p.listGen)return;if(e){error(p,e);return;}p.allowed=true;trace(p,'L/list.allowed');refresh(p);});});}catch(e){trace(p,'L/list.shellinit.throw',e);throw e;}\n  trace(p,'L/list.init.return');\n}\n";
function nSource(){const begin=listSource.indexOf('function init(p,kind) {'),end=listSource.indexOf('function next(p)');assert.ok(begin>=0&&end>begin);return listSource.slice(0,begin)+N_INIT+listSource.slice(end);}
function moduleAt(source,imports,globals={}){
 const code=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,spec)=>'var '+name+'=imports['+JSON.stringify(spec)+'];').replace('export default','result=');
 const ctx={imports,result:null,console,Date,Math,JSON,Object,String,Number,setTimeout(){return 1;},clearTimeout(){},...globals};
 vm.runInNewContext(code,ctx);return ctx.result;
}
function summary(v){if(Array.isArray(v))return 'array:'+v.length;return v===null?'null':typeof v==='object'||typeof v==='function'?'<'+typeof v+'>':v;}
function execute(source,options={}){
 const {kind='index',fail,routeValues={day:'',month:''},initialListGen=0}=options;
 const sentinel=options.sentinel||new Error('Expected a function.'),business=[],records=[],counts={coercions:0};
 const channel=moduleAt(appSource,{'./common/logsink.js':{i(tag,msg){records.push({tag,msg});},e(tag,msg){records.push({tag,msg});}},'./common/log-config.js':{},'./common/store':{},'./common/session':{},'./common/shell':{isVisible(){return true;}}});
 const realShell=moduleAt(shellSource,{'./store-page':{bind(){}},'./session':{bind(){}},'@system.device':{getInfo(){}},'@system.router':{replace(){}},'./layout':{valid(){return true;}}},{$app:{$def:channel}});
 const state={listGen:initialListGen},getCounts={};
 const page=new Proxy(state,{
  get(target,key,receiver){business.push(['get',String(key)]);getCounts[key]=(getCounts[key]||0)+1;if(fail&&fail.type==='page-get'&&fail.key===key&&(!fail.at||getCounts[key]===fail.at))throw sentinel;return options.oneShotListGen&&key==='listGen'?(getCounts[key]===1?7:99):Reflect.get(target,key,receiver);},
  set(target,key,value,receiver){business.push(['set',String(key),summary(value)]);if(fail&&fail.type==='page-set'&&fail.key===key)throw sentinel;return Reflect.set(target,key,options.normalizeSetters&&key==='listGen'?value+4:value,receiver);}
 });
 const route=new Proxy({...routeValues},{get(target,key,receiver){business.push(['route-get',String(key)]);if(fail&&fail.type==='route-get'&&fail.key===key)throw sentinel;return Reflect.get(target,key,receiver);}});
 const shell={trace:realShell.trace,params(p){assert.equal(this,shell);assert.equal(p,page);assert.equal(arguments.length,1);business.push(['shell.params']);if(fail&&fail.type==='params-call')throw sentinel;return route;},init(p,cb){assert.equal(this,shell);assert.equal(p,page);assert.equal(arguments.length,2);assert.equal(typeof cb,'function');business.push(['shell.init']);},focus(){},clear(){},ensure(){}};
 class Clock extends Date{
  constructor(){business.push(['today.new']);if(fail&&fail.type==='today-new')throw sentinel;super('2026-11-07T12:00:00+08:00');}
  getFullYear(){business.push(['today.year']);return super.getFullYear();}
  getMonth(){business.push(['today.month']);return super.getMonth();}
  getDate(){business.push(['today.day']);return super.getDate();}
 }
 if(options.coerceListGen){state.listGen={valueOf(){counts.coercions++;business.push(['listGen.valueOf']);if(fail&&fail.type==='listGen-coerce')throw sentinel;return 7;},toString(){throw Error('unexpected listGen string conversion');}};}
 const list=moduleAt(source,{'./store-page':{},'./shell':shell,'./layout':{}},{Date:Clock});
 let caught,returned;try{returned=list.init(page,kind);}catch(e){caught=e;}
 return {caught,returned,sentinel,business,records,counts,state,stages:records.filter(r=>r.tag==='stage').map(r=>r.msg.split(' state=')[0]),errorRecords:records.filter(r=>r.tag==='onerror')};
}
function stateSnapshot(s){return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Array.isArray(v)?Array.from(v):v]));}
// Written P decision: CURRENT source remains the input. This expectation-only oracle
// rebases N's operation sequence by exactly the authorized reads and local RHS fix;
// N_INIT, nSource, execute, VM/route/page fixtures and all test counts remain unchanged.
function expectedPSource(){
 let expected=N_INIT;
 const changes=[
  ["var q=shell.params(p);p.today=today();p.day=q.day||'';p.month=q.month||p.today.slice(0,7);p.filter=kind==='trash'?'trash':kind==='day'?'day':kind==='history'?'month':'all';", "var q=shell.params(p);try{q.month;}catch(ignored){}try{p.today;}catch(ignored){}var todayStr,dayStr,monthValue;p.today=todayStr=today();p.day=dayStr=q.day||'';p.month=monthValue=q.month||todayStr.slice(0,7);p.filter=kind==='trash'?'trash':kind==='day'?'day':kind==='history'?'month':'all';try{p.today;}catch(ignored){}"],
  ["p.day.slice(5,7)","dayStr.slice(5,7)"],
  ["p.day.slice(8)","dayStr.slice(8)"],
  ["p.today.slice(5)","todayStr.slice(5)"],
  ["p.month.replace('-',", "monthValue.replace('-',"]
 ];
 for(const [before,after] of changes){assert.equal(expected.split(before).length,2,'each authorized expectation rewrite occurs exactly once');expected=expected.replace(before,after);}
 const begin=listSource.indexOf('function init(p,kind) {'),end=listSource.indexOf('function next(p)');
 return listSource.slice(0,begin)+expected+listSource.slice(end);
}
function parity(options={}){const sentinel=options.sentinel||new Error('Expected a function.');const n=execute(expectedPSource(),{...options,sentinel}),o=execute(listSource,{...options,sentinel});assert.deepEqual(o.business,n.business,'all getter/setter/call/coercion events match the authorized P expectation sequence');assert.equal(o.caught,n.caught,'same propagation identity as the authorized P sequence');assert.equal(o.returned,n.returned);assert.deepEqual(o.counts,n.counts);assert.deepEqual(stateSnapshot(o.state),stateSnapshot(n.state),'own business state values match across distinct VM realms');return {n,o,sentinel};}
function groupFailure(group,options){const {n,o,sentinel}=parity(options);assert.equal(n.caught,sentinel);assert.equal(o.caught,sentinel,'must rethrow the original value, not wrap or swallow');const rows=o.errorRecords.filter(r=>r.msg.indexOf('L/probe.o.g'+group+'.throw ')===0);assert.equal(rows.length,1,'exactly one group report reaches unchanged shell.trace/appRoot/errorLiubai');assert.ok(rows[0].msg.includes('message='+sentinel.message),'real Error own message must be in actual onerror record');assert.ok(!o.stages.some(s=>s.indexOf('L/probe.o.g'+group+'.ok')===0));assert.ok(!o.stages.includes('L/list.init.enter'));for(let i=1;i<group;i++)assert.equal(o.stages.filter(s=>s.indexOf('L/probe.o.g'+i+'.ok')===0).length,1);for(let i=group+1;i<=6;i++)assert.ok(!o.stages.some(s=>s.indexOf('L/probe.o.g'+i+'.ok')===0));return o;}
test('O g1 reports each bare-field setter sentinel through real errorLiubai and rethrows with exact N order',()=>{
 for(const key of ['kind','alive','allowed'])groupFailure(1,{fail:{type:'page-set',key}});
});
test('O g2 exposes first listGen read and setter failures without an additional business read',()=>{
 for(const type of ['page-get','page-set'])groupFailure(2,{fail:{type,key:'listGen'}});
 const {o}=parity();assert.equal(o.business.filter(e=>e[0]==='get'&&e[1]==='listGen').length,1);
 assert.ok(o.stages.includes('L/probe.o.pre.listGen v=0'));assert.ok(o.stages.includes('L/probe.o.g2.ok lg=1'));
});
test('O g2 pre probe never coerces unknown listGen values; original numeric coercion still occurs once',()=>{
 const {o}=parity({coerceListGen:true});assert.equal(o.counts.coercions,1);assert.ok(o.stages.includes('L/probe.o.pre.listGen v=object'));assert.ok(o.stages.includes('L/probe.o.g2.ok lg=8'));
 const sentinel=new Error('numeric coercion sentinel');const n=execute(nSource(),{coerceListGen:true,fail:{type:'listGen-coerce'},sentinel});const cur=execute(listSource,{coerceListGen:true,fail:{type:'listGen-coerce'},sentinel});
 assert.equal(n.caught,sentinel);assert.equal(cur.caught,sentinel);assert.deepEqual(cur.business,n.business);assert.equal(cur.counts.coercions,1);assert.ok(cur.errorRecords.some(r=>r.msg.startsWith('L/probe.o.g2.throw message=numeric coercion sentinel')));
});
test('O g3 reports each reset-field setter without running a later reset or params',()=>{
 for(const key of ['rows','days','offset','hasMore','hasPrev','empty','busy','message'])groupFailure(3,{fail:{type:'page-set',key}});
});
test('O g4 reports an escaping shell.params call sentinel with original receiver and no later today',()=>{
 groupFailure(4,{fail:{type:'params-call'}});
 const {o}=parity();assert.ok(o.stages.includes('L/probe.o.g4.ok t=object'));assert.equal(o.business.filter(e=>e[0]==='shell.params').length,1);
});
test('O g5 reports today/day/month/filter failures and retains every N getter and setter',()=>{
 groupFailure(5,{fail:{type:'today-new'}});
 for(const key of ['today','day','month','filter'])groupFailure(5,{fail:{type:'page-set',key}});
 for(const key of ['day','month'])groupFailure(5,{fail:{type:'route-get',key}});
 const recovery=parity({fail:{type:'page-get',key:'today'}}).o;
 assert.equal(recovery.caught,undefined,'P §4.1 removes business today reads; §4.2 observes both failed reads without rethrow');
 assert.equal(recovery.business.filter(e=>e[0]==='get'&&e[1]==='today').length,2);
 for(const stage of ['L/probe.p.today0.read.throw','L/probe.p.today.read.throw'])assert.equal(recovery.errorRecords.filter(r=>r.msg.startsWith(stage+' ')).length,1);
 assert.ok(recovery.stages.includes('L/probe.o.g5.ok t=string'));assert.ok(recovery.stages.includes('L/probe.o.g6.ok'));assert.ok(recovery.stages.includes('L/list.init.enter'));
 const {o}=parity();assert.ok(o.stages.includes('L/probe.o.g5.ok t=string'));
});
test('O g6 reports all title and label setters and original formatting reads without suppressing the throw',()=>{
 const fields=['headerTitle','sectionTitle','dateLabel','emptyText','monthLabel'];
 for(let at=0;at<fields.length;at++){
  const o=groupFailure(6,{fail:{type:'page-set',key:fields[at]}}),sub=['a','b','c','d','e'][at];
  assert.equal(o.errorRecords.filter(r=>r.msg.startsWith('L/probe.o.g6'+sub+'.throw ')).length,1);
  for(let i=0;i<fields.length;i++)assert.equal(o.stages.includes('L/probe.o.g6'+['a','b','c','d','e'][i]+'.ok'),i<at,'only preceding assignments reached their own ok');
 }
 const day=parity({kind:'day',routeValues:{day:'2026-11-07',month:'2026-11'},fail:{type:'page-get',key:'day',at:2}}).o;
 assert.equal(day.caught,undefined);assert.equal(day.business.filter(e=>e[0]==='get'&&e[1]==='day').length,1);assert.equal(day.state.headerTitle,'11 月 07 日');assert.ok(day.stages.includes('L/probe.o.g6.ok'));
 const today=parity({fail:{type:'page-get',key:'today',at:2}}).o;
 assert.equal(today.caught,undefined);assert.equal(today.errorRecords.filter(r=>r.msg.startsWith('L/probe.p.today.read.throw ')).length,1);assert.equal(today.state.dateLabel,'11 / 07');assert.ok(today.stages.includes('L/probe.o.g6.ok'));
 const month=parity({fail:{type:'page-get',key:'month',at:2}}).o;
 assert.equal(month.caught,undefined);assert.equal(month.business.filter(e=>e[0]==='get'&&e[1]==='month').length,1);assert.equal(month.state.monthLabel,'2026 年 11 月');assert.ok(month.stages.includes('L/probe.o.g6.ok'));
});
test('O all six ok markers appear in strict order between first and enter in every normal list mode',()=>{
 for(const kind of ['index','trash','history','day']){
  const {o}=parity({kind,routeValues:{day:kind==='day'?'2026-11-07':'',month:'2026-11'}});
  assert.equal(o.caught,undefined);assert.equal(o.errorRecords.length,0);let cursor=-1;
  for(const prefix of ['L/list.init.first','L/probe.o.g1.ok','L/probe.o.pre.listGen v=','L/probe.o.g2.ok lg=','L/probe.o.g3.ok','L/probe.o.g4.ok t=','L/probe.p.qm t=','L/probe.p.today0 t=','L/probe.o.g5.ok t=','L/probe.p.today t=','L/probe.o.g6a.ok','L/probe.o.g6b.ok','L/probe.o.g6c.ok','L/probe.o.g6d.ok','L/probe.o.g6e.ok','L/probe.o.g6.ok','L/list.init.enter','L/list.init.return']){
   const at=o.stages.findIndex((s,i)=>i>cursor&&s.indexOf(prefix)===0);assert.ok(at>cursor,prefix);cursor=at;
  }
  assert.equal(o.business.filter(e=>e[0]==='shell.init').length,1);for(const stage of o.stages.filter(s=>s.startsWith('L/probe.o.')))assert.ok(stage.length<=40,stage);
 }
});
test('O keeps the original date validation catch and return outside the groups, with no g6/enter',()=>{
 for(const options of [{kind:'day',routeValues:{day:'2026-11-99',month:'2026-11'}},{kind:'history',routeValues:{day:'',month:'bad-month'}},{fail:{type:'page-get',key:'month'}}]){
  const {o}=parity(options);assert.equal(o.caught,undefined);assert.equal(o.state.ready,false);
  assert.equal(o.state.message,'\u65e5\u671f\u53c2\u6570\u65e0\u6548');assert.ok(!o.stages.includes('L/probe.o.g6.ok'));assert.ok(!o.stages.includes('L/list.init.enter'));
  assert.equal(o.errorRecords.filter(r=>r.msg.indexOf('L/list.params.error ')===0).length,1);assert.ok(!o.errorRecords.some(r=>r.msg.indexOf('L/probe.o.g')===0));
 }
});
test('O diagnostics never consume error accessors or custom conversions and still rethrow the same sentinel',()=>{
 for(const sentinel of [{},function poisonedError(){}]){
  let reads=0,coercions=0;for(const key of ['message','stack','code'])Object.defineProperty(sentinel,key,{get(){reads++;throw Error('error getter must not run');}});
  sentinel.toString=function(){coercions++;throw Error('error coercion must not run');};
  const {o}=parity({sentinel,fail:{type:'page-set',key:'rows'}});assert.equal(o.caught,sentinel);assert.equal(reads,0);assert.equal(coercions,0);assert.equal(o.errorRecords[0].msg,'L/probe.o.g3.throw error');
 }
});
test('O preserves one-shot page getter values and setter-normalized state while logs use the original RHS',()=>{
 const {o}=parity({oneShotListGen:true,routeValues:{day:'',month:'2026-11'}});assert.equal(o.business.filter(e=>e[0]==='get'&&e[1]==='listGen').length,1);assert.ok(o.stages.includes('L/probe.o.pre.listGen v=7'));assert.ok(o.stages.includes('L/probe.o.g2.ok lg=8'));
 const {o:normalized}=parity({initialListGen:4,normalizeSetters:true});assert.equal(normalized.state.listGen,9);assert.ok(normalized.stages.includes('L/probe.o.g2.ok lg=5'),'ok is the original successful write RHS, not a new page getter');
});
test('O diagnostic scalars are bounded and unknown month values are not converted or re-read',()=>{
 const long='1'.repeat(200);const {o}=parity({initialListGen:long,routeValues:{day:'',month:long}});for(const s of o.stages.filter(s=>s.startsWith('L/probe.o.')))assert.ok(s.length<=40);assert.ok(o.stages.includes('L/probe.o.pre.listGen v=string'));assert.ok(o.stages.includes('L/probe.o.g5.ok t=string'));assert.ok(!o.stages.filter(s=>s.startsWith('L/probe.o.')).some(s=>s.includes(long.slice(0,32))));
 let reads=0;const month={toString(){reads++;throw Error('month probe must not coerce');}};const {o:cur}=parity({routeValues:{day:'',month}});assert.equal(reads,0);assert.ok(cur.stages.includes('L/probe.o.g5.ok t=object'));assert.equal(cur.caught,undefined);
});

// The exact standards-review counterexample is now a repository regression.
// Poison only this module's VM intrinsic; the frozen N oracle receives the same poison.
test('O hostile review slice-returned object cannot interrupt N business initialization',t=>{
 const poison=`
var nativeProbeSlice=''.slice;
''.constructor.prototype.slice=function(start,end){
  if(start===0&&end===32)return {valueOf:function(){throw new Error('probe-only');}};
  return nativeProbeSlice.apply(this,arguments);
};
`;
 const options={initialListGen:'7',routeValues:{day:'',month:'2026-11'}};
 const n=execute(poison+nSource(),options),o=execute(poison+listSource,options),expected=execute(poison+expectedPSource(),options);
 assert.equal(n.caught,undefined,'the frozen N baseline must finish under the identical poison');
 assert.equal(n.state.listGen,'71');assert.ok(n.business.some(e=>e[0]==='shell.params'));
 t.diagnostic(JSON.stringify({N:{caught:n.caught===undefined?null:'unexpected',listGen:n.state.listGen,params_called:n.business.some(e=>e[0]==='shell.params')},O:{caught:o.caught===undefined?null:o.caught.message,listGen:o.state.listGen,params_called:o.business.some(e=>e[0]==='shell.params')}}));
 assert.equal(o.caught,n.caught,'diagnostic object conversion must not escape or become a business-group throw');
 assert.deepEqual(o.business,expected.business,'same exact authorized P reads, writes, calls and numeric coercions under the retained poison');
 assert.equal(o.returned,n.returned);assert.deepEqual(o.counts,n.counts);
 assert.deepEqual(stateSnapshot(o.state),stateSnapshot(n.state));
 assert.ok(!o.errorRecords.some(r=>r.msg.indexOf('probe-only')>=0),'a failed probe is not a business error');
 assert.ok(o.stages.includes('L/list.init.enter'),'later business groups are not blocked by probe construction');
});

test('O formatter uses only bounded primitive labels or safe counts without mutable intrinsic or object conversion',()=>{
 const start=listSource.indexOf('  function probeValue(v){'),end=listSource.indexOf('\n  var lg,lgNext;',start);assert.ok(start>=0&&end>start);
 let intrinsicCalls=0,objectConversions=0;
 const ctx={result:null,String(){intrinsicCalls++;throw Error('mutable String must not run');}};
 vm.runInNewContext(listSource.slice(start,end)+'\nresult=probeValue;',ctx);
 const unknown={toString(){objectConversions++;throw Error('unknown toString');},valueOf(){objectConversions++;throw Error('unknown valueOf');}};
 const values=[[0,'0'],[7,'7'],[999999999,'999999999'],[-1,'number'],[Infinity,'number'],[NaN,'number'],[0.5,'number'],[true,'boolean'],[false,'boolean'],[null,'object'],[undefined,'undefined'],['synthetic-user-text','string'],[unknown,'object'],[function opaque(){},'function']];
 for(const [value,label] of values){const got=ctx.result(value);assert.equal(typeof got,'string');assert.ok(got.length<=12);assert.equal(got,label);}
 assert.equal(intrinsicCalls,0);assert.equal(objectConversions,0);
});

test('O each complete value-stage construction and trace has an independent diagnostic-only boundary',()=>{
 // Host-only seam: replace the module-local safe trace with an artificially throwing
 // diagnostic dispatcher. N receives the identical seam and has no O stage calls.
 for(const prefix of ['L/probe.o.pre.listGen v=','L/probe.o.g2.ok lg=','L/probe.o.g4.ok t=','L/probe.o.g5.ok t=']){
  const seam="var realOTestTrace=trace;trace=function(p,s,e){if(s.indexOf("+JSON.stringify(prefix)+")===0)throw new Error('diagnostic-only');return arguments.length>2?realOTestTrace(p,s,e):realOTestTrace(p,s);};\n";
  const options={initialListGen:7,routeValues:{day:'',month:'2026-11'}};
  const n=execute(seam+nSource(),options),o=execute(seam+listSource,options),expected=execute(seam+expectedPSource(),options);
  assert.equal(n.caught,undefined);assert.equal(o.caught,undefined,'a diagnostic failure never blocks the next original business operation');
  assert.deepEqual(o.business,expected.business);assert.deepEqual(stateSnapshot(o.state),stateSnapshot(n.state));assert.deepEqual(o.counts,n.counts);assert.equal(o.returned,n.returned);
  assert.ok(o.stages.includes('L/list.init.enter'));assert.ok(!o.errorRecords.some(r=>r.msg.includes('diagnostic-only')));
  for(let g=1;g<=6;g++)if(!prefix.startsWith('L/probe.o.g'+g+'.ok'))assert.ok(o.stages.some(s=>s.startsWith('L/probe.o.g'+g+'.ok')));
 }
});

test('O new raw stages reject arbitrary listGen/month text and fit the 40-character transport budget',()=>{
 const synthetic='sensitive-synthetic-canary-0123456789';
 const {o}=parity({initialListGen:synthetic,routeValues:{day:'',month:synthetic}});
 const stages=o.stages.filter(s=>s.startsWith('L/probe.o.'));assert.equal(stages.length,6,'g6 does not run after the unchanged invalid-month return');
 for(const s of stages){assert.equal(typeof s,'string');assert.ok(s.length<=40);assert.ok(!s.includes(synthetic));}
 assert.ok(stages.includes('L/probe.o.pre.listGen v=string'));assert.ok(stages.includes('L/probe.o.g5.ok t=string'));
});

// Written decision A: expected vocabulary is specified independently of the formatter.
// These three real pre-stage cases were RED while N business parity was already green.
test('O decision A vocabulary gives safe numeric counts a value and every other input its typeof label',t=>{
 const start=listSource.indexOf('  function probeValue(v){'),end=listSource.indexOf('\n  var lg,lgNext;',start);assert.ok(start>=0&&end>start);
 const ctx={result:null};vm.runInNewContext(listSource.slice(start,end)+'\nresult=probeValue;',ctx);
 const cases=[[true,'boolean'],[false,'boolean'],[null,'object']];
 const failures=[];
 for(const [value,label] of cases){
  const {o}=parity({initialListGen:value});
  const expected='L/probe.o.pre.listGen v='+label;
  const actual=o.stages.find(s=>s.startsWith('L/probe.o.pre.listGen v='));
  t.diagnostic(JSON.stringify({input:value,expected,actual,N_business_parity:true}));
  if(actual!==expected||ctx.result(value)!==label)failures.push({input:value,expected,actual,formatter:ctx.result(value)});
 }
 assert.deepEqual(failures,[],'true/false/null must use specified typeof vocabulary, not literal value labels');
 const unknown={valueOf(){throw Error('no new valueOf');},toString(){throw Error('no new toString');}};
 for(const value of [-1,0.25,1000000000,Infinity,NaN,undefined,'private-canary',unknown,()=>{}])assert.equal(ctx.result(value),typeof value);
 for(const [value,label] of [[0,'0'],[7,'7'],[999999999,'999999999']])assert.equal(ctx.result(value),label);
});
