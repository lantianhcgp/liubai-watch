import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../entry/src/main/js/MainAbility/pages/',import.meta.url);
for(const name of ['index','history','day','trash','menu','read','edit']){
 test('V '+name+' uses the platform registered font instead of an unverified family override',()=>{
  const css=fs.readFileSync(new URL(name+'/'+name+'.css',root),'utf8');
  assert.doesNotMatch(css,/font-family\s*:/i,'HYQiHei-65S accepted by compiler is not a verified FIT3 font registry name');
 });
}
// ACE JSBoolean::Value is jerry_get_boolean_value, NOT JavaScript ToBoolean.
// Evaluate the actual HML conditions rather than making browser truthiness the oracle.
for(const name of ['menu','day','trash']){
 test('V '+name+' nonempty message/icon/hint conditions return native booleans',()=>{
  const h=fs.readFileSync(new URL(name+'/'+name+'.hml',root),'utf8');
  const expressions=[...h.matchAll(/\bif="\{\{([\s\S]*?)\}\}"/g)].map(x=>x[1]);
  for(const populated of [false,true]){
   const c={ready:true,mode:'app',hint:populated?'offline':'',message:populated?'error':'',c:{action:'back',icon:populated?'back':''},empty:false,hasMore:false,hasPrev:false,loading:false};
   for(const expression of expressions){const value=vm.runInNewContext(expression,c);assert.equal(typeof value,'boolean',name+': '+expression+' returned '+JSON.stringify(value));}
  }
 });
}
