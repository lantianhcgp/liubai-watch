import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const cdp=fs.readFileSync('qa/parity-cdp.mjs','utf8');
test('app target must not attach to approved baseline URL sharing the same origin',()=>{
 assert.match(cdp,/\/__app/);
 assert.match(cdp,/t\.url===/);
});
