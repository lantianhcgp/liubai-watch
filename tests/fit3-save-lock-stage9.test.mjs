import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function clock(){
 let now=0,id=0,active=null,fault=()=>'';const timers=new Map(),bad=[],allocated=[];
 const c={timers,bad,allocated,now:()=>now,Date:class extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}},fault(fn){fault=fn;},setTimeout(fn,ms){const mode=fault(ms);if(mode==='throw')throw Error('injected timer allocation failure');if(mode==='null')return null;if(mode==='undefined')return undefined;const key=id++;timers.set(key,{fn,ms,at:mode==='lost'?Infinity:now+ms});allocated.push(ms);return key;},clearTimeout(key){if(key===active||key===null||key===undefined)bad.push(key);timers.delete(key);},advance(ms){const end=now+ms;for(let i=0;i<20000;i++){const row=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!row){now=end;return;}now=row[1].at;active=row[0];try{row[1].fn();}finally{timers.delete(row[0]);active=null;}}throw Error('unbounded scheduler');}};return c;
}
function load(name,imports,c){const x={imports,result:null,console,Date:c.Date,setTimeout:c.setTimeout,clearTimeout:c.clearTimeout};vm.runInNewContext(fs.readFileSync(new URL(name,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,p)=>'var '+n+'=imports['+JSON.stringify(p)+'];').replace('export default','result='),x,{filename:name});return x.result;}
function fixture(t){
 const c=clock(),files=new Map(),calls=[],held=[],nested=[],events=[];let depth=0,enabled=false,blockReentry=false,hold=()=>false,timerFault=()=>'';
 const file={};
 function complete(method,o){depth++;try{if(method==='readText'){if(files.has(o.uri))o.success({text:files.get(o.uri)});else o.fail('absent',301);}else if(method==='writeText'){files.set(o.uri,o.text);o.success();}else if(method==='delete'){files.delete(o.uri);o.success();}else if(method==='mkdir')o.success();else o.fail('absent',301);}finally{depth--;}}
 for(const method of ['readText','writeText','delete','mkdir','get'])file[method]=o=>{calls.push({method,uri:o.uri,depth});if(enabled&&blockReentry&&depth){nested.push({method,uri:o.uri});held.push(()=>complete(method,o));return;}if(enabled&&hold(method,o)){held.push(()=>complete(method,o));return;}complete(method,o);};
 c.fault(ms=>enabled?timerFault(ms,depth):'');
 const u=load('common/utf8.js',{},c),s=load('common/store.js',{'@system.file':file,'./utf8.js':u},c);s.setSerialReads(true,true);s.setTrace(v=>events.push(v));let init;s.init(e=>init=e);c.advance(4000);assert.equal(init,null);enabled=true;t.after(()=>s.dispose());
 return {s,c,files,calls,held,nested,events,setFault(fn){timerFault=fn;},block(){blockReentry=true;},hold(fn){hold=fn;},release(){const h=held.splice(0);for(const f of h)f();}};
}
for(const kind of ['draftPut','save'])test('Z '+kind+' leaves every native callback before the next post-init file call',t=>{
 const f=fixture(t);f.block();let count=0,error,value;f.s[kind]({body:'kept whole text'},(e,v)=>{count++;error=e;value=v;});f.c.advance(9000);
 assert.equal(count,1,'operation cannot hang behind native reentrant callback');assert.equal(error,null);assert.deepEqual(f.nested,[],'all file continuations must exit the previous native callback');
 let body;f.s[kind==='save'?'load':'draftGet'](...(kind==='save'?[value.id]:[]),(e,v)=>{assert.equal(e,null);body=v.body;});f.c.advance(7000);assert.equal(body,'kept whole text');assert.deepEqual(f.c.bad,[]);
});
for(const mode of ['undefined','null','throw'])test('Z missing per-call deadline '+mode+' cannot submit an unguarded hung operation',t=>{
 const f=fixture(t);f.setFault(ms=>ms===10000?mode:'');f.hold((m,o)=>m==='readText'&&o.uri.endsWith('/d0.json'));let count=0,error;
 f.s.draftPut({body:'private retained'},e=>{count++;error=e;});f.c.advance(16000);assert.equal(count,1,'bounded actual completion or honest error');assert.ok(error,'never fake success for a hung native operation');assert.deepEqual(f.c.bad,[]);
});
for(const mode of ['undefined','null','throw'])test('Z timer allocation inside native callbacks '+mode+' cannot strand draft then save',t=>{
 const f=fixture(t);f.setFault((ms,depth)=>depth?mode:'');let draft=0,saved=0,meta,error;
 f.s.draftPut({body:'kept'},e=>{draft++;if(e)error=e;});f.s.save({body:'kept'},(e,v)=>{saved++;if(e)error=e;meta=v;});f.c.advance(12000);
 assert.equal(draft,1);assert.equal(saved,1,'queued save cannot wait forever behind draft');assert.equal(error,undefined);assert.ok(meta.id);assert.deepEqual(f.c.bad,[]);
});
test('Z returned-but-undispatched slot timer does not strand the sole save owner',t=>{
 const f=fixture(t);f.setFault(ms=>ms===50?'lost':'');let count=0,error;
 f.s.save({body:'actual body'},e=>{count++;error=e;});f.c.advance(16000);assert.equal(count,1);assert.equal(error,null,'independent task clock must dispatch the known continuation');assert.deepEqual(f.c.bad,[]);
});
test('Z timed out read fences new native calls until the retained read really ends',t=>{
 const f=fixture(t);f.hold((m,o)=>m==='readText'&&o.uri.endsWith('/d0.json'));let first=0,error;f.s.draftPut({body:'first'},e=>{first++;error=e;});f.c.advance(16000);assert.equal(first,1);assert.ok(error);const n=f.calls.length;
 let rejected;f.s.save({body:'new'},e=>rejected=e);f.c.advance(1000);assert.ok(rejected);assert.equal(f.calls.length,n,'logical timeout must not release native ownership');f.hold(()=>false);f.release();f.c.advance(1000);let retry;f.s.save({body:'new'},e=>retry=e);f.c.advance(10000);assert.equal(retry,null);assert.equal(first,1);assert.deepEqual(f.c.bad,[]);
});
test('Z held native write deadline never allows a second transaction or false success',t=>{
 const f=fixture(t);f.hold((m,o)=>m==='writeText'&&o.uri.endsWith('/g0.json'));let count=0,error;f.s.save({body:'keep me'},e=>{count++;error=e;});f.c.advance(16000);assert.equal(count,1);assert.ok(error);const n=f.calls.length;
 let again;f.s.save({body:'no overlap'},e=>again=e);f.c.advance(1000);assert.ok(again);assert.equal(f.calls.length,n);f.hold(()=>false);f.release();f.c.advance(2000);assert.equal(count,1);assert.deepEqual(f.c.bad,[]);
});
test('Z operational recovery is canceled on dispose without late file calls or timer self-clear',t=>{
 const f=fixture(t);f.block();let count=0,error;f.s.save({body:'preserved'},e=>{count++;error=e;});f.s.dispose();const n=f.calls.length;f.c.advance(20000);f.release();f.c.advance(20000);assert.equal(count,1);assert.ok(error);assert.equal(f.calls.length,n);assert.deepEqual(f.c.bad,[]);assert.equal(f.c.timers.size,0);
});
