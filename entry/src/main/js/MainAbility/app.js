import Store from './common/store';

var routeParams = {};
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
    routeParams = {}; state = 'loading'; initError = null;
    Store.init(function (err) { notify(err); });
  },
  getLiubaiParams: function () { return routeParams; },
  setLiubaiParams: function (p) { routeParams = p && typeof p === 'object' ? p : {}; },
  getLiubaiStoreState: function () { return state; },
  whenLiubaiReady: function (callback) {
    if (typeof callback !== 'function') return;
    if (state === 'ready' || state === 'failed') callback(initError);
    else if (state === 'destroyed') callback(new Error('Application destroyed'));
    else listeners.push(callback);
  },
  onDestroy: function () {
    state = 'destroyed'; listeners = []; routeParams = {};
    Store.dispose();
  }
};
