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
test('editor status and pinyin keep the approved line boxes with the native default family',()=>{
 const e=fs.readFileSync(root+'pages/edit/edit.css','utf8');
 for(const name of ['status','composing']){
  const b=e.match(new RegExp('\\.'+name+'\\{([^}]*)\\}'))[1];
  assert.doesNotMatch(b,/font-family:/,'unsupported explicit family clips small editor text');
  assert.match(b,/height:14px;/);
 }
 assert.match(e,/\.status\{[^}]*font-size:11px;/);
 assert.match(e,/\.composing\{[^}]*font-size:13px;/);
 assert.match(e,/\.line\{[^}]*font-family:HYQiHei-65S;/,'body typography is not part of this fix');
});
test('menu hints use the requested native size so two lines fit above the dock',()=>{
 const m=fs.readFileSync(root+'pages/menu/menu.css','utf8');
 const hint=m.match(/\.hint\{([^}]*)\}/)[1];
 assert.doesNotMatch(hint,/font-family:/,'unregistered family expands the reading hint beyond its fixed list box');
 const h=fs.readFileSync(root+'pages/menu/menu.hml','utf8');
 assert.match(h,/height:\{\{hintH-\(quiet\?16:7\)\}\};font-size:\{\{hintFont\}\}/);
 const js=fs.readFileSync(root+'pages/menu/menu.js','utf8');
 assert.match(js,/this\.hintFont=this\.mode==='tool'\?12:this\.mode==='app'\?19\*u:13/);
 assert.match(js,/this\.hintH=this\.mode==='tool'\?60:this\.mode==='app'\?82\*u:53/);
});
test('native fallback repair preserves original reading and progress geometry',()=>{
 const h=fs.readFileSync(root+'pages/read/read.hml','utf8');
 assert.match(h,/<text class="counter"[^>]*left: \{\{ trackX \}\}[^>]*width: \{\{ trackW \}\}/);
 assert.match(h,/top: \{\{ footerY \+ 20 \}\}/);
 assert.doesNotMatch(h,/counterX|counterW/);
 assert.match(css,/\.reading-line,\.reading-weight\{[^}]*font-family:HYQiHei-65S;/,'other native typeface choices remain untouched');
});
