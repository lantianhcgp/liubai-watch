import File from '@system.file';
import U from './utf8.js';

// No atomic rename assumption. Immutable body chunks + checksummed dual indices.
var ROOT = 'internal://app/lb1';
var PAGE = 6, MAX_PAGES = 256, CHUNK = 2800, MAX_BODY = 32768;
var TIMEOUT = 10000, ready = false, closed = false, busy = false;
// Preparation has one owner. A watchdog settles JS, not the native operation.
var initActive = false, initNative = 0, initWaiters = [], traceHook = null, initOwner = null;
// Application-selected profile; default retains the standalone Store contract.
var serialReads = false, recoveryFallback = false;
function setSerialReads(value, fallback) {
  if (!busy && !initActive && !initNative) { serialReads = value === true; recoveryFallback = serialReads && fallback === true; }
}
function checkInitDeadline() {
  var owner = initOwner;
  if (!owner || !owner.active || !owner.fail) return false;
  if (new Date().getTime() < owner.deadline) return true;
  trace('S/store.watchdog');
  owner.fail(error('Store initialization timeout'));
  return false;
}
function setTrace(fn) { traceHook = typeof fn === 'function' ? fn : null; }
function trace(stage) { try { if (traceHook) traceHook(stage); } catch (ignored) {} }
function ioStage(method, uri) {
  if (method === 'mkdir' && uri === ROOT) return 'S/io.mkdir';
  if (uri === ROOT + '/c0.json') return 'S/io.c0.' + (method === 'readText' ? 'read' : method === 'writeText' ? 'write' : 'other');
  if (uri === ROOT + '/c1.json') return 'S/io.c1.' + (method === 'readText' ? 'read' : method === 'writeText' ? 'write' : 'other');
  return '';
}
// Only the two independent generation reads may overlap. Public tasks and all
// writes remain serialized; cancellation handles never grow with record count.
var pending = [], fence = false, serial = 0, queue=[],savePending=false;
// One continuation and one ID/page hint; never retain index pages or bodies.
// Fixed 4096-bit absence summary (128 words), independent of record count.
var listResume = null, GC_MAX = 32, idBits = [], idComplete = false, idCatalog = -1, location = null;
function forgetLocations() { idBits = []; idComplete = false; idCatalog = -1; location = null; }
function idBit(id) { return Number(hash(id)) % 4096; }
function bitSet(bit) { var word=Math.floor(bit/32); idBits[word]=(idBits[word]||0)|(1<<(bit%32)); }
function bitKnown(bit) { return !!((idBits[Math.floor(bit/32)]||0)&(1<<(bit%32))); }
function otherBit(id){var h=5381;for(var i=0;i<id.length;i++)h=(h*33+id.charCodeAt(i))%4096;return h;}
function rememberId(id) { bitSet(idBit(id)); bitSet(otherBit(id)); }
function possiblyKnown(id) { return bitKnown(idBit(id)) && bitKnown(otherBit(id)); }
function recordRoots(state) {
  var blobs = [], i;
  if (!state.data || !Array.isArray(state.data.items) || state.data.items.length > PAGE) return null;
  for (i = 0; i < state.data.items.length; i++) blobs.push(state.data.items[i].blob);
  return gcBlobs({blobs: blobs});
}
function draftRoots(state) { return gcBlobs({blobs: state.data.value ? [state.data.value.blob] : []}); }
function error(text) { return new Error(text); }
// Called only from catch: error-first callbacks cannot encode a falsy throw.
function caughtError(value) { if (value) return value; var e = error('File operation threw'); e.cause = value; return e; }
function deliver(cb, e, v) { if (typeof cb === 'function') cb(e || null, v); }
function validKey(s) {
  if (typeof s !== 'string' || s.length < 1 || s.length > 40) return false;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (!(c === 45 || c === 95 || (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122))) return false;
  }
  return true;
}
function hash(s) {
  var h = 2166136261, i;
  for (i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return String(h);
}
function seal(seq, data) { return JSON.stringify({v: 1, seq: seq, data: data, hash: hash(JSON.stringify(data))}); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
// Recovery starts inside the catalog callback. Leave each native callback before
// another recovery I/O; serial slot reads alone did not fence c1->g0/g1->d0.
function recoveryStep(run, cb) {
  var owner = initOwner, timer = null, settled = false, cancel, resume = null, first = !initOwner.recoveryQueued;
  if (first) { owner.recoveryQueued = true; trace('W/recover.queued'); }
  function end(execute, e) {
    if (settled) return;
    settled = true;
    if (owner.resume === resume) owner.resume = null;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    var at = pending.indexOf(cancel);
    if (at >= 0) pending.splice(at, 1);
    if (!owner.active) return;
    if (!execute || closed) return cb(e || error('Store disposed'));
    if (first) trace('W/recover.dispatch');
    try { run(); }
    catch (caught) { if (owner.active && owner.fail) owner.fail(caughtError(caught)); else throw caught; }
  }
  cancel = function () { end(false); }; cancel.owner = owner;
  pending.push(cancel);
  function defer() {
    // One bounded continuation; never recurse into a file callback or create a
    // second native owner when a short timer cannot be allocated.
    if (!owner.watchLive || owner.resume) return end(false, error('Recovery timer unavailable'));
    resume = function () { end(true); };
    owner.resume = resume; owner.resumeAt = new Date().getTime() + 50;
    trace('X/recover.watch');
  }
  try {
    timer = setTimeout(function () { timer = null; end(true); }, 50);
    if (timer === null || timer === undefined) {
      timer = null;
      if (recoveryFallback) defer(); else end(false, error('Recovery timer unavailable'));
    }
  } catch (caught) { timer = null; if (recoveryFallback) defer(); else end(false, caughtError(caught)); }
}
function io(method, args, cb, dispatched) {
  if (closed) return cb(error('Store disposed'));
  if (!dispatched && serialReads && initOwner && initOwner.active && initOwner.recovery) {
    return recoveryStep(function () { io(method, args, cb, true); }, cb);
  }
  if (pending.length >= 2) return cb(error('Native I/O capacity reached'));
  var done = false, timed = false, timer = null, cancel, nativeDone = false;
  var initializing = initActive, owner = initializing ? initOwner : null, stage = initializing ? ioStage(method, args.uri) : '';
  if (owner && owner.active) owner.deadline = new Date().getTime() + TIMEOUT;
  var writing = method === 'writeText';
  function nativeEnd() { if (nativeDone) return; nativeDone = true; if (initializing) initNative--; }
  function rollback() {
    // A late native write may still happen AFTER a watchdog fires. Fence all
    // retries until its actual completion and removal; never reuse this URI.
    var finished = false;
    var guard = setTimeout(function () { finished = true; }, TIMEOUT);
    function end() { if (finished) return; finished = true; clearTimeout(guard); fence = false; }
    try { File.delete({uri: args.uri, success: end, fail: function (d, c) { if (c === 301) end(); }}); }
    catch (e) { clearTimeout(guard); }
  }
  function finish(e, value, nativeFailure) {
    if (done) { if (timed && writing) { timed = false; rollback(); } return; }
    done = true;
    try { if (timer !== null) clearTimeout(timer); } catch (ignored) {}
    timer = null;
    var at = pending.indexOf(cancel);
    if (at >= 0) pending.splice(at, 1);
    if (owner && !owner.active) return;
    try { cb(e, value, nativeFailure === true); }
    catch (caught) { if (owner && owner.active && owner.fail) { try { owner.fail(caughtError(caught)); } catch (ignored) {} } throw caught; }
  }
  cancel = function () {
    if (writing) { timed = true; fence = true; }
    finish(error('Store disposed'));
  };
  cancel.owner = owner;
  pending.push(cancel);
  try { timer = setTimeout(function () {
    // Native Lite owns an executing timeout until its callback returns.
    timer = null;
    if (done) return;
    if (writing) { timed = true; fence = true; }
    var e = error('File ' + method + ' timeout'); e.timeout = true;
    trace(stage ? stage + '.timeout' : 'S/io.timeout');
    finish(e);
  }, TIMEOUT); } catch (e) { finish(caughtError(e)); return; }
  args.success = function (v) { nativeEnd(); if (!done && stage) trace(stage + '.ok'); finish(null, v); };
  args.fail = function (d, c) {
    nativeEnd();
    if (done) { finish(null); return; }
    var e, nativeFailure = false;
    try { e = error('File ' + method + ' failed (' + c + '): ' + String(d)); e.code = Number(c); nativeFailure = true; }
    catch (caught) { e = caughtError(caught); }
    if (stage) trace(stage + '.fail');
    finish(e, undefined, nativeFailure);
  };
  if (initializing) initNative++;
  if (stage) trace(stage + '.begin');
  // A throw can follow native acceptance. Only its real callback ends ownership.
  try { File[method](args); } catch (e) { if (done) throw e; if (writing) { timed = true; fence = true; } finish(caughtError(e)); }
}
function read(uri, cb) {
  // A short bounded byte read reached EOF. Only a full buffer needs stat to
  // distinguish exactly 4096 bytes from a truncated oversized file.
  io('readText', {uri: uri, encoding: 'UTF-8', position: 0, length: 4096}, function (e, result, nativeFailure) {
    if (e) return cb(e, undefined, nativeFailure);
    var text, length, decodeError;
    try {
      text = result && result.text;
      if (typeof text !== 'string' || !U.valid(text)) decodeError = error('Corrupt file text');
      else length = U.bytes(text);
    } catch (caught) { decodeError = caughtError(caught); }
    if (decodeError) return cb(decodeError);
    if (length < 4096) return cb(null, text);
    io('get', {uri: uri, recursive: false}, function (err, info) {
      if (err) return cb(err);
      var checkError;
      try { if (!info || info.type !== 'file' || info.length > 4096 || info.length !== length) checkError = error('Corrupt or oversized small file'); }
      catch (caught) { checkError = caughtError(caught); }
      cb(checkError || null, text);
    });
  });
}
function write(uri, text, cb) {
  if (U.bytes(text) > 4000) return cb(error('Small file budget exceeded'));
  io('writeText', {uri: uri, text: text, encoding: 'UTF-8', append: false}, function (e) {
    if (e) return cb(e);
    read(uri, function (err, actual) { cb(err || (actual !== text ? error('File verification failed') : null)); });
  });
}
function mkdir(uri, cb) {
  io('mkdir', {uri: uri, recursive: true}, function (e) {
    if (!e) return cb(null);
    var timeout = false;
    try { var d = Object.getOwnPropertyDescriptor(e, 'timeout'); timeout = !!(d && 'value' in d && d.value === true); } catch (ignored) {}
    if (closed || timeout || initNative) return cb(e);
    io('get', {uri: uri, recursive: false}, function (other, info) {
      var failure = other;
      if (!failure) { try { if (!info || info.type !== 'dir') failure = error('Directory unavailable'); } catch (caught) { failure = caughtError(caught); } }
      cb(failure || null);
    });
  });
}
function unpack(text) {
  var x;
  try { x = JSON.parse(text); } catch (e) { return null; }
  if (!x || x.v !== 1 || typeof x.seq !== 'number' || x.seq < 0 || x.seq % 1 || x.seq > 9007199254740000 || !x.data || x.hash !== hash(JSON.stringify(x.data))) return null;
  return x;
}
function pair(base, empty, cb, rootsOf) {
  var best = null, bestSlot = -1, found = false, roots = [], left = 2, failure = null;
  var sequential = serialReads, owner = initActive ? initOwner : null;
  function nextSlot() {
    if (recoveryFallback && owner && owner.active && owner.recovery) {
      return recoveryStep(function () { part(1); }, cb);
    }
    var done = false, timer = null, cancel;
    function end(run, e) {
      if (done) return;
      done = true;
      try { if (timer !== null) clearTimeout(timer); } catch (ignored) {}
      timer = null;
      var at = pending.indexOf(cancel);
      if (at >= 0) pending.splice(at, 1);
      if (owner && !owner.active) return;
      if (run && !closed) part(1);
      else cb(e || error('Store disposed'));
    }
    cancel = function () { end(false); }; cancel.owner = owner;
    pending.push(cancel);
    try { timer = setTimeout(function () { timer = null; end(true); }, 50); }
    catch (e) { end(false, caughtError(e)); }
  }
  function part(slot) {
    read(base + slot + '.json', function (e, text, nativeFailure) {
      var absent = false, corrupt = false;
      if (e) {
        try {
          var code = Object.getOwnPropertyDescriptor(e, 'code'), message = Object.getOwnPropertyDescriptor(e, 'message');
          absent = !!(nativeFailure && code && 'value' in code && code.value === 301);
          corrupt = !!(message && 'value' in message && typeof message.value === 'string' && message.value.indexOf('Corrupt') >= 0);
        } catch (ignored) {}
      }
      if (e && !absent && !corrupt && !failure) failure = e;
      if (!e || !absent) found = true;
      if (!e) {
        var x, descriptors;
        try {
          x = unpack(text);
          if (x && rootsOf) {
            descriptors = rootsOf(x);
            if (!descriptors) failure = failure || error('Corrupt GC metadata roots');
            else roots = gcUnion(roots, descriptors);
          }
        } catch (caught) { failure = failure || caughtError(caught); }
        // Equal sequence selection must not depend on native completion order.
        if (x && (!best || x.seq > best.seq || (x.seq === best.seq && slot < bestSlot))) { best = x; bestSlot = slot; }
      }
      // Drain BOTH reads on every path before releasing the serialized task.
      // Otherwise a failed slot could leave stale I/O overlapping the next job.
      if (--left) {
        if (sequential) {
          // A logical timeout/throw does not prove the first native read ended.
          // Do not start a second call over a retained original operation.
          if (e && !nativeFailure && !corrupt) return cb(failure || e);
          nextSlot();
        }
        return;
      }
      if (failure) return cb(failure);
      if (!best && found) return cb(error('Corrupt storage: both generations damaged'));
      cb(null, best || {seq: -1, data: empty}, roots);
    });
  }
  part(0); if (!sequential) part(1);
}
function commit(base, old, data, cb) {
  listResume = null;
  var seq = old.seq + 1, uri = base + (seq % 2) + '.json', text = seal(seq, data);
  write(uri, text, function (e) {
    if (!e) return cb(null, {seq: seq, data: data});
    if (fence) return cb(e);
    // Remove a failed inactive commit, including a valid write whose read-back
    // failed. Current generation remains untouched. No rollback body overwrite.
    io('delete', {uri: uri}, function (cleanup) {
      if (cleanup && cleanup.code !== 301) fence = true;
      cb(e);
    });
  });
}
function catalog(cb) {
  pair(ROOT + '/c', {pages: 0}, function (e, c) {
    if (e) return cb(e);
    if (typeof c.data.pages !== 'number' || c.data.pages < 0 || c.data.pages % 1 || c.data.pages > MAX_PAGES) return cb(error('Corrupt catalog'));
    cb(null, c);
  });
}
function page(p, cb) {
  pair(ROOT + '/p' + p + '/i', {items: []}, function (e, state, roots) {
    if (e) return cb(e);
    var items = state.data.items, i, rec, m, b;
    if (!items || items.length > PAGE || state.seq < 0) return cb(error('Corrupt index page'));
    for (i = 0; i < items.length; i++) {
      rec = items[i]; m = rec.meta; b = rec.blob;
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
  if (priority && savePending) return deliver(cb,error('Save already in progress'));
  if (busy && initializing) return deliver(cb,error('Store busy initializing'));
  if (busy && queue.length >= (priority ? 7 : 6)) return deliver(cb,error('Queue full capacity'));
  if(priority)savePending=true;
  var job={cb:cb,work:work,priority:priority};
  if(busy){if(priority)queue.unshift(job);else queue.push(job);return;}
  runTask(job);
}
function runTask(job){
  busy=true;var done=false;
  function end(e,v){if(done)return;done=true;busy=false;if(job.priority)savePending=false;
    if(e) { forgetLocations(); listResume = null; }
    try{deliver(job.cb,e,v);}finally{if(closed||fence){while(queue.length)deliver(queue.shift().cb,error(closed?'Store disposed':'Uncertain native write; wait for rollback'));savePending=false;}else if(!busy&&queue.length)runTask(queue.shift());}
  }
  try{job.work(end);}catch(e){if(done)throw e;end(caughtError(e));}
}
function locate(c, id, cb) {
  if (idCatalog !== c.seq) forgetLocations();
  var p = 0, free = -1, freeState = null;
  var absent = idComplete && !possiblyKnown(id);
  function found(n, state) {
    var i;
    for (i = 0; i < state.data.items.length; i++) if (state.data.items[i].meta.id === id) {
      location = {id: id, p: n};
      cb(null, {p: n, state: state, index: i}); return true;
    }
    return false;
  }
  // Hints contain no records: reload BOTH slots even for a hot same-ID edit.
  if (location && location.id === id && location.p < c.data.pages) {
    return page(location.p, function (e, state) {
      if (e) return cb(e);
      if (!found(location.p, state)) { location = null; step(); }
    });
  }
  // There are no physical removals: new IDs append to the last bounded page.
  // Bloom collisions take the exact scan; they can never duplicate an ID.
  if (absent && c.data.pages) {
    var tail = c.data.pages - 1;
    return page(tail, function (e, state) {
      if (e) return cb(e);
      if (found(tail, state)) return;
      cb(null, {p: state.data.items.length < PAGE ? tail : -1, state: state.data.items.length < PAGE ? state : null, index: -1});
    });
  }
  function step() {
    if (p >= c.data.pages) {
      idComplete = true; idCatalog = c.seq;
      return cb(null, {p: free, state: freeState, index: -1});
    }
    page(p, function (e, state) {
      if (e) return cb(e);
      var i;
      for (i = 0; i < state.data.items.length; i++) rememberId(state.data.items[i].meta.id);
      if (found(p, state)) return;
      if (state.data.items.length < PAGE && free < 0) { free = p; freeState = state; }
      p++; step();
    });
  }
  step();
}
function token() { serial++; return 't' + new Date().getTime().toString(36) + '_' + serial.toString(36) + '_' + Math.floor(Math.random() * 1000000000).toString(36); }
// Durable bounded candidate journal: register BEFORE creating immutable chunks.
// Both valid metadata slots are roots, not just the newest selected generation.
// No file.list: known token/count descriptors let us delete exact chunk paths.
function gcBlobs(data) {
  var out = [], i, b;
  if (!data || !Array.isArray(data.blobs) || data.blobs.length > GC_MAX) return null;
  for (i = 0; i < data.blobs.length; i++) {
    b = data.blobs[i];
    if (!b || !validKey(b.token) || typeof b.count !== 'number' || b.count < 0 || b.count > 16 || b.count % 1) return null;
    out.push({token: b.token, count: b.count});
  }
  return out;
}
function gcUnion(a, b) {
  var out = a.slice(), i, j;
  for (i = 0; i < b.length; i++) {
    for (j = 0; j < out.length && out[j].token !== b[i].token; j++);
    if (j === out.length) out.push({token: b[i].token, count: b[i].count});
    else if (out[j].count < b[i].count) out[j].count = b[i].count;
  }
  return out;
}
function gcRoots(dir, kind, cb) {
  if (kind === 'orphan') return cb(null, []);
  pair(dir + (kind === 'draft' ? '/d' : '/i'), kind === 'draft' ? {value: null} : {items: []}, function (e, state, roots) {
    if (!e && kind === 'index' && state.seq < 0) return cb(error('Corrupt index page'));
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
      var survivors = [], at = 0, changed = false;
      function next() {
        if (at >= candidates.length) {
          if (!changed) return cb(null, {journal: journal, roots: roots});
          return commit(dir + '/g', journal, {blobs: survivors}, function (ce, current) {
            cb(ce, ce ? undefined : {journal: current, roots: roots});
          });
        }
        var b = candidates[at++], i, n = 0, failed = false;
        for (i = 0; i < roots.length; i++) if (roots[i].token === b.token) { survivors.push(b); return next(); }
        function chunk() {
          if (n >= b.count) {
            if (failed) survivors.push(b); else changed = true;
            return next();
          }
          io('delete', {uri: dir + '/b' + b.token + '_' + n++ + '.txt'}, function (de, value, nativeFailure) {
            if (closed) return cb(error('Store disposed'));
            if (initActive && de) {
              var timeout = false;
              try { var d = Object.getOwnPropertyDescriptor(de, 'timeout'); timeout = !!(d && 'value' in d && d.value === true); } catch (ignored) {}
              if (initNative || timeout) return cb(de);
            }
            if (de) {
              var code;
              try { code = Object.getOwnPropertyDescriptor(de, 'code'); } catch (ignored) {}
              if (!nativeFailure || !code || !('value' in code)) return cb(de);
              if (code.value !== 301) failed = true;
            }
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
  pair(dir + '/g', {blobs: []}, collected);
}
function gcRegister(dir, kind, candidate, cb, roots) {
  gcCollect(dir, kind, function (e, context) {
    if (e) return cb(e);
    var known = gcUnion(gcUnion(gcBlobs(context.journal.data), context.roots), [candidate]);
    if (known.length > GC_MAX) return cb(error('GC cleanup capacity reached; retry cleanup before writing'));
    commit(dir + '/g', context.journal, {blobs: known}, function (ce, current) {
      if (!ce) context.journal = current;
      cb(ce, ce ? undefined : context);
    });
  }, roots ? {roots: roots} : null);
}
function gcFinish(dir, kind, e, value, cb, context) {
  if (fence || closed) return cb(e, value);
  gcCollect(dir, kind, function () { cb(e, value); }, context);
}
function gcRecover(c, cb) {
  var p = 0;
  gcCollect(ROOT, 'draft', function (e) {
    if (e) return cb(e);
    trace('W/recover.draft.ok');
    function step() {
      if (p > c.data.pages || p >= MAX_PAGES) { trace('W/recover.pages.ok'); return cb(null); }
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
  var t = token(), pos = 0, count = 0, context = null;
  function step() {
    if (pos >= text.length) return cb(null, {token: t, count: count, bytes: U.bytes(text), hash: hash(text)}, context);
    var end = U.endBytes(text, pos, CHUNK), chunk = text.slice(pos, end);
    write(dir + '/b' + t + '_' + count + '.txt', chunk, function (e) {
      if (e) return cb(e, undefined, context);
      pos = end; count++; step();
    });
  }
  var chunks = 0, position = 0;
  while (position < text.length) { position = U.endBytes(text, position, CHUNK); chunks++; }
  gcRegister(dir, dir === ROOT ? 'draft' : 'index', {token: t, count: chunks}, function (e, registered) {
    if (e) return cb(e);
    context = registered;
    step();
  }, roots);
}
function blobRead(dir, blob, cb) {
  var n = 0, body = '';
  function step() {
    if (n >= blob.count) {
      if (!U.valid(body) || U.bytes(body) !== blob.bytes || hash(body) !== blob.hash) return cb(error('Corrupt body checksum'));
      return cb(null, body);
    }
    read(dir + '/b' + blob.token + '_' + n + '.txt', function (e, text) {
      if (e) return cb(e);
      body += text;
      if (U.bytes(body) > MAX_BODY) return cb(error('Body exceeds safe load budget; stored file preserved'));
      n++; step();
    });
  }
  step();
}
function two(n) { return n < 10 ? '0' + n : String(n); }
function metadata(id, body, created, revision, pinned, deleted) {
  var date = new Date(created), title = '', pos = 0, end, line;
  while (pos < body.length) {
    end = body.indexOf('\n', pos); if (end < 0) end = body.length;
    line = U.trimWhitespace(body.slice(pos, end));
    if (line) { title = U.sliceBytes(line, 72); break; }
    pos = end + 1;
  }
  return {id: id, created: created, date: date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate()),
    time: two(date.getHours()) + ':' + two(date.getMinutes()), title: title,
    preview: U.sliceBytes(U.compactWhitespace(body), 96),
    pinned: pinned, deleted: deleted, revision: revision, bytes: U.bytes(body)};
}
function checkFlags(x) {
  if (!x || typeof x !== 'object') return false;
  if (x.pinned !== undefined && typeof x.pinned !== 'boolean') return false;
  if (x.deleted !== undefined && typeof x.deleted !== 'boolean') return false;
  return true;
}
function save(input, cb) {
  try{input=clone(input);}catch(e){return deliver(cb,error('Invalid record serialization'));}
  task(cb, function (done) {
    if (!input || typeof input.body !== 'string' || !U.valid(input.body) || !U.hasText(input.body) || (input.id !== undefined && input.id !== '' && !validKey(input.id)) || !checkFlags(input)) return done(error('Invalid or empty record'));
    var size = U.bytes(input.body), id = input.id || ('n' + token());
    if (size > MAX_BODY) return done(error('Body safe-load budget exceeded; no truncation'));
    catalog(function (e, c) {
      if (e) return done(e);
      locate(c, id, function (err, hit) {
        if (err) return done(err);
        var old = hit.index >= 0 ? hit.state.data.items[hit.index].meta : null;
        if (size > 3072 && (!old || size > old.bytes)) return done(error('New text exceeds 3072 UTF-8 byte budget; original preserved'));
        var created = old ? old.created : (input.created === undefined ? new Date().getTime() : input.created);
        if (typeof created !== 'number' || !isFinite(created) || isNaN(new Date(created).getTime())) return done(error('Invalid creation date'));
        var meta = metadata(id, input.body, created, old ? old.revision + 1 : 1,
          input.pinned === undefined ? (old ? old.pinned : false) : input.pinned,
          input.deleted === undefined ? (old ? old.deleted : false) : input.deleted);
        var p = hit.p < 0 ? c.data.pages : hit.p, newPage = p === c.data.pages;
        if (p >= MAX_PAGES) return done(error('Record capacity reached; existing files preserved'));
        var dir = ROOT + '/p' + p;
        function persist(state) {
          blobWrite(dir, input.body, function (writeError, blob, gcContext) {
            if (writeError) return gcFinish(dir, 'index', writeError, undefined, done);
            var oldActiveRoots=recordRoots(state), items = state.data.items;
            if (old) items[hit.index] = {meta: meta, blob: blob}; else items.push({meta: meta, blob: blob});
            commit(dir + '/i', state, {items: items}, function (indexError) {
              if (indexError) return gcFinish(dir, 'index', indexError, undefined, done);
              if (!newPage) { rememberId(id); idCatalog=c.seq; location={id:id,p:p}; gcContext.roots=gcUnion(oldActiveRoots,recordRoots(state)); return gcFinish(dir, 'index', null, clone(meta), done, gcContext); }
              commit(ROOT + '/c', c, {pages: c.data.pages + 1}, function (catError) { if(!catError){rememberId(id);idCatalog=c.seq+1;location={id:id,p:p};gcContext.roots=gcUnion(oldActiveRoots,recordRoots(state));} gcFinish(dir, catError ? 'orphan' : 'index', catError, catError ? undefined : clone(meta), done, catError?null:gcContext); });
            });
          },state.roots||[]);
        }
        if (!newPage) {
          if (hit.state) return persist(hit.state);
          return page(p, function (pe, state) { if (pe) return done(pe); persist(state); });
        }
        // Uncatalogued pages are orphans after interrupted creation; reset ONLY
        // that unreachable page. Never reset a referenced damaged page.
        mkdir(dir, function (me) {
          if (me) return done(me);
          io('delete', {uri: dir + '/i1.json'}, function (de) {
            if (de && de.code !== 301) return done(de);
            io('delete', {uri: dir + '/i0.json'}, function (other) {
              if (other && other.code !== 301) return done(other);
              // Keep a verified empty rollback generation on a new unreachable page.
              write(dir+'/i0.json',seal(0,{items:[]}),function(we){if(we)return done(we);persist({seq:0,data:{items:[]}});});
            });
          });
        });
      });
    });
  },false,true);
}
function load(id, cb) {
  task(cb, function (done) {
    if (!validKey(id)) return done(error('Invalid record ID'));
    catalog(function (e, c) {
      if (e) return done(e);
      locate(c, id, function (err, hit) {
        if (err) return done(err);
        if (hit.index < 0) return done(error('Record not found'));
        var rec = hit.state.data.items[hit.index], m = clone(rec.meta);
        blobRead(ROOT + '/p' + hit.p, rec.blob, function (be, body) { if (be) return done(be); m.body = body; done(null, m); });
      });
    });
  });
}
function flag(id, flags, cb) {
  try{flags=clone(flags);}catch(e){return deliver(cb,error('Invalid flags'));}
  task(cb, function (done) {
    if (!validKey(id) || !checkFlags(flags) || (flags.pinned === undefined && flags.deleted === undefined)) return done(error('Invalid record flags'));
    catalog(function (e, c) {
      if (e) return done(e);
      locate(c, id, function (err, hit) {
        if (err) return done(err);
        if (hit.index < 0) return done(error('Record not found'));
        var m = hit.state.data.items[hit.index].meta;
        if (flags.pinned !== undefined) m.pinned = flags.pinned;
        if (flags.deleted !== undefined) m.deleted = flags.deleted;
        // revision denotes BODY version: flag-only writes do not invalidate anchors.
        commit(ROOT + '/p' + hit.p + '/i', hit.state, hit.state.data, function (ce) { gcFinish(ROOT + '/p' + hit.p, 'index', ce, ce ? undefined : clone(m), done); });
      });
    });
  });
}
function compare(a, b) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.created !== b.created) return a.created > b.created ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
function validFilter(value) {
  var s = String(value);
  return s === 'all' || s === 'pinned' || s === 'trash' || s === 'day' || s === 'month';
}
function dateShape(value, length) {
  // Preserve RegExp ToString and shape-only validation; do not normalize q.
  var s = String(value);
  if (s.length !== length) return false;
  for (var i = 0; i < length; i++) {
    var c = s.charCodeAt(i);
    if (i === 4 || i === 7) { if (c !== 45) return false; }
    else if (c < 48 || c > 57) return false;
  }
  return true;
}
function list(q, cb) {
  try{q=clone(q||{});}catch(e){return deliver(cb,error('Invalid query'));}
  task(cb, function (done) {
    q = q || {}; var filter = q.filter || 'all', offset = q.offset === undefined ? 0 : q.offset, limit = q.limit === undefined ? 6 : q.limit;
    if (typeof offset !== 'number' || offset < 0 || offset % 1 || typeof limit !== 'number' || limit < 1 || limit > 12 || limit % 1 || !validFilter(filter) || (filter === 'day' && !dateShape(q.day || '', 10)) || (filter === 'month' && !dateShape(q.month || '', 7))) return done(error('Invalid list query (limit 1..12)'));
    catalog(function (e, c) {
      if (e) return done(e);
      var queryKey = filter + '|' + (q.day || '') + '|' + (q.month || '') + '|' + c.seq + '|' + limit;
      var resume = listResume && listResume.key === queryKey && listResume.offset === offset ? listResume : null;
      var cursor = resume ? resume.cursor : null, remaining = resume ? offset-resume.offset : offset, total = resume ? resume.total : 0, first = !resume;
      if(resume&&remaining===0&&resume.buffer&&(resume.buffer.length>=limit||(!resume.more&&resume.buffer.length>0))){var cached=resume.buffer.splice(0,limit);resume.offset+=cached.length;if(!resume.more&&!resume.buffer.length)listResume=null;return done(null,{items:cached,hasMore:resume.more||resume.buffer.length>0,total:total});}
      listResume = null;
      function scan() {
        var p = 0, active = 0, failure = null, best = [], wanted = remaining > 0 ? Math.min(12, remaining) : limit+Math.min(12,limit)+1;
        function step() {
          if(failure){if(!active)done(failure);return;}
          if (p >= c.data.pages && !active) {
            if (remaining > 0) {
              if (best.length < wanted) return done(null, {items: [], hasMore: false, total: total});
              remaining -= best.length; cursor = best[best.length - 1]; first = false; return scan();
            }
            var cap=limit+Math.min(12,limit),more=best.length>cap;if(more)best.pop();var buffer=best.splice(limit);
            if ((more||buffer.length) && best.length) listResume = {key:queryKey,offset:offset+best.length,cursor:clone((buffer.length?buffer:best)[(buffer.length?buffer:best).length-1]),total:total,buffer:buffer,more:more};
            return done(null, {items: best, hasMore: more||buffer.length>0, total: total});
          }
          if(p>=c.data.pages||active>=1)return;
          var index=p++;active++;
          page(index, function (pe, state) {
            active--;if(pe){failure=failure||pe;step();return;}
            var i, m, at;
            for (i = 0; i < state.data.items.length; i++) {
              m = state.data.items[i].meta;
              if (filter === 'trash' ? !m.deleted : m.deleted) continue;
              if (filter === 'pinned' && !m.pinned) continue;
              if (filter === 'day' && m.date !== q.day) continue;
              if (filter === 'month' && m.date.slice(0, 7) !== q.month) continue;
              if (first) total++;
              if (cursor && compare(m, cursor) <= 0) continue;
              at = 0; while (at < best.length && compare(best[at], m) <= 0) at++;
              if (at < wanted) { best.splice(at, 0, clone(m)); if (best.length > wanted) best.pop(); }
            }
            state=null;step();
          });
          step();
        }
        step();
      }
      scan();
    });
  });
}
function aux(base, cb) { pair(base, {value: null}, cb); }
function auxiliaryGet(key, cb) {
  task(cb, function (done) {
    if (!validKey(key)) return done(error('Invalid setting key'));
    aux(ROOT + '/s_' + key, function (e, state) { done(e, e ? undefined : clone(state.data.value)); });
  });
}
function auxiliaryPut(key, value, cb) {
  try{value=clone(value);}catch(e){return deliver(cb,error('Invalid setting serialization'));}
  task(cb, function (done) {
    if (!validKey(key) || (value !== null && (!value || typeof value !== 'object'))) return done(error('Invalid setting object'));
    var snapshot;
    try { snapshot = clone(value); if (U.bytes(JSON.stringify(snapshot)) > 1600) return done(error('Setting budget exceeded')); }
    catch (e) { return done(error('Invalid setting serialization')); }
    aux(ROOT + '/s_' + key, function (e, state) {
      if (e) return done(e);
      commit(ROOT + '/s_' + key, state, {value: snapshot}, function (ce) { done(ce, ce ? undefined : clone(snapshot)); });
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
        var d;try{d=value.meta?clone(value.meta):JSON.parse(text);if(value.meta)d.body=text;}catch(pe){return done(error('Corrupt draft'));}done(null,d);
      });
    });
  });
}
function draftPut(value,cb){
  try{value=clone(value);}catch(e){return deliver(cb,error('Invalid draft serialization'));}
  task(cb,function(done){
    if(!value||typeof value!=='object')return done(error('Invalid draft'));
    if(value.body===undefined&&typeof value.text==='string')value.body=value.text;
    if(typeof value.body!=='string'||!U.valid(value.body)||(value.text!==undefined&&value.text!==value.body)||(value.id!==undefined&&value.id!==null&&value.id!==''&&!validKey(value.id)))return done(error('Invalid draft'));
    delete value.text;var text=value.body,meta=clone(value);delete meta.body;
    if(U.bytes(text)>MAX_BODY||U.bytes(JSON.stringify(meta))>3000)return done(error('Draft safe-load metadata budget exceeded; original preserved'));
    aux(ROOT+'/d',function(e,state){if(e)return done(e);blobWrite(ROOT,text,function(be,blob){if(be)return gcFinish(ROOT,'draft',be,undefined,done);commit(ROOT+'/d',state,{value:{blob:blob,meta:meta}},function(ce){gcFinish(ROOT,'draft',ce,ce?undefined:clone(value),done);});});});
  });
}
function draftClear(cb) {
  task(cb, function (done) {
    aux(ROOT + '/d', function (e, state) {
      if (e) return done(e);
      commit(ROOT + '/d', state, {value: null}, function (ce) { gcFinish(ROOT, 'draft', ce, null, done); });
    });
  });
}
function init(cb) {
  if (closed) return deliver(cb, error('Store disposed'));
  if (fence) return deliver(cb, error('Uncertain native write; wait for rollback'));
  if (initActive) {
    if (initWaiters.length >= 8) return deliver(cb, error('Store readiness capacity reached'));
    initWaiters.push(cb); return;
  }
  if (initNative) return deliver(cb, error('Native preparation still pending; retry after completion'));
  if (ready) return deliver(cb, null, true);
  var owner = {active:true,fail:null,timer:null,deadline:new Date().getTime()+TIMEOUT}; initOwner = owner;
  initActive = true; initWaiters = [cb];
  function complete(e, value) {
    if (!owner.active) return;
    owner.active = false; owner.watchLive = false; owner.resume = null; initActive = false; initOwner = null;
    try { if (owner.timer !== null) clearTimeout(owner.timer); } catch (ignored) {}
    owner.timer = null;
    if (e) ready = false;
    if (e) {
      // Logical cancellation never releases native ownership. Existing late-write
      // rollback remains fenced; stale preparation callbacks cannot continue.
      var handles = pending.slice();
      for (var j = 0; j < handles.length; j++) if (handles[j].owner === owner) handles[j]();
    }
    var waiting = initWaiters, thrown = false, first; initWaiters = [];
    trace(e ? 'S/store.failed' : 'S/store.ready');
    for (var i = 0; i < waiting.length; i++) {
      try { deliver(waiting[i], e, value); } catch (caught) { if (!thrown) { thrown = true; first = caught; } }
    }
    if (thrown) throw first;
  }
  trace('S/store.begin');
  task(complete, function (done) {
    owner.fail = done;
    // Independent of individual I/O callbacks and their cancellation handles.
    // Logical expiry retains initNative and the existing uncertain-write fence.
    function watchInit() {
      owner.timer = null;
      if (!owner.active || owner !== initOwner) return;
      var now = new Date().getTime(), remaining = owner.deadline - now;
      if (remaining <= 0) { trace('S/store.watchdog'); done(error('Store initialization timeout')); return; }
      if (owner.resume && now >= owner.resumeAt) {
        var resume = owner.resume; owner.resume = null; resume();
        if (!owner.active) return;
        remaining = owner.deadline - new Date().getTime();
      }
      armWatch(recoveryFallback ? Math.min(250, remaining) : remaining);
    }
    function armWatch(delay) {
      try { owner.timer = setTimeout(watchInit, delay); }
      catch (caught) { owner.timer = null; owner.watchLive = false; done(caughtError(caught)); return; }
      owner.watchLive = owner.timer !== null && owner.timer !== undefined;
      if (!owner.watchLive) { owner.timer = null; done(error('Initialization watchdog unavailable')); }
    }
    armWatch(recoveryFallback ? 250 : TIMEOUT);
    if (!owner.active) return;
    mkdir(ROOT, function (e) {
      if (e) return done(e);
      if (closed) return done(error('Store disposed'));
      trace('S/store.catalog');
      catalog(function (ce, c) {
        if (ce) return done(ce);
        if (closed) return done(error('Store disposed'));
        if (c.seq >= 0) { owner.recovery = true; trace('S/store.recover'); return gcRecover(c, function (ge) { if (closed) ge = ge || error('Store disposed'); if (initNative) ge = ge || error('Native preparation still pending'); if (!ge) ready = true; done(ge, !ge); }); }
        trace('S/store.first.commit');
        commit(ROOT + '/c', c, {pages: 0}, function (we) { if (closed) we = we || error('Store disposed'); if (!we) ready = true; done(we, !we); });
      });
    });
  }, true);
}
function dispose() { listResume = null; closed = true; ready = false; while (pending.length) pending[0](); while(queue.length)deliver(queue.shift().cb,error('Store disposed')); }
export default {init: init, list: list, load: load, save: save, flag: flag,
  draftGet: draftGet, draftPut: draftPut, draftClear: draftClear,
  settingGet: auxiliaryGet, settingPut: auxiliaryPut, dispose: dispose, setTrace: setTrace,
  setSerialReads: setSerialReads, checkInitDeadline: checkInitDeadline};
