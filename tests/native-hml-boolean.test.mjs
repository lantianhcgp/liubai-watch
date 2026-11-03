import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root='entry/src/main/js/MainAbility/pages/';
// Native IsIfDescriptorShown -> JSBoolean::Value -> jerry_get_boolean_value.
// It does not coerce nonempty strings like browser/Vue truthiness does.
function conditions(page){const h=fs.readFileSync(root+page+'/'+page+'.hml','utf8');return [...h.matchAll(/\bif="\{\{([\s\S]*?)\}\}"/g)].map(m=>m[1]);}
const base={ready:true,loading:false,hasPrev:false,hasMore:false,empty:false,message:'',hint:'',mode:'tool',open:true,hasPinyin:false,caretShow:false,c:{icon:'/common/icons/back_warm.png',action:'left'},line:{bold:false},$item:{pinned:false}};
test('tool image paths mount visible nodes with native strict boolean semantics',()=>{
 const expr=conditions('menu').find(s=>s.includes('c.icon'));
 assert.equal(vm.runInNewContext('('+expr+')',base),true,'nonempty shipped icon must evaluate to true, not a string');
 assert.equal(vm.runInNewContext('('+expr+')',{...base,c:{icon:'',action:'type'}}),false);
});
test('every shipped conditional gives the native engine an actual boolean, including nonempty paths and errors',()=>{
 for(const page of ['index','read','edit','menu','history','day','trash']){
  for(const extra of [{},{hint:'tools description'},{message:'Read failed',loading:false},{message:'',loading:true},{c:{icon:'',action:'type'}},{empty:true,hasPrev:true,hasMore:true}]){
   const scope={...base,...extra};
   for(const expr of conditions(page))assert.equal(typeof vm.runInNewContext('('+expr+')',scope),'boolean',page+' condition is not a boolean: '+expr);
  }
 }
});
