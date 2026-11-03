import fs from 'node:fs';
import { promises as disk } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// synthetic test only: this host stores fixtures in a real, disposable disk directory.
// Faults alter only callback delivery or a selected real file operation, never App defaults.
export function createDiskHost() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'liubai-store-'));
  const calls = [];
  const rules = [];
  const held = [];
  const late = [];
  const prefix = 'internal://app/';
  function local(uri) {
    if (typeof uri !== 'string' || !uri.startsWith(prefix)) throw new Error('invalid test URI');
    const target = path.resolve(directory, uri.slice(prefix.length));
    if (!target.startsWith(directory + path.sep)) throw new Error('unsafe test URI');
    return target;
  }
  function ruleFor(method, options) {
    const rule = rules.find(r => r.method === method && r.remaining > 0 && r.match(options));
    if (rule) rule.remaining--;
    return rule;
  }
  function operation(method, options, work) {
    calls.push({ method, uri: options.uri, length: options.length, position: options.position,
      encoding: options.encoding, append: options.append,
      bytes: typeof options.text === 'string' ? Buffer.byteLength(options.text) : undefined });
    const rule = ruleFor(method, options);
    const kind = rule?.kind;
    if (kind === 'throw') throw new Error('synthetic test only: API throw');
    const fail = (error, code) => {
      options.fail?.(error?.message || String(error), code || (error?.code === 'ENOENT' ? 301 : 300));
      if (kind === 'lateFail') late.push(() => options.success?.({ text: 'late synthetic test only' }));
    };
    const success = value => {
      options.success?.(value);
      if (kind === 'duplicate') {
        options.success?.(value);
        options.fail?.('synthetic test only: duplicate failure', 300);
      }
      if (kind === 'lateDuplicate') late.push(() => {
        options.success?.(value);
        options.fail?.('synthetic test only: late duplicate', 300);
      });
    };
    const perform = () => {
      if (kind === 'fail' || kind === 'lateFail') return fail('synthetic test only: injected I/O failure', rule.code || 300);
      work(local(options.uri), (error, value) => {
        if (error) return fail(error);
        if (kind === 'failAfter') return fail('synthetic test only: write happened before failure', 300);
        if (kind === 'corrupt' && method === 'readText') value = { text: value.text + '!' };
        success(value);
      }, kind);
    };
    if (kind === 'hold') held.push(perform);
    else perform();
  }
  const api = {
    mkdir(options) {
      operation('mkdir', options, (uri, cb) => fs.mkdir(uri, { recursive: options.recursive === true }, cb));
    },
    access(options) {
      operation('access', options, (uri, cb) => fs.access(uri, fs.constants.F_OK, cb));
    },
    writeText(options) {
      operation('writeText', options, (uri, cb, kind) => {
        if (options.append !== false || options.encoding !== 'UTF-8') return cb(new Error('explicit overwrite/UTF-8 required'));
        let text = options.text;
        if (kind === 'partial') text = text.slice(0, Math.max(1, Math.floor(text.length / 2)));
        fs.writeFile(uri, text, 'utf8', error => {
          if (!error && kind === 'partial') return cb(new Error('synthetic test only: partial write'));
          cb(error);
        });
      });
    },
    readText(options) {
      operation('readText', options, (uri, cb) => {
        if (!Number.isInteger(options.length) || options.length < 1 || options.length > 4096 ||
            options.position !== 0 || options.encoding !== 'UTF-8') return cb(new Error('bounded explicit read required'));
        fs.readFile(uri, (error, bytes) => {
          if (error) return cb(error);
          if (bytes.length > options.length) {
            const tooLong = new Error('synthetic test only: read exceeds requested length');
            options.fail?.(tooLong.message, 302);
            return;
          }
          cb(null, { text: bytes.toString('utf8') });
        });
      });
    },
    list(options) {
      operation('list', options, (uri, cb) => fs.readdir(uri, { withFileTypes: true }, (error, entries) => {
        cb(error, { fileList: entries?.map(entry => ({ uri: options.uri + '/' + entry.name, type: entry.isDirectory() ? 'dir' : 'file' })) });
      }));
    },
    get(options) {
      operation('get', options, (uri, cb) => fs.stat(uri, (error, info) => cb(error, info && { length: info.size, type: info.isDirectory() ? 'dir' : 'file' })));
    },
    delete(options) {
      operation('delete', options, (uri, cb) => fs.unlink(uri, cb));
    }
  };
  return {
    api, directory, calls, held, late,
    inject(method, match, kind, remaining = 1, code) { rules.push({ method, match, kind, remaining, code }); },
    release() { if (!held.length) throw new Error('no held operation'); held.shift()(); },
    deliverLate() { const callbacks = late.splice(0); for (const callback of callbacks) callback(); },
    resetLog() { calls.length = 0; },
    async read(uri) { return disk.readFile(local(uri), 'utf8'); },
    async write(uri, text) { await disk.mkdir(path.dirname(local(uri)), { recursive: true }); await disk.writeFile(local(uri), text, 'utf8'); },
    async remove(uri) { await disk.unlink(local(uri)); },
    async files() { return disk.readdir(path.join(directory, 'lb2')); },
    async close() { await disk.rm(directory, { recursive: true, force: true }); }
  };
}
