import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('fault fixture newline remains valid JavaScript across CDP template interpolation',()=>{
 const source=fs.readFileSync('qa/parity-matrix.mjs','utf8');const m=source.match(/await c\.eval\((`[^`]*\.kb\.insert[^`]*`)\)/);assert.ok(m,'missing real insert fixture');
 const rendered=vm.runInNewContext(m[1],{D:'testPage',JSON});assert.doesNotThrow(()=>new vm.Script(rendered));
 const seen=[];vm.runInNewContext(rendered,{testPage:{kb:{insert:s=>seen.push(s)}}});assert.equal(seen[0],'给明天留一点空白。\n');
});
