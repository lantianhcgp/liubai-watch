import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ROOT=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
test('V ready evidence stays unaggregated and never reads native reactive accessors',()=>{
 const logs=[];const store={setSerialReads(){},checkInitDeadline(){return true;},init(cb){cb(null);},dispose(){}};
 const imports={'./common/store':store,'./common/session':{},'./common/shell':{setVisibilityHook(){},markVisible(){},isVisible:()=>true},'./common/logsink.js':{init(){},page(){},stop(){},i(t,m){logs.push(m);},e(){}},'./common/log-config.js':{}};
 const c={imports,result:null,Date,setTimeout:()=>0,clearTimeout(){}};
 const s=fs.readFileSync(new URL('app.js',ROOT),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,k,p)=>'var '+k+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');vm.runInNewContext(s,c);const a=c.result;a.onCreate();assert.ok(logs.some(s=>s.startsWith('S/build.fit3.V ')));
 const p={};let reads=0;for(const k of ['ready','w','h'])Object.defineProperty(p,k,{get(){reads++;throw Error('native accessor');}});
 a.noteLiubaiGeometry(408,480,p);
 for(const m of ['V/menu.ready.app','V/menu.ready.record','V/menu.ready.read','V/menu.ready.exit','V/read.ready']){const n=logs.length;a.traceLiubai(m,p);assert.equal(logs.length,n+1);assert.match(logs.at(-1),/(?:^|\s)ready=1(?:\s|$)/);assert.match(logs.at(-1),/w=408 h=480/);}
 a.traceLiubai('V/save.fail',p);assert.doesNotMatch(logs.at(-1),/(?:^|\s)ready=1(?:\s|$)/);assert.equal(reads,0);a.onDestroy();
});
