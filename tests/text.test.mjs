import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const textUrl = new URL('../entry/src/main/js/MainAbility/common/text.js', import.meta.url);
const geometryUrl = new URL('../entry/src/main/js/MainAbility/common/geometry.js', import.meta.url);
const text = existsSync(textUrl) ? (await import(textUrl.href)).default : null;
const geometry = existsSync(geometryUrl) ? (await import(geometryUrl.href)).default : null;
function need(name) {
  assert.ok(text && typeof text[name] === 'function', 'missing text behavior: ' + name);
  return text[name];
}

test('width: glyph metrics use original native W, keep CJK/emoji conservative and never depend on Canvas', () => {
  const width = need('width');
  assert.equal(width('',24),0);
  assert.ok(Math.abs(width('iii',30)-24)<1e-9);
  assert.ok(Math.abs(width('WWW',30)-90)<1e-9);
  assert.ok(Math.abs(width(' ',30)-9)<1e-9);
  assert.ok(Math.abs(width('中',30)-30)<1e-9);
  assert.equal(width('e\u0301',30),width('e',30));
  assert.equal(width('❤\ufe0f',30),width('❤',30));
  assert.equal(width('👩🏽‍💻',30),width('😀',30));
  assert.ok(width('😀',30)>=30);
  assert.ok(width('W中😀',24)>width('iii',24));
});

test('bytes: exact UTF-8, counting astral pairs once and lone surrogates as replacement characters', () => {
  const bytes = need('bytes');
  for (const value of ['', 'abc\n', '今天', 'é Ω 中', '😀', '👩🏽‍💻', '🇨🇳', 'e\u0301', '❤\ufe0f', '\ud800', '\udc00', 'a\ud800b\udc00', 'x\ud83d\ude00y']) {
    assert.equal(bytes(value), Buffer.byteLength(value,'utf8'), JSON.stringify(value));
  }
});

const clusters = ['中','A','😀','👩🏽‍💻','❤\ufe0f','e\u0301\u0327','🇨🇳','1\ufe0f\u20e3','👨‍👩‍👧‍👦','\r\n','文'];
const clusterText = clusters.join('');
const clusterStarts = [0];
for (const glyph of clusters) clusterStarts.push(clusterStarts.at(-1) + glyph.length);

test('boundary: every UTF16 interior floors to its cluster start and endpoints clamp', () => {
  const boundary = need('boundary');
  for (let i=0;i<clusters.length;i++) {
    for (let at=clusterStarts[i];at<clusterStarts[i+1];at++) {
      assert.equal(boundary(clusterText,at),clusterStarts[i],JSON.stringify(clusters[i])+':'+at);
    }
  }
  assert.equal(boundary(clusterText,clusterText.length),clusterText.length);
  assert.equal(boundary(clusterText,-2),0);
  assert.equal(boundary(clusterText,9999),clusterText.length);
  assert.equal(boundary(clusterText,NaN),0);
  assert.equal(boundary('',0),0);
});

test('move: one whole glyph per operation, never splits astral, ZWJ, flag, variation or combining marks', () => {
  const move = need('move');
  let at = 0;
  for (let i=1;i<clusterStarts.length;i++) {
    at=move(clusterText,at,1);
    assert.equal(at,clusterStarts[i]);
  }
  assert.equal(move(clusterText,at,1),clusterText.length);
  for (let i=clusterStarts.length-2;i>=0;i--) {
    at=move(clusterText,at,-1);
    assert.equal(at,clusterStarts[i]);
  }
  assert.equal(move(clusterText,at,-1),0);
  assert.equal(move(clusterText,clusterStarts[3],100),clusterStarts[4],'delta magnitude is not multi-character jump');
  assert.equal(move(clusterText,clusterStarts[3],-100),clusterStarts[2]);
  assert.equal(move(clusterText,clusterStarts[3]+2,0),clusterStarts[3]);
});

test('insert: entire candidate is accepted atomically at a legal UTF16 cluster boundary', () => {
  const insert = need('insert');
  const result = insert('中😀文',2,'今天',3072);
  assert.deepEqual(result,{ok:true,text:'中今天😀文',cursor:3,error:''});
  const mark = insert('A😀B',1,'e\u0301',3072);
  assert.deepEqual(mark,{ok:true,text:'Ae\u0301😀B',cursor:3,error:''});
});


test('over-budget insert preserves original cursor and text atomically',()=>{const s='中'.repeat(1022),r=need('insert')(s,13,'你好世界',3072);assert.equal(r.ok,false);assert.equal(r.text,s);assert.equal(r.cursor,13);assert.ok(r.error);assert.equal(text.insert('😀',2,'😀',8).ok,true);assert.equal(text.insert('😀',2,'😀',7).ok,false);});
test('title and preview follow first nonblank line and preserve multi-paragraph body',()=>{assert.equal(need('title')('\n  标题  \n\n后文'),'标题');assert.equal(need('preview')('标题\n\n正文\n后段'),'正文 后段');});
const long=('短标题\n\n'+('今天记下一小段文字，Keep a small record of the day. 😀\n\n').repeat(18));
for(const info of [{windowWidth:412,windowHeight:484,screenShape:'rect'},{windowWidth:454,windowHeight:454,screenShape:'circle'},{windowWidth:390,windowHeight:390,screenShape:'circle'},{windowWidth:336,windowHeight:480,screenShape:'rect'}])for(const size of ['compact','normal','large'])test('pagination complete source coverage and safe full glyphs '+JSON.stringify(info)+' '+size,()=>{const paginate=need('paginate'),g=geometry.reader(info,size);let at=0,end=0,pages=0,count=0;while(at>=0){const m=paginate(long,g,at,false,0);assert.equal(m.start,end);assert.equal(m.page,pages);assert.ok(m.lines.length>0);assert.ok(m.lines.length<18);assert.ok(m.end>m.start);for(const l of m.lines){assert.ok(l.y>=g.top&&l.y+l.height<=g.bottom+.01);assert.ok(text.width(l.text,l.font)<=l.width+1);assert.equal(text.boundary(long,l.start),l.start);assert.equal(text.boundary(long,l.end),l.end);}end=m.end;count=m.count;at=m.next;pages++;assert.ok(pages<80);}assert.equal(end,long.length);assert.equal(pages,count);const middle=paginate(long,g,Math.floor(long.length/2),false,0);assert.ok(middle.start<=middle.anchor&&middle.end>middle.anchor);});
test('empty editor and cursor on blank paragraph retain visible complete caret line',()=>{const p=need('paginate');const g=geometry.editor({windowWidth:412,windowHeight:484,screenShape:'rect'},true);const a=p('',g,0,true,0);assert.equal(a.count,1);assert.equal(a.lines.length,1);assert.ok(a.lines[0].blank);assert.equal(a.next,-1);const b=p('a\n\ntext',g,2,true,2);assert.ok(b.lines.some(l=>l.start===2&&l.blank&&l.height===g.lineHeight));});
