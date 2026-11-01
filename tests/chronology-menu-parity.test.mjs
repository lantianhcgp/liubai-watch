import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {FileHost,moduleFor,call} from './file-host.mjs';
test('day/month listing follows chronological order, pin prioritisation only applies to notebook',async t=>{
 const host=await FileHost.temporary(),{store}=await moduleFor(host);t.after(async()=>{store.dispose();await host.cleanup()});await call(store,'init');
 await call(store,'save',{id:'recent',body:'Recent\n\nBody',created:new Date(2026,10,1,21,40).getTime()});await call(store,'save',{id:'pin',body:'Pinned\n\nBody',created:new Date(2026,10,1,17,15).getTime(),pinned:true});
 assert.deepEqual(Array.from((await call(store,'list',{filter:'all',offset:0,limit:6})).items,x=>x.id),['pin','recent']);
 for(const q of [{filter:'day',day:'2026-11-01'},{filter:'month',month:'2026-11'}])assert.deepEqual(Array.from((await call(store,'list',{...q,offset:0,limit:6})).items,x=>x.id),['recent','pin']);
});
test('menu segments and confirmation dock are one shell with square internal seams, not independent pills',()=>{
 const s=fs.readFileSync('entry/src/main/js/MainAbility/pages/menu/menu.css','utf8');const segment=/\.font\{([^}]*)\}/.exec(s)[1],dock=/\.dock-control\{([^}]*)\}/.exec(s)[1];assert.doesNotMatch(segment,/border-radius/);assert.doesNotMatch(dock,/border-radius/);
});
