import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(start=0){
 let next=start,visible=true,hook;const timers=new Map(),logs=[];
 const noop=()=>{},L={init:noop,page:noop,stop:noop,i:(t,m)=>logs.push(m),e:noop,status:()=>({})};
 const imports={'./common/logsink.js':L,'./common/log-config.js':{},'./common/session':{},'./common/store':{init:cb=>cb(null),dispose:noop},'./common/shell':{setVisibilityHook:f=>{hook=f;},markVisible:v=>{visible=v;if(hook)hook(v);},isVisible:()=>visible}};
 const c={imports,result:null,setTimeout(fn,ms){const id=next++%256;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
 const code=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/app.js',import.meta.url),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
 vm.runInNewContext(code,c);return {c,app:c.result,timers,logs};
}
test('app heartbeat absent handle does not cancel unrelated native ID zero',()=>{const f=fixture();const id=f.c.setTimeout(()=>{},99999);assert.equal(id,0);f.app.onCreate();assert.ok(f.timers.has(id));f.app.onDestroy();assert.ok(f.timers.has(id));assert.equal(f.timers.size,1);});
test('app heartbeat at wrapped ID zero remains a single pending timer',()=>{const f=fixture(255);f.app.onCreate();assert.deepEqual([...f.timers.keys()],[0]);f.app.diagVisibility(true);assert.deepEqual([...f.timers.keys()],[0]);f.app.onDestroy();assert.equal(f.timers.size,0);});
