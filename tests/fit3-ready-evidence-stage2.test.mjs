import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
  const logs=[];
  const store={setSerialReads(){},checkInitDeadline(){return true;},init(cb){cb(null);},dispose(){}};
  const logger={init(){},page(){},stop(){},i(tag,msg){logs.push({tag,msg});},e(){},status(){return {pending:0,sent:0,failed:0,dropped:0};}};
  const imports={'./common/store':store,'./common/session':{},'./common/shell':{setVisibilityHook(){},markVisible(){},isVisible:()=>true},'./common/logsink.js':logger,'./common/log-config.js':{}};
  const code=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/app.js',import.meta.url),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
  const ctx={imports,result:null,setTimeout(){return 1;},clearTimeout(){}};
  vm.runInNewContext(code,ctx);ctx.result.onCreate();
  return {app:ctx.result,logs};
}
test('T evidence identifies this candidate independently of retained product version',()=>{
  const f=fixture();assert.ok(f.logs.some(r=>r.msg.startsWith('S/build.fit3.T ')));f.app.onDestroy();
});
test('T business completion logs exact standalone ready=1 with measured geometry',()=>{
  const f=fixture(),p={ready:true,w:412,h:484,loading:false};f.app.noteLiubaiGeometry(412,484,p);
  f.app.traceLiubai('S/edit.done',p);const r=f.logs.at(-1).msg;
  assert.match(r,/(?:^|\s)ready=1(?:\s|$)/);assert.match(r,/w=412 h=484/);f.app.onDestroy();
});
test('T native geometry alone cannot certify edit waiting, a failed page, or an unrelated page',()=>{
  const f=fixture(),p={};let reads=0;
  for(const k of ['ready','w','h'])Object.defineProperty(p,k,{get(){reads++;throw Error('native accessor');}});
  f.app.noteLiubaiGeometry(412,484,p);f.app.traceLiubai('S/edit.wait',p);
  assert.doesNotMatch(f.logs.at(-1).msg,/(?:^|\s)ready=1(?:\s|$)/);
  assert.match(f.logs.at(-1).msg,/device_ready=1 w=412 h=484/);
  f.app.traceLiubai('S/edit.done',p);assert.match(f.logs.at(-1).msg,/(?:^|\s)ready=1(?:\s|$)/);
  const q={ready:false,w:0,h:0};f.app.traceLiubai('S/edit.failed',q);
  assert.doesNotMatch(f.logs.at(-1).msg,/(?:^|\s)ready=1(?:\s|$)/);
  assert.doesNotMatch(f.logs.at(-1).msg,/w=412/);
  f.app.clearLiubaiGeometry(p);f.app.traceLiubai('S/edit.wait',p);
  assert.doesNotMatch(f.logs.at(-1).msg,/w=412/);assert.equal(reads,0);f.app.onDestroy();
});
