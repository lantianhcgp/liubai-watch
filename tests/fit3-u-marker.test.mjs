import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('U candidate has its own early marker; T retained only as inherited compatibility lineage',()=>{
 const rows=[],noop=()=>{};
 const imports={'./common/logsink.js':{init:noop,page:noop,stop:noop,i:(t,m)=>rows.push(m)},'./common/log-config.js':{},'./common/store':{init:cb=>cb(null),dispose:noop},'./common/session':{},'./common/shell':{setVisibilityHook:noop,markVisible:noop,isVisible:()=>true}};
 const code=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/app.js',import.meta.url),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
 const c={imports,result:null,setTimeout:()=>1,clearTimeout:noop};vm.runInNewContext(code,c);c.result.onCreate();
 assert.equal(rows.filter(x=>x.startsWith('S/build.fit3.U ')).length,1);
 assert.ok(rows.findIndex(x=>x.startsWith('S/build.fit3.U '))<rows.findIndex(x=>x.startsWith('L/app.store.init.enter ')));
 c.result.onDestroy();
});
