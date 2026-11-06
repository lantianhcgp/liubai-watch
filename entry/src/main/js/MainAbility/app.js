import L from './common/logsink.js';
import logConfig from './common/log-config.js';

import Store from './common/store';
import Session from './common/session';
import shell from './common/shell';

var routeParams = {};
// Store operations stay callback-based. Pages remain free to render while init runs.
var state = 'idle', initError = null, listeners = [];
// Diagnostic-only scalars; do not bind these to page data or storage.
var diagLast = '', diagView = '', diagTimer = 0, diagBeat = 0, diagVisible = false, diagGen = 0, diagCancelFailed = false;
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
// Own-data property extraction only: never invokes getters or custom conversions,
// so a business error accessor keeps its full read count for the original handler.
function errText(err) {
  if (err === null || err === undefined) return String(err);
  if (typeof err !== 'object' && typeof err !== 'function') return String(err).slice(0, 100);
  var out = '', names = ['message', 'stack', 'code'], i, d;
  try {
    for (i = 0; i < names.length; i++) {
      d = Object.getOwnPropertyDescriptor(err, names[i]);
      if (d && 'value' in d && (typeof d.value === 'string' || typeof d.value === 'number')) {
        if (out) out += ' ';
        out += names[i] + '=' + String(d.value).slice(0, 80);
      }
    }
  } catch (ignored) {}
  return out || 'error';
}
function trace(stage) {
  try { diagLast = stage; L.i('stage', (stage + ' state=' + state + diagView).slice(0, 240)); } catch (ignored) {}
}
function stopHeartbeat() {
  diagGen++;
  try { clearTimeout(diagTimer); diagTimer = 0; diagCancelFailed = false; }
  catch (ignored) { if (diagTimer) diagCancelFailed = true; }
}
function heartbeat() {
  try {
    if (diagCancelFailed) {
      if (diagTimer) {
        try { clearTimeout(diagTimer); diagTimer = 0; diagCancelFailed = false; }
        catch (ignored) { return; }
      } else diagCancelFailed = false;
    }
    if (diagTimer || !diagVisible || !shell.isVisible() || state === 'destroyed' || diagBeat >= 6) return;
    var gen = diagGen;
    diagTimer = setTimeout(function () {
      if (gen !== diagGen) return;
      diagTimer = 0;
      if (!diagVisible || !shell.isVisible() || state === 'destroyed' || diagBeat >= 6) return;
      diagBeat++;
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
        diagView = (' ready=' + ownScalar(p, 'ready') + ' allowed=' + ownScalar(p, 'allowed') +
          ' loading=' + ownScalar(p, 'loading') + ' empty=' + ownScalar(p, 'empty') +
          ' w=' + ownScalar(p, 'w') + ' h=' + ownScalar(p, 'h')).slice(0, 200);
      } catch (ignored) { diagView = ' snapshot=blocked'; }
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
  if (state === 'destroyed') return;
  state = err ? 'failed' : 'ready'; initError = err || null;
  trace('L/app.notify.' + state);
  var waiting = listeners; listeners = [];
  for (var i = 0; i < waiting.length; i++) {
    trace('L/app.dispatch');
    try { waiting[i](initError); }
    catch (e) { reportError('L/app.dispatch.throw', e); throw e; }
  }
}
export default {
  onCreate: function () {
    try { L.init(logConfig); } catch (e) { reportError('L/app.logger.init', e); throw e; }
    shell.setVisibilityHook(function (v) { diagVisible = v; if (v) { heartbeat(); } else { stopHeartbeat(); } });
    shell.markVisible(true);
    try { L.page('MainAbility'); } catch (e) { reportError('L/app.logger.page', e); throw e; }
    stopHeartbeat(); diagLast = ''; diagView = ''; diagBeat = 0; diagVisible = true;
    trace('L/app.create.enter');

    routeParams = {}; state = 'loading'; initError = null;
    heartbeat();
    trace('L/app.store.init.enter');
    try {
      Store.init(function (err) {
        trace('L/app.store.callback.' + (err ? 'error' : 'ok'));
        if (err) reportError('L/app.store.callback', err);
        try { notify(err); }
        catch (e) { reportError('L/app.notify.throw', e); throw e; }
      });
    } catch (e) { reportError('L/app.store.init.throw', e); throw e; }
    trace('L/app.store.init.return');
    trace('L/app.create.exit');
  },
  getLiubaiParams: function () { return routeParams; },
  setLiubaiParams: function (p) { routeParams = p && typeof p === 'object' ? p : {}; },
  getStore:function(){return Store;},
  getSession:function(){return Session;},
  getLiubaiStoreState: function () { return state; },
  whenLiubaiReady: function (callback) {
    if (typeof callback !== 'function') return;
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
    else listeners.push(callback);
  },
  onDestroy: function () {
    try { shell.setVisibilityHook(null); } catch (ignored) {}
    diagVisible = false; stopHeartbeat(); trace('L/app.destroy');
    try {
    state = 'destroyed'; listeners = []; routeParams = {};
    Store.dispose();

    } catch (e) {
      reportError('L/app.destroy.throw', e); throw e;
    } finally {
      try { L.stop(); } catch (e) { reportError('L/app.logger.stop', e); throw e; }
    }
  },
  traceLiubai: tracePage,
  errorLiubai: reportError,
  diagVisibility: function (v) { diagVisible = v === true; if (diagVisible) { heartbeat(); } else { stopHeartbeat(); } },
  onError: onerror,
  onerror: onerror
};
