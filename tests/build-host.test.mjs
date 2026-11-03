import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('legacy CLT source loader must not inherit package type=module externals classification',()=>{const p=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.ok(!Object.hasOwn(p,'type'));});
