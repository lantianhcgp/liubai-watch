import Session from './common/session';

var routeParams = {};
// The FIT3 installer checks app.js together with each page's js against a
// 48 KB budget, so the storage engine must not be bundled into the
// application file. The boot page loads it and publishes it via attachStore.
var Store = null;
// Store operations stay callback-based. Pages remain free to render while init runs.
var state = 'idle', initError = null, listeners = [];
function notify(err) {
  if (state === 'destroyed') return;
  state = err ? 'failed' : 'ready'; initError = err || null;
  var waiting = listeners; listeners = [];
  for (var i = 0; i < waiting.length; i++) waiting[i](initError);
}
export default {
  onCreate: function () {
    routeParams = {};
  },
  attachStore: function (engine) {
    if (!engine || Store) return;
    Store = engine; state = 'loading'; initError = null;
    Store.init(function (err) { notify(err); });
  },
  getLiubaiParams: function () { return routeParams; },
  setLiubaiParams: function (p) { routeParams = p && typeof p === 'object' ? p : {}; },
  getStore:function(){return Store;},
  getSession:function(){return Session;},
  getLiubaiStoreState: function () { return state; },
  whenLiubaiReady: function (callback) {
    if (typeof callback !== 'function') return;
    if (state === 'ready' || state === 'failed') callback(initError);
    else if (state === 'destroyed') callback(new Error('Application destroyed'));
    else listeners.push(callback);
  },
  onDestroy: function () {
    state = 'destroyed'; listeners = []; routeParams = {};
    if (Store) Store.dispose();
  }
};
