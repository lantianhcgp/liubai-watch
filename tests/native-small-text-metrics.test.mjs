import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='entry/src/main/js/MainAbility/';
const css=fs.readFileSync(root+'pages/read/read.css','utf8');
function block(name){return css.match(new RegExp('\\.'+name+'\\{([^}]*)\\}'))[1];}
test('reader small text uses the platform default family so its requested size is applied',()=>{
 // Native SetFont returns without applying size when an explicit family is absent.
 // Omitting font-family retains ProductAdapter's registered platform default.
 for(const name of ['time','counter']){
  assert.doesNotMatch(block(name),/font-family:/,'unsupported explicit family defeats font-size');
  assert.match(block(name),/font-size:12px;/);
  assert.match(block(name),/height:15px;/,'approved line box is enough at the actual requested size');
 }
});
test('native fallback repair preserves original reading and progress geometry',()=>{
 const h=fs.readFileSync(root+'pages/read/read.hml','utf8');
 assert.match(h,/<text class="counter"[^>]*left: \{\{ trackX \}\}[^>]*width: \{\{ trackW \}\}/);
 assert.match(h,/top: \{\{ footerY \+ 20 \}\}/);
 assert.doesNotMatch(h,/counterX|counterW/);
 assert.match(css,/\.reading-line,\.reading-weight\{[^}]*font-family:HYQiHei-65S;/,'other native typeface choices remain untouched');
});
