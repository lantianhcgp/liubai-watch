import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {FileHost,moduleFor,call} from './file-host.mjs';
const layoutURL='data:text/javascript;base64,'+Buffer.from(fs.readFileSync('entry/src/main/js/MainAbility/common/layout.js')).toString('base64');
const layout=(await import(layoutURL)).default;
const reader=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('entry/src/main/js/MainAbility/common/reader.js','utf8').replace(/from ['"]\.\/layout['"]/,'from '+JSON.stringify(layoutURL))).toString('base64'))).default;
test('changing page limit cannot discard unconsumed cached metadata rows',async t=>{
 const host=await FileHost.temporary(),{store}=await moduleFor(host);t.after(async()=>{store.dispose();await host.cleanup()});await call(store,'init');
 for(let i=0;i<18;i++)await call(store,'save',{id:'n'+String(i).padStart(2,'0'),body:'Title '+i+'\n\nBody',created:new Date(2026,10,1,20,0).getTime()-i*60000});
 const a=await call(store,'list',{filter:'all',offset:0,limit:6}),b=await call(store,'list',{filter:'all',offset:6,limit:12});
 assert.deepEqual([...Array.from(a.items,x=>x.id),...Array.from(b.items,x=>x.id)],Array.from({length:18},(_,i)=>'n'+String(i).padStart(2,'0')));assert.equal(b.hasMore,false);
});
test('approved short heading boundary is 18 characters, with 19 falling back to body',()=>{
 const g=layout.reader({windowWidth:412,windowHeight:484,screenShape:'rect'});
 for(const n of [16,17,18]){const text='题'.repeat(n)+'\n\n正文内容。';const p=reader.page(text,0,g);assert.equal(p.lines[0].bold,true,n+'-character heading');}
 assert.equal(reader.page('题'.repeat(19)+'\n\n正文内容。',0,g).lines[0].bold,false);
});
