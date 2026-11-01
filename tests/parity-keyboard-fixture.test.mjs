import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('matrix pinyin fixture uses actual public pointer key events rather than nonexistent keyboard key/del API',()=>{
 const s=fs.readFileSync('qa/parity-matrix.mjs','utf8');assert.doesNotMatch(s,/\.kb\.(?:key|del)\(/);assert.match(s,/async function originalKey/);assert.match(s,/Input\.dispatchMouseEvent/);
});
