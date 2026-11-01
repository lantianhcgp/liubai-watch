import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';

// A real on-disk @system.file callback host. Faults supplement, never replace,
// real disk I/O. position/length use SDK byte semantics; no implicit mkdir.
export class TestClock {
  constructor() { this.now = 0; this.next = 0; this.timers = new Map(); this.fired = []; }
  setTimeout(fn, ms) {
    const id = ++this.next;
    const fire = () => { if (!this.timers.has(id)) return; this.timers.delete(id); this.fired.push(ms); fn(); };
    this.timers.set(id, {due:this.now + ms, fire, real:setTimeout(fire, ms)});
    return id;
  }
  clearTimeout(id) { const t=this.timers.get(id); if (t) clearTimeout(t.real); this.timers.delete(id); }
  advance(ms) {
    this.now += ms;
    const due=[...this.timers.entries()].filter(([,t])=>t.due<=this.now).sort((a,b)=>a[1].due-b[1].due);
    for (const [id,t] of due) { if (this.timers.has(id)) { clearTimeout(t.real); t.fire(); } }
  }
  dispose() { for (const id of this.timers.keys()) this.clearTimeout(id); }
}
export class FileHost {
  constructor(root) { this.root = root; this.calls = []; this.rules = []; this.pending = []; this.clock = new TestClock(); this.stallWaiters = []; this.idleWaiters = []; this.inFlight = 0; }
  waitForStall() { return this.pending.length ? Promise.resolve() : new Promise(resolve=>this.stallWaiters.push(resolve)); }
  idle() { return this.inFlight === 0 ? Promise.resolve() : new Promise(resolve=>this.idleWaiters.push(resolve)); }
  static async temporary() { return new FileHost(await fs.mkdtemp(path.join(os.tmpdir(), 'liubai-file-'))); }
  local(uri) {
    if (!/^internal:\/\/app\/[a-zA-Z0-9_./-]+$/.test(uri) || uri.length > 128 || uri.includes('..')) throw Object.assign(new Error('invalid URI'), {code:'EINVAL'});
    return path.join(this.root, uri.slice('internal://app/'.length));
  }
  inject(method, match, mode, count = 1) { this.rules.push({method, match, mode, count}); }
  invoke(method, options, disk) {
    this.calls.push({method, uri:options.uri, length:options.length, bytes:options.text === undefined ? undefined : Buffer.byteLength(options.text)});
    const rule = this.rules.find(r => r.count > 0 && r.method === method && (!r.match || r.match.test(options.uri)));
    const mode = rule ? (rule.count--, rule.mode) : '';
    const finish = async () => {
      this.inFlight++;
      let value, error;
      try {
        if (mode === 'fail') throw new Error('injected disk failure');
        if (mode === 'throw') throw new Error('injected native exception');
        if (mode === 'partial') { await fs.writeFile(this.local(options.uri), Buffer.from(options.text).subarray(0, 17)); throw new Error('disk full after partial write'); }
        value = await disk();
        if (mode === 'corrupt' && method === 'writeText') await fs.appendFile(this.local(options.uri), '!');
      } catch (e) { error = e; }
      // User callback exceptions must not be misreported as native I/O errors.
      try {
        if (error) options.fail?.(String(error.message), error.code === 'ENOENT' ? 301 : error.code === 'EINVAL' ? 202 : error.code === 'E2BIG' ? 302 : 300);
        else options.success?.(value);
        options.complete?.();
        if (mode === 'double') options.success?.(value);
      } finally {
        this.inFlight--;
        if (this.inFlight === 0) for (const resolve of this.idleWaiters.splice(0)) resolve();
      }
    };
    if (mode === 'stall') { this.pending.push(finish); for (const resolve of this.stallWaiters.splice(0)) resolve(); return; }
    if (mode === 'throw') throw new Error('injected synchronous native exception');
    void finish();
  }
  async release() { const p = this.pending.splice(0); for (const f of p) await f(); }
  mkdir(o) { this.invoke('mkdir', o, () => fs.mkdir(this.local(o.uri), {recursive:o.recursive === true})); }
  access(o) { this.invoke('access', o, () => fs.access(this.local(o.uri))); }
  get(o) { this.invoke('get', o, async () => { const s = await fs.stat(this.local(o.uri)); return {uri:o.uri,length:s.size,lastModifiedTime:0,type:s.isDirectory()?'dir':'file'}; }); }
  writeText(o) { this.invoke('writeText', o, () => {
    if (Buffer.byteLength(o.text)>4000) throw Object.assign(new Error('write exceeds SDK 4000 bytes'), {code:'E2BIG'});
    return fs.writeFile(this.local(o.uri), o.text, {encoding:o.encoding === 'UTF-8' ? 'utf8' : o.encoding || 'utf8', flag:o.append === true ? 'a' : 'w'});
  }); }
  readText(o) { this.invoke('readText', o, async () => {
    const length = o.length ?? 4096;
    if (length > 4096) throw Object.assign(new Error('read exceeds 4KB'), {code:'E2BIG'});
    const f = await fs.open(this.local(o.uri), 'r');
    try { const b = Buffer.alloc(length); const {bytesRead} = await f.read(b, 0, length, o.position || 0); return {text:b.subarray(0, bytesRead).toString('utf8')}; }
    finally { await f.close(); }
  }); }
  delete(o) { this.invoke('delete', o, () => fs.unlink(this.local(o.uri))); }
  list(o) { this.invoke('list', o, async () => ({fileList:await Promise.all((await fs.readdir(this.local(o.uri))).map(async n => { const uri=o.uri+'/'+n, s=await fs.stat(this.local(uri)); return {uri,length:s.size,type:s.isDirectory()?'dir':'file',lastModifiedTime:0}; }))})); }
  move() { throw new Error('file.move is deliberately unavailable'); }
  async cleanup() { await this.release(); await this.idle(); this.clock.dispose(); await fs.rm(this.root, {recursive:true, force:true}); }
}

export async function moduleFor(host) {
  const base = new URL('../entry/src/main/js/MainAbility/common/', import.meta.url);
  const utf8Source = await fs.readFile(new URL('utf8.js', base), 'utf8').catch(e => e.code === 'ENOENT' ? 'export default {};' : Promise.reject(e));
  const storeSource = await fs.readFile(new URL('store.js', base), 'utf8').catch(e => e.code === 'ENOENT' ? 'export default {};' : Promise.reject(e));
  // No accelerated deadlines for real disk. CLOCK can advance only on explicit
  // fault-test request after waitForStall confirms the native call was reached.
  const CLOCK = {setTimeout:host.clock.setTimeout.bind(host.clock), clearTimeout:host.clock.clearTimeout.bind(host.clock)};
  const context = vm.createContext({console, setTimeout:CLOCK.setTimeout, clearTimeout:CLOCK.clearTimeout, CLOCK});
  const file = new vm.SyntheticModule(['default'], function () { this.setExport('default', host); }, {context});
  const utf8 = new vm.SourceTextModule(utf8Source, {context, identifier:'utf8.js'});
  const store = new vm.SourceTextModule(storeSource, {context, identifier:'store.js'});
  await store.link(spec => spec === '@system.file' ? file : utf8);
  if (utf8.status === 'unlinked') await utf8.link(() => { throw new Error('unexpected import'); });
  await store.evaluate();
  if (utf8.status !== 'evaluated') await utf8.evaluate();
  return {store:store.namespace.default, utf8:utf8.namespace.default};
}
export function call(store, method, ...args) { return new Promise((resolve, reject) => {
  const cb = (e, value) => e ? reject(e instanceof Error ? e : new Error(String(e))) : resolve(value);
  try { store[method](...args, cb); } catch (e) { reject(e); }
}); }
export function checksum(s) { let h=2166136261; for (let i=0;i<s.length;i++) h=((h^s.charCodeAt(i))*16777619)>>>0; return String(h); }
export function seal(seq, data) { const text=JSON.stringify(data); return JSON.stringify({v:1,seq,data,hash:checksum(text)}); }
