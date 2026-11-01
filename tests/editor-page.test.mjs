import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const root=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function page(n,mocks){let s=fs.readFileSync(new URL('pages/'+n+'/'+n+'.js',root),'utf8');s=s.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,a,b)=>'var '+a+'=mocks['+JSON.stringify(b)+'];').replace('export default','result=');const ctx={mocks,result:null,console,setTimeout,clearTimeout,Date};vm.runInNewContext(s,ctx);let p=ctx.result;Object.assign(p,p.data);return p;}
let passed=0;function test(n,f){f();passed++;console.log('PASS '+n);}
const prefix='../../common/';const mocks={};let saves=[],navs=[],session=null;
mocks[prefix+'shell']={focus(){},clear(){},nav(p,n,q){navs.push({n,q});},params(){return{};}};
mocks[prefix+'store-page']={save(input,cb){saves.push({input,cb});},draftClear(cb){cb(null);}};
mocks[prefix+'session']={get(){return session;},set(s){session=s;},clear(){session=null;},clipboardPut(){},clipboardGet(){return'';}};
mocks[prefix+'utf8']={bytes(s){return Buffer.byteLength(s);}};
function editor(){let p=page('edit',mocks);p.alive=true;p.text='complete full text';p.id='same-id';p.created=123;p.kb={snapshot(){return{text:p.text,cursor:3,type:0,pinyin:''};}};return p;}
test('double completion is a single real callback save',()=>{saves=[];const p=editor();p.save();p.save();assert.equal(saves.length,1);assert.equal(saves[0].input.id,'same-id');assert.equal(saves[0].input.body,p.text);assert.equal(saves[0].input.created,123);});
test('I/O failure preserves text/id and leaves retry reachable',()=>{saves=[];const p=editor();p.save();saves[0].cb(new Error('disk full'));assert.equal(p.saving,false);assert.equal(p.text,'complete full text');assert.equal(p.id,'same-id');assert.match(p.message,/disk full/);p.save();assert.equal(saves.length,2);});
test('only successful save navigates to same record',()=>{saves=[];navs=[];const p=editor();p.save();assert.equal(navs.length,0);saves[0].cb(null,{id:'same-id'});assert.equal(navs[0].n,'read');assert.equal(navs[0].q.id,'same-id');});
test('empty document never starts save',()=>{saves=[];const p=editor();p.text=' \n ';p.save();assert.equal(saves.length,0);});
test('new record does not send invalid empty ID',()=>{saves=[];const p=editor();p.id='';p.save();assert.equal(saves[0].input.id,undefined);});
test('cancel changed document cannot clear existing record',()=>{navs=[];const p=editor();p.base='unmatched';p.pinyin='ni';p.cancel();assert.equal(navs[0].n,'menu');assert.equal(navs[0].q.mode,'exit');assert.equal(session.text,p.text);});
test('missing pixel touch coordinate cannot invent document start',()=>{let p=editor();p.lines=[{start:8,end:12,text:'word',x:20,font:22}];let changed=[];p.kb.setCursor=i=>changed.push(i);p.pickLine(0,{});assert.equal(changed.length,0);});
console.log(JSON.stringify({passed,failed:0}));
