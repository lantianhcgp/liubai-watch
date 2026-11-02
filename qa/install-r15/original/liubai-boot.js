/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 615:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var $app_template$ = __webpack_require__(361)
var $app_style$ = __webpack_require__(482)
var $app_script$ = __webpack_require__(868)
var options=$app_script$
 if ($app_script$.__esModule) {

      options = $app_script$.default;
 }
options.styleSheet=$app_style$
options.render=$app_template$;
module.exports=new ViewModel(options);

/***/ }),

/***/ 482:
/***/ (function(module) {

module.exports = {"classSelectors":{"page":{"width":"100%","height":"100%","backgroundColor":921615}}}

/***/ }),

/***/ 361:
/***/ (function(module) {

module.exports = function (vm) { var _vm = vm || this; return _c('div', {'staticClass' : ["page"]} ) }

/***/ }),

/***/ 210:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _typeof2 = _interopRequireDefault(__webpack_require__(642));
var _system = _interopRequireDefault(requireModule("@system.file"));
var _utf = _interopRequireDefault(__webpack_require__(703));
var ROOT = 'internal://app/lb1';
var PAGE = 6,
  MAX_PAGES = 256,
  CHUNK = 2800,
  MAX_BODY = 32768;
var TIMEOUT = 10000,
  ready = false,
  closed = false,
  busy = false;
var pending = [],
  fence = false,
  serial = 0,
  queue = [],
  savePending = false;
var listResume = null,
  GC_MAX = 32,
  idBits = [],
  idComplete = false,
  idCatalog = -1,
  location = null;
function forgetLocations() {
  idBits = [];
  idComplete = false;
  idCatalog = -1;
  location = null;
}
function idBit(id) {
  return Number(hash(id)) % 4096;
}
function bitSet(bit) {
  var word = Math.floor(bit / 32);
  idBits[word] = (idBits[word] || 0) | 1 << bit % 32;
}
function bitKnown(bit) {
  return !!((idBits[Math.floor(bit / 32)] || 0) & 1 << bit % 32);
}
function otherBit(id) {
  var h = 5381;
  for (var i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) % 4096;
  return h;
}
function rememberId(id) {
  bitSet(idBit(id));
  bitSet(otherBit(id));
}
function possiblyKnown(id) {
  return bitKnown(idBit(id)) && bitKnown(otherBit(id));
}
function recordRoots(state) {
  var blobs = [],
    i;
  if (!state.data || !Array.isArray(state.data.items) || state.data.items.length > PAGE) return null;
  for (i = 0; i < state.data.items.length; i++) blobs.push(state.data.items[i].blob);
  return gcBlobs({
    blobs: blobs
  });
}
function draftRoots(state) {
  return gcBlobs({
    blobs: state.data.value ? [state.data.value.blob] : []
  });
}
function error(text) {
  return new Error(text);
}
function deliver(cb, e, v) {
  if (typeof cb === 'function') cb(e || null, v);
}
function validKey(s) {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s);
}
function hash(s) {
  var h = 2166136261,
    i;
  for (i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
  return String(h);
}
function seal(seq, data) {
  return JSON.stringify({
    v: 1,
    seq: seq,
    data: data,
    hash: hash(JSON.stringify(data))
  });
}
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
function io(method, args, cb) {
  if (closed) return cb(error('Store disposed'));
  if (pending.length >= 2) return cb(error('Native I/O capacity reached'));
  var done = false,
    timed = false,
    timer,
    cancel;
  var writing = method === 'writeText';
  function rollback() {
    var finished = false;
    var guard = setTimeout(function () {
      finished = true;
    }, TIMEOUT);
    function end() {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      fence = false;
    }
    try {
      _system["default"]["delete"]({
        uri: args.uri,
        success: end,
        fail: function fail(d, c) {
          if (c === 301) end();
        }
      });
    } catch (e) {
      clearTimeout(guard);
    }
  }
  function finish(e, value) {
    if (done) {
      if (timed && writing) {
        timed = false;
        rollback();
      }
      return;
    }
    done = true;
    clearTimeout(timer);
    var at = pending.indexOf(cancel);
    if (at >= 0) pending.splice(at, 1);
    cb(e, value);
  }
  cancel = function cancel() {
    if (writing) {
      timed = true;
      fence = true;
    }
    finish(error('Store disposed'));
  };
  pending.push(cancel);
  timer = setTimeout(function () {
    if (writing) {
      timed = true;
      fence = true;
    }
    finish(error('File ' + method + ' timeout'));
  }, TIMEOUT);
  args.success = function (v) {
    finish(null, v);
  };
  args.fail = function (d, c) {
    var e = error('File ' + method + ' failed (' + c + '): ' + String(d));
    e.code = Number(c);
    finish(e);
  };
  try {
    _system["default"][method](args);
  } catch (e) {
    if (done) throw e;
    finish(error('File ' + method + ': ' + String(e)));
  }
}
function read(uri, cb) {
  io('readText', {
    uri: uri,
    encoding: 'UTF-8',
    position: 0,
    length: 4096
  }, function (e, result) {
    if (e) return cb(e);
    if (!result || typeof result.text !== 'string' || !_utf["default"].valid(result.text)) return cb(error('Corrupt file text'));
    var length = _utf["default"].bytes(result.text);
    if (length < 4096) return cb(null, result.text);
    io('get', {
      uri: uri,
      recursive: false
    }, function (err, info) {
      if (err) return cb(err);
      if (!info || info.type !== 'file' || info.length > 4096 || info.length !== length) return cb(error('Corrupt or oversized small file'));
      cb(null, result.text);
    });
  });
}
function write(uri, text, cb) {
  if (_utf["default"].bytes(text) > 4000) return cb(error('Small file budget exceeded'));
  io('writeText', {
    uri: uri,
    text: text,
    encoding: 'UTF-8',
    append: false
  }, function (e) {
    if (e) return cb(e);
    read(uri, function (err, actual) {
      cb(err || (actual !== text ? error('File verification failed') : null));
    });
  });
}
function mkdir(uri, cb) {
  io('mkdir', {
    uri: uri,
    recursive: true
  }, function (e) {
    if (!e) return cb(null);
    io('get', {
      uri: uri,
      recursive: false
    }, function (other, info) {
      cb(other || (!info || info.type !== 'dir' ? error('Directory unavailable') : null));
    });
  });
}
function unpack(text) {
  var x;
  try {
    x = JSON.parse(text);
  } catch (e) {
    return null;
  }
  if (!x || x.v !== 1 || typeof x.seq !== 'number' || x.seq < 0 || x.seq % 1 || x.seq > 9007199254740000 || !x.data || x.hash !== hash(JSON.stringify(x.data))) return null;
  return x;
}
function pair(base, empty, cb, rootsOf) {
  var best = null,
    bestSlot = -1,
    found = false,
    roots = [],
    left = 2,
    failure = null;
  function part(slot) {
    read(base + slot + '.json', function (e, text) {
      if (e && e.code !== 301 && !/Corrupt/.test(e.message) && !failure) failure = e;
      if (!e || e && e.code !== 301) found = true;
      if (!e) {
        var x = unpack(text),
          descriptors;
        if (x && rootsOf) {
          descriptors = rootsOf(x);
          if (!descriptors) failure = failure || error('Corrupt GC metadata roots');else roots = gcUnion(roots, descriptors);
        }
        if (x && (!best || x.seq > best.seq || x.seq === best.seq && slot < bestSlot)) {
          best = x;
          bestSlot = slot;
        }
      }
      if (--left) return;
      if (failure) return cb(failure);
      if (!best && found) return cb(error('Corrupt storage: both generations damaged'));
      cb(null, best || {
        seq: -1,
        data: empty
      }, roots);
    });
  }
  part(0);
  part(1);
}
function commit(base, old, data, cb) {
  listResume = null;
  var seq = old.seq + 1,
    uri = base + seq % 2 + '.json',
    text = seal(seq, data);
  write(uri, text, function (e) {
    if (!e) return cb(null, {
      seq: seq,
      data: data
    });
    if (fence) return cb(e);
    io('delete', {
      uri: uri
    }, function (cleanup) {
      if (cleanup && cleanup.code !== 301) fence = true;
      cb(e);
    });
  });
}
function catalog(cb) {
  pair(ROOT + '/c', {
    pages: 0
  }, function (e, c) {
    if (e) return cb(e);
    if (typeof c.data.pages !== 'number' || c.data.pages < 0 || c.data.pages % 1 || c.data.pages > MAX_PAGES) return cb(error('Corrupt catalog'));
    cb(null, c);
  });
}
function page(p, cb) {
  pair(ROOT + '/p' + p + '/i', {
    items: []
  }, function (e, state, roots) {
    if (e) return cb(e);
    var items = state.data.items,
      i,
      rec,
      m,
      b;
    if (!items || items.length > PAGE || state.seq < 0) return cb(error('Corrupt index page'));
    for (i = 0; i < items.length; i++) {
      rec = items[i];
      m = rec.meta;
      b = rec.blob;
      if (!m || !validKey(m.id) || typeof m.created !== 'number' || !isFinite(m.created) || typeof m.revision !== 'number' || m.revision < 1 || typeof m.bytes !== 'number' || m.bytes > MAX_BODY || m.bytes < 1 || typeof m.pinned !== 'boolean' || typeof m.deleted !== 'boolean' || typeof m.title !== 'string' || typeof m.preview !== 'string' || !b || !validKey(b.token) || b.bytes !== m.bytes || b.count < 1 || b.count > 16 || b.count % 1 || typeof b.hash !== 'string') return cb(error('Corrupt record index'));
    }
    state.roots = roots;
    cb(null, state);
  }, recordRoots);
}
function task(cb, work, initializing, priority) {
  if (closed) return deliver(cb, error('Store disposed'));
  if (fence) return deliver(cb, error('Uncertain native write; wait for rollback'));
  if (!ready && !initializing) return deliver(cb, error('Store not initialized'));
  if (priority && savePending) return deliver(cb, error('Save already in progress'));
  if (busy && initializing) return deliver(cb, error('Store busy initializing'));
  if (busy && queue.length >= (priority ? 7 : 6)) return deliver(cb, error('Queue full capacity'));
  if (priority) savePending = true;
  var job = {
    cb: cb,
    work: work,
    priority: priority
  };
  if (busy) {
    if (priority) queue.unshift(job);else queue.push(job);
    return;
  }
  runTask(job);
}
function runTask(job) {
  busy = true;
  var done = false;
  function end(e, v) {
    if (done) return;
    done = true;
    busy = false;
    if (job.priority) savePending = false;
    if (e) {
      forgetLocations();
      listResume = null;
    }
    try {
      deliver(job.cb, e, v);
    } finally {
      if (closed || fence) {
        while (queue.length) deliver(queue.shift().cb, error(closed ? 'Store disposed' : 'Uncertain native write; wait for rollback'));
        savePending = false;
      } else if (!busy && queue.length) runTask(queue.shift());
    }
  }
  try {
    job.work(end);
  } catch (e) {
    end(e);
  }
}
function locate(c, id, cb) {
  if (idCatalog !== c.seq) forgetLocations();
  var p = 0,
    free = -1,
    freeState = null;
  var absent = idComplete && !possiblyKnown(id);
  function found(n, state) {
    var i;
    for (i = 0; i < state.data.items.length; i++) if (state.data.items[i].meta.id === id) {
      location = {
        id: id,
        p: n
      };
      cb(null, {
        p: n,
        state: state,
        index: i
      });
      return true;
    }
    return false;
  }
  if (location && location.id === id && location.p < c.data.pages) {
    return page(location.p, function (e, state) {
      if (e) return cb(e);
      if (!found(location.p, state)) {
        location = null;
        step();
      }
    });
  }
  if (absent && c.data.pages) {
    var tail = c.data.pages - 1;
    return page(tail, function (e, state) {
      if (e) return cb(e);
      if (found(tail, state)) return;
      cb(null, {
        p: state.data.items.length < PAGE ? tail : -1,
        state: state.data.items.length < PAGE ? state : null,
        index: -1
      });
    });
  }
  function step() {
    if (p >= c.data.pages) {
      idComplete = true;
      idCatalog = c.seq;
      return cb(null, {
        p: free,
        state: freeState,
        index: -1
      });
    }
    page(p, function (e, state) {
      if (e) return cb(e);
      var i;
      for (i = 0; i < state.data.items.length; i++) rememberId(state.data.items[i].meta.id);
      if (found(p, state)) return;
      if (state.data.items.length < PAGE && free < 0) {
        free = p;
        freeState = state;
      }
      p++;
      step();
    });
  }
  step();
}
function token() {
  serial++;
  return 't' + new Date().getTime().toString(36) + '_' + serial.toString(36) + '_' + Math.floor(Math.random() * 1000000000).toString(36);
}
function gcBlobs(data) {
  var out = [],
    i,
    b;
  if (!data || !Array.isArray(data.blobs) || data.blobs.length > GC_MAX) return null;
  for (i = 0; i < data.blobs.length; i++) {
    b = data.blobs[i];
    if (!b || !validKey(b.token) || typeof b.count !== 'number' || b.count < 0 || b.count > 16 || b.count % 1) return null;
    out.push({
      token: b.token,
      count: b.count
    });
  }
  return out;
}
function gcUnion(a, b) {
  var out = a.slice(),
    i,
    j;
  for (i = 0; i < b.length; i++) {
    for (j = 0; j < out.length && out[j].token !== b[i].token; j++);
    if (j === out.length) out.push({
      token: b[i].token,
      count: b[i].count
    });else if (out[j].count < b[i].count) out[j].count = b[i].count;
  }
  return out;
}
function gcRoots(dir, kind, cb) {
  if (kind === 'orphan') return cb(null, []);
  pair(dir + (kind === 'draft' ? '/d' : '/i'), kind === 'draft' ? {
    value: null
  } : {
    items: []
  }, function (e, state, roots) {
    cb(e, e ? undefined : roots);
  }, kind === 'draft' ? draftRoots : recordRoots);
}
function gcCollect(dir, kind, cb, context) {
  function collected(e, journal) {
    if (e) return cb(e);
    var candidates = gcBlobs(journal.data);
    if (!candidates) return cb(error('Corrupt GC journal'));
    function rooted(re, roots) {
      if (re) return cb(re);
      var survivors = [],
        at = 0,
        changed = false;
      function next() {
        if (at >= candidates.length) {
          if (!changed) return cb(null, {
            journal: journal,
            roots: roots
          });
          return commit(dir + '/g', journal, {
            blobs: survivors
          }, function (ce, current) {
            cb(ce, ce ? undefined : {
              journal: current,
              roots: roots
            });
          });
        }
        var b = candidates[at++],
          i,
          n = 0,
          failed = false;
        for (i = 0; i < roots.length; i++) if (roots[i].token === b.token) {
          survivors.push(b);
          return next();
        }
        function chunk() {
          if (n >= b.count) {
            if (failed) survivors.push(b);else changed = true;
            return next();
          }
          io('delete', {
            uri: dir + '/b' + b.token + '_' + n++ + '.txt'
          }, function (de) {
            if (closed) return cb(error('Store disposed'));
            if (de && de.code !== 301) failed = true;
            chunk();
          });
        }
        chunk();
      }
      next();
    }
    if (context && context.roots) return rooted(null, context.roots);
    gcRoots(dir, kind, rooted);
  }
  if (context && context.journal) return collected(null, context.journal);
  pair(dir + '/g', {
    blobs: []
  }, collected);
}
function gcRegister(dir, kind, candidate, cb, roots) {
  gcCollect(dir, kind, function (e, context) {
    if (e) return cb(e);
    var known = gcUnion(gcUnion(gcBlobs(context.journal.data), context.roots), [candidate]);
    if (known.length > GC_MAX) return cb(error('GC cleanup capacity reached; retry cleanup before writing'));
    commit(dir + '/g', context.journal, {
      blobs: known
    }, function (ce, current) {
      if (!ce) context.journal = current;
      cb(ce, ce ? undefined : context);
    });
  }, roots ? {
    roots: roots
  } : null);
}
function gcFinish(dir, kind, e, value, cb, context) {
  if (fence || closed) return cb(e, value);
  gcCollect(dir, kind, function () {
    cb(e, value);
  }, context);
}
function gcRecover(c, cb) {
  var p = 0;
  gcCollect(ROOT, 'draft', function (e) {
    if (e) return cb(e);
    function step() {
      if (p > c.data.pages || p >= MAX_PAGES) return cb(null);
      var n = p++;
      gcCollect(ROOT + '/p' + n, n === c.data.pages ? 'orphan' : 'index', function (pe) {
        if (pe) return cb(pe);
        step();
      });
    }
    step();
  });
}
function blobWrite(dir, text, cb, roots) {
  var t = token(),
    pos = 0,
    count = 0,
    context = null;
  function step() {
    if (pos >= text.length) return cb(null, {
      token: t,
      count: count,
      bytes: _utf["default"].bytes(text),
      hash: hash(text)
    }, context);
    var end = _utf["default"].endBytes(text, pos, CHUNK),
      chunk = text.slice(pos, end);
    write(dir + '/b' + t + '_' + count + '.txt', chunk, function (e) {
      if (e) return cb(e, undefined, context);
      pos = end;
      count++;
      step();
    });
  }
  var chunks = 0,
    position = 0;
  while (position < text.length) {
    position = _utf["default"].endBytes(text, position, CHUNK);
    chunks++;
  }
  gcRegister(dir, dir === ROOT ? 'draft' : 'index', {
    token: t,
    count: chunks
  }, function (e, registered) {
    if (e) return cb(e);
    context = registered;
    step();
  }, roots);
}
function blobRead(dir, blob, cb) {
  var n = 0,
    body = '';
  function step() {
    if (n >= blob.count) {
      if (!_utf["default"].valid(body) || _utf["default"].bytes(body) !== blob.bytes || hash(body) !== blob.hash) return cb(error('Corrupt body checksum'));
      return cb(null, body);
    }
    read(dir + '/b' + blob.token + '_' + n + '.txt', function (e, text) {
      if (e) return cb(e);
      body += text;
      if (_utf["default"].bytes(body) > MAX_BODY) return cb(error('Body exceeds safe load budget; stored file preserved'));
      n++;
      step();
    });
  }
  step();
}
function two(n) {
  return n < 10 ? '0' + n : String(n);
}
function metadata(id, body, created, revision, pinned, deleted) {
  var date = new Date(created),
    title = '',
    pos = 0,
    end,
    line;
  while (pos < body.length) {
    end = body.indexOf('\n', pos);
    if (end < 0) end = body.length;
    line = body.slice(pos, end).replace(/^\s+|\s+$/g, '');
    if (line) {
      title = _utf["default"].sliceBytes(line, 72);
      break;
    }
    pos = end + 1;
  }
  var preview = body.slice(end < body.length ? end + 1 : body.length).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  if (!preview) preview = "\u70B9\u5F00\u9605\u8BFB";
  return {
    id: id,
    created: created,
    date: date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate()),
    time: two(date.getHours()) + ':' + two(date.getMinutes()),
    title: title,
    preview: _utf["default"].sliceBytes(preview, 96),
    pinned: pinned,
    deleted: deleted,
    revision: revision,
    bytes: _utf["default"].bytes(body)
  };
}
function checkFlags(x) {
  if (!x || (0, _typeof2["default"])(x) !== 'object') return false;
  if (x.pinned !== undefined && typeof x.pinned !== 'boolean') return false;
  if (x.deleted !== undefined && typeof x.deleted !== 'boolean') return false;
  return true;
}
function save(input, cb) {
  try {
    input = clone(input);
  } catch (e) {
    return deliver(cb, error('Invalid record serialization'));
  }
  task(cb, function (done) {
    if (!input || typeof input.body !== 'string' || !_utf["default"].valid(input.body) || !/\S/.test(input.body) || input.id !== undefined && input.id !== '' && !validKey(input.id) || !checkFlags(input)) return done(error('Invalid or empty record'));
    var size = _utf["default"].bytes(input.body),
      id = input.id || 'n' + token();
    if (size > MAX_BODY) return done(error('Body safe-load budget exceeded; no truncation'));
    catalog(function (e, c) {
      if (e) return done(e);
      locate(c, id, function (err, hit) {
        if (err) return done(err);
        var old = hit.index >= 0 ? hit.state.data.items[hit.index].meta : null;
        if (size > 3072 && (!old || size > old.bytes)) return done(error('New text exceeds 3072 UTF-8 byte budget; original preserved'));
        var created = old ? old.created : input.created === undefined ? new Date().getTime() : input.created;
        if (typeof created !== 'number' || !isFinite(created) || isNaN(new Date(created).getTime())) return done(error('Invalid creation date'));
        var meta = metadata(id, input.body, created, old ? old.revision + 1 : 1, input.pinned === undefined ? old ? old.pinned : false : input.pinned, input.deleted === undefined ? old ? old.deleted : false : input.deleted);
        var p = hit.p < 0 ? c.data.pages : hit.p,
          newPage = p === c.data.pages;
        if (p >= MAX_PAGES) return done(error('Record capacity reached; existing files preserved'));
        var dir = ROOT + '/p' + p;
        function persist(state) {
          blobWrite(dir, input.body, function (writeError, blob, gcContext) {
            if (writeError) return gcFinish(dir, 'index', writeError, undefined, done);
            var oldActiveRoots = recordRoots(state),
              items = state.data.items;
            if (old) items[hit.index] = {
              meta: meta,
              blob: blob
            };else items.push({
              meta: meta,
              blob: blob
            });
            commit(dir + '/i', state, {
              items: items
            }, function (indexError) {
              if (indexError) return gcFinish(dir, 'index', indexError, undefined, done);
              if (!newPage) {
                rememberId(id);
                idCatalog = c.seq;
                location = {
                  id: id,
                  p: p
                };
                gcContext.roots = gcUnion(oldActiveRoots, recordRoots(state));
                return gcFinish(dir, 'index', null, clone(meta), done, gcContext);
              }
              commit(ROOT + '/c', c, {
                pages: c.data.pages + 1
              }, function (catError) {
                if (!catError) {
                  rememberId(id);
                  idCatalog = c.seq + 1;
                  location = {
                    id: id,
                    p: p
                  };
                  gcContext.roots = gcUnion(oldActiveRoots, recordRoots(state));
                }
                gcFinish(dir, catError ? 'orphan' : 'index', catError, catError ? undefined : clone(meta), done, catError ? null : gcContext);
              });
            });
          }, state.roots || []);
        }
        if (!newPage) {
          if (hit.state) return persist(hit.state);
          return page(p, function (pe, state) {
            if (pe) return done(pe);
            persist(state);
          });
        }
        mkdir(dir, function (me) {
          if (me) return done(me);
          io('delete', {
            uri: dir + '/i1.json'
          }, function (de) {
            if (de && de.code !== 301) return done(de);
            io('delete', {
              uri: dir + '/i0.json'
            }, function (other) {
              if (other && other.code !== 301) return done(other);
              write(dir + '/i0.json', seal(0, {
                items: []
              }), function (we) {
                if (we) return done(we);
                persist({
                  seq: 0,
                  data: {
                    items: []
                  }
                });
              });
            });
          });
        });
      });
    });
  }, false, true);
}
function load(id, cb) {
  task(cb, function (done) {
    if (!validKey(id)) return done(error('Invalid record ID'));
    catalog(function (e, c) {
      if (e) return done(e);
      locate(c, id, function (err, hit) {
        if (err) return done(err);
        if (hit.index < 0) return done(error('Record not found'));
        var rec = hit.state.data.items[hit.index],
          m = clone(rec.meta);
        blobRead(ROOT + '/p' + hit.p, rec.blob, function (be, body) {
          if (be) return done(be);
          m.body = body;
          done(null, m);
        });
      });
    });
  });
}
function flag(id, flags, cb) {
  try {
    flags = clone(flags);
  } catch (e) {
    return deliver(cb, error('Invalid flags'));
  }
  task(cb, function (done) {
    if (!validKey(id) || !checkFlags(flags) || flags.pinned === undefined && flags.deleted === undefined) return done(error('Invalid record flags'));
    catalog(function (e, c) {
      if (e) return done(e);
      locate(c, id, function (err, hit) {
        if (err) return done(err);
        if (hit.index < 0) return done(error('Record not found'));
        var m = hit.state.data.items[hit.index].meta;
        if (flags.pinned !== undefined) m.pinned = flags.pinned;
        if (flags.deleted !== undefined) m.deleted = flags.deleted;
        commit(ROOT + '/p' + hit.p + '/i', hit.state, hit.state.data, function (ce) {
          gcFinish(ROOT + '/p' + hit.p, 'index', ce, ce ? undefined : clone(m), done);
        });
      });
    });
  });
}
function compare(a, b, prioritisePins) {
  if (prioritisePins && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.created !== b.created) return a.created > b.created ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
function list(q, cb) {
  try {
    q = clone(q || {});
  } catch (e) {
    return deliver(cb, error('Invalid query'));
  }
  task(cb, function (done) {
    q = q || {};
    var filter = q.filter || 'all',
      offset = q.offset === undefined ? 0 : q.offset,
      limit = q.limit === undefined ? 6 : q.limit;
    if (typeof offset !== 'number' || offset < 0 || offset % 1 || typeof limit !== 'number' || limit < 1 || limit > 12 || limit % 1 || !/^(all|pinned|trash|day|month)$/.test(filter) || filter === 'day' && !/^\d{4}-\d{2}-\d{2}$/.test(q.day || '') || filter === 'month' && !/^\d{4}-\d{2}$/.test(q.month || '')) return done(error('Invalid list query (limit 1..12)'));
    catalog(function (e, c) {
      if (e) return done(e);
      var queryKey = filter + '|' + (q.day || '') + '|' + (q.month || '') + '|' + c.seq;
      var resume = listResume && listResume.key === queryKey && listResume.offset === offset && listResume.limit === limit ? listResume : null;
      var cursor = resume ? resume.cursor : null,
        remaining = resume ? offset - resume.offset : offset,
        total = resume ? resume.total : 0,
        first = !resume;
      if (resume && remaining === 0 && resume.buffer && (resume.buffer.length >= limit || !resume.more && resume.buffer.length > 0)) {
        var cached = resume.buffer.splice(0, limit);
        resume.offset += cached.length;
        if (!resume.more && !resume.buffer.length) listResume = null;
        return done(null, {
          items: cached,
          hasMore: resume.more || resume.buffer.length > 0,
          total: total
        });
      }
      listResume = null;
      function scan() {
        var p = 0,
          active = 0,
          failure = null,
          best = [],
          wanted = remaining > 0 ? Math.min(12, remaining) : limit + Math.min(12, limit) + 1;
        function step() {
          if (failure) {
            if (!active) done(failure);
            return;
          }
          if (p >= c.data.pages && !active) {
            if (remaining > 0) {
              if (best.length < wanted) return done(null, {
                items: [],
                hasMore: false,
                total: total
              });
              remaining -= best.length;
              cursor = best[best.length - 1];
              first = false;
              return scan();
            }
            var cap = limit + Math.min(12, limit),
              more = best.length > cap;
            if (more) best.pop();
            var buffer = best.splice(limit);
            if ((more || buffer.length) && best.length) listResume = {
              key: queryKey,
              limit: limit,
              offset: offset + best.length,
              cursor: clone((buffer.length ? buffer : best)[(buffer.length ? buffer : best).length - 1]),
              total: total,
              buffer: buffer,
              more: more
            };
            return done(null, {
              items: best,
              hasMore: more || buffer.length > 0,
              total: total
            });
          }
          if (p >= c.data.pages || active >= 1) return;
          var index = p++;
          active++;
          page(index, function (pe, state) {
            active--;
            if (pe) {
              failure = failure || pe;
              step();
              return;
            }
            var i, m, at;
            for (i = 0; i < state.data.items.length; i++) {
              m = state.data.items[i].meta;
              if (filter === 'trash' ? !m.deleted : m.deleted) continue;
              if (filter === 'pinned' && !m.pinned) continue;
              if (filter === 'day' && m.date !== q.day) continue;
              if (filter === 'month' && m.date.slice(0, 7) !== q.month) continue;
              if (first) total++;
              if (cursor && compare(m, cursor, filter !== 'day' && filter !== 'month') <= 0) continue;
              at = 0;
              while (at < best.length && compare(best[at], m, filter !== 'day' && filter !== 'month') <= 0) at++;
              if (at < wanted) {
                best.splice(at, 0, clone(m));
                if (best.length > wanted) best.pop();
              }
            }
            state = null;
            step();
          });
          step();
        }
        step();
      }
      scan();
    });
  });
}
function aux(base, cb) {
  pair(base, {
    value: null
  }, cb);
}
function auxiliaryGet(key, cb) {
  task(cb, function (done) {
    if (!validKey(key)) return done(error('Invalid setting key'));
    aux(ROOT + '/s_' + key, function (e, state) {
      done(e, e ? undefined : clone(state.data.value));
    });
  });
}
function auxiliaryPut(key, value, cb) {
  try {
    value = clone(value);
  } catch (e) {
    return deliver(cb, error('Invalid setting serialization'));
  }
  task(cb, function (done) {
    if (!validKey(key) || value !== null && (!value || (0, _typeof2["default"])(value) !== 'object')) return done(error('Invalid setting object'));
    var snapshot;
    try {
      snapshot = clone(value);
      if (_utf["default"].bytes(JSON.stringify(snapshot)) > 1600) return done(error('Setting budget exceeded'));
    } catch (e) {
      return done(error('Invalid setting serialization'));
    }
    aux(ROOT + '/s_' + key, function (e, state) {
      if (e) return done(e);
      commit(ROOT + '/s_' + key, state, {
        value: snapshot
      }, function (ce) {
        done(ce, ce ? undefined : clone(snapshot));
      });
    });
  });
}
function draftGet(cb) {
  task(cb, function (done) {
    aux(ROOT + '/d', function (e, state) {
      if (e) return done(e);
      var value = state.data.value;
      if (!value) return done(null, null);
      blobRead(ROOT, value.blob, function (be, text) {
        if (be) return done(be);
        var d;
        try {
          d = value.meta ? clone(value.meta) : JSON.parse(text);
          if (value.meta) d.body = text;
        } catch (pe) {
          return done(error('Corrupt draft'));
        }
        done(null, d);
      });
    });
  });
}
function draftPut(value, cb) {
  try {
    value = clone(value);
  } catch (e) {
    return deliver(cb, error('Invalid draft serialization'));
  }
  task(cb, function (done) {
    if (!value || (0, _typeof2["default"])(value) !== 'object') return done(error('Invalid draft'));
    if (value.body === undefined && typeof value.text === 'string') value.body = value.text;
    if (typeof value.body !== 'string' || !_utf["default"].valid(value.body) || value.text !== undefined && value.text !== value.body || value.id !== undefined && value.id !== null && value.id !== '' && !validKey(value.id)) return done(error('Invalid draft'));
    delete value.text;
    var text = value.body,
      meta = clone(value);
    delete meta.body;
    if (_utf["default"].bytes(text) > MAX_BODY || _utf["default"].bytes(JSON.stringify(meta)) > 3000) return done(error('Draft safe-load metadata budget exceeded; original preserved'));
    aux(ROOT + '/d', function (e, state) {
      if (e) return done(e);
      blobWrite(ROOT, text, function (be, blob) {
        if (be) return gcFinish(ROOT, 'draft', be, undefined, done);
        commit(ROOT + '/d', state, {
          value: {
            blob: blob,
            meta: meta
          }
        }, function (ce) {
          gcFinish(ROOT, 'draft', ce, ce ? undefined : clone(value), done);
        });
      });
    });
  });
}
function draftClear(cb) {
  task(cb, function (done) {
    aux(ROOT + '/d', function (e, state) {
      if (e) return done(e);
      commit(ROOT + '/d', state, {
        value: null
      }, function (ce) {
        gcFinish(ROOT, 'draft', ce, null, done);
      });
    });
  });
}
function init(cb) {
  task(cb, function (done) {
    mkdir(ROOT, function (e) {
      if (e) return done(e);
      catalog(function (ce, c) {
        if (ce) return done(ce);
        if (c.seq >= 0) return gcRecover(c, function (ge) {
          if (!ge) ready = true;
          done(ge, !ge);
        });
        commit(ROOT + '/c', c, {
          pages: 0
        }, function (we) {
          if (!we) ready = true;
          done(we, !we);
        });
      });
    });
  }, true);
}
function dispose() {
  listResume = null;
  closed = true;
  ready = false;
  while (pending.length) pending[0]();
  while (queue.length) deliver(queue.shift().cb, error('Store disposed'));
}
var _default = {
  init: init,
  list: list,
  load: load,
  save: save,
  flag: flag,
  draftGet: draftGet,
  draftPut: draftPut,
  draftClear: draftClear,
  settingGet: auxiliaryGet,
  settingPut: auxiliaryPut,
  dispose: dispose
};
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

/***/ 868:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _store = _interopRequireDefault(__webpack_require__(210));
var _system = _interopRequireDefault(requireModule("@system.router"));
var _default = {
  onInit: function onInit() {
    var def = this.$vm && this.$vm.$app && this.$vm.$app.$def;
    if (def && def.attachStore) def.attachStore(_store["default"]);
    if (def && def.setLiubaiParams) def.setLiubaiParams({});
    _system["default"].replace({
      uri: 'pages/index/index',
      params: {}
    });
  }
};
exports["default"] = _default;

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
/******/ 	var __webpack_exports__ = __webpack_require__(615);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=boot.js.map