import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(n,imports={},globals={}){const c={imports,result:null,console,setTimeout:()=>1,clearTimeout(){},Date,...globals};const s=fs.readFileSync(new URL(n,ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,k,p)=>'var '+k+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');vm.runInNewContext(s,c);return c.result;}
function fixture(){
 const info={windowWidth:408,windowHeight:480,screenShape:'rect'};
 const layout=load('common/layout.js'),reader=load('common/reader.js',{'./layout':layout}),utf8=load('common/utf8.js');
 let state={id:'',text:'same body',cursor:4,type:0,pinyin:'',open:false};
 const session={get:()=>state,set:s=>{state=s;},clear:()=>{state=null;}};
 const keyboard=load('common/keyboard.js',{'./utf8':utf8,'./session':session,'./lookupDictV5':{lookupDict(){}}});
 const shell={params:()=>({}),init(p,cb){p.info=info;p.w=408;p.h=480;p.ready=true;cb(info);},ensure(p,cb){cb(null);},focus(){},clear(){},trace(){}};
 const p=load('pages/edit/edit.js',{'../../common/shell':shell,'../../common/layout':layout,'../../common/reader':reader,'../../common/utf8':utf8,'../../common/keyboard':keyboard,'../../common/session':session,'../../common/store-page':{draftPut(s,cb){cb(null);}}});
 Object.assign(p,p.data);return {p};
}
test('V resume with unchanged document must reconstruct its folded geometry and page',()=>{const {p}=fixture();p.onInit();assert.ok(p.pg);assert.ok(p.lines.length);const before=JSON.stringify(p.lines);p.onHide();p.onShow();assert.equal(p.ready,true);assert.ok(p.pg,'unchanged snapshot is not an already rendered page');assert.equal(JSON.stringify(p.lines),before);assert.equal(p.g.open,false);p.onDestroy();});
test('V repeated same-page retry preserves caret, dimensions and visible text',()=>{const {p}=fixture();p.onInit();const x=p.caretX,y=p.caretY;for(let i=0;i<3;i++){p.onInit(true);assert.ok(p.pg);assert.equal(p.caretShow,true);assert.equal(p.caretX,x);assert.equal(p.caretY,y);assert.ok(p.spaceW>44);}p.onDestroy();});
