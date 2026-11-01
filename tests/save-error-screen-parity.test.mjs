import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {fixture} from './list-menu.test.mjs';
const root='entry/src/main/js/MainAbility/';
test('failed save retains intact edit snapshot and opens approved error screen without passing body in params',()=>{
 let saved,cache,nav;const mocks={
  '../../common/shell':{nav(p,n,q){nav={n,q};}},
  '../../common/store-page':{save(n,cb){saved=cb;}},
  '../../common/session':{set(s){cache=s;}}
 };let s=fs.readFileSync(root+'pages/edit/edit.js','utf8').replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,a,b)=>'var '+a+'=mocks['+JSON.stringify(b)+'];').replace('export default','result=');const c={mocks,result:null,console,setTimeout,clearTimeout};vm.runInNewContext(s,c);const p=c.result;Object.assign(p,JSON.parse(JSON.stringify(p.data)),{alive:true,id:'n1',text:'完整正文\n第二段',cursor:7,created:123,base:'original',open:true,anchor:0,kb:{snapshot(){return{text:p.text,cursor:7,type:1,pinyin:'',open:true};}}});p.save();saved(new Error('disk full'));
 assert.equal(p.text,'完整正文\n第二段');assert.equal(p.saving,false);assert.ok(cache,'unsaved snapshot must survive route destruction');assert.equal(cache.text,p.text);assert.equal(cache.id,'n1');assert.equal(cache.cursor,7);assert.equal(nav.n,'menu');assert.equal(nav.q.mode,'error');assert.equal(nav.q.id,'n1');assert.equal(nav.q.body,undefined);assert.equal(nav.q.text,undefined);
});
test('approved error screen has continue/retry controls and only asks parent editor to retry',()=>{
 const f=fixture('menu',{mode:'error',id:'n1'});f.session.set({id:'n1',text:'unsaved full body',cursor:4,type:1,pinyin:'',open:true});
 assert.equal(f.p.ready,true);assert.equal(f.p.title,'保存失败');assert.equal(f.p.emptyTitle,'没存上，不丢文字');assert.equal(f.p.emptyIcon,'alert');assert.deepEqual(Array.from(f.p.dock,c=>c.label),['继续编辑','重试保存']);f.p.activate('save');let n=f.calls.at(-1);assert.equal(n[0],'nav');assert.equal(n[1],'edit');assert.equal(n[2].action,'save');assert.equal(n[2].body,undefined);assert.equal(f.session.get().text,'unsaved full body');assert.equal(f.calls.filter(c=>c[0]==='save').length,0);f.p.back();assert.equal(f.calls.at(-1)[1],'edit');
});
