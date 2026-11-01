import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
let source=fs.readFileSync('entry/src/main/js/MainAbility/pages/edit/edit.js','utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,a,b)=>'var '+a+'=mocks['+JSON.stringify(b)+'];').replace('export default','result=');
let calls=0;const mocks={};for(let n of ['shell','layout','reader','store-page','keyboard','session','utf8'])mocks['../../common/'+n]={};
mocks['../../common/keyboard'].create=o=>({snapshot:()=>({text:o.text,cursor:o.cursor,type:o.type,pinyin:o.pinyin})});
let ctx={mocks,result:null,setTimeout,clearTimeout,console};vm.runInNewContext(source,ctx);let p=ctx.result;Object.assign(p,p.data,{params:{action:'new'},action:'new'});p.changed=()=>{};
assert.doesNotThrow(()=>p.boot({text:'',cursor:0,open:true}),'native route action parameter must never overwrite a called page method');
console.log('PASS native route action cannot shadow editor command method');
