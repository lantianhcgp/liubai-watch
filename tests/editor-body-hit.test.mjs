import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const h=fs.readFileSync('entry/src/main/js/MainAbility/pages/edit/edit.hml','utf8');
test('native editor body-only transparent hit surface is not inside compiler for scope or on whole page',()=>{
 assert.match(h,/<div class="body-hit" @click="pickLine"/);
 assert.doesNotMatch(h,/<stack[^>]*@click="pickLine"/);
 assert.doesNotMatch(h,/<text[^>]*for=[^>]*@click="pickLine"/);
});
