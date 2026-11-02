import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const acorn = require('/data/data/com.termux/files/home/liubai-watch-sign-private/signer/node_modules/acorn');
const here = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.join(here, 'regexp-control.mjs');
// Before implementation, test the real identity baseline rather than a missing import.
const transformForLite = fs.existsSync(modulePath) ? (await import(pathToFileURL(modulePath))).transformForLite : text => ({code: text, replacements: []});
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type) fn(node);
  for (const [name, value] of Object.entries(node)) {
    if (name === 'loc') continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, fn));
    else if (value && typeof value === 'object') walk(value, fn);
  }
}
function regexCount(text) {
  let count = 0;
  walk(acorn.parse(text, {ecmaVersion: 5}), n => {if (n.regex) count++;});
  return count;
}
function fixture(name) { return fs.readFileSync(path.join(here, 'original', name), 'utf8'); }

// Seam: regex-only translation of the actual failed startup-page compiler JS.
// Independent oracle: the original expression executed by Node's own RegExp.
test('all real startup regex calls translate without remaining regex and preserve string-domain behavior', () => {
  const expressions = new Set();
  let total = 0;
  for (const name of ['liubai-boot.js', 'liubai-index.js']) {
    const original = fixture(name);
    const result = transformForLite(original);
    assert.equal(regexCount(result.code), 0, `${name} still contains parser-rejected regex`);
    const before = regexCount(original);
    assert.equal(result.replacements.length, before, 'Every literal accounted for');
    total += before;
    walk(acorn.parse(original, {ecmaVersion: 5}), node => {
      if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return;
      const callee = node.callee;
      if (callee.object.regex && callee.property.name === 'test') expressions.add(`return ${original.slice(callee.object.start, callee.object.end)}.test(value);`);
      if (callee.property.name === 'replace' && node.arguments[0]?.regex) expressions.add(`return value.replace(${original.slice(node.arguments[0].start, node.arguments[0].end)}, ${original.slice(node.arguments[1].start, node.arguments[1].end)});`);
    });
  }
  assert.equal(total, 11, 'Pinned real fixture changed');
  const whitespace = ['\t','\n','\v','\f','\r',' ','\u00a0','\u1680','\u2000','\u2001','\u2002','\u2003','\u2004','\u2005','\u2006','\u2007','\u2008','\u2009','\u200a','\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff'];
  const values = ['', 'a', 'A_9-', 'x'.repeat(40), 'x'.repeat(41), 'a/b', 'a\nb', 'a\0b',
    'Corrupt', 'Corrupt GC metadata', 'not corrupt', 'all', 'pinned', 'trash', 'day', 'month', 'all\n',
    '2026-11', '2026-11-02', '2026-1-02', '2026-00-00', '0000-99-99', '2026-11\n', '２０２６-11',
    ' \tTitle\n\nBody \n', '\ud83d\ude00', '\u180e', '\u200b', '\ud800',
    undefined, null, 0, false, [], ['all']];
  for (const ws of whitespace) values.push(ws, ws + 'x' + ws, 'x' + ws + ws + 'y');
  let seed = 78231;
  const alphabet = ['a','Z','0','9','_','-','/','|','中','\t','\n',' ','\u00a0','\u200b','\u2028','\ufeff'];
  for (let i = 0; i < 250; i++) {
    let text = '';
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const length = seed % 52;
    for (let j = 0; j < length; j++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      text += alphabet[seed % alphabet.length];
    }
    values.push(text);
  }
  let checked = 0;
  for (const body of expressions) {
    const original = `(function(){${body}})()`;
    const replacement = transformForLite(original).code;
    assert.equal(regexCount(replacement), 0);
    for (const value of values) {
      let before, after, beforeError, afterError;
      try {before = vm.runInNewContext(original, {value});} catch (e) {beforeError = e.name;}
      try {after = vm.runInNewContext(replacement, {value});} catch (e) {afterError = e.name;}
      assert.equal(afterError, beforeError, JSON.stringify({body, value, beforeError, afterError}));
      assert.equal(after, before, JSON.stringify({body, value, before, after}));
      checked++;
    }
  }
  console.log(`Independent expression parity comparisons: ${checked}`);
});
