import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {FileHost, call} from './file-host.mjs';

// Public seams: store.save/load/list callbacks, editor.save, and UTF8 helpers.
// Original regex expressions are independent host-only oracles, never shipped.
const root = new URL('../entry/src/main/js/MainAbility/', import.meta.url);
const spaces = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680' +
  '\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a' +
  '\u2028\u2029\u202f\u205f\u3000\ufeff';
const trimOracle = s => s.replace(/^\s+|\s+$/g, '');
const compactOracle = s => trimOracle(s.replace(/\s+/g, ' '));

function trackRegex(context) {
  vm.runInContext(`var regexpTouches = 0;
    var originalReplace = RegExp.prototype[Symbol.replace];
    RegExp.prototype[Symbol.replace] = function () {
      regexpTouches++; return originalReplace.apply(this, arguments);
    };`, context);
}

async function storeFixture(t) {
  const host = await FileHost.temporary();
  const context = vm.createContext({console,
    setTimeout:host.clock.setTimeout.bind(host.clock),
    clearTimeout:host.clock.clearTimeout.bind(host.clock)});
  trackRegex(context);
  const file = new vm.SyntheticModule(['default'], function () { this.setExport('default', host); }, {context});
  const utf8 = new vm.SourceTextModule(await fs.readFile(new URL('common/utf8.js', root), 'utf8'), {context});
  const module = new vm.SourceTextModule(await fs.readFile(new URL('common/store.js', root), 'utf8'), {context});
  await module.link(spec => spec === '@system.file' ? file : utf8);
  await module.evaluate();
  const store = module.namespace.default;
  t.after(async () => { store.dispose(); await host.cleanup(); });
  await call(store, 'init');
  return {store, utf8:utf8.namespace.default, context};
}

function titleOracle(body, utf8) {
  for (const line of body.split('\n')) {
    const trimmed = trimOracle(line);
    if (trimmed) return utf8.sliceBytes(trimmed, 72);
  }
  return '';
}

test('store metadata retains title/preview/body and byte limits with zero regex execution', async t => {
  const {store:s, utf8:u, context} = await storeFixture(t);
  const bodies = [
    spaces + 'Title' + spaces + '\n\n' + spaces + '\u4e2d\ud83d\ude00 body' + spaces,
    '\n\r\n\t\n' + spaces + 'first nonempty line' + spaces + '\r\nsecond',
    '\u180e\u200b\u0085\u0000\n\ufeffpayload\u200a',
    'prefix\u2028middle\u2029tail\r\nend',
    spaces + '\u4e2d'.repeat(30) + '\ud83d\ude00'.repeat(25) + spaces,
    'A'.repeat(71) + '\ud83d\ude00\n' + 'B'.repeat(95) + '\ud83d\ude00',
    ('x\t\n\u3000y\u200a').repeat(120),
    ...Array.from(spaces, c => c + 'x' + c + c + 'y' + c)
  ];
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const m = await call(s, 'save', {id:'whitespace_' + i, body, created:1704196800000 + i});
    assert.equal(m.title, titleOracle(body, u), 'title ' + i);
    assert.equal(m.preview, u.sliceBytes(compactOracle(body), 96), 'preview ' + i);
    assert.equal(m.bytes, u.bytes(body));
    assert.equal((await call(s, 'load', m.id)).body, body, 'body is NEVER normalized');
  }
  const page = await call(s, 'list', {limit:12});
  for (const m of page.items) {
    const i = Number(m.id.slice('whitespace_'.length));
    assert.equal(m.title, titleOracle(bodies[i], u));
    assert.equal(m.preview, u.sliceBytes(compactOracle(bodies[i]), 96));
  }
  assert.equal(context.regexpTouches, 0, 'metadata must not execute a RegExp');
});

test('UTF8 trim/compact/hasText match the old expressions for every UTF16 code unit and boundary runs', async t => {
  const {utf8:u} = await storeFixture(t);
  for (const name of ['trimWhitespace', 'compactWhitespace', 'hasText'])
    assert.equal(typeof u[name], 'function', name + ' is an explicit ES5 text helper');
  for (let code = 0; code <= 0xffff; code++) {
    const c = String.fromCharCode(code);
    for (const text of [c, c + c, c + 'X' + c, 'X' + c + c + 'Y', spaces + c + spaces]) {
      assert.equal(u.trimWhitespace(text), trimOracle(text), 'trim ' + code);
      assert.equal(u.compactWhitespace(text), compactOracle(text), 'compact ' + code);
      assert.equal(u.hasText(text), !!text.replace(/\s/g, ''), 'nonempty ' + code);
    }
  }
  for (const text of ['', spaces, spaces.repeat(30), '\ud83d\ude00\u0301',
    '\u180e\u200b\u0085', 'A'.repeat(3072), ('x' + spaces).repeat(100)]) {
    assert.equal(u.trimWhitespace(text), trimOracle(text));
    assert.equal(u.compactWhitespace(text), compactOracle(text));
    assert.equal(u.hasText(text), !!text.replace(/\s/g, ''));
  }
});

async function editorFixture() {
  const saves = [], mocks = {};
  mocks['../../common/store-page'] = {save(input) { saves.push(input); }};
  const context = vm.createContext({console, mocks, result:null, setTimeout, clearTimeout});
  trackRegex(context);
  vm.runInContext((await fs.readFile(new URL('common/utf8.js', root), 'utf8')).replace('export default', 'result='), context);
  mocks['../../common/utf8'] = context.result;
  const source = (await fs.readFile(new URL('pages/edit/edit.js', root), 'utf8'))
    .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, name, spec) => 'var ' + name + '=mocks[' + JSON.stringify(spec) + '];')
    .replace('export default', 'result=');
  vm.runInContext(source, context);
  const p = context.result;
  Object.assign(p, p.data, {alive:true, kb:{}, id:'same-id', created:123});
  return {p, saves, context};
}

test('editor.save keeps exact empty-text classification/guard/order over all UTF16 without regex', async () => {
  const {p, saves, context} = await editorFixture();
  const bodies = ['', spaces, spaces.repeat(4), spaces + 'x' + spaces,
    '\u180e', '\u200b', '\u0085', '\ud83d\ude00', '\ud800', 'x'.repeat(3072)];
  for (let code = 0; code <= 0xffff; code++) bodies.push(String.fromCharCode(code));
  for (const body of bodies) {
    p.saving = false; p.message = ''; p.text = body;
    const before = saves.length;
    p.save();
    const expected = !!body.replace(/\s/g, '');
    assert.equal(saves.length - before, Number(expected), JSON.stringify(body));
    assert.equal(p.saving, expected);
    if (expected) {
      assert.equal(saves.at(-1).body, body);
      assert.equal(saves.at(-1).id, 'same-id');
      assert.equal(saves.at(-1).created, 123);
    } else assert.equal(p.message, '\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a');
  }
  const before = saves.length;
  p.saving = true; p.text = null; assert.doesNotThrow(() => p.save());
  p.saving = false; p.kb = null; assert.doesNotThrow(() => p.save());
  assert.equal(saves.length, before, 'guard must run before examining text');
  assert.equal(context.regexpTouches, 0, 'editor.save must not execute a RegExp');
});
