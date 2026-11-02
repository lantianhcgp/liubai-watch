import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root='entry/src/main/js/MainAbility/pages/';
for(const p of ['boot','index','read','edit','menu','history','day','trash'])test('native numeric style bindings avoid long decimal string parser: '+p,()=>{const h=fs.readFileSync(root+p+'/'+p+'.hml','utf8');assert.equal(/\}\}px/.test(h),false,'dynamic number must remain native numeric JS value, not decimal+px string');});
