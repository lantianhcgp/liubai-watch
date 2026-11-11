import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {FileHost, moduleFor, call, seal, checksum} from './file-host.mjs';

async function fixture(t) { const host=await FileHost.temporary(); const m=await moduleFor(host); t.after(async()=>{m.store.dispose?.();await host.cleanup();}); return {host,...m}; }
const plain = v => JSON.parse(JSON.stringify(v));

test('public callback contract exists before implementation', async t => {
  const {store}=await fixture(t);
  for (const name of ['init','list','load','save','flag','draftGet','draftPut','draftClear','settingGet','settingPut','dispose']) assert.equal(typeof store[name], 'function', `${name} must be implemented`);
});
test('UTF8 byte budget, emoji boundaries, lone surrogate detection', async t => {
  const {utf8:u}=await fixture(t);
  assert.equal(typeof u.bytes,'function','UTF8 implementation missing');
  for (const s of ['a','\u4e2d','\ud83d\ude00','a\ud83d\ude00b','\u0301','\ud800']) assert.equal(u.bytes(s),Buffer.byteLength(s));
  assert.equal(u.bound('a\ud83d\ude00b',2),1);
  assert.equal(u.prev('a\ud83d\ude00b',3),1);
  assert.equal(u.next('a\ud83d\ude00b',1),3);
  assert.equal(u.sliceBytes('a\ud83d\ude00b',4),'a');
  assert.equal(u.sliceBytes('a\ud83d\ude00b',5),'a\ud83d\ude00');
  assert.equal(u.valid('\ud800'),false);
});
test('same ID update preserves date, full emoji text, accurate filters and flags', async t => {
  const {store:s}=await fixture(t); await call(s,'init');
  const a=await call(s,'save',{id:'note-a',body:'\n \nTitle\n\nfull \u4e2d\ud83d\ude00 text',created:Date.UTC(2024,0,2,12)});
  assert.equal(a.title,'Title'); assert.equal(a.bytes,Buffer.byteLength('\n \nTitle\n\nfull \u4e2d\ud83d\ude00 text'));
  const b=await call(s,'save',{id:a.id,body:'changed \ud83d\ude00',created:Date.now()});
  assert.equal(b.id,a.id);assert.equal(b.created,a.created);assert.equal(b.revision,a.revision+1);
  assert.equal((await call(s,'load',a.id)).body,'changed \ud83d\ude00');
  await call(s,'flag',a.id,{pinned:true});
  assert.equal((await call(s,'list',{filter:'pinned'})).items.length,1);
  assert.equal((await call(s,'list',{filter:'day',day:a.date})).items.length,1);
  assert.equal((await call(s,'list',{filter:'month',month:a.date.slice(0,7)})).items.length,1);
  await call(s,'flag',a.id,{deleted:true});
  assert.equal((await call(s,'list',{})).items.length,0);
  assert.equal((await call(s,'list',{filter:'trash'})).items.length,1);
  await call(s,'flag',a.id,{deleted:false});
  assert.equal((await call(s,'load',a.id)).body,'changed \ud83d\ude00');
});
test('new overbudget/empty/malformed values reject, never truncate', async t => {
  const {store:s,host}=await fixture(t); await call(s,'init');
  for(const input of [{body:'x'.repeat(3073)},{body:' \n '},{body:'\ud800'},{id:'../bad',body:'x'}]) await assert.rejects(call(s,'save',input));
  await assert.rejects(call(s,'list',{filter:'unknown'}));
  await assert.rejects(call(s,'settingPut','../escape',{}));
  await assert.rejects(call(s,'flag','none',{pinned:'yes'}));
  assert.equal((await call(s,'list',{})).items.length,0);
  assert.ok(host.calls.every(c=>/^[\x00-\x7f]+$/.test(c.uri)));
});
test('draft isolated from saved body, reloads all editor fields, clear is a tombstone', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');
  await call(s,'save',{id:'x',body:'original'});
  const d={id:'x',body:'unsaved \ud83d\ude00',cursor:2,type:'cn',pinyin:'shi',keyboardOpen:true};
  await call(s,'draftPut',d);assert.deepEqual(plain(await call(s,'draftGet')),d);
  s.dispose();const {store:r}=await moduleFor(host);await call(r,'init');
  assert.deepEqual(plain(await call(r,'draftGet')),d);assert.equal((await call(r,'load','x')).body,'original');
  await call(r,'draftClear');r.dispose();const {store:r2}=await moduleFor(host);await call(r2,'init');assert.equal(await call(r2,'draftGet'),null);r2.dispose();
});
test('settings persist with reading ID/revision/anchor, failed update preserves old', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');
  assert.equal(await call(s,'settingGet','reader'),null);
  await call(s,'settingPut','reader',{id:'x',revision:2,anchor:13,size:'large'});
  host.inject('writeText',/s_reader/, 'partial');await assert.rejects(call(s,'settingPut','reader',{anchor:99}));
  s.dispose();const {store:r}=await moduleFor(host);await call(r,'init');assert.equal((await call(r,'settingGet','reader')).anchor,13);r.dispose();
});
test('body write, index commit, verification failures keep previous body and retry', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});
  for(const [method,match,mode] of [['writeText',/\/b/, 'partial'],['writeText',/\/i[01]\.json$/, 'partial'],['writeText',/\/i[01]\.json$/, 'corrupt'],['writeText',/\/b/, 'throw']]) {
    // S19: the original throw fixture is A, but its production signal is A/B-equivalent.
    // Retain only this test's original options so the fixture can explicitly finish A.
    const originalWrite=host.writeText;let thrownWrite=null;
    if(mode==='throw')host.writeText=function(options){try{return originalWrite.call(this,options);}catch(error){thrownWrite=options;throw error;}};
    try {
      host.inject(method,match,mode);await assert.rejects(call(s,'save',{id:'x',body:'new'}));
      if(mode==='throw') {
        assert.ok(thrownWrite);assert.equal(host.pending.length,0,'original A has no retained native completion');
        await assert.rejects(fs.access(host.local(thrownWrite.uri)),{code:'ENOENT'});
        const blockedCalls=host.calls.length;
        await assert.rejects(call(s,'load','x'),{message:'Error: Uncertain native write; wait for rollback'});
        await assert.rejects(call(s,'save',{id:'x',body:'retry'}),{message:'Error: Uncertain native write; wait for rollback'});
        assert.equal(host.calls.length,blockedCalls,'unresolved acceptance must not start new I/O');
        // An explicit fixture failure completion enters the existing rollback path;
        // only the real on-disk delete/ENOENT callback may release the production fence.
        thrownWrite.fail('S19 explicit fixture completion: no write accepted',300);
        await host.idle();
        const rollback=host.calls.slice(blockedCalls);
        assert.equal(rollback.length,1);assert.equal(rollback[0].method,'delete');assert.equal(rollback[0].uri,thrownWrite.uri);
        await assert.rejects(fs.access(host.local(thrownWrite.uri)),{code:'ENOENT'});
      }
    } finally {host.writeText=originalWrite;}
    assert.equal((await call(s,'load','x')).body,'old');
  }
  await call(s,'save',{id:'x',body:'new'});assert.equal((await call(s,'load','x')).body,'new');
});
test('double native callbacks and overlapping saves do not create duplicate revisions', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');
  host.inject('writeText',/\/b/,'double');
  const first=call(s,'save',{id:'dedup',body:'body'});
  await assert.rejects(call(s,'save',{id:'dedup',body:'body'}),/busy|progress|\u4fdd\u5b58|\u91cd\u590d/i);
  await first;
  assert.equal((await call(s,'load','dedup')).revision,1);assert.equal((await call(s,'list',{})).items.length,1);
});
test('read stall times out exactly once, retry works, late callback ignored', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});
  host.inject('readText',/\/i/,'stall');let count=0;
  const result=new Promise(resolve=>s.load('x',e=>{count++;resolve(e);}));
  await host.waitForStall();assert.equal(host.pending.length,1);host.clock.advance(9999);assert.equal(count,0);host.clock.advance(1);
  const error=await result;assert.ok(error);assert.match(String(error),/timeout|\u8d85\u65f6/i);assert.ok(host.clock.fired.includes(10000));
  assert.equal((await call(s,'load','x')).body,'old');await host.release();assert.equal(count,1);
});
test('commit write stall fences retries until late rollback; old body preserved', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});
  host.inject('writeText',/\/i[01]\.json$/,'stall');const result=call(s,'save',{id:'x',body:'new'}), rejected=assert.rejects(result,/timeout/i);
  await host.waitForStall();assert.equal(host.pending.length,1);host.clock.advance(10000);await rejected;
  await assert.rejects(call(s,'save',{id:'x',body:'retry'}));await host.release();
  await host.idle();assert.equal((await call(s,'load','x')).body,'old');
  await call(s,'save',{id:'x',body:'retry'});assert.equal((await call(s,'load','x')).body,'retry');
});
test('corrupt newest index falls back; two corrupt generations never silently reset', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});await call(s,'save',{id:'x',body:'new'});s.dispose();
  const dir=host.root+'/lb1/p0';const names=['i0.json','i1.json'];const entries=await Promise.all(names.map(async n=>({n,obj:JSON.parse(await fs.readFile(dir+'/'+n,'utf8'))})));
  entries.sort((a,b)=>b.obj.seq-a.obj.seq);await fs.writeFile(dir+'/'+entries[0].n,'broken');
  const {store:r}=await moduleFor(host);await call(r,'init');assert.equal((await call(r,'load','x')).body,'old');
  await fs.writeFile(dir+'/'+entries[1].n,'broken');await assert.rejects(call(r,'list',{}),/corrupt|\u635f\u574f/i);r.dispose();
});
test('bounded small-index pagination, 140 records, pinned-first, cold reload', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');
  for(let i=0;i<140;i++) await call(s,'save',{id:'n'+i,body:'record-'+i+' \ud83d\ude00',created:1700000000000+i,pinned:i%31===0});
  s.dispose();const {store:r}=await moduleFor(host);await call(r,'init');host.calls=[];
  let offset=0, seen=[], more=true;
  while(more) { const page=await call(r,'list',{offset,limit:9});assert.ok(page.items.length<=9);assert.ok(page.items.every(m=>m.body===undefined));if(page.total!==undefined)assert.equal(page.total,140);seen.push(...page.items);offset+=page.items.length;more=page.hasMore; }
  assert.equal(seen.length,140);assert.equal(new Set(seen.map(m=>m.id)).size,140);
  const expected=Array.from({length:140},(_,i)=>({id:'n'+i,pinned:i%31===0,created:1700000000000+i})).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.created-a.created).map(x=>x.id);
  assert.deepEqual(seen.map(x=>x.id),expected);
  assert.ok(host.calls.filter(c=>c.method==='readText').every(c=>c.length<=4096));
  assert.equal(host.calls.filter(c=>c.method==='readText'&&/\/b/.test(c.uri)).length,0,'list must not read bodies');
  assert.equal(host.calls.filter(c=>c.method==='list').length,0,'catalog cannot depend on unbounded directory enumeration');r.dispose();
});
test('legacy >3072-byte record loads/flags unchanged; edits may shrink but never silently truncate', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'legacy',body:'short'});s.dispose();
  const dir=host.root+'/lb1/p0';const candidates=await Promise.all(['i0.json','i1.json'].map(async n=>({n,e:JSON.parse(await fs.readFile(dir+'/'+n,'utf8'))})));candidates.sort((a,b)=>b.e.seq-a.e.seq);
  const chosen=candidates[0], rec=chosen.e.data.items[0], body='\ud83d\ude00'.repeat(1400);
  const chunks=[];let pos=0;while(pos<body.length){chunks.push(body.slice(pos,pos+700));pos+=700;}
  const token='legacyfixture';for(let i=0;i<chunks.length;i++)await fs.writeFile(`${dir}/b${token}_${i}.txt`,chunks[i]);
  rec.blob={token,count:chunks.length,bytes:Buffer.byteLength(body),hash:checksum(body)};rec.meta.bytes=Buffer.byteLength(body);
  await fs.writeFile(dir+'/'+chosen.n,seal(chosen.e.seq,chosen.e.data));
  const {store:r}=await moduleFor(host);await call(r,'init');assert.equal((await call(r,'load','legacy')).body,body);
  await call(r,'flag','legacy',{pinned:true});assert.equal((await call(r,'load','legacy')).body,body);
  await call(r,'save',{id:'legacy',body:body.slice(0,-2)});assert.equal((await call(r,'load','legacy')).body,body.slice(0,-2));
  await assert.rejects(call(r,'save',{id:'legacy',body:body+'x'}));r.dispose();
});
test('dispose completes pending callbacks and suppresses stale work', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});
  host.inject('readText',/\/i/,'stall');const p=call(s,'load','x');s.dispose();await assert.rejects(p);await host.release();await assert.rejects(call(s,'load','x'));
});

test('queue accepts page autosave/read/save, snapshots inputs, prioritizes save', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');
  host.inject('readText',/\/c/,'stall');const order=[];
  const record=(name,p)=>p.then(v=>{order.push(name);return v;});
  const first=record('active',call(s,'list',{}));await host.waitForStall();
  const draft={id:'',body:'queued draft',cursor:0,type:0,pinyin:'',open:true,original:'',created:0,viewAnchor:0,extra:{x:1}};
  const write=record('draft',call(s,'draftPut',draft));
  const read=record('read',call(s,'draftGet'));
  const input={id:'',body:'manual save',created:1700000000000};const save=record('save',call(s,'save',input));
  draft.body='mutated';draft.extra.x=99;input.body='mutated';
  await assert.rejects(call(s,'save',{body:'duplicate'}),/save|progress|busy/i);
  await host.release();const results=await Promise.all([first,write,read,save]);
  assert.deepEqual(order,['active','save','draft','read']);assert.equal(results[2].body,'queued draft');assert.equal(results[2].extra.x,1);
  assert.equal((await call(s,'load',results[3].id)).body,'manual save');
});
test('queue bounds eight including active, reserves priority save, overflow explicit', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');host.inject('readText',/\/c/,'stall');
  const first=call(s,'list',{});await host.waitForStall();const jobs=[];
  for(let i=0;i<6;i++)jobs.push(call(s,'settingPut','q'+i,{i}));
  await assert.rejects(call(s,'draftGet'),/queue.*full|capacity/i);
  const save=call(s,'save',{id:'reserved',body:'saved despite autosaves'});
  await assert.rejects(call(s,'list',{}),/queue.*full|capacity/i);
  await host.release();await Promise.all([first,...jobs,save]);assert.equal((await call(s,'load','reserved')).revision,1);
  for(let i=0;i<6;i++)assert.equal((await call(s,'settingGet','q'+i)).i,i);
});
test('ordinary queue failure releases next tasks without swallowing callbacks', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});
  host.inject('readText',/\/c/,'stall');const first=call(s,'list',{});await host.waitForStall();
  host.inject('writeText',/\/b/,'partial');const failed=assert.rejects(call(s,'save',{id:'x',body:'new'}));
  const next=call(s,'load','x');await host.release();await first;await failed;assert.equal((await next).body,'old');
  await call(s,'save',{id:'x',body:'retry'});assert.equal((await call(s,'load','x')).body,'retry');
});
test('write fence fails already queued tasks and blocks init until actual late cleanup', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');await call(s,'save',{id:'x',body:'old'});
  host.inject('writeText',/\/d[01]\.json$/,'stall');const active=assert.rejects(call(s,'draftPut',{id:'',body:'draft'}),/timeout/i);
  await host.waitForStall();let callbacks=0;
  const pending=new Promise(resolve=>s.save({id:'x',body:'must not write'},e=>{callbacks++;resolve(e);}));
  host.clock.advance(10000);await active;const err=await pending;assert.ok(err);assert.match(String(err),/native write|rollback|uncertain/i);assert.equal(callbacks,1);
  await assert.rejects(call(s,'init'),/native write|rollback|uncertain/i);
  await host.release();await host.idle();assert.equal(callbacks,1);assert.equal((await call(s,'load','x')).body,'old');
  assert.equal(await call(s,'draftGet'),null);
});
test('dispose cancels active and every queued callback exactly once without native writes', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');host.inject('readText',/\/c/,'stall');
  const counts=[0,0,0];const cb=i=>e=>{assert.ok(e);counts[i]++;};s.list({},cb(0));await host.waitForStall();
  s.draftPut({id:'',body:'pending'},cb(1));s.save({body:'pending save'},cb(2));const writes=host.calls.filter(c=>c.method==='writeText').length;
  s.dispose();assert.deepEqual(counts,[1,1,1]);await host.release();await host.idle();assert.deepEqual(counts,[1,1,1]);
  assert.equal(host.calls.filter(c=>c.method==='writeText').length,writes);
});
test('large draft stores body chunks and small metadata, parent fields/extras survive reload', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');
  const body=('e\u0301 \ud83d\udc69\u200d\ud83d\udcbb \u2764\ufe0f\n').repeat(300);
  const d={text:body,body,id:'',cursor:2,type:0,pinyin:'',open:false,original:'previous',created:0,viewAnchor:3,extra:{labels:['a'],enabled:false}};
  const expected={...d};delete expected.text;
  assert.deepEqual(plain(await call(s,'draftPut',d)),expected);s.dispose();const {store:r}=await moduleFor(host);await call(r,'init');
  assert.deepEqual(plain(await call(r,'draftGet')),expected);
  const names=await fs.readdir(host.root+'/lb1');const metas=names.filter(n=>/^d[01]\.json$/.test(n));assert.ok(metas.length);
  for(const n of metas){const text=await fs.readFile(host.root+'/lb1/'+n,'utf8');assert.ok(Buffer.byteLength(text)<4000);assert.equal(text.includes('"body"'),false);assert.equal(text.includes('"text"'),false);}
  for(const n of names.filter(n=>/^b.*\.txt$/.test(n))){const text=await fs.readFile(host.root+'/lb1/'+n,'utf8');assert.ok(Buffer.byteLength(text)<=2800);assert.equal(text.startsWith('{'),false);}
  await call(r,'draftPut',{text:'alias only',id:'',cursor:0,type:0});assert.equal((await call(r,'draftGet')).body,'alias only');
  await call(r,'draftPut',{body:'',id:'',type:0});assert.equal((await call(r,'draftGet')).body,'');r.dispose();
});
test('draft validation and chunk/meta faults preserve previous draft and retry', async t => {
  const {store:s,host}=await fixture(t);await call(s,'init');const old={id:'',body:'old',type:0};await call(s,'draftPut',old);
  for(const value of [{body:'a',text:'b'},{body:'\ud800'},{body:'ok',id:'../bad'},{body:'ok',extra:'x'.repeat(4000)},{body:'x'.repeat(32769)}])await assert.rejects(call(s,'draftPut',value));
  const circular={body:'ok'};circular.extra=circular;await assert.rejects(call(s,'draftPut',circular));
  for(const [match,mode] of [[/\/b/,'partial'],[/\/d[01]\.json$/,'partial'],[/\/d[01]\.json$/,'corrupt']]){
    host.inject('writeText',match,mode);await assert.rejects(call(s,'draftPut',{id:'',body:'new'}));assert.deepEqual(plain(await call(s,'draftGet')),old);
  }
  await call(s,'draftPut',{id:'',body:'retry'});assert.equal((await call(s,'draftGet')).body,'retry');
});
test('unicode combining ZWJ variation roundtrip remains valid across 2800-byte seams', async t => {
  const {store:s,utf8:u,host}=await fixture(t);await call(s,'init');
  const body='a'.repeat(2799)+'e\u0301\ud83d\udc69\u200d\ud83d\udcbb\u2764\ufe0f';
  await call(s,'save',{id:'unicode',body});assert.equal((await call(s,'load','unicode')).body,body);assert.equal(u.valid(body),true);
  for(const n of (await fs.readdir(host.root+'/lb1/p0')).filter(n=>/\.txt$/.test(n))){const b=await fs.readFile(host.root+'/lb1/p0/'+n);assert.equal(Buffer.from(b.toString('utf8')).equals(b),true);assert.ok(b.length<=2800);}
});
