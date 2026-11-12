import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
// ACE's synchronous Task retains Arguments until the JS callback returns.
// An active clear frees that structure early; ordinary Node clocks hide it.
function clock(){
 let now=0,next=0,active=null;const timers=new Map(),selfClears=[];
 return {timers,selfClears,Date:class extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}},
 setTimeout(fn,ms){const id=next++%256;assert.ok(!timers.has(id),'fixture timer collision');timers.set(id,{fn,due:now+ms});return id;},
 clearTimeout(id){if(id===active&&timers.has(id))selfClears.push({id,at:now});timers.delete(id);},
 advance(ms){const end=now+ms;for(let n=0;n<2000;n++){
  const row=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];
  if(!row){now=end;return;}now=row[1].due;active=row[0];try{row[1].fn();}finally{timers.delete(row[0]);active=null;}
 }throw Error('unbounded timers');}};
}
function load(name,imports,c){
 const code=fs.readFileSync(new URL(name,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
 const ctx={imports,result:null,console,Date:c.Date,setTimeout:c.setTimeout,clearTimeout:c.clearTimeout};
 vm.runInNewContext(code,ctx,{filename:name});return ctx.result;
}
function fixture(){
 const c=clock(),files=new Map(),requests=[],events=[];
 const file={mkdir:o=>o.success(),readText(o){requests.push(o);if(files.has(o.uri))o.success({text:files.get(o.uri)});else o.fail('absent',301);},writeText(o){files.set(o.uri,o.text);o.success();},get:o=>o.fail('absent',301),delete(o){files.delete(o.uri);o.success();}};
 const u=load('common/utf8.js',{},c),s=load('common/store.js',{'@system.file':file,'./utf8.js':u},c);s.setSerialReads(true);s.setTrace(x=>events.push(x));return {s,c,file,files,requests,events};
}
test('ACE clock negative control detects active clear including native ID zero',()=>{const c=clock();const id=c.setTimeout(()=>c.clearTimeout(id),50);c.advance(50);assert.deepEqual(c.selfClears,[{id:0,at:50}]);});
test('FIT3 serialized cold init never clears the running slot continuation',()=>{const f=fixture();let calls=0,err;f.s.init(e=>{calls++;err=e;});f.c.advance(300);assert.equal(calls,1);assert.equal(err,null);assert.ok(f.events.includes('S/store.ready'));assert.deepEqual(f.c.selfClears,[],'running continuation must remain native-owned');f.s.dispose();assert.equal(f.c.timers.size,0);});
test('FIT3 serial continuation disposal cancels only pending work',()=>{const f=fixture();let calls=0,err;f.s.init(e=>{calls++;err=e;});const before=f.requests.length;f.s.dispose();f.c.advance(20000);assert.equal(calls,1);assert.ok(err);assert.equal(f.requests.length,before);assert.deepEqual(f.c.selfClears,[]);assert.equal(f.c.timers.size,0);});
test('FIT3 individual I/O timeout does not clear its own native Arguments',()=>{const f=fixture();f.s.init(()=>{});f.c.advance(300);let held,calls=0,error;f.file.readText=o=>{held=o;};f.s.list({offset:0,limit:6},e=>{calls++;error=e;});f.c.advance(10000);assert.equal(calls,1);assert.ok(error);assert.deepEqual(f.c.selfClears,[]);held.fail('absent',301);assert.equal(calls,1);f.s.dispose();});
test('FIT3 init owner timeout retains native ownership without active clears',()=>{const f=fixture();const held=[];f.file.readText=o=>held.push(o);let count=0,error;f.s.init(e=>{count++;error=e;});f.c.advance(10001);assert.equal(count,1);assert.ok(error);assert.deepEqual(f.c.selfClears,[]);const n=held.length;f.s.init(()=>{});assert.equal(held.length,n);held[0].fail('absent',301);assert.equal(count,1);f.s.dispose();});
