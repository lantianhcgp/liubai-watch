import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../../entry/src/main/js/MainAbility/',import.meta.url);
function loadBoot(app){const routes=[],engine={};const source=fs.readFileSync(new URL('pages/boot/boot.js',root),'utf8').replace(/^import Store[^\n]*$/m,'var Store=engine;').replace(/^import Router[^\n]*$/m,'var Router=router;').replace('export default','result=');const c={result:null,engine,router:{replace(o){routes.push(o.uri);}},$app:app};vm.runInNewContext(source,c);const p=Object.assign({},c.result.data,c.result);return {p,routes,engine};}
test('boot uses native global application and waits until rendered before replacing',()=>{
 let attached,params;const a={attachStore(s){attached=s;},setLiubaiParams(p){params=p;}};const {p,routes,engine}=loadBoot(a);
 p.onInit();assert.equal(attached,engine);assert.deepEqual(routes,[],'navigation cannot replace the page before boot render');
 assert.equal(typeof p.onReady,'function');p.onReady();assert.deepEqual(routes,['pages/index/index']);assert.equal(Object.keys(params).length,0);
});
test('bootstrap provides a visible message rather than a silently blank page when application is unavailable',()=>{
 const {p,routes}=loadBoot(undefined);assert.doesNotThrow(()=>p.onInit());assert.ok(typeof p.message==='string'&&p.message.length>0);if(p.onReady)p.onReady();assert.deepEqual(routes,[]);
 const hml=fs.readFileSync(new URL('pages/boot/boot.hml',root),'utf8');assert.match(hml,/<text[^>]*>\s*{{message}}/);
});
test('icon uses proven 114px square rather than old 48px input',()=>{const b=fs.readFileSync(new URL('../../entry/src/main/resources/base/media/icon.png',import.meta.url));assert.equal(b.readUInt32BE(16),114);assert.equal(b.readUInt32BE(20),114);});
