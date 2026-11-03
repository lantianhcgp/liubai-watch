/* Node contract tests, NOT Lite/JerryScript runtime or screenshot evidence.
 * The page and common context/nav/life/geometry/text modules below are actual
 * project sources. Device/Router/Storage are platform API stubs. Store callback
 * fixtures exercise the public asynchronous contract, not an in-page imitation.
 * No parent editor page instance is supplied or required.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const base = new URL('../entry/src/main/js/MainAbility/', import.meta.url);
const pagePath = new URL('pages/menu/menu.js', base);
const record = {
  id: 'n1', text: '晚自习之后\n\n完整正文，不是列表摘要。', title: '晚自习之后',
  date: '2026-11-01', time: '21:40', createdAt: 1793540400000,
  version: 3, pinned: false, deleted: false, bytes: 66
};
const snapshot = {
  schema: 1, id: 'n1', text: '甲😀乙\n正文', original: '原来的正文', cursor: 3,
  pinyin: 'beiwang', mode: 0, open: false, anchor: 3, originalVersion: 3,
  source: 'day', day: '2026-11-01', month: '2026-11'
};
const copy = value => JSON.parse(JSON.stringify(value));
function moduleSource(relative, ctx) {
  const path = new URL(relative, base);
  assert.ok(fs.existsSync(path), relative + ' must exist');
  const source = fs.readFileSync(path, 'utf8')
    .replace(/^import[^\n]*\n/gm, '').replace('export default', 'return');
  return new vm.Script('(function(){\n' + source + '\n})()', { filename: path.pathname }).runInContext(ctx);
}
function harness(options = {}) {
  assert.ok(fs.existsSync(pagePath), 'V3 native menu page must exist before its behavior can be exercised');
  const params = { mode: 'read-options', id: 'n1', anchor: 17, source: 'day', day: '2026-11-01', month: '2026-11', ...options.params };
  const records = { n1: copy(record), ...copy(options.records || {}) };
  const state = { store: null, editor: options.editor ? copy(options.editor) : null, params, clipboard: copy(options.clipboard || []), font: options.font || 'normal', positions: [{ id: 'n1', at: 17 }] };
  const calls = [], routes = [], logs = [], storageCalls = [], timers = new Map();
  let timerId = 0, storedDraft = options.draft ? copy(options.draft) : null;
  const hooks = options.store || {};
  const store = {
    read(id, cb) {
      calls.push({ method: 'read', id });
      if (hooks.read) return hooks.read(id, cb);
      const r = records[id];
      cb(r ? null : { code: 'NOT_FOUND' }, r ? copy(r) : null);
    },
    setFlag(id, flag, value, cb) {
      calls.push({ method: 'setFlag', id, flag, value });
      if (hooks.setFlag) return hooks.setFlag(id, flag, value, cb);
      if (!records[id]) return cb({ code: 'NOT_FOUND' }, null);
      records[id][flag] = value; records[id].version += 1;
      cb(null, copy(records[id]));
    },
    saveDraft(s, cb) {
      calls.push({ method: 'saveDraft', snapshot: copy(s) });
      if (hooks.saveDraft) return hooks.saveDraft(s, cb);
      storedDraft = copy(s); cb(null, true);
    },
    clearDraft(cb) {
      calls.push({ method: 'clearDraft' });
      if (hooks.clearDraft) return hooks.clearDraft(cb);
      storedDraft = null; cb(null, true);
    },
    loadDraft(cb) {
      calls.push({ method: 'loadDraft' });
      if (hooks.loadDraft) return hooks.loadDraft(cb);
      cb(null, storedDraft ? copy(storedDraft) : null);
    }
  };
  state.store = options.noStore ? null : store;
  const info = options.info || { windowWidth: 412, windowHeight: 484, screenShape: 'rect' };
  const Storage = {
    set(o) {
      storageCalls.push({ key: o.key, value: o.value });
      if (options.storageSet) return options.storageSet(o);
      if (o.success) o.success();
    },
    get(o) { if (o.success) o.success(o.default || ''); }
  };
  const ctx = vm.createContext({
    $app: { $def: { getState: () => state } },
    Device: { getInfo(o) { calls.push({ method: 'getInfo' }); if (options.device) return options.device(o); o.success(copy(info)); } },
    Router: { replace(o) { routes.push({ uri: o.uri, params: copy(state.params), routerKeys: Object.keys(o) }); } },
    Storage,
    console: { info: (...parts) => logs.push(parts.join(' ')), error: (...parts) => logs.push(parts.join(' ')), warn: (...parts) => logs.push(parts.join(' ')) },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  ctx.context = moduleSource('common/context.js', ctx);
  ctx.geometry = moduleSource('common/geometry.js', ctx);
  ctx.text = moduleSource('common/text.js', ctx);
  ctx.life = moduleSource('common/life.js', ctx);
  ctx.nav = moduleSource('common/nav.js', ctx);
  const page = moduleSource('pages/menu/menu.js', ctx);
  Object.assign(page, copy(page.data));
  page.$refs = { crown: { rotation(o) { calls.push({ method: 'rotation', focus: o.focus }); } } };
  return { page, state, records, calls, routes, logs, storageCalls, get draft() { return storedDraft; }, flushFocus() { for (const [id, fn] of timers) { timers.delete(id); fn(); } } };
}
function open(options = {}) { const h = harness(options); h.page.onInit(); return h; }
function lastRoute(h) { return h.routes[h.routes.length - 1]; }
function assertReadRoute(h, anchor = 17) {
  const route = lastRoute(h);
  assert.equal(route.uri, 'pages/read/read');
  assert.equal(route.params.id, 'n1');
  assert.equal(route.params.anchor, anchor);
  assert.equal(route.params.source, 'day');
  assert.equal(route.params.day, '2026-11-01');
  assert.equal(route.params.month, '2026-11');
  assert.deepEqual(route.routerKeys, ['uri'], 'Router.replace keeps long state out of routing arguments');
  assert.ok(!('text' in route.params));
}

test('read-options uses actual device geometry, exact V3 ordering, and boolean visibility', () => {
  const h = open(); const p = h.page;
  assert.equal(p.ready, true);
  assert.equal(p.mode, 'read-options');
  assert.equal(p.title, '更多操作');
  assert.deepEqual(Array.from(p.fonts, x => x.label), ['紧凑', '标准', '大字']);
  assert.deepEqual(Array.from(p.rows, x => x.label), ['从头阅读', '编辑记录', '记录操作']);
  assert.equal(p.readHint1, '按正文位置记住进度');
  assert.equal(p.readHint2, '换字号或屏幕后仍从附近继续');
  assert.equal(p.dockLeftLabel, '返回阅读');
  assert.equal(p.top, p.hy + p.hit + 8);
  assert.equal(p.listH, p.dockY - p.top - 8);
  assert.equal(p.rowH, 50);
  assert.equal(p.rowFont, 20);
  for (const key of ['isReadOptions', 'isRecord', 'isApp', 'isConfirm', 'isExit', 'isError', 'isTools', 'isClipboard', 'showEmpty', 'showMessage']) assert.equal(typeof p[key], 'boolean', key);
  assert.equal(h.calls.filter(x => x.method === 'getInfo').length, 1);
  p.onShow(); assert.equal(h.calls.filter(x => x.method === 'getInfo').length, 1);
  h.flushFocus(); assert.ok(h.calls.some(x => x.method === 'rotation' && x.focus));
  assert.ok(h.logs.includes('LB2 MENU mode=read-options rows=3'));
  p.onDestroy(); assert.equal(p.active, false);
});
for (const font of ['compact', 'normal', 'large']) test('read-options persists tiny ' + font + ' choice, stays in the approved menu, and back restores anchor', () => {
  const h = open();
  h.page.selectFont(font);
  assert.equal(h.state.font, font);
  assert.deepEqual(h.storageCalls, [{ key: 'lb2_font', value: font }]);
  assert.ok(Buffer.byteLength(h.storageCalls[0].value) < 128);
  assert.equal(h.routes.length, 0, 'approved readFontSet renders without leaving this menu');
  assert.deepEqual(Array.from(h.page.fonts, x => x.selected), ['compact', 'normal', 'large'].map(x => x === font));
  assert.deepEqual(Array.from(h.page.rows, x => x.label), ['从头阅读', '编辑记录', '记录操作']);
  h.page.back(); assertReadRoute(h);
  assert.deepEqual(h.state.positions, [{ id: 'n1', at: 17 }]);
  h.page.onDestroy();
});
test('read-options starts from anchor zero without modifying the stored record', () => {
  const h = open(); const before = copy(h.records.n1);
  h.page.action('reader-start');
  assertReadRoute(h, 0);
  assert.deepEqual(h.records.n1, before);
  assert.ok(!h.calls.some(x => x.method === 'setFlag' || x.method === 'saveDraft'));
  h.page.onDestroy();
});
test('read-options record menu and back preserve id, anchor, and day provenance', () => {
  const h = open();
  h.page.action('record');
  assert.equal(lastRoute(h).uri, 'pages/menu/menu');
  assert.equal(lastRoute(h).params.mode, 'record');
  assert.equal(lastRoute(h).params.id, 'n1');
  assert.equal(lastRoute(h).params.anchor, 17);
  h.page.back(); assertReadRoute(h);
  h.page.onDestroy();
});

function assertEditorRoute(h, retrySave = false) {
  const route = lastRoute(h), s = h.state.editor;
  assert.equal(route.uri, 'pages/edit/edit');
  assert.equal(route.params.restore, true);
  assert.equal(route.params.id, s.id);
  assert.equal(route.params.source, s.source);
  assert.equal(route.params.day, s.day);
  assert.equal(route.params.month, s.month);
  assert.equal(route.params.retrySave === true, retrySave);
  assert.deepEqual(route.routerKeys, ['uri']);
  for (const key of ['text', 'original', 'pinyin', 'originalVersion', 'sheetOffset']) assert.ok(!(key in route.params), key + ' belongs in the editor snapshot, not route arguments');
}
function assertVisibleMessage(h) {
  assert.equal(h.page.showMessage, true);
  assert.ok(h.page.message.length > 0);
  assert.equal(h.page.busy, false, 'failure must allow another attempt');
}

test('read-options edits the same record text-first without creating an editor page reference', () => {
  const h = open(); const before = copy(h.records.n1);
  h.page.action('edit-record');
  const r = lastRoute(h);
  assert.equal(r.uri, 'pages/edit/edit');
  assert.equal(r.params.id, 'n1');
  assert.equal(r.params.open, false);
  assert.equal(r.params.anchor, 17);
  assert.equal(r.params.source, 'day');
  assert.equal(r.params.day, '2026-11-01');
  assert.equal(r.params.month, '2026-11');
  assert.deepEqual(h.records.n1, before);
  assert.ok(!('text' in r.params)); h.page.onDestroy();
});
test('font persistence failure keeps the selected in-memory choice and menu usable', () => {
  const h = open({ storageSet(o) { o.fail(); } });
  h.page.selectFont('large');
  assert.equal(h.state.font, 'large');
  assert.equal(h.routes.length, 0);
  assert.equal(h.page.fonts[2].selected, true);
  assert.ok(h.logs.includes('LB2 FONT persist fail'));
  h.page.selectFont('invalid'); assert.equal(h.storageCalls.length, 1);
  h.page.onDestroy();
});

test('record loads only the requested id asynchronously and renders exact three actions', () => {
  let finish;
  const h = open({ params: { mode: 'record' }, store: { read(id, cb) { assert.equal(id, 'n1'); finish = cb; } } });
  assert.equal(h.page.title, '这条记录');
  assert.equal(h.page.busy, true);
  assert.equal(h.page.rows.length, 0, 'unknown flags must not be rendered as a loaded record');
  h.page.action('pin'); assert.ok(!h.calls.some(x => x.method === 'setFlag'));
  finish(null, copy(record));
  assert.equal(h.page.busy, false);
  assert.deepEqual(Array.from(h.page.rows, x => x.label), ['置顶记录', '复制到应用内', '移到回收站']);
  assert.deepEqual(Array.from(h.page.rows, x => x.action), ['pin', 'copy', 'delete']);
  assert.equal(h.page.rows[2].danger, true);
  assert.ok(h.logs.includes('LB2 MENU mode=record rows=3'));
  h.page.onDestroy();
});
test('record pin updates from callback metadata, and a failed unpin preserves saved state and gold label', () => {
  let finish;
  const h = open({ params: { mode: 'record' }, store: { setFlag(id, flag, value, cb) { finish = cb; } } });
  h.page.action('pin');
  assert.deepEqual(h.calls.filter(x => x.method === 'setFlag'), [{ method: 'setFlag', id: 'n1', flag: 'pinned', value: true }]);
  assert.equal(h.page.rows[0].label, '置顶记录'); assert.equal(h.routes.length, 0);
  finish(null, { ...record, pinned: true, version: 4 });
  assert.equal(h.page.rows[0].label, '取消置顶');
  assert.equal(h.page.rows[0].color, '#e6c78c');
  h.page.action('pin'); finish({ code: 'WRITE_FAILED' }, null);
  assertVisibleMessage(h);
  assert.equal(h.page.rows[0].label, '取消置顶');
  assert.equal(h.page.rows[0].color, '#e6c78c');
  assert.equal(h.records.n1.pinned, false, 'fixture saved record is not optimistically edited by the page');
  assert.equal(h.routes.length, 1); h.page.onDestroy();
});
test('record unpin writes an explicit false and renders the ordinary label only on success', () => {
  const h = open({ params: { mode: 'record' }, records: { n1: { ...record, pinned: true } } });
  h.page.action('pin');
  assert.equal(h.records.n1.pinned, false);
  assert.equal(h.page.rows[0].label, '置顶记录');
  assert.equal(h.calls.find(x => x.method === 'setFlag').value, false);
  h.page.onDestroy();
});
test('record copy prepends fresh full text as approved, keeps duplicates, and evicts beyond 15 entries', () => {
  const clipboard = Array.from({ length: 15 }, (_, i) => '旧正文' + i);
  const h = open({ params: { mode: 'record' }, clipboard });
  h.records.n1.text = '现在的完整正文\n' + '甲'.repeat(160);
  h.page.action('copy'); h.page.action('copy');
  assert.equal(h.state.clipboard.length, 15);
  assert.equal(h.state.clipboard[2], '旧正文0');
  assert.equal(h.state.clipboard[0], h.records.n1.text);
  assert.equal(h.state.clipboard[1], h.records.n1.text, 'approved HTML unshift retains duplicate copies');
  assert.equal(h.calls.filter(x => x.method === 'read').length, 3);
  assert.ok(!h.calls.some(x => x.method === 'setFlag'));
  assert.equal(h.routes.length, 2, 'approved copy action returns to the reader'); h.page.onDestroy();
});
test('record read errors and wrong-record callbacks cannot copy or mutate a different record', () => {
  const h = open({ params: { mode: 'record' }, store: { read(_id, cb) { cb(null, { ...record, id: 'other' }); } }, clipboard: ['保留'] });
  assertVisibleMessage(h);
  assert.equal(h.page.rows.length, 0);
  h.page.action('copy'); h.page.action('pin'); h.page.action('delete');
  assert.deepEqual(h.state.clipboard, ['保留']);
  assert.equal(h.calls.filter(x => x.method === 'read').length, 1);
  assert.ok(!h.calls.some(x => x.method === 'setFlag'));
  assert.equal(h.routes.length, 0); h.page.onDestroy();
  const missing = open({ params: { mode: 'record', id: 'missing' } });
  assertVisibleMessage(missing); assert.equal(missing.page.rows.length, 0); missing.page.onDestroy();
});
test('copy read failure retains existing clipboard and enables retry', () => {
  let count = 0;
  const h = open({ params: { mode: 'record' }, clipboard: ['保留'], store: { read(_id, cb) { cb(++count === 1 ? null : { code: 'READ_FAILED' }, count === 1 ? copy(record) : null); } } });
  h.page.action('copy');
  assertVisibleMessage(h); assert.deepEqual(h.state.clipboard, ['保留']);
  assert.equal(h.routes.length, 0); h.page.onDestroy();
});

test('record delete opens reversible confirmation without deleting or losing read provenance', () => {
  const h = open({ params: { mode: 'record' } });
  const before = copy(h.records.n1);
  h.page.action('delete');
  const r = lastRoute(h);
  assert.equal(r.uri, 'pages/menu/menu'); assert.equal(r.params.mode, 'confirm');
  assert.equal(r.params.id, 'n1'); assert.equal(r.params.anchor, 17);
  assert.equal(r.params.source, 'day'); assert.equal(r.params.day, '2026-11-01');
  assert.equal(r.params.month, '2026-11');
  assert.deepEqual(h.records.n1, before); assert.ok(!h.calls.some(x => x.method === 'setFlag'));
  h.page.onDestroy();
});
test('confirmation labels express reversible trash, and cancel returns to the same reading anchor', () => {
  const h = open({ params: { mode: 'confirm' } });
  assert.equal(h.page.title, '移入回收站');
  assert.equal(h.page.dialogText, '这条记录先收起来？');
  assert.ok(h.page.dialogHint1.includes('恢复'));
  assert.equal(h.page.dialogHint2,'不会立即永久删除。','approved V3 literal, not obsolete shortened wording');
  assert.equal(h.page.dockLeftLabel, '保留'); assert.equal(h.page.dockRightLabel, '移入');
  assert.equal(h.page.showDockRight, true);
  h.page.action(h.page.dockLeftAction); assertReadRoute(h);
  assert.ok(!h.calls.some(x => x.method === 'setFlag')); h.page.onDestroy();
});
test('confirmation awaits deleted=true metadata; failed callback retains record and can retry', () => {
  let finish;
  const h = open({ params: { mode: 'confirm' }, store: { setFlag(id, flag, value, cb) { finish = cb; } } });
  h.page.action(h.page.dockRightAction);
  assert.deepEqual(h.calls.filter(x => x.method === 'setFlag'), [{ method: 'setFlag', id: 'n1', flag: 'deleted', value: true }]);
  assert.equal(h.routes.length, 0); assert.equal(h.records.n1.deleted, false);
  h.page.action(h.page.dockRightAction); assert.equal(h.calls.filter(x => x.method === 'setFlag').length, 1);
  finish({ code: 'WRITE_FAILED' }, null); assertVisibleMessage(h);
  assert.equal(h.records.n1.deleted, false); assert.equal(h.routes.length, 0);
  h.page.action(h.page.dockRightAction);
  finish(null, { ...record, deleted: true, version: 4 });
  assert.equal(lastRoute(h).uri, 'pages/index/index'); h.page.onDestroy();
});
test('null or mismatched mutation metadata is a failure, not an invented successful write', () => {
  for (const result of [null, false, { ...record, id: 'other', deleted: true }, { ...record, deleted: false }]) {
    const h = open({ params: { mode: 'confirm' }, store: { setFlag(_id, _flag, _value, cb) { cb(null, result); } } });
    h.page.action(h.page.dockRightAction); assertVisibleMessage(h);
    assert.equal(h.routes.length, 0); assert.equal(h.records.n1.deleted, false); h.page.onDestroy();
  }
});

test('app offers trash and only a real persisted draft, then restores the complete snapshot', () => {
  let finish;
  const s = { ...snapshot, sheetOffset: -38 };
  const h = open({ params: { mode: 'app', id: null }, draft: s, store: { loadDraft(cb) { finish = cb; } } });
  assert.equal(h.page.title, '笔记本');
  assert.deepEqual(Array.from(h.page.rows, x => x.label), ['回收站']);
  assert.equal(h.page.dockLeftLabel, '返回随记');
  finish(null, copy(s));
  assert.deepEqual(Array.from(h.page.rows, x => x.label), ['回收站', '继续草稿']);
  h.page.action('resume-draft'); assert.deepEqual(copy(h.state.editor), s); assertEditorRoute(h);
  assert.ok(!h.calls.some(x => x.method === 'saveDraft')); h.page.onDestroy();
});
test('app without a persisted draft never substitutes a stale shared editor, and trash/back routes are real', () => {
  const h = open({ params: { mode: 'app', id: null }, editor: snapshot });
  assert.deepEqual(Array.from(h.page.rows, x => x.label), ['回收站']);
  assert.ok(h.page.hint1.includes('本地')); assert.ok(h.page.hint2.includes('本地'));
  h.page.action('resume-draft'); assert.equal(h.routes.length, 0);
  h.page.action('trash'); assert.equal(lastRoute(h).uri, 'pages/trash/trash');
  h.page.back(); assert.equal(lastRoute(h).uri, 'pages/index/index'); h.page.onDestroy();
});
test('app loadDraft error is visible and does not install or advertise an invalid draft', () => {
  const h = open({ params: { mode: 'app' }, store: { loadDraft(cb) { cb({ code: 'READ_FAILED' }, null); } } });
  assertVisibleMessage(h); assert.deepEqual(Array.from(h.page.rows, x => x.label), ['回收站']);
  assert.equal(h.state.editor, null); h.page.onDestroy();
});

test('exit explicitly distinguishes a draft from deleting or overwriting the saved record', () => {
  const h = open({ params: { mode: 'exit' }, editor: snapshot });
  assert.equal(h.page.title, '退出编辑');
  assert.equal(h.page.dialogIcon, '/common/ui/empty-book-gold.png'); assert.equal(h.page.dialogIconSize, 43);
  assert.equal(h.page.dialogText, '文字先留成草稿');
  assert.ok(h.page.dialogHint1.includes('退出不等于删除记录'));
  assert.ok(h.page.dialogHint2.includes('不') && h.page.dialogHint2.includes('覆盖'));
  assert.equal(h.page.dockLeftLabel, '放弃本次'); assert.equal(h.page.dockRightLabel, '留草稿');
  const before = copy(h.state.editor);
  h.page.back(); assertEditorRoute(h); assert.deepEqual(copy(h.state.editor), before);
  assert.ok(!h.calls.some(x => ['setFlag', 'clearDraft', 'saveDraft'].includes(x.method))); h.page.onDestroy();
});
test('keep-draft waits for the actual store callback, failure keeps snapshot for retry, success returns index', () => {
  let finish;
  const s = { ...snapshot, sheetOffset: -12 };
  const h = open({ params: { mode: 'exit' }, editor: s, store: { saveDraft(saved, cb) { assert.deepEqual(copy(saved), s); finish = cb; } } });
  const before = copy(h.records.n1);
  h.page.action(h.page.dockRightAction); assert.equal(h.page.busy, true); assert.equal(h.routes.length, 0);
  h.page.action(h.page.dockRightAction); assert.equal(h.calls.filter(x => x.method === 'saveDraft').length, 1);
  finish({ code: 'FULL' }, false); assertVisibleMessage(h);
  assert.deepEqual(copy(h.state.editor), s); assert.equal(h.routes.length, 0);
  h.page.action(h.page.dockRightAction); finish(null, true);
  assert.equal(lastRoute(h).uri, 'pages/index/index'); assert.deepEqual(copy(h.state.editor), s);
  assert.deepEqual(h.records.n1, before); h.page.onDestroy();
});
test('false draft-save result cannot clear editing state or claim a saved draft', () => {
  const h = open({ params: { mode: 'exit' }, editor: snapshot, store: { saveDraft(_s, cb) { cb(null, false); } } });
  h.page.action(h.page.dockRightAction); assertVisibleMessage(h);
  assert.equal(h.routes.length, 0); assert.deepEqual(copy(h.state.editor), snapshot);
  assert.equal(h.draft, null); h.page.onDestroy();
});
test('discard clears the draft first, then editor snapshot, and returns the original id and provenance', () => {
  let finish;
  const h = open({ params: { mode: 'exit' }, editor: snapshot, draft: snapshot, store: { clearDraft(cb) { finish = cb; } } });
  h.page.action(h.page.dockLeftAction); assert.equal(h.routes.length, 0);
  assert.deepEqual(copy(h.state.editor), snapshot);
  finish({ code: 'WRITE_FAILED' }, false); assertVisibleMessage(h); assert.deepEqual(copy(h.state.editor), snapshot);
  h.page.action(h.page.dockLeftAction); finish(null, true);
  assert.equal(h.state.editor, null); assertReadRoute(h, snapshot.anchor);
  assert.equal(h.records.n1.text, record.text); assert.ok(!h.calls.some(x => x.method === 'setFlag')); h.page.onDestroy();
});
test('discarding a new draft returns index and saving a new draft actually persists full snapshot', () => {
  const s = { ...snapshot, id: null, original: '', originalVersion: 0, sheetOffset: -12 };
  const keep = open({ params: { mode: 'exit', id: null }, editor: s });
  keep.page.action(keep.page.dockRightAction); assert.deepEqual(keep.draft, s);
  assert.equal(lastRoute(keep).uri, 'pages/index/index'); keep.page.onDestroy();
  const discard = open({ params: { mode: 'exit', id: null }, editor: s, draft: s });
  discard.page.action(discard.page.dockLeftAction); assert.equal(discard.draft, null);
  assert.equal(discard.state.editor, null); assert.equal(lastRoute(discard).uri, 'pages/index/index'); discard.page.onDestroy();
});
for (const action of ['continue-edit', 'retry-save']) test('error ' + action + ' restores full snapshot and leaves saved record untouched', () => {
  const s = { ...snapshot, sheetOffset: -26, mode: 3 };
  const h = open({ params: { mode: 'error' }, editor: s });
  assert.equal(h.page.title, '保存失败'); assert.equal(h.page.dialogIcon, '/common/ui/empty-alert-gold.png');
  assert.equal(h.page.dialogIconSize, 43); assert.equal(h.page.dialogText, '没存上，不丢文字');
  assert.ok(h.page.dialogHint1.includes('当前文字仍留在编辑区'));
  assert.equal(h.page.dockLeftLabel, '继续编辑'); assert.equal(h.page.dockRightLabel, '重试保存');
  h.page.action(action); assertEditorRoute(h, action === 'retry-save');
  assert.deepEqual(copy(h.state.editor), s); assert.equal(h.records.n1.text, record.text);
  assert.ok(!h.calls.some(x => ['read', 'setFlag', 'saveDraft', 'clearDraft'].includes(x.method))); h.page.onDestroy();
});

test('tools preserve original toolbar/type image, exact head-tail actions and return to restored editor', () => {
  const h = open({ params: { mode: 'tools' }, editor: snapshot });
  assert.equal(h.page.title, '键盘工具'); assert.equal(h.page.rowFont, 18);
  assert.equal(h.page.toolBarImage, '/common/keyboard/common/toolBar.png');
  assert.equal(h.page.typeIcon, '/common/keyboard/common/key0.png');
  assert.equal(h.page.toolBarH, 44); assert.equal(h.page.typeIconSize, 25);
  assert.equal(h.page.toolPartW * 4, h.page.contentW);
  assert.deepEqual(Array.from(h.page.rows, x => x.label), ['移到正文开头', '移到正文结尾']);
  assert.equal(h.page.dockLeftLabel, '返回编辑');
  h.page.back(); assertEditorRoute(h); assert.deepEqual(copy(h.state.editor), snapshot); h.page.onDestroy();
});
for (const [action, cursor] of [['cursor-left', 1], ['cursor-right', 4], ['cursor-start', 0], ['cursor-end', snapshot.text.length]]) test('tools ' + action + ' only changes snapshot cursor on real grapheme boundaries', () => {
  const h = open({ params: { mode: 'tools' }, editor: snapshot }); const before = copy(h.records.n1);
  h.page.action(action); assert.equal(h.state.editor.cursor, cursor); assertEditorRoute(h);
  assert.deepEqual(copy(h.state.editor), { ...snapshot, cursor });
  assert.deepEqual(h.records.n1, before); assert.ok(!h.calls.some(x => ['setFlag', 'saveDraft'].includes(x.method))); h.page.onDestroy();
});
for (const mode of [0, 1, 2, 3]) test('tools type cycles numeric keyboard mode ' + mode + ' without replacing menu mode or losing pinyin', () => {
  const s = { ...snapshot, mode, sheetOffset: -28 };
  const h = open({ params: { mode: 'tools' }, editor: s });
  assert.equal(h.page.typeIcon, '/common/keyboard/common/key' + mode + '.png');
  h.page.action('type'); assertEditorRoute(h);
  assert.deepEqual(copy(h.state.editor), { ...s, mode: (mode + 1) % 4 });
  assert.equal(h.page.mode, 'tools'); h.page.onDestroy();
});
test('tools clipboard and clipboard bottom routes preserve snapshot without any parent page object', () => {
  const h = open({ params: { mode: 'tools' }, editor: snapshot });
  h.page.action('clipboard');
  assert.equal(lastRoute(h).uri, 'pages/menu/menu'); assert.equal(lastRoute(h).params.mode, 'clipboard');
  assert.equal(lastRoute(h).params.source, snapshot.source);
  assert.deepEqual(copy(h.state.editor), snapshot); h.page.onDestroy();
  const c = open({ params: { mode: 'clipboard' }, editor: snapshot });
  assert.equal(c.page.title, '剪切板'); assert.equal(c.page.showEmpty, true);
  assert.equal(c.page.showDialog,true);
  assert.equal(c.page.showHints,false);
  assert.equal(c.page.dialogIcon,'/common/ui/empty-copy-gold.png');
  assert.equal(c.page.dialogText,'这里还没有内容');
  assert.equal(c.page.dialogHint1,'先从记录菜单复制。');
  assert.equal(c.page.dialogHint2,'它不是手机系统剪切板。');
  assert.equal(c.page.dialogHintH,Math.ceil(c.page.dialogHintFont*1.6),'approved quiet-empty line-height 1.6');
  assert.ok(c.page.dialogY+c.page.dialogIconSize+c.page.dialogIconGap+c.page.dialogTitleH+c.page.dialogTitleGap+2*c.page.dialogHintH<c.page.dockY);
  assert.equal(c.page.showDockRight,false);
  assert.equal(c.page.dockLeftLabel,'返回键盘');
  c.page.action(c.page.dockLeftAction); assertEditorRoute(c); c.page.onDestroy();
});
for (const [width,height,shape] of [[412,484,'rect'],[454,454,'circle'],[390,390,'circle'],[336,480,'rect']]) test('clipboard original 1.6 line boxes fit device '+width+' '+shape,()=>{
  const h=open({params:{mode:'clipboard'},editor:snapshot,info:{windowWidth:width,windowHeight:height,screenShape:shape}}),p=h.page;
  assert.equal(p.dialogHintH,Math.ceil(p.dialogHintFont*1.6));
  const total=p.dialogIconSize+p.dialogIconGap+p.dialogTitleH+p.dialogTitleGap+2*p.dialogHintH;
  assert.ok(p.dialogH>=total,'column height covers all real children');
  assert.ok(p.dialogY+total<p.dockY-8,'full content above bottom bar');
  h.page.onDestroy();
});
test('dialog dock fits inside its native border and has a pixel-backed right round cap',()=>{
  const hml=fs.readFileSync(new URL('../entry/src/main/js/MainAbility/pages/menu/menu.hml',import.meta.url),'utf8');
  assert.match(hml,/src="\/common\/ui\/dock-gold-cap\.png"/,'native parent border radius does not clip child gold fill');
  assert.match(hml,/left:\{\{dockFillW\}\}/);
  for(const info of [{windowWidth:412,windowHeight:484,screenShape:'rect'},{windowWidth:454,windowHeight:454,screenShape:'circle'},{windowWidth:390,windowHeight:390,screenShape:'circle'},{windowWidth:336,windowHeight:480,screenShape:'rect'}]){
    const h=open({params:{mode:'confirm',id:'n1'},info}),p=h.page;
    assert.equal(2*p.dockPartW+1,p.dockW-2,'two controls and divider fit inside two one-pixel borders');
    assert.equal(p.dockFillW+p.dockCapW,p.dockPartW);
    assert.equal(p.dockCapW,(p.hit-2)/2);
    assert.equal(p.dialogHint1,'可以在回收站恢复。');
    assert.equal(p.dialogHint2,'不会立即永久删除。');
    h.page.onDestroy();
  }
});
test('app-menu keeps V3 readable quiet-status typography separate from tools micro-hints',()=>{
  const h=open({params:{mode:'app'},editor:snapshot});
  assert.equal(h.page.hintFont,19);
  assert.equal(h.page.hintLineH,Math.ceil(19*1.7));
  assert.equal(h.page.hintTopPad,16);
  assert.equal(h.page.hintH,Math.ceil(19*1.7)*2+16);
  assert.equal(h.page.rows[0].icon,'/common/ui/trash-warm.png');
  h.page.onDestroy();
});

test('clipboard rows truncate only display to 70 characters while pasting the selected full text', () => {
  const full = '😀' + '完整复制正文'.repeat(18);
  const h = open({ params: { mode: 'clipboard' }, editor: snapshot, clipboard: ['第一个', full] });
  assert.equal(h.page.showEmpty, false); assert.equal(h.page.rows.length, 2);
  assert.ok(h.page.rows[1].label.length <= 71, 'at most 70 display characters and one ellipsis');
  assert.equal(h.state.clipboard[1], full);
  h.page.action(h.page.rows[1].action);
  assertEditorRoute(h);
  assert.equal(h.state.editor.text, snapshot.text.slice(0, snapshot.cursor) + full + snapshot.text.slice(snapshot.cursor));
  assert.equal(h.state.editor.cursor, snapshot.cursor + full.length);
  assert.equal(h.state.editor.original, snapshot.original); assert.equal(h.state.editor.pinyin, snapshot.pinyin);
  assert.equal(h.records.n1.text, record.text); assert.equal(h.state.clipboard[1], full); h.page.onDestroy();
});
test('clipboard rejects invalid row indexes and UTF-8 overflow atomically, retaining editing text and cursor', () => {
  const s = { ...snapshot, text: '甲'.repeat(1024), cursor: 3 };
  const h = open({ params: { mode: 'clipboard' }, editor: s, clipboard: ['乙'] });
  for (const action of ['paste--1', 'paste-1', 'paste-NaN', 'paste-0.5', 'paste-', 'paste-0x0']) h.page.action(action);
  assert.equal(h.routes.length, 0); assert.deepEqual(copy(h.state.editor), s);
  h.page.action(h.page.rows[0].action); assertVisibleMessage(h);
  assert.equal(h.routes.length, 0); assert.deepEqual(copy(h.state.editor), s);
  assert.deepEqual(h.state.clipboard, ['乙']); h.page.onDestroy();
});
test('clipboard accepts exactly the 3072-byte limit and aligns a cursor inside an emoji before inserting', () => {
  const s = { ...snapshot, text: 'a'.repeat(3065) + '😀', cursor: 3066 };
  const h = open({ params: { mode: 'clipboard' }, editor: s, clipboard: ['乙'] });
  h.page.action(h.page.rows[0].action); assertEditorRoute(h);
  assert.equal(Buffer.byteLength(h.state.editor.text), 3072);
  assert.equal(h.state.editor.text, 'a'.repeat(3065) + '乙😀');
  assert.equal(h.state.editor.cursor, 3066); h.page.onDestroy();
});

test('editor-only modes with no snapshot do not write draft, fabricate content, or navigate to a replacement record', () => {
  for (const mode of ['tools', 'clipboard', 'exit', 'error']) {
    const h = open({ params: { mode }, clipboard: ['正文'] });
    for (const action of ['cursor-left', 'cursor-right', 'type', 'paste-0', 'keep-draft', 'discard', 'continue-edit', 'retry-save']) h.page.action(action);
    h.page.back(); assertVisibleMessage(h);
    assert.equal(h.state.editor, null); assert.equal(h.routes.length, 0);
    assert.ok(!h.calls.some(x => ['setFlag', 'saveDraft', 'clearDraft'].includes(x.method))); h.page.onDestroy();
  }
});
test('missing store and synchronous store exceptions are visible, retryable errors rather than unhandled crashes', () => {
  const none = open({ params: { mode: 'record' }, noStore: true }); assertVisibleMessage(none); none.page.onDestroy();
  const h = open({ params: { mode: 'exit' }, editor: snapshot, store: { saveDraft() { throw new Error('disk'); } } });
  h.page.action(h.page.dockRightAction); assertVisibleMessage(h);
  assert.deepEqual(copy(h.state.editor), snapshot); assert.equal(h.routes.length, 0); h.page.onDestroy();
});
test('late and duplicate callbacks cannot mutate a destroyed page, append twice, or navigate after hide', () => {
  let finish;
  const h = open({ params: { mode: 'record' }, store: { read(_id, cb) { finish = cb; } } });
  h.page.onDestroy(); finish(null, copy(record));
  assert.equal(h.page.rows.length, 0); assert.equal(h.routes.length, 0);
  let copyFinish, count = 0;
  const c = open({ params: { mode: 'record' }, store: { read(_id, cb) { if (++count === 1) cb(null, copy(record)); else copyFinish = cb; } } });
  c.page.action('copy'); copyFinish(null, copy(record)); copyFinish(null, copy(record));
  assert.deepEqual(c.state.clipboard, [record.text]); c.page.onDestroy();
  let draftFinish;
  const d = open({ params: { mode: 'exit' }, editor: snapshot, store: { clearDraft(cb) { draftFinish = cb; } } });
  d.page.action(d.page.dockLeftAction); d.page.onHide(); draftFinish(null, true);
  assert.deepEqual(copy(d.state.editor), snapshot); assert.equal(d.routes.length, 0); d.page.onDestroy();
});
test('reactivation invalidates an earlier read and never lets its flags replace the newer record', () => {
  const callbacks = [];
  const h = open({ params: { mode: 'record' }, store: { read(_id, cb) { callbacks.push(cb); } } });
  h.page.onHide(); h.page.onShow(); assert.equal(callbacks.length, 2);
  callbacks[0](null, { ...record, pinned: true }); assert.equal(h.page.rows.length, 0);
  callbacks[1](null, copy(record)); assert.equal(h.page.rows[0].label, '置顶记录'); h.page.onDestroy();
});
for (const info of [
  { windowWidth: 412, windowHeight: 484, screenShape: 'rect' },
  { windowWidth: 454, windowHeight: 454, screenShape: 'circle' },
  { windowWidth: 336, windowHeight: 480, screenShape: 'rect' },
  { windowWidth: 408, windowHeight: 408, screenShape: 'circle' }
]) test('all eight menu layouts have finite device-derived px and explicit heights at ' + info.windowWidth + 'x' + info.windowHeight, () => {
  for (const mode of ['read-options', 'record', 'app', 'confirm', 'exit', 'error', 'tools', 'clipboard']) {
    const h = open({ params: { mode }, info, editor: snapshot }); const p = h.page;
    assert.equal(p.w, info.windowWidth); assert.equal(p.h, info.windowHeight);
    assert.ok(p.titleFont >= 20); assert.equal(p.rowH, 50);
    for (const field of ['hw', 'hit', 'listH', 'contentW', 'dockW', 'dockPartW', 'dialogH', 'toolBarH', 'hintH', 'fontBlockH']) assert.ok(Number.isFinite(p[field]) && p[field] > 0, field);
    assert.equal(p.top + p.listH + 8, p.dockY);
    assert.ok(p.dockY + p.hit <= p.h); assert.ok(p.dockX >= 0 && p.dockX + p.dockW <= p.w);
    assert.ok(p.titleW + p.hit + 8 <= p.hw + 0.001, 'approved menu has one back hit, not a phantom right hit');
    assert.ok(p.dialogH <= p.listH);
    assert.equal(p.isReadOptions + p.isRecord + p.isApp + p.isConfirm + p.isExit + p.isError + p.isTools + p.isClipboard, 1);
    for (const field of ['showEmpty', 'showMessage', 'showHints', 'showDialog', 'showDockRight', 'showDockIcon']) assert.equal(typeof p[field], 'boolean', field);
    h.page.onDestroy();
  }
});
test('failed device discovery remains loading and never substitutes fixed dimensions', () => {
  const h = open({ device(o) { o.success({ windowWidth: 0, windowHeight: 0, screenShape: 'rect' }); } });
  assert.equal(h.page.ready, false); assert.equal(h.page.w, 0); assert.equal(h.page.h, 0);
  h.page.action('reader-start'); assert.equal(h.routes.length, 0); h.page.onDestroy();
});
test('native menu HML/CSS exist, use boolean conditions, original toolbar, pure-text event containers and bounded ES5', () => {
  const hp = new URL('pages/menu/menu.hml', base), cp = new URL('pages/menu/menu.css', base);
  assert.ok(fs.existsSync(hp), 'menu.hml must be a real deliverable'); assert.ok(fs.existsSync(cp), 'menu.css must be a real deliverable');
  const hml = fs.readFileSync(hp, 'utf8'), css = fs.readFileSync(cp, 'utf8'), js = fs.readFileSync(pagePath, 'utf8');
  assert.ok(hml.includes('ref="crown"')); assert.ok(hml.includes('action(item.action)'));
  assert.ok(hml.includes("selectFont('compact')")); assert.ok(hml.includes('toolBarImage')); assert.ok(hml.includes('typeIcon'));
  assert.ok(hml.includes('height:{{listH}}')); assert.ok(hml.includes('height:{{dialogH}}'));
  assert.ok(!/<(?:button|section|span|p)\b/.test(hml));
  assert.ok(!/<text\b[^>]*@(?:click|touch|swipe)/.test(hml), 'text never owns action hit areas');
  assert.ok(!/<[^>]*\bif=[^>]*\bfor=|<[^>]*\bfor=[^>]*\bif=/.test(hml));
  assert.ok(!/class="{{/.test(hml));
  for (const match of hml.matchAll(/\bif="{{\s*(!?)(\w+)\s*}}"/g)) {
    const p = open({ params: { mode: 'read-options' } }).page;
    assert.equal(typeof p[match[2]], 'boolean', match[2]); p.onDestroy();
  }
  assert.ok(!/}}px/.test(hml), 'native numeric bindings cannot stringify overlong fractional px values');
  for (const match of hml.matchAll(/src="(\/common\/[^"{]+)"/g)) assert.ok(fs.existsSync(new URL(match[1].slice(1), base)), match[1]);
  for (const match of js.matchAll(/['"](\/common\/[^'"]+\.png)['"]/g)) assert.ok(fs.existsSync(new URL(match[1].slice(1), base)), match[1]);
  assert.ok(!/\b(?:Promise|async|await|let|const)\b|=>|\?\./.test(js));
  assert.ok(!/\beval\s*\(|\bFunction\s*\(/.test(js));
  assert.ok(!/\bbackground(?:-color)?\s*:/.test((css.match(/\.\w*(?:text|label|title|hint|notice|empty|caption)\w*\s*\{[^}]*\}/g) || []).join('')), 'text-related classes stay pure text');
});
