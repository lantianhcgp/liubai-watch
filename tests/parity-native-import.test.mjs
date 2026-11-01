import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('matrix cold reload imports genuine .app through existing simulator file input handler',()=>{
 const s=fs.readFileSync('qa/parity-matrix.mjs','utf8');
 assert.doesNotMatch(s,/AppImporter/);
 assert.match(s,/new DataTransfer\(/);
 assert.match(s,/getElementById\('file-input'\)/);
 assert.match(s,/dispatchEvent\(new Event\('change'/);
});
