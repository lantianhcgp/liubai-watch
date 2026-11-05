import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {FileHost, call, seal} from './file-host.mjs';

// Agreed seams: the existing public store callbacks and @system.file boundary.
// The original expressions at 3ede738 are independent behavior oracles below.
// Only the store's VM lacks RegExp.test; host/oracle regular expressions remain.
async function fixture(t) {
  const host = await FileHost.temporary();
  const base = new URL('../entry/src/main/js/MainAbility/common/', import.meta.url);
  const context = vm.createContext({console,
    setTimeout:host.clock.setTimeout.bind(host.clock),
    clearTimeout:host.clock.clearTimeout.bind(host.clock)});
  vm.runInContext('RegExp.prototype.test = function () { throw new Error("RegExp.test unavailable in install lane"); };', context);
  const file = new vm.SyntheticModule(['default'], function () {
    this.setExport('default', host);
  }, {context});
  const utf8 = new vm.SourceTextModule(await fs.readFile(new URL('utf8.js', base), 'utf8'), {context});
  const module = new vm.SourceTextModule(await fs.readFile(new URL('store.js', base), 'utf8'), {context});
  await module.link(spec => spec === '@system.file' ? file : utf8);
  await module.evaluate();
  const store = module.namespace.default;
  t.after(async () => { store.dispose(); await host.cleanup(); });
  await call(store, 'init');
  return {store, host};
}

async function queryOutcome(store, query) {
  try {
    const value = await call(store, 'list', query);
    return {ok:true, ids:Array.from(value.items, x => x.id), total:value.total, hasMore:value.hasMore};
  } catch (e) { return {ok:false, message:e.message}; }
}
const invalidQuery = {ok:false, message:'Error: Invalid list query (limit 1..12)'};

test('keys: exact ASCII alphabet, lengths, types and all UTF-16 code units without RegExp.test', async t => {
  const {store:s, host} = await fixture(t);
  const oracle = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(x);
  const values = ['', 'a', 'Z', '0', '_', '-', 'a'.repeat(40), 'a'.repeat(41), '../x',
    'x\n', 'x\r\n', 'x\u2028', ' x', 'x ', null, undefined, 0, true, ['x'], {id:'x'}, new String('x')];
  for (let n = 0; n <= 42; n++) values.push('k'.repeat(n));
  for (const key of values) {
    const before = host.calls.length;
    if (oracle(key)) assert.equal(await call(s, 'settingGet', key), null);
    else {
      await assert.rejects(call(s, 'settingGet', key), /Invalid setting key/);
      assert.equal(host.calls.length, before, 'invalid key must perform no native I/O');
    }
  }
  for (let code = 0; code <= 0xffff; code++) {
    const key = 'K' + String.fromCharCode(code);
    if (oracle(key)) assert.equal(await call(s, 'settingGet', key), null, String(code));
    else await assert.rejects(call(s, 'settingGet', key), /Invalid setting key/, String(code));
  }
  await assert.rejects(call(s, 'load', 'round-trip_1\n'), /Invalid record ID/);
  await assert.rejects(call(s, 'flag', '../escape', {pinned:true}), /Invalid record flags/);
  await assert.rejects(call(s, 'draftPut', {id:'x\n', body:'draft'}), /Invalid draft/);
});

test('Corrupt: case-sensitive unanchored matching, native coercion and healthy-slot fallback without RegExp.test', async t => {
  const {store:s, host} = await fixture(t);
  await call(s, 'settingPut', 'probe', {kept:'healthy slot'});
  const nativeRead = host.readText.bind(host);
  let message, count = 0;
  host.readText = options => {
    if (options.uri.endsWith('/s_probe1.json')) {
      count++;
      options.fail(message, 300);
    } else nativeRead(options);
  };
  const values = ['Corrupt', 'prefixCorruptsuffix', 'Corrupt\n', 'corrupt', 'CORRUPT',
    '', undefined, null, 123, ['Corrupt'], {toString() { return 'Corrupt'; }}];
  for (const value of values) {
    message = value;
    const expected = /Corrupt/.test('File readText failed (300): ' + String(value));
    if (expected) assert.equal((await call(s, 'settingGet', 'probe')).kept, 'healthy slot');
    else await assert.rejects(call(s, 'settingGet', 'probe'), /File readText failed \(300\)/);
  }
  assert.equal(count, values.length, 'both generation reads must finish on every path');
  message = 'Corrupt';
  await fs.writeFile(host.root + '/lb1/s_probe0.json', 'broken');
  await assert.rejects(call(s, 'settingGet', 'probe'), /Corrupt storage: both generations damaged/);
});

test('body: exact ECMAScript whitespace, every UTF-16 code unit, Unicode and malformed input without RegExp.test', async t => {
  const {store:s, host} = await fixture(t);
  const whitespace = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680' +
    '\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a' +
    '\u2028\u2029\u202f\u205f\u3000\ufeff';
  for (const body of ['', whitespace, whitespace.repeat(3)]) {
    const before = host.calls.length;
    await assert.rejects(call(s, 'save', {body}), /Invalid or empty record/);
    assert.equal(host.calls.length, before);
  }
  const text = whitespace + '\u4e2d\ud83d\ude00\u0301\u180e\u200b\u0085\u0000' + whitespace;
  const saved = await call(s, 'save', {id:'unicode-body', body:text});
  assert.equal((await call(s, 'load', saved.id)).body, text, 'non-whitespace text is never trimmed');
  for (const body of [null, 0, false, {}, [], '\ud800', '\udc00', 'a\ud800'])
    await assert.rejects(call(s, 'save', {body}), /Invalid or empty record/);
  await assert.rejects(call(s, 'save', {body:'x'.repeat(3073)}), /3072 UTF-8 byte budget/);
  // Native fault injection stops after validation: no 65K record writes or
  // recomputation of expected whitespace with the replacement algorithm.
  host.readText = options => options.fail('body validation accepted probe', 300);
  for (let code = 0; code <= 0xffff; code++) {
    const body = String.fromCharCode(code), wellFormed = code < 0xd800 || code > 0xdfff;
    const expected = wellFormed && /\S/.test(body);
    await assert.rejects(call(s, 'save', {body}), expected ? /body validation accepted probe/ : /Invalid or empty record/, String(code));
  }
  for (const body of ['\ud83d\ude00', '\u180e', '\u200b', '\u200c', '\u2060', '\u0085', whitespace + 'x' + whitespace])
    await assert.rejects(call(s, 'save', {body}), /body validation accepted probe/);
});

async function seedQueries(store) {
  const a = await call(store, 'save', {id:'a', body:'pinned', pinned:true, created:1704196800000});
  await call(store, 'save', {id:'b', body:'ordinary', created:1704196800001});
  await call(store, 'save', {id:'c', body:'deleted', deleted:true, created:1704196800002});
  return a;
}

test('filter: exact alternatives with original JSON/string coercion and truthy defaults without RegExp.test', async t => {
  const {store:s} = await fixture(t), saved = await seedQueries(s);
  // Direct day/month date validation is covered in the following two slices.
  const values = ['all', 'pinned', 'trash', undefined, null, '', 0, false,
    'ALL', 'all\n', 'all\r\n', ' all', 'all ', 'day\u2028', [], ['all'], ['pinned'],
    ['trash'], ['day'], ['month'], [['all']], ['all', 'pinned'], {}, true, 1,
    {toString:'all'}, {valueOf:null}, {toJSON() { return 'pinned'; }}];
  for (const value of values) {
    const query = {filter:value, day:saved.date, month:saved.date.slice(0, 7)};
    const q = JSON.parse(JSON.stringify(query)), filter = q.filter || 'all';
    let valid, coercionError;
    try { valid = /^(all|pinned|trash|day|month)$/.test(filter); }
    catch (e) { coercionError = e; }
    const outcome = await queryOutcome(s, query);
    if (coercionError) assert.deepEqual(outcome, {ok:false, message:String(coercionError)});
    else if (!valid) assert.deepEqual(outcome, invalidQuery);
    else {
      // Arrays stringify to permitted alternatives but are NOT normalized in
      // later strict-equality filtering. That longstanding quirk must remain.
      const ids = filter === 'trash' ? ['c'] : filter === 'pinned' ? ['a'] : ['a', 'b'];
      assert.deepEqual(outcome, {ok:true, ids, total:ids.length, hasMore:false});
    }
  }
});

async function assertDateQuery(store, saved, field, value) {
  const query = {filter:field, [field]:value}, q = JSON.parse(JSON.stringify(query));
  let valid, coercionError;
  try { valid = (field === 'day' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}$/).test(q[field] || ''); }
  catch (e) { coercionError = e; }
  const result = await queryOutcome(store, query);
  if (coercionError) assert.deepEqual(result, {ok:false, message:String(coercionError)});
  else if (!valid) assert.deepEqual(result, invalidQuery, JSON.stringify(value));
  else {
    const match = field === 'day' ? saved.date : saved.date.slice(0, 7);
    const ids = q[field] === match ? ['a', 'b'] : [];
    assert.deepEqual(result, {ok:true, ids, total:ids.length, hasMore:false}, JSON.stringify(value));
  }
}

test('day: exact ASCII date shape, no added calendar validation, original coercion without RegExp.test', async t => {
  const {store:s} = await fixture(t), saved = await seedQueries(s);
  const values = [saved.date, '0000-00-00', '9999-99-99', '2023-02-29', '2024-02-29', '2024-13-32',
    '2024-1-02', '2024-01-2', '20240102', '2024/01/02', '２０２４-０１-０２', '٢٠٢٤-٠١-٠٢',
    '', undefined, null, 0, false, 20240102, true, [], [saved.date], [[saved.date]], ['2024', '01', '02'],
    {}, {toString:'2024-01-02'}, {toJSON() { return saved.date; }}];
  for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029', ' ', '\u00a0', '\u0000']) {
    values.push(saved.date + suffix, suffix + saved.date);
  }
  for (let i = 0; i < 10; i++) {
    for (const c of ['/', '-', 'A', '0', '9', '\n', '\u0661', '\uff11', '\ud800'])
      values.push(saved.date.slice(0, i) + c + saved.date.slice(i + 1));
  }
  for (const value of values) await assertDateQuery(s, saved, 'day', value);
  for (let code = 0; code <= 0xffff; code++)
    await assertDateQuery(s, saved, 'day', String.fromCharCode(code) + '024-01-02');
  for (const query of [{filter:'day', day:saved.date, offset:-1}, {filter:'day', day:saved.date, limit:13}])
    assert.deepEqual(await queryOutcome(s, query), invalidQuery);
});

test('month: exact ASCII month shape, out-of-range values and every UTF-16 code unit without RegExp.test', async t => {
  const {store:s} = await fixture(t), saved = await seedQueries(s), month = saved.date.slice(0, 7);
  const values = [month, '0000-00', '9999-99', '2024-13', '2024-1', '202401', '2024/01',
    '２０２４-０１', '٢٠٢٤-٠١', '', undefined, null, 0, false, 202401, true, [], [month], [[month]],
    ['2024', '01'], {}, {toString:'2024-01'}, {toJSON() { return month; }}];
  for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029', ' ', '\u00a0', '\u0000'])
    values.push(month + suffix, suffix + month);
  for (let i = 0; i < 7; i++) {
    for (const c of ['/', '-', 'A', '0', '9', '\n', '\u0661', '\uff11', '\ud800'])
      values.push(month.slice(0, i) + c + month.slice(i + 1));
  }
  for (const value of values) await assertDateQuery(s, saved, 'month', value);
  for (let code = 0; code <= 0xffff; code++)
    await assertDateQuery(s, saved, 'month', String.fromCharCode(code) + '024-01');
  assert.deepEqual(await queryOutcome(s, {filter:'month', month, limit:12, offset:2}),
    {ok:true, ids:[], total:2, hasMore:false});
});
