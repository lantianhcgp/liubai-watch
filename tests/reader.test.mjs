import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../entry/src/main/js/MainAbility/common/',import.meta.url);
const layoutSource=await readFile(new URL('layout.js',root),'utf8');
const layoutURL='data:text/javascript;base64,'+Buffer.from(layoutSource).toString('base64');
const layout=(await import(layoutURL)).default;
let reader, source='';
try {
  source=await readFile(new URL('reader.js',root),'utf8');
  const code=source.replace(/from ['"]\.\/layout(?:\.js)?['"]/g,'from '+JSON.stringify(layoutURL));
  reader=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
} catch (_) {}
const windows=[
  {windowWidth:412,windowHeight:484,screenShape:'rect'},
  {windowWidth:390,windowHeight:390,screenShape:'circle'},
  {windowWidth:454,windowHeight:454,screenShape:'circle'},
  {windowWidth:336,windowHeight:480,screenShape:'rect'}
];
const narrow={w:412,h:484,round:false,top:130,bottom:190,font:24,lineHeight:30,pad:170};
const segmenter=new Intl.Segmenter('en',{granularity:'grapheme'});
function boundaries(text){return new Set([0,text.length,...Array.from(segmenter.segment(text),s=>s.index)]);}
function allPages(text,g,options={}) {
  const pages=[];let start=0;
  do {
    const pg=reader.page(text,start,g,options);pages.push(pg);
    assert.equal(pg.start,start);assert.ok(pg.end>=start&&pg.end<=text.length);
    if(pg.end===text.length)break;
    assert.ok(pg.end>start,'pagination must progress');start=pg.end;
    assert.ok(pages.length<=text.length+2,'bounded pagination');
  } while(true);
  // A newline exactly at the page bottom can require its EOF insertion row.
  if(options.editor && (!text.length || /[\r\n]$/.test(text))) {
    const last=pages.at(-1);
    if(!last.lines.some(l=>l.start===text.length&&l.end===text.length)) pages.push(reader.page(text,text.length,g,options));
  }
  return pages;
}
function validate(text,g,options={}) {
  const pages=allPages(text,g,options),edges=boundaries(text);let rebuilt='';
  for(const pg of pages) {
    let prev=pg.start;
    assert.ok(edges.has(pg.start)&&edges.has(pg.end),'page splits grapheme');
    assert.ok(pg.lines.length<=Math.ceil((g.bottom-g.top)/Math.min(6,g.lineHeight))+1,'line objects bounded by viewport');
    for(const l of pg.lines) {
      for(const k of ['start','end','text','x','y','width','height','font','bold'])assert.ok(k in l,'missing '+k);
      assert.ok(l.start>=prev&&l.end>=l.start&&l.end<=pg.end);prev=l.end;
      assert.ok(edges.has(l.start)&&edges.has(l.end),'line splits grapheme');
      assert.equal(l.text,text.slice(l.start,l.end));assert.ok(!/[\r\n]/.test(l.text));rebuilt+=l.text;
      assert.ok(l.y>=g.top-.001&&l.y+l.height<=g.bottom+.001,'vertical clipping');
      const band=layout.shapeBand(g.w,g.h,g.round,l.y,l.y+l.height,g.pad);
      assert.ok(l.x>=band.x-.001&&l.x+l.width<=band.x+band.width+.001,'unsafe line rectangle');
      assert.ok(reader.measure(l.text,l.font)<=l.width+.001,'text clipping');
      if(g.round)for(const x of [l.x,l.x+l.width])for(const y of [l.y,l.y+l.height])
        assert.ok((x-g.w/2)**2+(y-g.h/2)**2<=(Math.min(g.w,g.h)/2)**2+.01);
      if(l.text&&/[，。！？；：、）》】〕」』…,.!?;:]/.test(l.text[0])) {
        const paragraphStart=Math.max(text.lastIndexOf('\n',l.start-1),text.lastIndexOf('\r',l.start-1))+1;
        assert.equal(l.start,paragraphStart,'closing punctuation begins non-paragraph line');
      }
    }
    assert.equal(text.slice(pg.start,pg.end).replace(/[\r\n]/g,''),pg.lines.map(l=>l.text).join(''),'raw offsets must account for every character');
  }
  assert.equal(rebuilt,text.replace(/[\r\n]/g,''),'full original body retained');
  assert.equal(reader.count(text,g,options),pages.length);
  return pages;
}

test('public reader module is implemented (RED seam)',()=>{
  assert.ok(reader,'reader public API not implemented');
  assert.deepEqual(Object.keys(reader).sort(),['count','hit','locate','measure','page']);
});
test('all devices/fonts cover the last sentence and entire original text',()=>{
  const text='今日随记\n\n'+('这是一段完整正文，不能摘要。Hello world, keep every word!\n下一段保持原文与换行。\n\n').repeat(24)+'这是全文最后一句。';
  for(const info of windows)for(const key of ['compact','normal','large']) {
    const g=layout.reader(info,key),pages=validate(text,g);
    assert.ok(pages.length>1);assert.equal(pages.at(-1).end,text.length);
    assert.ok(pages.at(-1).lines.map(l=>l.text).join('').endsWith('这是全文最后一句。'));
    for(let i=0;i<pages.length;i++) {
      const loc=reader.locate(text,pages[i].start,g,{});
      assert.equal(loc.index,i);assert.deepEqual(loc.page,pages[i]);
      assert.equal(loc.previousStart,i?pages[i-1].start:0);
    }
  }
});
test('reader skips no raw spaces, but repeated newlines cost only a short gap',()=>{
  const text='  正文  \r\n\r\n\n\n\n  后段  \n';
  const g=layout.reader(windows[0]);const pages=validate(text,g);
  assert.equal(pages.length,1);
  assert.equal(pages[0].lines.length,2);
  assert.ok(pages[0].lines[1].y-pages[0].lines[0].y<g.lineHeight*1.5);
  validate('\n'.repeat(20000),g);
});
test('editor can place cursor before every newline and at empty/tail paragraphs',()=>{
  for(const info of windows)for(const open of [true,false]) {
    const g=layout.editor(info,open);
    for(const text of ['', '\n', '\n\n\n', 'alpha\r\n\r\n末句\n', '\n'.repeat(160)]) {
      validate(text,g,{editor:true,cursor:text.length});
      const edges=boundaries(text);
      for(const cursor of edges) {
        const loc=reader.locate(text,cursor,g,{editor:true,cursor});
        assert.ok(loc.page.lines.some(l=>cursor>=l.start&&cursor<=l.end),'cursor is not represented: '+cursor);
        assert.ok(loc.page.lines.some(l=>l.start===cursor) || text[cursor]!=='\n','blank line cursor has its row');
      }
    }
  }
});
test('long words make linear forward progress without keeping the document as lines',()=>{
  const g=layout.reader(windows[1]);const text='W'.repeat(20000);
  const pages=validate(text,g);assert.ok(pages.length>100);
  assert.ok(pages[0].lines.length<=Math.floor((g.bottom-g.top)/g.lineHeight));
  assert.equal(reader.locate(text,text.length,g).page.end,text.length);
});
test('English prefers a whole word and Chinese closing/opening punctuation stays attached',()=>{
  const text='alpha beta gamma delta epsilon';
  const pages=validate(text,{...narrow,font:20});
  const lines=pages.flatMap(p=>p.lines);
  for(const l of lines)if(l.end<text.length)assert.ok(/\s$/.test(l.text)||/^\s/.test(text.slice(l.end)),'ordinary word split');
  validate(('甲乙，丙丁。戊己！？庚辛（壬癸）后续；继续：结束。').repeat(12),narrow);
  validate('，段首允许。\n。下一段首。',narrow);
  for(const l of validate('甲乙（丙丁）甲乙《丙丁》',narrow).flatMap(p=>p.lines))
    assert.ok(!/[（《【〔「『(]$/.test(l.text),'opening punctuation stranded');
});
test('surrogates, combining marks, flags, skin tones, keycaps and ZWJ emoji stay whole',()=>{
  const unit='a\u0301中👩🏽‍💻🇨🇳1️⃣👨‍👩‍👧‍👦क\u093f✈️';
  const text=(unit+' ').repeat(80);
  for(const info of windows)validate(text,layout.reader(info));
  for(const cluster of Array.from(segmenter.segment(unit),s=>s.segment)) {
    const w=reader.measure(cluster,24);
    assert.equal(reader.hit(cluster,0,24),0);
    assert.equal(reader.hit(cluster,w+10,24),cluster.length);
    assert.ok([0,cluster.length].includes(reader.hit(cluster,w*.75,24)));
  }
  const g=layout.reader(windows[0]),emoji='甲a\u0301👩🏽‍💻乙';
  for(let a=0;a<=emoji.length;a++) {
    const pg=reader.page(emoji,a,g);assert.ok(boundaries(emoji).has(pg.start));
    const loc=reader.locate(emoji,a,g);assert.ok(loc.page.start<=a&&loc.page.end>=a);
  }
});
test('anchors clamp safely, layouts change by raw UTF16 offset, EOF never loses final content',()=>{
  const text=('first line\n第二段文字。\n').repeat(30)+'末句';
  for(const info of windows) {
    const g=layout.reader(info),n=reader.count(text,g);
    for(const a of [-100,NaN,undefined,-Infinity])assert.equal(reader.locate(text,a,g).index,0);
    for(const a of [Infinity,text.length+100])assert.equal(reader.locate(text,a,g).index,n-1);
    assert.equal(reader.page(text,-12,g).start,0);assert.equal(reader.page(text,Infinity,g).start,text.length);
    const anchor=Math.floor(text.length*.63);
    for(const key of ['compact','large']) {
      const loc=reader.locate(text,anchor,layout.reader(info,key));
      assert.ok(loc.page.start<=anchor&&loc.page.end>anchor);
    }
  }
});
test('title is independent short first paragraph, once only, fits enlarged line and not editor',()=>{
  const g=layout.reader(windows[0]);
  const text='标题\n\n'+('正文内容。'.repeat(120));
  const pages=validate(text,g),head=pages[0].lines[0];
  assert.equal(head.text,'标题');assert.ok(head.font>g.font&&head.font<=g.font*1.13);assert.equal(head.bold,true);
  for(const l of pages.slice(1).flatMap(p=>p.lines))assert.equal(l.bold,false);
  for(const text of ['正文直接开始，没有独立短标题。'.repeat(60),'短句\n下一段', '只有标题\n\n'])
    for(const l of reader.page(text,0,g).lines){assert.equal(l.bold,false);assert.equal(l.font,g.font);}
  const bodyOnly=reader.page(text,0,g,{editor:true,cursor:0});assert.equal(bodyOnly.lines[0].font,g.font);
  const tiny={...narrow,bottom:narrow.top+narrow.lineHeight};
  assert.equal(reader.page('长标题内容\n\n正文',0,tiny).lines[0].font,tiny.font,'title must not crowd out body/overflow');
});
test('metrics preserve calibrated crab ASCII ratios and choose nearest UTF16 cluster',()=>{
  assert.equal(reader.measure('中',30),30);assert.equal(reader.measure('a',30),17);
  assert.equal(reader.measure('W',30),30);assert.equal(reader.measure(' ',30),9);
  assert.equal(reader.measure('a\u0301',30),reader.measure('a',30));
  assert.equal(reader.measure('👩🏽‍💻',30),30);assert.equal(reader.measure('\r\n',30),0);
  assert.equal(reader.hit('abc',-10,30),0);assert.equal(reader.hit('abc',Infinity,30),3);
  assert.equal(reader.hit('abc',NaN,30),0);
  assert.equal(reader.hit('ab',8,30),0);assert.equal(reader.hit('ab',9,30),1);
});
test('invalid/unfittable geometry throws instead of clipping or inventing device dimensions',()=>{
  const g=layout.reader(windows[0]);
  for(const bad of [undefined,{},{...g,font:0},{...g,lineHeight:0},{...g,top:-1},{...g,bottom:g.top},{...g,w:NaN},{...g,lineHeight:Infinity},{...g,bottom:g.h+1},{...g,pad:g.w}])
    for(const fn of ['page','locate','count'])assert.throws(()=>fn==='count'?reader[fn]('正文',bad):reader[fn]('正文',0,bad));
  const tight={...g,pad:(g.w-8)/2};assert.throws(()=>reader.page('👩🏽‍💻',0,tight),'unsplittable glyph cannot be clipped');
});
test('reader runtime has no browser/node, async, document-wide token/page array or modern builtins',()=>{
  assert.ok(source.length>0);
  assert.ok(!/\b(?:document|canvas|Intl|Promise|Map|Set|Uint\d+Array|TextEncoder|Buffer|async|await)\b/.test(source));
  assert.ok(!/Array\.from|\.codePointAt\(|\.normalize\(|\.fill\(|\.map\(|\.flat\(|\.repeat\(|\.\.\.|\?\.|\?\?/.test(source));
});
