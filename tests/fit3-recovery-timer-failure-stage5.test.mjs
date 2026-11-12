import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(name,imports,c){const x={imports,result:null,Date,console,setTimeout:c.setTimeout,clearTimeout:c.clearTimeout};const s=fs.readFileSync(new URL(name,root),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,p)=>'var '+n+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');vm.runInNewContext(s,x);return x.result;}
function seal(data){const s=JSON.stringify(data);let h=2166136261;for(let i=0;i<s.length;i++)h=((h^s.charCodeAt(i))*16777619)>>>0;return JSON.stringify({v:1,seq:0,data,hash:String(h)});}
test('W unavailable recovery timer never clears undefined as native timer zero',()=>{
 let recovery=false,seq=1;const timers=new Map(),invalid=[];
 const c={setTimeout(fn,ms){if(recovery&&ms===50)return undefined;const id=seq++;timers.set(id,{fn,ms});return id;},clearTimeout(id){if(id===undefined||id===null)invalid.push(id);timers.delete(id);}};
 const file={mkdir:o=>o.success(),readText:o=>o.uri.endsWith('/c0.json')?o.success({text:seal({pages:0})}):o.fail('absent',301)};
 const u=load('common/utf8.js',{},c),s=load('common/store.js',{'@system.file':file,'./utf8.js':u},c);s.setSerialReads(true);s.setTrace(x=>{if(x==='S/store.recover')recovery=true;});let count=0,error;
 s.init(e=>{count++;error=e;});const next=[...timers].find(([,v])=>v.ms===50);assert.ok(next);timers.delete(next[0]);next[1].fn();
 assert.equal(count,1);assert.match(String(error),/Recovery timer unavailable/);assert.deepEqual(invalid,[]);s.dispose();assert.equal(timers.size,0);
});
