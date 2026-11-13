import L from './common/logsink.js';
import logConfig from './common/log-config.js';

import Store from './common/store';
import Session from './common/session';
import shell from './common/shell';

var routeParams = {};
// Store operations stay callback-based. Pages remain free to render while init runs.
var state = 'idle', initError = null, listeners = [];
var storeGen = 0, lifecycleGen = 0;
var appActive = false, deadlineMode = false, initDeadline = 0;
var diagQuiet = 0, diagQuietLast = '', diagGeometry = '', diagGeometryPage = null;
// Diagnostic-only scalars; do not bind these to page data or storage.
var diagLast = '', diagView = '', diagTimer = null, diagBeat = 0, diagVisible = false, diagGen = 0, diagCancelFailed = false;
// Own-data snapshot read: descriptor only, never executes page accessors.
function ownScalar(p, key) {
  if (!p || typeof p !== 'object') return '';
  try {
    var d = Object.getOwnPropertyDescriptor(p, key);
    if (d && 'value' in d) {
      var v = d.value, t = typeof v;
      if (t === 'string') return v.slice(0, 40);
      if (t === 'number' || t === 'boolean') return String(v);
      return '';
    }
  } catch (ignored) {}
  return '';
}
// Diagnostic output is fixed type labels and optional bounded numeric code only.
// Never export error prose, stack, filenames, or invoke their accessors/conversions.
function errText(err) {
  var type = err === null ? 'null' : typeof err, out = 'type=' + type;
  if (type === 'number' && isFinite(err) && err % 1 === 0 && err >= -9999 && err <= 9999) return out + ' value=' + err;
  if (type === 'object' || type === 'function') {
    try {
      var d = Object.getOwnPropertyDescriptor(err, 'code');
      if (d && 'value' in d && typeof d.value === 'number' && isFinite(d.value) && d.value % 1 === 0 && d.value >= -9999 && d.value <= 9999) out += ' code=' + d.value;
    } catch (ignored) {}
  }
  return out;
}
function trace(stage) {
  try {
    diagLast = stage;
    if (deadlineMode && stage.indexOf('S/io.') === 0 && stage.indexOf('.fail') < 0 && stage.indexOf('.timeout') < 0) {
      diagQuiet = Math.min(999999, diagQuiet + 1); diagQuietLast = stage; return;
    }
    L.i('stage', (stage + ' state=' + state + diagView +
      (diagQuiet ? ' quiet=' + diagQuiet + ' qlast=' + diagQuietLast : '')).slice(0, 300));
    diagQuiet = 0; diagQuietLast = '';
  } catch (ignored) {}
}
function checkPreparation() {
  if (!deadlineMode || state !== 'loading') return;
  var active = false;
  try { active = Store.checkInitDeadline() === true; }
  catch (e) { reportError('S/app.deadline.throw', e); }
  // Store's sliding owner deadline protects legitimate long recovery. This
  // fallback applies only when the completion chain itself is no longer active.
  if (state === 'loading' && !active && new Date().getTime() >= initDeadline) {
    trace('S/app.deadline');
    notify(new Error('Store initialization timeout'));
  }
}
function stopHeartbeat() {
  diagGen++;
  try { if (diagTimer !== null) clearTimeout(diagTimer); diagTimer = null; diagCancelFailed = false; }
  catch (ignored) { if (diagTimer !== null) diagCancelFailed = true; }
}
function heartbeat() {
  try {
    if (diagCancelFailed) {
      if (diagTimer !== null) {
        try { clearTimeout(diagTimer); diagTimer = null; diagCancelFailed = false; }
        catch (ignored) { return; }
      } else diagCancelFailed = false;
    }
    if (diagTimer !== null || !diagVisible || !shell.isVisible() || state === 'destroyed' || diagBeat >= 6) return;
    var gen = diagGen;
    diagTimer = setTimeout(function () {
      if (gen !== diagGen) return;
      diagTimer = null;
      if (!diagVisible || !shell.isVisible() || state === 'destroyed' || diagBeat >= 6) return;
      diagBeat++;
      try { checkPreparation(); } catch (e) { reportError('S/app.deadline.callback', e); }
      try {
        var s = L.status();
        L.i('heartbeat', ('L/hb ' + diagBeat + ' state=' + state + ' last=' + diagLast + diagView +
          ' pending=' + s.pending + ' sent=' + s.sent + ' failed=' + s.failed + ' dropped=' + s.dropped).slice(0, 300));
      } catch (ignored) {}
      heartbeat();
    }, 5000);
  } catch (ignored) {}
}
function tracePage(stage, p) {
  try {
    if (state === 'destroyed') return;
    stage = String(stage).slice(0, 60);
    if (stage === 'L/index.onHide' || stage === 'L/index.onDestroy') {
      diagVisible = false; stopHeartbeat();
    } else if (stage === 'L/index.onShow') { diagVisible = true; heartbeat(); }
    if (p) {
      try {
        var snapReady = ownScalar(p, 'ready');
        if (deadlineMode && (snapReady === 'true' || snapReady === 'false')) snapReady = snapReady === 'true' ? '1' : '0';
        diagView = (' ready=' + snapReady + ' allowed=' + ownScalar(p, 'allowed') +
          ' loading=' + ownScalar(p, 'loading') + ' empty=' + ownScalar(p, 'empty') +
          ' w=' + ownScalar(p, 'w') + ' h=' + ownScalar(p, 'h')).slice(0, 200);
        if (diagGeometry && (!diagGeometryPage || diagGeometryPage === p) && ownScalar(p, 'w') === '') {
          var knownReady = snapReady;
          // These business milestones follow successful ready assignments. Device
          // geometry alone is separately labelled and never proves editor ready.
          if (knownReady === '' && (stage === 'S/index.done' || stage === 'S/history.done' || stage === 'S/edit.done' || stage === 'V/read.ready' || stage.indexOf('V/menu.ready.') === 0)) knownReady = '1';
          diagView = ' ready=' + knownReady + diagGeometry;
        }
      } catch (ignored) { diagView = ' snapshot=blocked'; }
    }
    if (deadlineMode && stage.indexOf('L/') === 0 && stage !== 'L/device.callback.exit' && stage !== 'L/index.onInit.enter' && stage !== 'L/index.onInit.exit' && stage !== 'L/index.onShow' && stage !== 'L/index.onHide' && stage !== 'L/index.onDestroy') {
      diagQuiet = Math.min(999999, diagQuiet + 1); diagQuietLast = stage;
      return;
    }
    trace(stage);
  } catch (ignored) {}
}
function reportError(stage, err) {
  try {
    L.e('onerror', (String(stage).slice(0, 60) + ' ' + errText(err)).slice(0, 280));
  } catch (ignored) {}
}
function onerror(err) { reportError('L/app.onerror', err); }
function notify(err) {
  if (state !== 'loading') return;
  state = err ? 'failed' : 'ready'; initError = err || null;
  trace('L/app.notify.' + state);
  var waiting = listeners, resultError = initError, notifyGen = lifecycleGen; listeners = [];
  var thrown = false, first;
  for (var i = 0; i < waiting.length; i++) {
    if (notifyGen !== lifecycleGen || state === 'destroyed') break;
    if (typeof waiting[i] !== 'function') continue;
    trace('L/app.dispatch');
    try { waiting[i](resultError); }
    catch (e) { reportError('L/app.dispatch.throw', e); if (!thrown) { thrown = true; first = e; } }
  }
  if (thrown) throw first;
}
function prepareStore() {
  var gen = ++storeGen;
  state = 'loading'; initError = null;
  initDeadline = new Date().getTime() + 10000;
  trace('L/app.store.init.enter');
  try {
    Store.init(function (err) {
      if (gen !== storeGen || state !== 'loading') return;
      trace('L/app.store.callback.' + (err ? 'error' : 'ok'));
      if (err) reportError('L/app.store.callback', err);
      try { notify(err); }
      catch (e) { reportError('L/app.notify.throw', e); throw e; }
    });
  } catch (e) {
    reportError('L/app.store.init.throw', e);
    if (gen === storeGen && state === 'loading') {
      try { notify(e || new Error('Store initialization failed')); } catch (ignored) {}
    }
    throw e;
  }
  trace('L/app.store.init.return');
}
export default {
  onCreate: function () {
    if (appActive && state !== 'destroyed') { trace('S/app.create.shared'); return; }
    appActive = true;
    deadlineMode = typeof Store.checkInitDeadline === 'function';
    if (typeof Store.setSerialReads === 'function') Store.setSerialReads(true, true);
    try { L.init(logConfig); } catch (e) { reportError('L/app.logger.init', e); throw e; }
    shell.setVisibilityHook(function (v) { diagVisible = v; if (v) { heartbeat(); } else { stopHeartbeat(); } });
    shell.markVisible(true);
    try { L.page('MainAbility'); } catch (e) { reportError('L/app.logger.page', e); throw e; }
    stopHeartbeat(); diagLast = ''; diagView = ''; diagBeat = 0; diagVisible = true;
    diagQuiet = 0; diagQuietLast = ''; diagGeometry = ''; diagGeometryPage = null;
    trace('L/app.create.enter');
    trace('S/build.readiness');
    trace('S/build.fit3.W');
    trace('S/build.fit3.V');
    trace('S/build.fit3.U');
    // Retained lineage only; build.fit3.W identifies this candidate.
    trace('S/build.fit3.T');

    routeParams = {}; state = 'loading'; initError = null;
    heartbeat();
    try { if (typeof Store.setTrace === 'function') Store.setTrace(trace); } catch (ignored) {}
    prepareStore();
    trace('L/app.create.exit');
  },
  getLiubaiParams: function () { return routeParams; },
  setLiubaiParams: function (p) { routeParams = p && typeof p === 'object' ? p : {}; },
  getStore:function(){return Store;},
  getSession:function(){return Session;},
  getLiubaiStoreState: function () { checkPreparation(); return state; },
  retryLiubaiStore: function () { if (state === 'failed') prepareStore(); },
  whenLiubaiReady: function (callback) {
    if (typeof callback !== 'function') return;
    checkPreparation();
    if (state === 'ready' || state === 'failed') {
      trace('L/app.ready.dispatch');
      try { callback(initError); }
      catch (e) { reportError('L/app.ready.dispatch.throw', e); throw e; }
    }
    else if (state === 'destroyed') {
      trace('L/app.ready.destroyed.dispatch');
      try { callback(new Error('Application destroyed')); }
      catch (e) { reportError('L/app.ready.destroyed.throw', e); throw e; }
    }
    else {
      var waiting = listeners, slot = waiting.indexOf(null);
      if (slot < 0) { if (waiting.length >= 8) { callback(new Error('Application readiness capacity reached')); return; } slot = waiting.length; }
      waiting[slot] = callback;
      var canceled = false;
      return function () { if (canceled) return; canceled = true; if (waiting[slot] === callback) waiting[slot] = null; while (waiting.length && waiting[waiting.length - 1] === null) waiting.pop(); };
    }
  },
  onDestroy: function () {
    try { shell.setVisibilityHook(null); } catch (ignored) {}
    diagVisible = false; stopHeartbeat(); trace('L/app.destroy');
    var disposingFailed = false;
    try {
    state = 'destroyed'; appActive = false; initDeadline = 0; diagGeometry = ''; diagGeometryPage = null;
    storeGen++; lifecycleGen++; listeners = []; routeParams = {};
    Store.dispose();

    } catch (e) {
      disposingFailed = true; reportError('L/app.destroy.throw', e); throw e;
    } finally {
      try { L.stop(); } catch (e) { reportError('L/app.logger.stop', e); if (!disposingFailed) throw e; }
    }
  },
  traceLiubai: tracePage,
  noteLiubaiGeometry: function (w, h, p) {
    if (typeof w === 'number' && typeof h === 'number' && isFinite(w) && isFinite(h) && w > 0 && h > 0) {
      diagGeometry = ' device_ready=1 w=' + w + ' h=' + h; diagGeometryPage = p || null;
    }
  },
  clearLiubaiGeometry: function (p) {
    if (diagGeometryPage === p) { diagGeometry = ''; diagGeometryPage = null; }
  },
  errorLiubai: reportError,
  diagVisibility: function (v) { diagVisible = v === true; if (diagVisible) { heartbeat(); } else { stopHeartbeat(); } },
  onError: onerror,
  onerror: onerror
};
