/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 258:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var $app_script$ = __webpack_require__(900)
var options=$app_script$
 if ($app_script$.__esModule) {

        options = $app_script$.default;
 }
module.exports=new ViewModel(options);

/***/ }),

/***/ 756:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _utf = _interopRequireDefault(__webpack_require__(703));
var current = null,
  clips = [];
function set(s) {
  current = s;
}
function get() {
  return current;
}
function clear() {
  current = null;
}
function put(s) {
  if (!s) return;
  if (typeof s !== 'string' || !_utf["default"].valid(s) || _utf["default"].bytes(s) > 3072) return false;
  var text = s;
  for (var i = clips.length - 1; i >= 0; i--) if (clips[i] === text) clips.splice(i, 1);
  clips.unshift(text);
  if (clips.length > 8) clips.pop();
  var total = 0;
  for (var j = 0; j < clips.length; j++) total += _utf["default"].bytes(clips[j]);
  while (total > 8192) total -= _utf["default"].bytes(clips.pop());
  return true;
}
function clip(i) {
  return clips[i || 0] || '';
}
function list() {
  var a = [];
  for (var i = 0; i < clips.length; i++) a.push({
    index: i,
    title: clips[i].substring(0, 20),
    bytes: _utf["default"].bytes(clips[i])
  });
  return a;
}
var api = {
  set: set,
  get: get,
  clear: clear,
  clipboardPut: put,
  clipboardGet: clip,
  clipboardList: list,
  clipboardValues: function clipboardValues() {
    return clips.slice();
  }
};
api.bind = function (t) {
  if (!t || t === api) return;
  for (var k in t) if (k !== 'bind') api[k] = t[k];
};
var _default = api;
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 703:
/***/ (function(__unused_webpack_module, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
function high(c) {
  return c >= 55296 && c <= 56319;
}
function low(c) {
  return c >= 56320 && c <= 57343;
}
function bound(s, i) {
  i = Math.max(0, Math.min(s.length, Math.floor(Number(i) || 0)));
  if (i > 0 && i < s.length && high(s.charCodeAt(i - 1)) && low(s.charCodeAt(i))) i--;
  return i;
}
function next(s, i) {
  i = bound(s, i);
  if (i >= s.length) return s.length;
  return i + (high(s.charCodeAt(i)) && low(s.charCodeAt(i + 1)) ? 2 : 1);
}
function prev(s, i) {
  i = bound(s, i);
  if (i <= 0) return 0;
  i--;
  if (i > 0 && low(s.charCodeAt(i)) && high(s.charCodeAt(i - 1))) i--;
  return i;
}
function width(s, i) {
  var c = s.charCodeAt(i);
  if (c < 128) return 1;
  if (c < 2048) return 2;
  if (high(c) && low(s.charCodeAt(i + 1))) return 4;
  return 3;
}
function bytes(s) {
  var n = 0,
    i = 0;
  for (; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 128) n++;else if (c < 2048) n += 2;else if (high(c) && low(s.charCodeAt(i + 1))) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}
function endBytes(s, start, max) {
  var i = bound(s, start),
    used = 0,
    w;
  while (i < s.length) {
    w = width(s, i);
    if (used + w > max) break;
    used += w;
    i += high(s.charCodeAt(i)) && low(s.charCodeAt(i + 1)) ? 2 : 1;
  }
  return i;
}
function sliceBytes(s, max) {
  return s.slice(0, endBytes(s, 0, max));
}
function valid(s) {
  var i, c;
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    if (high(c)) {
      if (!low(s.charCodeAt(i + 1))) return false;
      i++;
    } else if (low(c)) return false;
  }
  return true;
}
var _default = {
  bytes: bytes,
  prev: prev,
  next: next,
  bound: bound,
  sliceBytes: sliceBytes,
  endBytes: endBytes,
  valid: valid
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 900:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _typeof2 = _interopRequireDefault(__webpack_require__(642));
var _session = _interopRequireDefault(__webpack_require__(756));
var routeParams = {};
var Store = null;
var state = 'idle',
  initError = null,
  listeners = [];
function notify(err) {
  if (state === 'destroyed') return;
  state = err ? 'failed' : 'ready';
  initError = err || null;
  var waiting = listeners;
  listeners = [];
  for (var i = 0; i < waiting.length; i++) waiting[i](initError);
}
var _default = {
  onCreate: function onCreate() {
    routeParams = {};
  },
  attachStore: function attachStore(engine) {
    if (!engine || Store) return;
    Store = engine;
    state = 'loading';
    initError = null;
    Store.init(function (err) {
      notify(err);
    });
  },
  getLiubaiParams: function getLiubaiParams() {
    return routeParams;
  },
  setLiubaiParams: function setLiubaiParams(p) {
    routeParams = p && (0, _typeof2["default"])(p) === 'object' ? p : {};
  },
  getStore: function getStore() {
    return Store;
  },
  getSession: function getSession() {
    return _session["default"];
  },
  getLiubaiStoreState: function getLiubaiStoreState() {
    return state;
  },
  whenLiubaiReady: function whenLiubaiReady(callback) {
    if (typeof callback !== 'function') return;
    if (state === 'ready' || state === 'failed') callback(initError);else if (state === 'destroyed') callback(new Error('Application destroyed'));else listeners.push(callback);
  },
  onDestroy: function onDestroy() {
    state = 'destroyed';
    listeners = [];
    routeParams = {};
    if (Store) Store.dispose();
  }
};
exports["default"] = _default;
;
(exports["default"] || module.exports).manifest = __webpack_require__(932);

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 143:
/***/ (function(module) {

"use strict";


function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 642:
/***/ (function(module) {

"use strict";


function _typeof(obj) {
  "@babel/helpers - typeof";

  return (module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, module.exports.__esModule = true, module.exports["default"] = module.exports), _typeof(obj);
}
module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 932:
/***/ (function(module) {

"use strict";
module.exports = JSON.parse('{"manifest.json":"content"}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(258);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=app.js.map