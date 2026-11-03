import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root='entry/src/main/js/MainAbility/';
function load(name,imports={}){const code=fs.readFileSync(root+name,'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,p)=>'var '+n+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');const ctx={imports,result:null,console,Math,JSON};vm.runInNewContext(code,ctx);return ctx.result;}
const layout=load('common/layout.js');
test('native tool icons and their labels occupy the same equal-width hit columns',()=>{
 const menu=load('pages/menu/menu.js',{'../../common/layout':layout,'../../common/session':{get(){return{id:'',type:1};}},'../../common/shell':{focus(){}}});
 for(const info of [{windowWidth:412,windowHeight:484,screenShape:'rect'},{windowWidth:454,windowHeight:454,screenShape:'circle'}]){
  const p={...menu,...menu.data,mode:'tool',id:'',title:'tool',dock:[]};p.measure(info);p.makeRows();
  assert.equal(p.toolW*4,p.contentW);assert.ok(p.toolW>=44);
  assert.deepEqual(Array.from(p.toolControls,c=>c.action),['left','type','paste','right']);
  for(const c of p.toolControls){const name=c.action==='type'?p.typeImage:c.icon;assert.ok(name&&fs.existsSync(root+name.replace(/^\/common\//,'common/')),'mounted cell lacks a real shipped glyph');}
 }
 const h=fs.readFileSync(root+'pages/menu/menu.hml','utf8');assert.doesNotMatch(h,/transform:scaleX/);
 assert.match(h,/class="tool-hit"[^>]*width:\{\{toolW\}\}/);assert.match(h,/class="tool-label"[^>]*width:\{\{toolW\}\}/);
});
