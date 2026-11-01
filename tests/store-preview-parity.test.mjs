import test from 'node:test';import assert from 'node:assert/strict';import {FileHost,moduleFor,call} from './file-host.mjs';
test('list metadata preview excludes title paragraph like approved V3 without changing original body',async t=>{
 const host=await FileHost.temporary(),{store}=await moduleFor(host);t.after(async()=>{store.dispose();await host.cleanup()});await call(store,'init');
 const text='\n\nTitle\n\nA quiet sentence\nsecond line';const m=await call(store,'save',{id:'v3-preview',body:text,created:Date.UTC(2026,10,1,10)});
 assert.equal(m.title,'Title');assert.equal(m.preview,'A quiet sentence second line');assert.equal((await call(store,'load',m.id)).body,text);
 const s=await call(store,'save',{id:'one-line',body:'one line'});assert.equal(s.preview,'\u70b9\u5f00\u9605\u8bfb');
});
