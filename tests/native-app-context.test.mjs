import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function fixture(globalApp, artificialVm){
 const calls=[],store={},session={},route={id:'saved'};
 const application={getStore(){return store;},getSession(){return session;},whenLiubaiReady(cb){calls.push(['ready']);cb(null);},getLiubaiParams(){return route;},setLiubaiParams(p){calls.push(['params',p]);}};
 const imports={'./store-page':{bind(v){calls.push(['store',v]);}},'./session':{bind(v){calls.push(['session',v]);}},'@system.device':{},'@system.router':{replace(v){calls.push(['route',v]);}},'./layout':{}};
 const source=fs.readFileSync(new URL('common/shell.js',base),'utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,p)=>'var '+name+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');
 const ctx={imports,result:null,setTimeout,clearTimeout,Date:{now(){return 2000;}},Error};
 if(globalApp==='direct')ctx.$app=application;
 else if(globalApp==='def')ctx.$app={$def:application};
 else if(globalApp!==undefined)ctx.$app=globalApp;
 vm.runInNewContext(source,ctx,{filename:'common/shell.js'});
 return {shell:ctx.result,calls,store,session,route,application,page:artificialVm?{$vm:{$app:{$def:application}}}:{}};
}
test('native global application binds exact shared objects without artificial page $vm',()=>{
 const f=fixture('direct');let error='not called';f.shell.ensure(f.page,e=>{error=e;});
 assert.equal(error,null);assert.equal(f.calls[0][0],'store');assert.equal(f.calls[0][1],f.store);
 assert.equal(f.calls[1][0],'session');assert.equal(f.calls[1][1],f.session);assert.equal(f.calls[2][0],'ready');
});
test('native global $def wrapper preserves readiness and router parameter identity',()=>{
 const f=fixture('def');let error='not called';f.shell.ensure(f.page,e=>{error=e;});assert.equal(error,null);
 assert.equal(f.shell.params(f.page),f.route);const values={id:'b'};f.shell.nav(f.page,'read',values);
 const params=f.calls.find(c=>c[0]==='params');const route=f.calls.find(c=>c[0]==='route');
 assert.equal(params[1],values);assert.equal(route[1].params,values);assert.equal(route[1].uri,'pages/read/read');
});
test('missing or unrelated global app cannot be rescued by a fabricated page $vm',()=>{
 for(const app of [undefined,{},{$def:{}}]){const f=fixture(app,true);let error;f.shell.ensure(f.page,e=>{error=e;});assert.equal(error.message,'App store readiness unavailable');assert.equal(f.calls.length,0);}
});
test('launcher PNG resources retain exact 114/32 dimensions and manifest reference',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../entry/src/main/config.json',import.meta.url),'utf8'));
 assert.equal(config.module.abilities[0].icon,'$media:icon');assert.deepEqual(config.app.version,{code:8,name:'0.2.6'});
 for(const [name,size] of [['icon.png',114],['icon_small.png',32]]){
  const bytes=fs.readFileSync(new URL('../entry/src/main/resources/base/media/'+name,import.meta.url));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
 }
});
