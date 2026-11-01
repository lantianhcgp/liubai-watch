import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('pan starts on the far side so the complete pointer drag stays within the original keyboard viewport',()=>{const s=fs.readFileSync('qa/parity-matrix.mjs','utf8');assert.match(s,/sx=g\.x\+g\.keyW\*\(move<0\?\.75:\.25\)/);});
