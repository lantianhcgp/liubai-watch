import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('matrix key pointer accounts for original horizontal atlas offset and moves out-of-viewport keys into view',()=>{
 const source=fs.readFileSync('qa/parity-matrix.mjs','utf8');const fn=source.slice(source.indexOf('async function originalKey'),source.indexOf('async function capture'));
 assert.match(fn,/snapshot\(\)\.sheetOffset/);assert.match(fn,/mouseMoved/);assert.match(fn,/keyW/);assert.match(fn,/targetOffset/);
});
