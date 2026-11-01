import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {FileHost, moduleFor, call, seal} from './file-host.mjs';

async function fixture(t) {
  const host = await FileHost.temporary();
  const {store} = await moduleFor(host);
  t.after(async () => { store.dispose(); await host.cleanup(); });
  await call(store, 'init');
  return {host, store};
}
const bodies = async dir => (await fs.readdir(dir)).filter(n => /^b.*\.txt$/.test(n));

// Real native-callback disk host; neither accelerated deadlines nor fabricated index data.
test('140 sorted records page in one bounded scan per sequential request', {timeout:30000}, async t => {
  const {host, store:s} = await fixture(t);
  for (let i=0; i<140; i++) await call(s, 'save', {id:'n'+i, body:'record-'+i+' 😀', created:1700000000000+i, pinned:i%31===0});
  s.dispose();
  const {store:r} = await moduleFor(host);
  t.after(() => r.dispose());
  await call(r, 'init'); host.calls=[];
  const seen=[]; let offset=0, more=true;
  while (more) {
    const page=await call(r, 'list', {offset, limit:9});
    assert.equal(page.total,140);
    assert.ok(page.items.length<=9);
    assert.ok(page.items.every(m => m.body===undefined));
    seen.push(...page.items); offset+=page.items.length; more=page.hasMore;
  }
  const expected=Array.from({length:140}, (_,i) => ({id:'n'+i,created:1700000000000+i,pinned:i%31===0}))
    .sort((a,b) => Number(b.pinned)-Number(a.pinned)||b.created-a.created).map(m=>m.id);
  assert.deepEqual(seen.map(m=>m.id), expected);
  const reads=host.calls.filter(c=>c.method==='readText');
  assert.ok(reads.length<=2*Math.ceil(140/6)*Math.ceil(140/9)+2*Math.ceil(140/9), 'sequential offset must not rescan once per skipped dozen');
  assert.ok(reads.every(c=>c.length<=4096));
  assert.equal(reads.filter(c=>/\/b/.test(c.uri)).length,0);
  assert.equal(host.calls.filter(c=>c.method==='list').length,0);
  // Different query, nonsequential jump, and writes must invalidate continuation.
  assert.equal((await call(r,'list',{filter:'pinned',limit:12})).total,5);
  assert.deepEqual(Array.from((await call(r,'list',{offset:50,limit:3})).items,m=>m.id),expected.slice(50,53));
  await call(r,'flag',expected[0],{deleted:true});
  assert.equal((await call(r,'list',{offset:53,limit:3})).total,139);
});

test('GC bounds saved revisions and preserves both rollback generations', async t => {
  const {host,store:s}=await fixture(t), dir=host.root+'/lb1/p0';
  for(let i=0;i<24;i++) await call(s,'save',{id:'x',body:'revision-'+i});
  assert.ok((await bodies(dir)).length<=2,'immutable revisions must be collected');
  const generations=await Promise.all(['i0.json','i1.json'].map(async n=>({n,x:JSON.parse(await fs.readFile(dir+'/'+n,'utf8'))})));
  generations.sort((a,b)=>b.x.seq-a.x.seq);
  for(const g of generations) for(const rec of g.x.data.items)
    for(let i=0;i<rec.blob.count;i++) await fs.access(dir+'/b'+rec.blob.token+'_'+i+'.txt');
  await fs.writeFile(dir+'/'+generations[0].n,'broken');
  assert.equal((await call(s,'load','x')).body,'revision-22');
  assert.equal(host.calls.filter(c=>c.method==='list').length,0);
});

test('GC bounds large drafts, retains rollback on clear, collects after second clear', async t => {
  const {host,store:s}=await fixture(t), dir=host.root+'/lb1';
  for(let i=0;i<20;i++) await call(s,'draftPut',{id:'',body:'d'.repeat(6000)+i,cursor:i});
  assert.ok((await bodies(dir)).length<=6,'only two three-chunk draft generations may remain');
  await call(s,'draftClear');
  assert.equal((await bodies(dir)).length,3,'previous draft still supports tombstone rollback');
  await call(s,'draftClear');
  assert.equal((await bodies(dir)).length,0);
  assert.equal(host.calls.filter(c=>c.method==='list').length,0);
});

test('GC recovers interrupted intent without deleting current or previous blobs', async t => {
  const {host,store:s}=await fixture(t), dir=host.root+'/lb1/p0';
  await call(s,'save',{id:'x',body:'old'});await call(s,'save',{id:'x',body:'current'});
  const roots=[];
  for(const n of ['i0.json','i1.json']) for(const rec of JSON.parse(await fs.readFile(dir+'/'+n,'utf8')).data.items)
    roots.push({token:rec.blob.token,count:rec.blob.count});
  await fs.writeFile(dir+'/borphan_0.txt','interrupted body');
  const journals=await Promise.all(['g0.json','g1.json'].map(async n=>({n,x:JSON.parse(await fs.readFile(dir+'/'+n,'utf8'))})));journals.sort((a,b)=>a.x.seq-b.x.seq);
  await fs.writeFile(dir+'/'+journals[0].n,seal(journals[1].x.seq+1,{blobs:[...roots,{token:'orphan',count:2}]}));
  s.dispose();const {store:r}=await moduleFor(host);t.after(()=>r.dispose());await call(r,'init');
  assert.equal((await bodies(dir)).length,2);
  assert.equal((await call(r,'load','x')).body,'current');
  for(const b of roots) await fs.access(dir+'/b'+b.token+'_0.txt');
  assert.equal(host.calls.filter(c=>c.method==='list').length,0);
});

test('GC retries failed cleanup and failed body/commit candidates stay bounded', async t => {
  const {host,store:s}=await fixture(t), dir=host.root+'/lb1/p0';
  await call(s,'save',{id:'x',body:'old'});await call(s,'save',{id:'x',body:'new'});
  host.inject('delete',/\/b/,'fail');await call(s,'save',{id:'x',body:'third'});
  await call(s,'save',{id:'x',body:'fourth'});
  assert.ok((await bodies(dir)).length<=2);
  for(let i=0;i<6;i++) {
    host.inject('writeText',/\/b/,'partial');await assert.rejects(call(s,'save',{id:'x',body:'failed'}));
    assert.equal((await call(s,'load','x')).body,'fourth');
  }
  await call(s,'save',{id:'x',body:'recovered'});
  assert.ok((await bodies(dir)).length<=2);
  assert.equal(host.calls.filter(c=>c.method==='list').length,0);
});
