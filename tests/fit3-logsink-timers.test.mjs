import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fit3-logger-'));
const prepare=spawnSync('python',['scripts/prepare-logsink.py','--project',temp],{cwd:root,encoding:'utf8'});
assert.equal(prepare.status,0,prepare.stderr);
const source=fs.readFileSync(path.join(temp,'entry/src/main/js/MainAbility/common/logsink.js'),'utf8');
const cfg={endpoint:'https://unit.invalid/receive',key:'unit-only',app:'unit',ver:'1'};
function fixture(){
 let now=0,next=0,active=null;const timers=new Map(),selfClears=[],requests=[];
 const c={console:{},Date:class extends Date{constructor(){super(now);}},
  setTimeout(fn,ms){const id=next++%256;assert.ok(!timers.has(id));timers.set(id,{fn,due:now+ms});return id;},
  clearTimeout(id){if(id===active&&timers.has(id))selfClears.push(id);timers.delete(id);},
  require(){return {fetch(o){requests.push(o);if(c.ack)o.success({code:200,data:{ok:true}});}};}};
 vm.runInNewContext(source.replace('export default L;','this.L=L;'),c);
 return {c,L:c.L,timers,selfClears,requests,tick(ms){const end=now+ms;for(let i=0;i<1000;i++){const row=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!row){now=end;return;}now=row[1].due;active=row[0];try{row[1].fn();}finally{timers.delete(row[0]);active=null;}}throw Error('runaway');}};
}
test('generated logger init/stop never cancel unrelated native timer ID zero',()=>{const f=fixture();const id=f.c.setTimeout(()=>{},100000);assert.equal(id,0);f.L.init(cfg);assert.ok(f.timers.has(id));f.L.stop();assert.ok(f.timers.has(id));});
test('generated logger ID-zero first send with synchronous ACK cannot clear its executing pump',()=>{const f=fixture();f.c.ack=true;f.L.init(cfg);f.L.i('one','one');f.tick(5000);assert.equal(f.requests.length,1);assert.equal(f.L.status().sent,1);assert.deepEqual(f.selfClears,[]);f.L.stop();assert.equal(f.timers.size,0);});
test('generated logger has exactly one scheduled pump even when its valid ID is zero',()=>{const f=fixture();f.L.init(cfg);f.L.i('one','one');f.L.i('two','two');assert.equal(f.timers.size,1);f.L.stop();assert.equal(f.timers.size,0);});
test('generated logger lost fetch expires without active clear and retains retry/generation guards',()=>{const f=fixture();f.L.init(cfg);f.L.i('one','one');f.L.flush();f.tick(50);assert.equal(f.requests.length,1);f.tick(8000);assert.equal(f.L.status().failed,1);assert.equal(f.L.status().pending,1);assert.equal(f.L.status().busy,0);assert.deepEqual(f.selfClears,[]);f.tick(5000);assert.equal(f.requests.length,2);assert.equal(f.requests[0].data,f.requests[1].data);f.requests[0].success({code:200,data:{ok:true}});assert.equal(f.L.status().sent,0);f.requests[1].success({code:200,data:{ok:true}});assert.equal(f.L.status().sent,1);f.L.stop();assert.equal(f.timers.size,0);});
