import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync('qa/parity-matrix.mjs','utf8');
test('each RAF readiness check activates its own tab; background-tab RAF cannot be waited in parallel',()=>{
 assert.doesNotMatch(s,/Promise\.all\(\[c\.eval\('document\.fonts/);
 assert.match(s,/await c\.send\('Page\.bringToFront'\)/);assert.match(s,/await b\.send\('Page\.bringToFront'\)/);
});
