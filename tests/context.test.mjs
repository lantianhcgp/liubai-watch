import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const base=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
function load(file,globals={}){assert.ok(fs.existsSync(new URL(file,base)),file+' implementation missing');const src=fs.readFileSync(new URL(file,base),'utf8');assert.ok(!/^import /m.test(src),'pure context/app should have no import');const ctx=vm.createContext({...globals});vm.runInContext(src.replace('export default','globalThis.result ='),ctx);return ctx.result;}
test('elcton-derived app exposes real shared state without boot/store bundle',()=>{const app=load('app.js',{console});app.onCreate();const s=app.getState();assert.equal(s,app.getState());assert.equal(s.store,null);assert.equal(s.params.uri,'pages/index/index');assert.equal(s.clipboard.length,0);app.onDestroy();});
test('context uses real $app and immutable routing snapshots',()=>{const app=load('app.js',{console});app.onCreate();const c=load('common/context.js',{$app:app});assert.equal(c.state(),app.getState());const input={id:'n123',anchor:42};c.setParams('pages/read/read',input);input.anchor=88;assert.equal(c.params().anchor,42);assert.equal(c.params().id,'n123');assert.equal(app.getState().params.uri,'pages/read/read');});
test('context fails explicitly instead of accepting fake $vm app',()=>{const c=load('common/context.js',{$vm:{$app:{$def:{}}}});assert.throws(()=>c.state(),/APP_CONTEXT/);});
test('config starts directly at genuine index and preserves all public V3 pages',()=>{const p=new URL('../entry/src/main/config.json',import.meta.url);assert.ok(fs.existsSync(p),'new config missing');const c=JSON.parse(fs.readFileSync(p));assert.equal(c.app.bundleName,'com.hcbiu.liubai');assert.equal(c.app.version.code,2);assert.deepEqual(c.module.js[0].pages,['index','read','edit','menu','history','day','trash'].map(p=>'pages/'+p+'/'+p));});
