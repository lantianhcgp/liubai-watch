import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function fixture(){
 const calls={refresh:0,draft:0,remember:0};
 const imports={'../../common/shell':{},'../../common/session':{set(){calls.remember++;}},'../../common/utf8':{}};
 const ctx={imports,result:null,console,Date,setTimeout,clearTimeout};
 const code=fs.readFileSync(new URL('pages/edit/edit.js',ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
 vm.runInNewContext(code,ctx);const p=ctx.result;Object.assign(p,p.data);
 p.refresh=()=>calls.refresh++;p.queueDraft=()=>calls.draft++;p.capture=()=>({});p.kb={};
 const state={text:'Existing body',cursor:4,type:0,pinyin:'ni',candidates:[{text:'你',matchLength:2}],image:'/common/keyboard/common/0.png',sheetWidth:446.5,sheetOffset:0};
 p.changed(state);Object.keys(calls).forEach(k=>calls[k]=0);
 return {p,state,calls};
}
test('V keyboard drag updates only sheet position, not body/pagination/draft/candidates',()=>{
 const f=fixture(),originalCandidates=f.p.candidates;
 for(let i=1;i<=60;i++)f.p.changed({...f.state,sheetOffset:-i,candidates:[{text:'你',matchLength:2}]});
 assert.equal(f.p.sheetOffset,-60);assert.equal(f.calls.refresh,0);assert.equal(f.calls.draft,0);assert.equal(f.calls.remember,0);assert.equal(f.p.candidates,originalCandidates);
});
test('V dictionary result alone does not rebuild unchanged document or resave draft',()=>{
 const f=fixture();f.p.changed({...f.state,candidates:[{text:'你好',matchLength:2}]});
 assert.equal(f.p.candidates[0].text,'你好');assert.equal(f.calls.refresh,0);assert.equal(f.calls.draft,0);
});
test('V real text and cursor edits still refresh immediately and preserve draft/session',()=>{
 const f=fixture();f.p.changed({...f.state,text:'Existing body!',cursor:14});
 assert.equal(f.p.text,'Existing body!');assert.equal(f.calls.refresh,1);assert.equal(f.calls.draft,1);assert.equal(f.calls.remember,1);
});
test('V pinyin/type changes retain session and draft without body repagination',()=>{
 const f=fixture();f.p.changed({...f.state,pinyin:'nin',type:1});
 assert.equal(f.p.pinyin,'nin');assert.equal(f.p.type,1);assert.equal(f.calls.refresh,0);assert.equal(f.calls.draft,1);assert.equal(f.calls.remember,1);
});
