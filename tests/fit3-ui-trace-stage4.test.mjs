import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(n,imports={}){const c={imports,result:null,console:{log(){}},setTimeout:()=>1,clearTimeout(){},Date};const s=fs.readFileSync(new URL(n,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,k,p)=>'var '+k+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');vm.runInNewContext(s,c);return c.result;}
function fixture(name,params={}){
 const stages=[],navs=[],saves=[];
 const layout=load('common/layout.js'),reader=load('common/reader.js',{'./layout':layout}),utf8=load('common/utf8.js');
 let state={id:params.id||'',text:'PRIVATE BODY MUST NOT APPEAR',cursor:0,type:0,pinyin:'',open:true};
 const shell={params:()=>params,init(p,cb){p.w=408;p.h=480;p.ready=true;cb({windowWidth:408,windowHeight:480,screenShape:'rect'});},ensure(p,cb){cb(null);},focus(){},clear(){},nav(p,page,q){navs.push({page,q});},trace(p,s){stages.push(s);}};
 const store={draftGet:cb=>cb(null,null),load:(id,cb)=>cb(null,{id,body:state.text,date:'2026-11-12',time:'13:00',revision:1,pinned:false}),settingGet:(id,cb)=>cb(null,null),settingPut:(id,s,cb)=>cb(null),save:(s,cb)=>saves.push(cb),draftClear:cb=>cb(null)};
 const session={get:()=>state,set:s=>{state=s;},clear:()=>{state=null;},clipboardList:()=>[]};
 const p=load('pages/'+name+'/'+name+'.js',{'../../common/shell':shell,'../../common/layout':layout,'../../common/reader':reader,'../../common/utf8':utf8,'../../common/store-page':store,'../../common/session':session});Object.assign(p,p.data);return {p,stages,navs,saves};
}
for(const mode of ['app','record','read','exit'])test('V menu '+mode+' emits enter/ready/click/exit without record prose',()=>{const f=fixture('menu',{mode,id:'r1'});f.p.onInit();f.p.activate('back');f.p.onHide();f.p.onDestroy();for(const marker of ['V/menu.enter.'+mode,'V/menu.ready.'+mode,'V/menu.click.back','V/menu.exit'])assert.ok(f.stages.includes(marker),marker);assert.ok(f.stages.every(s=>!s.includes('PRIVATE')));});
test('V reader enter/ready/more/exit follows the real load callback',()=>{const f=fixture('read',{id:'r1'});f.p.onInit();f.p.more();f.p.onHide();f.p.onDestroy();for(const marker of ['V/read.enter','V/read.ready','V/read.click.more','V/read.exit'])assert.ok(f.stages.includes(marker),marker);assert.equal(f.navs[0].page,'menu');});
for(const fail of [false,true])test('V save '+(fail?'failure':'success')+' emits actual callback result not an optimistic success',()=>{const f=fixture('edit',{id:'r1'});Object.assign(f.p,{alive:true,loading:false,text:'PRIVATE BODY MUST NOT APPEAR',id:'r1',initGen:1,kb:{snapshot(){return {text:f.p.text};}}});f.p.save();assert.ok(f.stages.includes('V/save.enter'));assert.ok(!f.stages.includes('V/save.ok'));f.saves[0](fail?new Error('PRIVATE FAILURE'):null,{id:'r1'});assert.ok(f.stages.includes(fail?'V/save.fail':'V/save.ok'));assert.ok(f.stages.every(s=>!s.includes('PRIVATE')));assert.equal(f.navs.length,fail?0:1);});
test('V menu diagnostics failing cannot block initialization or action routing',()=>{const f=fixture('menu',{mode:'app'});f.p.onInit();f.p.activate('back');assert.equal(f.navs.at(-1).page,'index');});
