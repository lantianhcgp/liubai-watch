import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createDiskHost } from './store-disk-host.mjs';

// Every generated record/body below is synthetic test only, not a product seed.
const sourcePath = new URL('../entry/src/main/js/MainAbility/common/store.js', import.meta.url);
const ROOT = 'internal://app/lb2/';
const required = ['init', 'list', 'days', 'read', 'save', 'setFlag', 'saveDraft', 'loadDraft', 'clearDraft'];
function factory(clock, logger) {
  assert.ok(existsSync(sourcePath), 'common/store.js must exist');
  const source = readFileSync(sourcePath, 'utf8');
  assert.ok(source.includes('export default createStore;'), 'static factory export required');
  const ClockDate = clock ? class extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.value])); }
    static now() { return clock.value; }
  } : Date;
  const context = vm.createContext({ Date: ClockDate, console: logger || console });
  new vm.Script(source.replace('export default createStore;', 'this.createStore = createStore;')).runInContext(context);
  return context.createStore;
}
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function outcome(store, method, ...args) {
  return new Promise(resolve => store[method](...args, (err, result) => resolve({ err, result: plain(result) })));
}
async function ok(store, method, ...args) {
  const result = await outcome(store, method, ...args);
  assert.equal(result.err, null, `${method}: ${result.err}`);
  return result.result;
}
async function fixture(t, clock) {
  const host = createDiskHost();
  t.after(() => host.close());
  const create = factory(clock);
  const store = create(host.api);
  await ok(store, 'init');
  return { host, store, create };
}
async function roots(host) {
  const a = JSON.parse(await host.read(ROOT + 'a.json')).data;
  const b = JSON.parse(await host.read(ROOT + 'b.json')).data;
  return { a, b, current: a.q >= b.q ? a : b, slot: a.q >= b.q ? 'a' : 'b' };
}
function checksum(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33 ^ text.charCodeAt(i)) >>> 0;
  return h;
}
function envelope(data) { return JSON.stringify({ data, c: checksum(JSON.stringify(data)) }); }
const bodyCall = o => o.uri.includes('/r') && o.uri.endsWith('.txt');
const pageCall = o => o.uri.includes('/p') && o.uri.endsWith('.json');
const rootCall = o => o.uri === ROOT + 'a.json' || o.uri === ROOT + 'b.json';
const waitTurn = () => new Promise(resolve => setImmediate(resolve));
async function waitHeld(host) {
  for (let i = 0; i < 100; i++) { if (host.held.length) return; await new Promise(resolve => setTimeout(resolve, 2)); }
  assert.fail('test host never reached selected held I/O');
}

test('two existing roots with missing pages never initialize an empty replacement',async t=>{const {host,store,create}=await fixture(t);const a=await ok(store,'save',null,'old protected');await ok(store,'save',a.id,'new protected');const ra=await roots(host);for(const gen of new Set([...ra.a.p,...ra.b.p]))await host.remove(ROOT+'p0_'+gen+'.json');const before=await host.read(ROOT+'a.json');host.resetLog();assert.ok((await outcome(create(host.api),'init')).err);assert.equal(host.calls.filter(c=>c.method==='writeText').length,0);assert.equal(await host.read(ROOT+'a.json'),before);});
test('null flag identity cannot create phantom records',async t=>{const {store}=await fixture(t);assert.ok((await outcome(store,'setFlag',null,'pinned',true)).err);assert.equal((await ok(store,'list',{},0,8)).total,0);});
test('root failure followed by rollback failure poisons mutation admission and cold start recovers old journal',async t=>{const {host,store,create}=await fixture(t);const old=await ok(store,'save',null,'old protected');host.inject('writeText',rootCall,'failAfter');host.inject('writeText',rootCall,'fail');assert.ok((await outcome(store,'save',old.id,'new uncertain')).err);assert.ok((await outcome(store,'save',old.id,'must not overwrite uncertain generation')).err);const cold=create(host.api);await ok(cold,'init');assert.deepEqual(await ok(cold,'read',old.id),old);});
test('journal clear written before failure plus rollback failure cannot publish failed body on cold start',async t=>{const {host,store,create}=await fixture(t);const old=await ok(store,'save',null,'old journal protected');const clearJournal=o=>o.uri===ROOT+'txn.json'&&o.text.includes('"pending":false');host.inject('writeText',clearJournal,'failAfter');host.inject('writeText',rootCall,'duplicate');host.inject('writeText',rootCall,'fail');assert.ok((await outcome(store,'save',old.id,'failed new body')).err);assert.ok((await outcome(store,'save',old.id,'must not overwrite')).err);const cold=create(host.api);await ok(cold,'init');assert.deepEqual(await ok(cold,'read',old.id),old);});
// Original interface-only test intentionally retained; it passed the old stub.
test('all required callback interfaces exist; source stays ES5 + static export', () => {
  const store = factory()({});
  for (const key of required) assert.equal(typeof store[key], 'function', key);
  const source = readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(source, /\b(async|await|Promise|require|Buffer|process|const|let|class)\b|=>|\?\.|\?\?/);
  assert.ok([...source].every(c => c.charCodeAt(0) < 128), 'product JS must use escaped static Chinese');
});

test('concurrent initialization callers share delayed disk startup instead of receiving IO_BUSY', async t => {
  const host = createDiskHost(); t.after(() => host.close());
  host.inject('mkdir', () => true, 'hold');
  const store = factory()(host.api);
  const first = outcome(store, 'init');
  const second = outcome(store, 'init');
  assert.equal(host.held.length, 1, 'startup is deliberately paused at the real disk boundary');
  host.release();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results.map(x => x.err), [null, null], 'all callers observe the one actual initialization result');
  const saved = await ok(store, 'save', null, 'synthetic joined initialization body');
  assert.equal((await ok(store, 'read', saved.id)).text, saved.text);
  assert.equal(host.calls.filter(x => x.method === 'mkdir').length, 1, 'joining never starts overlapping initialization I/O');
});

test('pending initialization admits at most eight callers and reports excess without more I/O', async t => {
  const host = createDiskHost(); t.after(() => host.close());
  host.inject('mkdir', () => true, 'hold'); const store = factory()(host.api);
  const pending = Array.from({length:8}, () => outcome(store, 'init'));
  let excess; store.init((err) => {excess=err;});
  const observed=excess; host.release(); const settled=await Promise.all(pending);
  assert.equal(observed, 'INIT_WAIT_LIMIT', 'bounded subscription rejects only the excess caller');
  assert.ok(settled.every(x=>x.err===null));
  assert.equal(host.calls.filter(x=>x.method==='mkdir').length,1);
});

test('one initialization subscriber throwing cannot strand another subscriber', async t => {
  const host=createDiskHost(); t.after(()=>host.close());
  const api=Object.create(host.api);let complete;const marker=new Error('synthetic subscriber failure');
  api.mkdir=o=>{complete=()=>o.fail('synthetic actual init failure',300);};
  api.access=o=>o.fail('synthetic inaccessible app directory',300);
  const store=factory()(api);let observed,throws;
  store.init(()=>{throw marker;});store.init(err=>{observed=err;});
  try{complete();}catch(e){throws=e;}
  assert.equal(observed,'IO_300','other observer must receive actual initialization error despite first observer failure');
  assert.equal(throws,undefined,'observer failure must not masquerade as a file API failure');
});

test('disposing during a held startup completes callers as DISPOSED and never starts later I/O', async t => {
  const host=createDiskHost();t.after(()=>host.close());host.inject('mkdir',()=>true,'hold');
  const store=factory()(host.api),first=outcome(store,'init'),second=outcome(store,'init');
  store.dispose();host.release();const settled=await Promise.all([first,second]);
  assert.deepEqual(settled.map(x=>x.err),['DISPOSED','DISPOSED']);
  assert.equal(host.calls.length,1,'no follow-up file request may begin after store disposal');
  assert.equal((await outcome(store,'init')).err,'DISPOSED');
});

test('joined initialization reports an actual disk failure to every caller and remains retryable', async t => {
  const host=createDiskHost();t.after(()=>host.close());host.inject('mkdir',()=>true,'hold');
  host.inject('readText',rootCall,'fail');const store=factory()(host.api);
  const first=outcome(store,'init'),second=outcome(store,'init');host.release();
  const failures=await Promise.all([first,second]);assert.deepEqual(failures.map(x=>x.err),['IO_300','IO_300']);
  await ok(store,'init');assert.equal((await ok(store,'list',{},0,8)).total,0);
  const saved=await ok(store,'save',null,'synthetic retry remains functional');
  assert.equal((await ok(store,'read',saved.id)).text,saved.text);
});

test('duplicate initialization file callbacks notify each joined caller once', async t => {
  const host=createDiskHost();t.after(()=>host.close());host.inject('mkdir',()=>true,'hold');
  host.inject('writeText',()=>true,'duplicate',8);host.inject('readText',()=>true,'duplicate',8);
  const store=factory()(host.api),counts=[0,0];
  const pending=counts.map((_,i)=>new Promise(resolve=>store.init((err,value)=>{counts[i]++;resolve({err,value});})));
  host.release();assert.ok((await Promise.all(pending)).every(x=>x.err===null));await waitTurn();
  assert.deepEqual(counts,[1,1]);assert.equal((await ok(store,'list',{},0,8)).total,0);
});

test('disposing after one valid root was read cannot publish successful initialization from that root', async t => {
  const host=createDiskHost();t.after(()=>host.close());const warm=factory()(host.api);await ok(warm,'init');await ok(warm,'save',null,'synthetic previously committed record');warm.dispose();
  host.inject('readText',o=>o.uri.endsWith('/b.json'),'hold');const store=factory()(host.api);
  const first=outcome(store,'init'),second=outcome(store,'init');await waitHeld(host);store.dispose();host.release();
  const settled=await Promise.all([first,second]);assert.deepEqual(settled.map(x=>x.err),['DISPOSED','DISPOSED']);
});

test('ready initialization callback exceptions are isolated with the fixed marker', async t => {
  const host=createDiskHost();t.after(()=>host.close());const logs=[];
  const store=factory(undefined,{error:x=>logs.push(x)})(host.api);await ok(store,'init');
  let observed;assert.doesNotThrow(()=>store.init(err=>{observed=err;throw Error('synthetic private ready body');}));
  assert.equal(observed,null);assert.deepEqual(logs,['LB2 STORE init callback exception']);
  assert.equal((await ok(store,'list',{},0,8)).total,0);
});

test('disposed initialization callback exceptions are isolated with the fixed marker', t => {
  const host=createDiskHost();t.after(()=>host.close());const logs=[];
  const store=factory(undefined,{error:x=>logs.push(x)})(host.api);store.dispose();let observed;
  assert.doesNotThrow(()=>store.init(err=>{observed=err;throw Error('synthetic private disposed body');}));
  assert.equal(observed,'DISPOSED');assert.deepEqual(logs,['LB2 STORE init callback exception']);
  assert.equal(host.calls.length,0);
});

test('excess initialization callback exceptions cannot affect the eight waiting callers', async t => {
  const host=createDiskHost();t.after(()=>host.close());host.inject('mkdir',()=>true,'hold');const logs=[];
  const store=factory(undefined,{error:x=>logs.push(x)})(host.api);
  const waiting=Array.from({length:8},()=>outcome(store,'init'));let observed,escaped;
  try{store.init(err=>{observed=err;throw Error('synthetic private excess body');});}catch(error){escaped=error;}
  host.release();const results=await Promise.all(waiting);
  assert.equal(observed,'INIT_WAIT_LIMIT');assert.equal(escaped,undefined);
  assert.deepEqual(logs,['LB2 STORE init callback exception']);assert.ok(results.every(x=>x.err===null));
  assert.equal(host.calls.filter(x=>x.method==='mkdir').length,1);
});

test('real disk first init creates two checked short roots and no seeded records', async t => {
  const { host, store } = await fixture(t);
  assert.deepEqual(await ok(store, 'list', {}, 0, 8), { rows: [], more: false, total: 0 });
  assert.equal(await ok(store, 'loadDraft'), null);
  const r = await roots(host);
  assert.equal(r.current.n, 0);
  assert.deepEqual(r.current.p, []);
  assert.equal(r.current.d, 0);
  assert.deepEqual((await host.files()).sort(), ['a.json', 'b.json']);
  for (const name of ['a', 'b']) {
    const raw = await host.read(ROOT + name + '.json');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.c, checksum(JSON.stringify(parsed.data)));
    assert.ok(Buffer.byteLength(raw) <= 1024);
  }
});

test('UTF-8 record save/read/update keeps original timestamps and historical flags', async t => {
  const clock = { value: new Date(2024, 1, 29, 6, 7).getTime() };
  const { host, store, create } = await fixture(t, clock);
  const text = '留白记录 synthetic test only\n正文😀';
  const record = await ok(store, 'save', null, text);
  assert.equal(record.text, text);
  assert.equal(record.bytes, Buffer.byteLength(text));
  assert.equal(record.date, '2024-02-29');
  assert.equal(record.time, '06:07');
  assert.equal(record.version, 1);
  await ok(store, 'setFlag', record.id, 'pinned', true);
  await ok(store, 'setFlag', record.id, 'deleted', true);
  clock.value = new Date(2026, 10, 3, 19, 48).getTime();
  const changed = await ok(store, 'save', record.id, '修改😀 synthetic test only');
  for (const field of ['id', 'createdAt', 'date', 'time']) assert.equal(changed[field], record[field]);
  assert.equal(changed.pinned, true);
  assert.equal(changed.deleted, true);
  assert.equal(changed.version, record.version + 1);
  assert.equal(changed.title, '修改😀 synthetic test only');
  const cold = create(host.api);
  await ok(cold, 'init');
  assert.deepEqual(await ok(cold, 'read', record.id), changed);
  assert.equal((await ok(cold, 'list', {}, 0, 8)).total, 0);
  assert.equal((await ok(cold, 'list', { deleted: true, pinned: true, day: '2024-02-29' }, 0, 8)).total, 1);
});

test('list paginates metadata only, sorts pinned then newest, and days counts actual history', async t => {
  const clock = { value: new Date(2026, 10, 1, 12, 0).getTime() };
  const { host, store } = await fixture(t, clock);
  const records = [];
  for (let i = 0; i < 19; i++) {
    clock.value = new Date(2026, 10, 1 + Math.floor(i / 7), 12, i).getTime();
    records.push(await ok(store, 'save', null, `synthetic test only row ${i}\n内容${i}`));
  }
  await ok(store, 'setFlag', records[0].id, 'pinned', true);
  await ok(store, 'setFlag', records[9].id, 'pinned', true);
  await ok(store, 'setFlag', records[18].id, 'deleted', true);
  host.resetLog();
  const first = await ok(store, 'list', {}, 0, 8);
  assert.equal(first.total, 18);
  assert.equal(first.rows.length, 8);
  assert.equal(first.more, true);
  assert.deepEqual(first.rows.slice(0, 3).map(r => r.id), [records[9].id, records[0].id, records[17].id]);
  const second = await ok(store, 'list', {}, 8, 8);
  const third = await ok(store, 'list', {}, 16, 8);
  assert.equal(second.rows.length, 8);
  assert.equal(third.rows.length, 2);
  assert.equal(third.more, false);
  assert.equal(new Set([...first.rows, ...second.rows, ...third.rows].map(r => r.id)).size, 18);
  assert.equal((await ok(store, 'list', { pinned: true }, 0, 8)).total, 2);
  assert.equal((await ok(store, 'list', { day: '2026-11-02' }, 0, 8)).total, 7);
  assert.deepEqual(await ok(store, 'days', '2026-11'), {
    rows: [
      { day: '2026-11-03', count: 4, title: records[17].title },
      { day: '2026-11-02', count: 7, title: records[13].title },
      { day: '2026-11-01', count: 7, title: records[6].title }
    ], total: 3, more: false
  });
  assert.equal(host.calls.filter(c => bodyCall(c)).length, 0, 'list/days must not read any record body');
  assert.equal(host.calls.filter(c => c.method === 'list').length, 0, 'no unbounded directory enumeration');
  first.rows[0].title = 'caller mutation synthetic test only';
  assert.equal((await ok(store, 'read', records[9].id)).title, records[9].title);
});

test('V3 day and trash pages stay chronological across pages while home prioritizes pins', async t => {
  const clock={value:new Date(2026,10,1,17,15).getTime()};
  const {store}=await fixture(t,clock);
  const older=await ok(store,'save',null,'older synthetic test only');
  clock.value=new Date(2026,10,1,21,40).getTime();
  const newer=await ok(store,'save',null,'newer synthetic test only');
  await ok(store,'setFlag',older.id,'pinned',true);
  assert.deepEqual((await ok(store,'list',{},0,8)).rows.map(r=>r.id),[older.id,newer.id]);
  assert.equal((await ok(store,'list',{day:'2026-11-01'},0,1)).rows[0].id,newer.id);
  assert.equal((await ok(store,'list',{day:'2026-11-01'},1,1)).rows[0].id,older.id);
  await ok(store,'setFlag',older.id,'deleted',true);
  await ok(store,'setFlag',newer.id,'deleted',true);
  assert.equal((await ok(store,'list',{deleted:true},0,1)).rows[0].id,newer.id);
  assert.equal((await ok(store,'list',{deleted:true},1,1)).rows[0].id,older.id);
});

test('one edit changes one page generation; read loads one body, flags load no bodies', async t => {
  const { host, store } = await fixture(t);
  const records = [];
  for (let i = 0; i < 10; i++) records.push(await ok(store, 'save', null, `synthetic test only ${i}`));
  const before = (await roots(host)).current;
  host.resetLog();
  await ok(store, 'save', records[0].id, 'synthetic test only edited');
  const after = (await roots(host)).current;
  assert.notEqual(after.p[0], before.p[0]);
  assert.equal(after.p[1], before.p[1]);
  assert.equal(host.calls.filter(c => c.method === 'writeText' && pageCall(c)).length, 1);
  host.resetLog();
  await ok(store, 'read', records[9].id);
  assert.equal(host.calls.filter(c => c.method === 'readText' && bodyCall(c)).length, 1);
  host.resetLog();
  const flagged = await ok(store, 'setFlag', records[0].id, 'pinned', true);
  assert.equal(flagged.pinned, true);
  assert.equal(flagged.text, undefined);
  assert.equal(host.calls.filter(c => bodyCall(c)).length, 0);
});

test('256 records / 32 pages: worst glyph metadata fits 4096 and bodies are never retained in pages', async t => {
  const { host, store, create } = await fixture(t);
  const text = '😀'.repeat(36) + '\n' + '😀'.repeat(150) + ' synthetic test only';
  const last = [];
  for (let i = 0; i < 256; i++) last.push(await ok(store, 'save', null, text));
  const { current } = await roots(host);
  assert.equal(current.n, 256);
  assert.equal(current.p.length, 32);
  assert.equal(last[255].title, '😀'.repeat(36));
  assert.ok([...last[255].preview].length <= 60);
  for (let i = 0; i < 32; i++) {
    const raw = await host.read(ROOT + `p${i}_${current.p[i]}.json`);
    assert.ok(Buffer.byteLength(raw) <= 4096, `page ${i}`);
    assert.equal(JSON.parse(raw).data.r.length, 8);
    assert.equal(raw.includes(text), false);
  }
  const full = await outcome(store, 'save', null, 'synthetic test only overflow');
  assert.equal(full.err, 'STORE_FULL');
  assert.equal((await ok(store, 'list', {}, 248, 8)).rows.length, 8);
  assert.equal((await ok(store, 'list', {}, 248, 8)).more, false);
  const cold = create(host.api);
  await ok(cold, 'init');
  assert.equal((await ok(cold, 'list', {}, 0, 8)).total, 256);
  assert.ok(host.calls.every(c => c.method !== 'readText' || c.length > 0 && c.length <= 4096));
  assert.ok(host.calls.every(c => c.bytes === undefined || c.bytes <= 4096));
  console.log(`real-disk capacity: 256 records, ${current.p.length} pages; explicit read <=4096`);
});

for (const [method, matcher, kind] of [
  ['writeText', bodyCall, 'fail'], ['writeText', bodyCall, 'partial'],
  ['readText', bodyCall, 'corrupt'], ['writeText', pageCall, 'fail'],
  ['readText', pageCall, 'corrupt'], ['writeText', rootCall, 'fail'],
  ['writeText', rootCall, 'partial'], ['writeText', rootCall, 'failAfter'],
  ['readText', rootCall, 'corrupt']
]) {
  test(`transaction ${method}/${kind}/${matcher.name}: failure preserves committed RAM and cold disk`, async t => {
    const { host, store, create } = await fixture(t);
    const old = await ok(store, 'save', null, '旧正文 synthetic test only');
    const before = await roots(host);
    const activeRaw = await host.read(ROOT + before.slot + '.json');
    host.inject(method, matcher, kind);
    assert.ok((await outcome(store, 'save', old.id, '新正文 synthetic test only')).err);
    assert.deepEqual(await ok(store, 'read', old.id), old);
    assert.equal(await host.read(ROOT + before.slot + '.json'), activeRaw);
    const cold = create(host.api);
    await ok(cold, 'init');
    assert.deepEqual(await ok(cold, 'read', old.id), old);
    const retried = await ok(store, 'save', old.id, '重试 synthetic test only');
    assert.equal(retried.version, 2);
  });
}

test('duplicate callbacks cannot double-commit or release a newer mutation lock', async t => {
  const { host, store } = await fixture(t);
  host.inject('writeText', () => true, 'duplicate', 20);
  host.inject('readText', () => true, 'duplicate', 20);
  let count = 0;
  const saved = await new Promise(resolve => store.save(null, 'synthetic test only duplicates', (err, value) => {
    count++; assert.equal(err, null); resolve(plain(value));
  }));
  await waitTurn();
  assert.equal(count, 1);
  assert.equal((await ok(store, 'list', {}, 0, 8)).total, 1);
  assert.equal((await roots(host)).current.q, 1);
  assert.equal((await ok(store, 'read', saved.id)).text, saved.text);
});

test('held/late callbacks: IO_BUSY immediately, old-snapshot reads allowed, no timeout lock release', async t => {
  const { host, store } = await fixture(t);
  const record = await ok(store, 'save', null, 'synthetic test only committed');
  host.inject('writeText', bodyCall, 'lateFail');
  assert.ok((await outcome(store, 'save', record.id, 'synthetic test only failed')).err);
  host.inject('writeText', bodyCall, 'hold');
  const pending = outcome(store, 'save', record.id, 'synthetic test only pending');
  await waitHeld(host);
  assert.equal((await outcome(store, 'setFlag', record.id, 'pinned', true)).err, 'IO_BUSY');
  assert.equal((await outcome(store, 'saveDraft', { text: 'synthetic test only' })).err, 'IO_BUSY');
  assert.equal((await ok(store, 'read', record.id)).text, record.text);
  assert.equal((await ok(store, 'list', {}, 0, 8)).total, 1);
  host.deliverLate();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal((await outcome(store, 'clearDraft')).err, 'IO_BUSY');
  host.release();
  assert.equal((await pending).err, null);
  assert.equal((await ok(store, 'read', record.id)).text, 'synthetic test only pending');
});

test('a read started before commit finishes on its immutable old root/page/body snapshot', async t => {
  const { host, store } = await fixture(t);
  const old = await ok(store, 'save', null, 'synthetic test only before');
  host.inject('readText', pageCall, 'hold');
  const pendingRead = outcome(store, 'read', old.id);
  await waitHeld(host);
  await ok(store, 'save', old.id, 'synthetic test only after');
  host.release();
  assert.deepEqual((await pendingRead).result, old);
});

test('cold root checksum corruption chooses real valid backup including historical flags', async t => {
  const clock = { value: new Date(2023, 7, 12, 3, 4).getTime() };
  const { host, store, create } = await fixture(t, clock);
  const old = await ok(store, 'save', null, 'synthetic test only history');
  await ok(store, 'setFlag', old.id, 'pinned', true);
  await ok(store, 'setFlag', old.id, 'deleted', true);
  const { slot } = await roots(host);
  const raw = JSON.parse(await host.read(ROOT + slot + '.json'));
  raw.c = (raw.c + 1) >>> 0;
  await host.write(ROOT + slot + '.json', JSON.stringify(raw));
  const cold = create(host.api);
  await ok(cold, 'init');
  const restored = await ok(cold, 'read', old.id);
  assert.equal(restored.pinned, true);
  assert.equal(restored.deleted, false);
  assert.equal(restored.date, '2023-08-12');
  assert.equal(restored.createdAt, old.createdAt);
});

test('two corrupt roots do not initialize over existing data', async t => {
  const { host, store, create } = await fixture(t);
  await ok(store, 'save', null, 'synthetic test only protected');
  await host.write(ROOT + 'a.json', '{bad synthetic test only');
  await host.write(ROOT + 'b.json', '{bad synthetic test only');
  host.resetLog();
  assert.ok((await outcome(create(host.api), 'init')).err);
  assert.equal(host.calls.filter(c => c.method === 'writeText').length, 0);
});

test('only two actual 301 root misses allow fresh initialization; permission errors never mean empty', async t => {
  const host = createDiskHost(); t.after(() => host.close());
  const create = factory();
  host.inject('access', o => o.uri === ROOT + 'b.json', 'fail', 1, 300);
  assert.ok((await outcome(create(host.api), 'init')).err);
  assert.equal(host.calls.filter(c => c.method === 'writeText').length, 0);
  const store = create(host.api); await ok(store, 'init');
  await ok(store, 'save', null, 'synthetic test only present');
  await host.remove(ROOT + 'a.json');
  const cold = create(host.api); await ok(cold, 'init');
  assert.equal((await ok(cold, 'list', {}, 0, 8)).total, 1);
});

test('mkdir failure confirms an existing directory via access and never swallows access error', async t => {
  const { host, create } = await fixture(t);
  host.inject('mkdir', () => true, 'fail');
  await ok(create(host.api), 'init');
  assert.ok(host.calls.some(c => c.method === 'access' && c.uri === 'internal://app/lb2'));
  host.inject('mkdir', () => true, 'fail');
  host.inject('access', o => o.uri === 'internal://app/lb2', 'fail', 1, 300);
  assert.equal((await outcome(create(host.api), 'init')).err, 'IO_300');
});

test('valid envelope with invalid metadata is rejected; newer broken page falls back to older root', async t => {
  const { host, store, create } = await fixture(t);
  const old = await ok(store, 'save', null, 'synthetic test only valid');
  await ok(store, 'save', old.id, 'synthetic test only newer');
  const { current } = await roots(host);
  const uri = ROOT + `p0_${current.p[0]}.json`;
  const page = JSON.parse(await host.read(uri)).data;
  page.r[0][6] = 9000; // synthetic test only: valid checksum, impossible body-byte metadata.
  await host.write(uri, envelope(page));
  const cold = create(host.api); await ok(cold, 'init');
  assert.deepEqual(await ok(cold, 'read', old.id), old);
});

test('body damage is reported instead of returned as a successful record', async t => {
  const { host, store } = await fixture(t);
  const record = await ok(store, 'save', null, 'synthetic test only good');
  const { current } = await roots(host);
  const row = JSON.parse(await host.read(ROOT + `p0_${current.p[0]}.json`)).data.r[0];
  await host.write(ROOT + `${record.id}_${row[8]}.txt`, 'synthetic test only corrupt');
  assert.ok((await outcome(store, 'read', record.id)).err);
  assert.equal((await ok(store, 'list', {}, 0, 8)).total, 1);
});

test('draft body/original are separate versioned files; ASCII short header and exact cold snapshot', async t => {
  const { host, store, create } = await fixture(t);
  const text = '测'.repeat(1024); // synthetic test only: exact 3072 UTF-8-byte boundary.
  const original = '原'.repeat(1024);
  const snapshot = { schema: 1, id: null, text, original, cursor: 700, pinyin: 'liubai', mode: '拼音',
    open: true, anchor: 12, originalVersion: 0, source: 'sheet', day: '2026-11-03', month: '2026-11', sheetOffset: 16 };
  await ok(store, 'saveDraft', snapshot);
  const { current } = await roots(host);
  const header = await host.read(ROOT + `d${current.d}.json`);
  assert.ok([...header].every(c => c.charCodeAt(0) < 128));
  assert.ok(Buffer.byteLength(header) <= 1024);
  assert.equal(header.includes(text), false);
  assert.equal(header.includes(original), false);
  const cold = create(host.api); await ok(cold, 'init');
  assert.deepEqual(await ok(cold, 'loadDraft'), snapshot);
  host.resetLog();
  await ok(store, 'clearDraft');
  assert.equal(await ok(store, 'loadDraft'), null);
  assert.equal(host.calls.filter(c => c.method === 'delete').length, 0);
  const cleared = create(host.api); await ok(cleared, 'init');
  assert.equal(await ok(cleared, 'loadDraft'), null);
  assert.equal((await ok(cleared, 'list', {}, 0, 8)).total, 0);
});

for (const [method, match, kind] of [
  ['writeText', o => o.uri.includes('/do'), 'fail'],
  ['readText', o => o.uri.includes('/d') && o.uri.endsWith('.json'), 'corrupt'],
  ['readText', rootCall, 'corrupt']
]) {
  test(`draft ${method}/${kind}: failed save retains earlier disk snapshot`, async t => {
    const { host, store, create } = await fixture(t);
    await ok(store, 'saveDraft', { text: 'synthetic test only previous', original: '原稿 synthetic test only' });
    const before = await ok(store, 'loadDraft');
    host.inject(method, match, kind);
    assert.ok((await outcome(store, 'saveDraft', { text: 'synthetic test only next', original: '新稿 synthetic test only' })).err);
    assert.deepEqual(await ok(store, 'loadDraft'), before);
    const cold = create(host.api); await ok(cold, 'init');
    assert.deepEqual(await ok(cold, 'loadDraft'), before);
  });
}

test('validation and exact UTF-8 budget errors do not create files or mutate root', async t => {
  const { host, store } = await fixture(t);
  const exact = await ok(store, 'save', null, '测'.repeat(1024)); // synthetic test only.
  assert.equal(exact.bytes, 3072);
  const before = (await roots(host)).current.q;
  host.resetLog();
  for (const [method, args] of [
    ['save', [null, '测'.repeat(1025)]], ['save', [null, '\ud800']],
    ['save', ['../../bad', 'synthetic test only']], ['save', ['r999', 'synthetic test only']],
    ['setFlag', [exact.id, 'unknown', true]], ['setFlag', [exact.id, 'pinned', 'true']],
    ['saveDraft', [{ text: 'x', original: '测'.repeat(1025) }]],
    ['saveDraft', [{ text: 'x', mode: 'x'.repeat(1000) }]],
    ['list', [{ day: '2026-02-30' }, 0, 8]], ['days', ['2026-13']]
  ]) assert.ok((await outcome(store, method, ...args)).err, method);
  assert.equal((await roots(host)).current.q, before);
  assert.equal(host.calls.filter(c => c.method === 'writeText').length, 0);
});

test('API throws and non-missing read failures return callbacks, never successful empty data', async t => {
  const { host, store } = await fixture(t);
  const old = await ok(store, 'save', null, 'synthetic test only old');
  host.inject('writeText', bodyCall, 'throw');
  assert.equal((await outcome(store, 'save', old.id, 'synthetic test only thrown')).err, 'IO_THROW');
  host.inject('readText', bodyCall, 'fail', 1, 302);
  assert.equal((await outcome(store, 'read', old.id)).err, 'IO_302');
  assert.equal((await ok(store, 'read', old.id)).text, old.text);
});

// synthetic test only: preserve real disk operations, but deliver native empty-read 202.
// _ReadFileImpl: fileSize-position <= 0 returns -202, not successful empty text.
function nativeEmptyReadApi(host) {
  var api = {}, method;
  for (method in host.api) api[method] = host.api[method];
  api.readText = function(options) {
    var forwarded = {}, key;
    for (key in options) forwarded[key] = options[key];
    forwarded.success = function(value) {
      if (value.text === '') {
        options.fail('synthetic test only: fileSize-position <= 0', 202);
        return;
      }
      options.success(value);
    };
    host.api.readText(forwarded);
  };
  return api;
}
async function nativeDraftFixture(t) {
  const host = createDiskHost();
  t.after(() => host.close());
  const api = nativeEmptyReadApi(host), create = factory(), store = create(api);
  await ok(store, 'init');
  return { host, api, create, store };
}

test('native empty-read 202: new nonempty text with empty original skips its part and verifies header', async t => {
  const { host, api, create, store } = await nativeDraftFixture(t);
  const snapshot = { schema: 1, id: null, text: '\u6d4b'.repeat(1024), original: '', cursor: 1024,
    pinyin: '', mode: 'pinyin', originalVersion: 0 };
  host.resetLog();
  await ok(store, 'saveDraft', snapshot);
  const { current } = await roots(host), g = current.d;
  const headerUri = ROOT + 'd' + g + '.json', emptyUri = ROOT + 'do' + g + '.txt';
  const header = JSON.parse(await host.read(headerUri)).data;
  assert.equal(header.b, 3072);
  assert.equal(header.a, 0);
  assert.equal(header.o, checksum(''));
  assert.equal(header.t, checksum(snapshot.text));
  assert.equal(await host.read(ROOT + 'dt' + g + '.txt'), snapshot.text);
  assert.equal((await host.files()).includes('do' + g + '.txt'), false);
  assert.equal(host.calls.some(c => c.uri === emptyUri), false);
  const written = host.calls.findIndex(c => c.method === 'writeText' && c.uri === headerUri);
  const verified = host.calls.findIndex(c => c.method === 'readText' && c.uri === headerUri);
  assert.ok(written >= 0 && verified > written, 'header must be read back from real disk');
  const cold = create(api); await ok(cold, 'init');
  host.resetLog();
  assert.deepEqual(await ok(cold, 'loadDraft'), snapshot);
  assert.equal(host.calls.some(c => c.uri === emptyUri), false);
  host.inject('readText', o => /^internal:\/\/app\/lb2\/d\d+\.json$/.test(o.uri), 'corrupt');
  assert.equal((await outcome(store, 'saveDraft', snapshot)).err, 'VERIFY_WRITE');
  assert.equal((await roots(host)).current.d, g);
  const protectedCold = create(api); await ok(protectedCold, 'init');
  assert.deepEqual(await ok(protectedCold, 'loadDraft'), snapshot);
});

test('native empty-read 202: empty body with pending pinyin persists without either text part', async t => {
  const { host, api, create, store } = await nativeDraftFixture(t);
  const snapshot = { schema: 1, id: null, text: '', original: '', cursor: 0,
    pinyin: 'liubai', mode: 'pinyin', originalVersion: 0 };
  host.resetLog();
  await ok(store, 'saveDraft', snapshot);
  const { current } = await roots(host), g = current.d;
  const header = JSON.parse(await host.read(ROOT + 'd' + g + '.json')).data;
  assert.deepEqual([header.b, header.a, header.t, header.o], [0, 0, checksum(''), checksum('')]);
  const files = await host.files();
  assert.equal(files.includes('dt' + g + '.txt'), false);
  assert.equal(files.includes('do' + g + '.txt'), false);
  const cold = create(api); await ok(cold, 'init');
  assert.deepEqual(await ok(cold, 'loadDraft'), snapshot);
  assert.equal(host.calls.some(c => /^internal:\/\/app\/lb2\/d[ot]\d+\.txt$/.test(c.uri)), false);
});

test('native empty-read 202: existing nonempty original survives an empty edited body', async t => {
  const { host, api, create, store } = await nativeDraftFixture(t);
  const record = await ok(store, 'save', null, '\u539f'.repeat(1024));
  const snapshot = { schema: 1, id: record.id, text: '', original: record.text, cursor: 0,
    pinyin: '', mode: 'pinyin', originalVersion: record.version };
  host.resetLog();
  await ok(store, 'saveDraft', snapshot);
  const { current } = await roots(host), g = current.d;
  assert.equal((await host.files()).includes('dt' + g + '.txt'), false);
  assert.equal(await host.read(ROOT + 'do' + g + '.txt'), record.text);
  const header = JSON.parse(await host.read(ROOT + 'd' + g + '.json')).data;
  assert.deepEqual([header.b, header.t, header.a], [0, checksum(''), 3072]);
  const cold = create(api); await ok(cold, 'init');
  assert.deepEqual(await ok(cold, 'loadDraft'), snapshot);
  assert.deepEqual(await ok(cold, 'read', record.id), record);
  assert.equal(host.calls.some(c => c.uri === ROOT + 'dt' + g + '.txt'), false);
});

test('native empty-read 202: checked old-format zero-byte parts load without reading them', async t => {
  const { host, store, create } = await fixture(t);
  const api = nativeEmptyReadApi(host);
  for (const snapshot of [{ text: '', cursor: 0, pinyin: 'legacy' },
    { schema: 1, id: null, text: '', original: '', cursor: 0, pinyin: 'legacy' }]) {
    await ok(store, 'saveDraft', snapshot);
    const g = (await roots(host)).current.d;
    for (const part of ['dt', 'do']) {
      const uri = ROOT + part + g + '.txt';
      await host.write(uri, ''); // Materialize actual legacy zero-byte files, even after the fix.
      assert.equal(Buffer.byteLength(await host.read(uri)), 0);
      const native = await new Promise(resolve => api.readText({ uri, position: 0, length: 4096,
        encoding: 'UTF-8', success: value => resolve({ err: null, value }),
        fail: (data, code) => resolve({ err: 'IO_' + code }) }));
      assert.equal(native.err, 'IO_202', 'adapter must reject an actual zero-byte disk read');
    }
    const cold = create(api); await ok(cold, 'init');
    host.resetLog();
    assert.deepEqual(await ok(cold, 'loadDraft'), snapshot);
    assert.equal(host.calls.some(c => /^internal:\/\/app\/lb2\/d[ot]\d+\.txt$/.test(c.uri)), false);
  }
});

test('native empty-read 202: nonempty missing or corrupt parts and arbitrary 202 still fail', async t => {
  const { host, api, create, store } = await nativeDraftFixture(t);
  const snapshot = { schema: 1, id: null, text: 'synthetic test only body', original: 'synthetic test only original' };
  await ok(store, 'saveDraft', snapshot);
  const g = (await roots(host)).current.d;
  const cold = create(api); await ok(cold, 'init');
  for (const part of ['dt', 'do']) {
    const uri = ROOT + part + g + '.txt', saved = await host.read(uri);
    await host.remove(uri);
    assert.equal((await outcome(cold, 'loadDraft')).err, 'IO_301');
    await host.write(uri, saved + '!');
    assert.equal((await outcome(cold, 'loadDraft')).err, 'DRAFT_CORRUPT');
    await host.write(uri, '');
    assert.equal((await outcome(cold, 'loadDraft')).err, 'IO_202');
    await host.write(uri, saved);
    for (const code of [202, 302]) {
      host.inject('readText', o => o.uri === uri, 'fail', 1, code);
      assert.equal((await outcome(cold, 'loadDraft')).err, 'IO_' + code);
    }
    assert.deepEqual(await ok(cold, 'loadDraft'), snapshot);
  }
});

test('native empty-read 202: zero byte counts require the exact empty checksum and numeric zero', async t => {
  const { host, store } = await nativeDraftFixture(t);
  const snapshot = { schema: 1, text: 'synthetic test only body', original: 'synthetic test only original' };
  await ok(store, 'saveDraft', snapshot);
  const g = (await roots(host)).current.d, uri = ROOT + 'd' + g + '.json';
  const checked = JSON.parse(await host.read(uri)).data;
  for (const [part, bytes, sum] of [['dt', 'b', 't'], ['do', 'a', 'o']]) {
    const partUri = ROOT + part + g + '.txt', saved = await host.read(partUri);
    const bad = plain(checked); bad[bytes] = 0;
    await host.write(uri, envelope(bad));
    assert.equal((await outcome(store, 'loadDraft')).err, 'DRAFT_CORRUPT');
    await host.write(partUri, '');
    assert.ok((await outcome(store, 'loadDraft')).err, 'zero bytes with nonempty checksum must fail');
    bad[sum] = checksum('');
    for (const count of ['0', null, false, undefined]) {
      bad[bytes] = count;
      await host.write(uri, envelope(bad));
      assert.ok((await outcome(store, 'loadDraft')).err, 'only numeric zero may restore empty text');
    }
    bad[bytes] = 0;
    for (const hash of [String(checksum('')), null, false, undefined]) {
      bad[sum] = hash;
      await host.write(uri, envelope(bad));
      assert.ok((await outcome(store, 'loadDraft')).err, 'empty checksum must match strictly');
    }
    await host.write(partUri, saved);
    await host.write(uri, envelope(checked));
    assert.deepEqual(await ok(store, 'loadDraft'), snapshot);
  }
});
