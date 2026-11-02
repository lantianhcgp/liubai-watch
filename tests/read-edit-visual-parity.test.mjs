import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Approved V3 component/geometry contracts, NOT a pixel-rendering substitute.
// Device/store/dictionary callbacks are boundaries; page, layout, reader,
// keyboard and session logic below are the actual isolated-project sources.
const root = new URL('../entry/src/main/js/MainAbility/', import.meta.url);
const windows = [
  {windowWidth:412, windowHeight:484, screenShape:'rect'},
  {windowWidth:390, windowHeight:390, screenShape:'circle'},
  {windowWidth:454, windowHeight:454, screenShape:'circle'},
  {windowWidth:336, windowHeight:480, screenShape:'rect'}
];
const body = '今日随记\n\n' + '这是一段完整正文，保留原来的每一个字。Hello world.\n'.repeat(32) + '全文最后一句。';
const note = {id:'same-id', body, date:'2026-11-01', time:'08:42', revision:3, created:123, pinned:false};
const text = (path) => fs.readFileSync(new URL(path, root), 'utf8');
function moduleAt(path, imports = {}, timers = {}) {
  const source = text(path)
    .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, name, spec) => 'var ' + name + '=imports[' + JSON.stringify(spec) + '];')
    .replace('export default', 'module.exports=');
  const module = {exports:{}};
  vm.runInNewContext(source, {module, imports, console:{log(){}}, ...timers}, {filename:path});
  return module.exports;
}
function harness(name, info = windows[0], params = {}, options = {}) {
  const timers = new Map(); let timerId = 0;
  const clock = {
    setTimeout(fn) {const id=++timerId; timers.set(id,fn); return id;},
    clearTimeout(id) {timers.delete(id);}
  };
  const layout = moduleAt('common/layout.js');
  const reader = moduleAt('common/reader.js', {'./layout':layout});
  const utf8 = moduleAt('common/utf8.js');
  const session = moduleAt('common/session.js', {'./utf8':utf8});
  // This suite does not assert flash-I/O success. Existing keyboard.test.mjs
  // exercises that real dictionary separately; an unanswered lookup here
  // keeps composition available for page/status and state-preservation tests.
  const keyboard = moduleAt('common/keyboard.js', {
    './lookupDictV5':{lookupDict(){return function(){};}}, './utf8':utf8, './session':session
  }, clock);
  if (options.session) session.set(options.session);
  const calls = {focus:0, nav:[], settings:[], draft:[]};
  const shell = {
    params(){return params;},
    init(p, cb){layout.valid(info); p.info=info; p.w=info.windowWidth; p.h=info.windowHeight; p.ready=true; cb(info);},
    ensure(p, cb){cb(null);}, focus(){calls.focus++;}, clear(){},
    nav(p, page, values){calls.nav.push({page, values});}
  };
  const store = {
    load(id, cb){assert.equal(id,note.id); cb(null,note);},
    settingGet(key, cb){cb(null,null);},
    settingPut(key, value, cb){calls.settings.push({key,value}); cb(null);},
    draftGet(cb){cb(null,options.draft);},
    draftPut(value, cb){calls.draft.push(value); cb(null);}, draftClear(cb){cb(null);}
  };
  const p = moduleAt('pages/'+name+'/'+name+'.js', {
    '../../common/shell':shell, '../../common/layout':layout, '../../common/reader':reader,
    '../../common/store-page':store, '../../common/keyboard':keyboard,
    '../../common/session':session, '../../common/utf8':utf8
  }, clock);
  Object.assign(p,p.data);
  return {p,layout,reader,session,calls,timers,close(){p.onDestroy();}};
}
function tree(source) {
  const root={tag:'root',attrs:{},children:[]}, stack=[root];
  for(const token of source.matchAll(/<\/?[a-z][^>]*>/g)) {
    const raw=token[0];
    if(raw.startsWith('</')) {stack.pop(); continue;}
    const attrs={};
    for(const a of raw.matchAll(/([\w:@-]+)="([^"]*)"/g)) attrs[a[1]]=a[2];
    const n={tag:raw.match(/^<([\w-]+)/)[1],attrs,children:[]};
    stack.at(-1).children.push(n);
    if(!raw.endsWith('/>')) stack.push(n);
  }
  return root;
}
function descendants(n) {return n.children.flatMap(c=>[c,...descendants(c)]);}
function byClass(n, cls) {
  const result=descendants(n).find(x=>(x.attrs.class||'').split(/\s+/).includes(cls));
  assert.ok(result,'missing V3 component '+cls); return result;
}
function byClick(n, action) {
  const result=descendants(n).find(x=>x.attrs['@click']===action);
  assert.ok(result,'missing action '+action); return result;
}
function bind(value, state) {
  return value.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_,expr)=>String(vm.runInNewContext(expr,state)));
}
function visible(n, p) {
  if(!n.attrs.if) return true;
  return vm.runInNewContext(n.attrs.if.replace(/^\{\{|\}\}$/g,''),p);
}
function properties(source) {
  const result={};
  for(const item of source.split(';')) {
    const at=item.indexOf(':'); if(at<0) continue;
    result[item.slice(0,at).trim()]=item.slice(at+1).trim();
  }
  return result;
}
function style(n, css, p = {}) {
  let result={}; const classes=(n.attrs.class||'').split(/\s+/);
  for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if(rule[1].split(',').some(s=>classes.includes(s.trim().replace(/^\./,'')))) Object.assign(result,properties(rule[2]));
  }
  if(n.attrs.style) Object.assign(result,properties(bind(n.attrs.style,p)));
  return result;
}
function near(actual, expected, tolerance=.001) {assert.ok(Math.abs(actual-expected)<=tolerance,actual+' differs from '+expected);}
const editHml=text('pages/edit/edit.hml'), editCss=text('pages/edit/edit.css'), editTree=tree(editHml);
const readHml=text('pages/read/read.hml'), readCss=text('pages/read/read.css'), readTree=tree(readHml);

// The numeric values and wording here are taken from the final renderRead /
// renderEdit / editorGeometry / V3 styles, with Lite heights made explicit.
test('fresh editor is text-first, including a new empty record',()=>{
  const h=harness('edit',windows[0],{action:'new'});
  try {
    assert.equal(h.p.data.open,false,'page default must not open the keyboard');
    h.p.onInit();
    assert.equal(h.p.open,false,'new record must use the approved closed editor');
    assert.equal(h.p.text,''); assert.equal(h.p.kb.snapshot().text,'');
    assert.equal(h.p.title,'写一条');
  } finally {h.close();}
});
test('missing saved open flag defaults closed, explicit draft/session flags still restore',()=>{
  for(const flag of [undefined,false,true]) {
    const saved={id:'same-id',text:'原文',cursor:1,type:2,pinyin:'ni',original:'unchanged'};
    if(flag!==undefined) saved.open=flag;
    for(const kind of ['session','draft']) {
      const h=harness('edit',windows[0],kind==='draft'?{draft:true}:{id:'same-id'}, {[kind]:saved});
      try {h.p.onInit(); assert.equal(h.p.open,flag===true); assert.equal(h.p.text,saved.text); assert.equal(h.p.pinyin,'ni');} finally {h.close();}
    }
  }
});
test('editor header has three closed columns or four separate 46px open actions',()=>{
  const header=byClass(editTree,'header');
  for(const info of windows) {
    const h=harness('edit',info,{id:'same-id'});
    try {
      h.p.onInit();
      for(const open of [false,true]) {
        h.p.open=open; h.p.refresh(true);
        const children=header.children.filter(n=>visible(n,h.p));
        assert.equal(children.length,open?4:3,'collapse/tools must not be a centered glyph pair');
        const styles=children.map(n=>style(n,editCss,h.p));
        for(const i of open?[0,1,2,3]:[0,2]) {
          near(parseFloat(styles[i].width),46); near(parseFloat(styles[i].height),46);
        }
        const remaining=h.p.hw-styles.reduce((sum,s)=>sum+parseFloat(s.width),0);
        near(remaining,open?h.p.hw-184:10);
        // Approved 390px circle has only 3.465px between four 46px targets.
        assert.ok(remaining/(children.length-1)>=(open?3:5)-.001);
        if(!open) assert.equal(styles[1].height,'46px','title column must have an explicit height');
      }
    } finally {h.close();}
  }
  assert.equal(style(byClass(editTree,'title'),editCss)['font-size'],'21px');
  for(const cls of ['cancel','done']) assert.equal(style(byClass(editTree,cls),editCss)['font-size'],'18px');
});
test('editor collapse/tools/delete/enter/nav use exact 23px SVG-derived images, not text glyphs',()=>{
  const expected=[['toggle','back_editor_muted.png'],['tools','dots_editor_warm.png'],['del','delete_key_warm.png'],['enter','enter_key_warm.png'],['prev','back_nav_muted.png'],['next','right_nav_muted.png']];
  for(const [action,file] of expected) {
    const buttons=descendants(editTree).filter(n=>n.attrs['@click']===action && (action!=='toggle'||n.attrs.class==='icon'));
    assert.ok(buttons.length,'missing icon action '+action);
    for(const button of buttons) {
      const image=button.children.find(n=>n.tag==='image');
      assert.ok(image,action+' must use an image, not a Unicode approximation');
      assert.equal(image.attrs.src,'/common/icons/'+file);
      const s=style(image,editCss); assert.equal(s.width,'23px'); assert.equal(s.height,'23px');
    }
  }
  assert.doesNotMatch(editHml,/&#x(?:230[34]|232B|21B5|2022);/i);
});
test('closed nav is three separate dark round buttons, 6px gaps and gold 17px expand copy',()=>{
  const h=harness('edit',windows[0],{id:'same-id'});
  try {
    h.p.onInit();
    const nav=byClass(editTree,'folded-bar'), expand=byClick(nav,'toggle');
    const es=style(expand,editCss,h.p);
    near(parseFloat(es.width),h.p.footW-100);
    assert.equal(es['margin-left'],'6px'); assert.equal(es['margin-right'],'6px');
    assert.equal(es.height,'44px'); assert.equal(es['border-radius'],'22px');
    assert.equal(es['background-color'],'#171b1b');
    const label=style(byClass(nav,'expand-label'),editCss);
    assert.equal(label.color,'#e6c78c'); assert.equal(label['font-size'],'17px');
    for(const action of ['prev','next']) {
      const n=byClick(nav,action), s=style(n,editCss,h.p);
      assert.equal(s.width,'44px'); assert.equal(s.height,'44px'); assert.equal(s['border-radius'],'22px');
      assert.equal(s['background-color'],'#171b1b');
      assert.equal(Number(s.opacity),h.p[action==='prev'?'canPrev':'canNext']?1:.4);
    }
  } finally {h.close();}
});
test('disabled previous button is a real no-op, not a redraw/session update',()=>{
  const h=harness('edit',windows[0],{id:'same-id'});
  try {
    h.p.onInit(); const before=h.session.get(), focus=h.calls.focus;
    h.p.prev();
    assert.equal(h.calls.focus,focus,'disabled navigation must not execute turn/refresh');
    assert.equal(h.session.get(),before,'disabled navigation must not replace the session');
    assert.equal(h.p.canPrev,false); assert.equal(h.p.canNext,true);
  } finally {h.close();}
});
test('disabled next button is a real no-op at the final page',()=>{
  const h=harness('edit',windows[0],{id:'same-id',anchor:body.length});
  try {
    h.p.onInit(); const before=h.session.get(), focus=h.calls.focus;
    h.p.next();
    assert.equal(h.calls.focus,focus,'disabled next must not redraw');
    assert.equal(h.session.get(),before);
    assert.equal(h.p.canPrev,true); assert.equal(h.p.canNext,false);
  } finally {h.close();}
});
test('enabled closed navigation updates availability without moving the input cursor',()=>{
  const h=harness('edit',windows[0],{id:'same-id'});
  try {
    h.p.onInit(); const cursor=h.p.cursor;
    h.p.next(); assert.ok(h.p.anchor>0); assert.equal(h.p.canPrev,true); assert.equal(h.p.cursor,cursor);
    h.p.prev(); assert.equal(h.p.anchor,0); assert.equal(h.p.canPrev,false); assert.equal(h.p.cursor,cursor);
  } finally {h.close();}
});
test('status is always present in the safe shape band with 11px neutral text / 14px height',()=>{
  const status=byClass(editTree,'status');
  for(const info of windows) {
    const h=harness('edit',info,{id:'same-id'});
    try {
      h.p.onInit();
      for(const open of [false,true]) {
        h.p.open=open; h.p.refresh(true);
        assert.equal(visible(status,h.p),true,'closed editor also needs its page/location hint');
        const s=style(status,editCss,h.p), g=h.p.g;
        const band=h.layout.shapeBand(g.w,g.h,g.round,g.bottom+1,g.bottom+15,10);
        near(parseFloat(s.top),g.bottom+1); near(parseFloat(s.left),band.x); near(parseFloat(s.width),band.width);
        assert.equal(s.height,'14px'); assert.equal(s['font-size'],'11px'); assert.equal(s.color,'#adb1a9');
        assert.equal(s['text-align'],'center');
        assert.match(h.p.viewCounter,open?/点正文改位置$/:/点正文定位后输入$/);
      }
    } finally {h.close();}
  }
});
test('composition status is blue 13px, while collapse/expand preserves text/pinyin/cursor/type',()=>{
  const composing=byClass(editTree,'composing');
  const h=harness('edit',windows[0],{}, {session:{id:'',text:'甲乙',cursor:1,type:0,pinyin:'ni',open:true}});
  try {
    h.p.onInit(); const before=h.p.kb.snapshot();
    assert.equal(visible(composing,h.p),true);
    const s=style(composing,editCss,h.p);
    assert.equal(s.color,'#70b5ff'); assert.equal(s['font-size'],'13px'); assert.equal(s.height,'14px');
    assert.equal(h.p.composition,'拼音：ni');
    h.p.toggle(); assert.equal(h.p.open,false); h.p.toggle(); assert.equal(h.p.open,true);
    for(const k of ['text','pinyin','cursor','type']) assert.equal(h.p.kb.snapshot()[k],before[k]);
  } finally {h.close();}
});
test('empty editor has the approved muted placeholder; caret is gold and inset by 2px',()=>{
  const placeholder=byClass(editTree,'placeholder');
  const h=harness('edit',windows[0],{action:'new'});
  try {
    h.p.onInit(); assert.equal(h.p.empty,true); assert.equal(visible(placeholder,h.p),true);
    assert.match(editHml,/&#x5199;&#x4E0B;&#x73B0;&#x5728;&#x7684;&#x5FF5;&#x5934;/i);
    assert.equal(style(placeholder,editCss,h.p).color,'#adb1a9');
    const first=h.p.lines[0]; near(h.p.caretX,first.x); near(h.p.caretY,first.y+2); near(h.p.caretH,first.height-4);
    assert.equal(style(byClass(editTree,'caret'),editCss,h.p)['background-color'],'#e6c78c');
    assert.equal(h.p.kb.snapshot().text,'','placeholder must not become saved body text');
  } finally {h.close();}
});
test('keyboard keeps the original 141px sheet, 25px mode and 33px original space graphic',()=>{
  const mode=byClass(editTree,'type-img'), space=byClass(editTree,'space-symbol');
  for(const info of windows) {
    const h=harness('edit',info,{action:'new'});
    try {
      h.p.onInit(); h.p.toggle();
      assert.equal(h.p.open,true); assert.equal(h.p.image,'/common/keyboard/common/0.png');
      assert.equal(h.p.sheetWidth,570*141/180);
      assert.equal(h.p.spaceImage,'/common/keyboard/'+(info.screenShape==='circle'?'circle':'rect')+'/space.png');
      assert.equal(bind(space.attrs.src,h.p),h.p.spaceImage);
      const ss=style(space,editCss,h.p); assert.equal(ss.height,'33px');
      const ms=style(mode,editCss,h.p); assert.equal(ms.width,'25px'); assert.equal(ms.height,'25px');
      for(const cls of ['key-viewport','key-sheet']) assert.equal(style(byClass(editTree,cls),editCss,h.p).height,'141px');
      for(const cls of ['key-mode','small-key','space']) assert.equal(style(byClass(editTree,cls),editCss,h.p).height,'44px');
      assert.equal(style(byClass(editTree,'small-key'),editCss)['margin-left'],'5px');
      near(h.p.spaceW,h.p.footW-3*44-3*5);
    } finally {h.close();}
  }
});
test('candidate strip has 44px targets, 21px text, blue first word and warm remaining words',()=>{
  const label=byClass(editTree,'candidate-text'), item=byClass(editTree,'candidate');
  const h=harness('edit',windows[0],{action:'new'});
  try {
    h.p.onInit();
    h.p.changed({...h.p.kb.snapshot(),pinyin:'ni',candidates:[{text:'你',matchLength:2},{text:'你好',matchLength:2}]});
    for(let i=0;i<h.p.candidates.length;i++) {
      const c=h.p.candidates[i], p={...h.p,i,c};
      assert.equal(style(label,editCss,p)['font-size'],'21px');
      assert.equal(style(label,editCss,p).color,i===0?'#70b5ff':'#f1f0e8');
      near(parseFloat(style(item,editCss,p).width),Math.max(44,Math.ceil(h.reader.measure(c.text,21))+16));
      assert.equal(style(item,editCss,p).height,'44px');
    }
    assert.equal(style(byClass(editTree,'candidates'),editCss,h.p).height,'44px');
  } finally {h.close();}
});
test('reader date matches V3 month/day, counter is zero-padded and final-page copy is retained',()=>{
  const h=harness('read',windows[0],{id:'same-id'});
  try {
    h.p.onInit(); assert.equal(h.p.date,'11 / 01'); assert.equal(h.p.time,'08:42');
    const total=h.p.total;
    assert.equal(h.p.counter,'01 / '+String(total).padStart(2,'0'));
    while(h.p.page.end<h.p.text.length) h.p.turn(1);
    assert.equal(h.p.counter,'已读完 · '+String(total).padStart(2,'0')+' / '+String(total).padStart(2,'0'));
    assert.equal(h.p.page.end,body.length); assert.ok(h.p.lines.at(-1).text.endsWith('全文最后一句。'));
  } finally {h.close();}
});
test('reader uses 23px warm back / 26px heavy gold dots and 18px/12px date hierarchy',()=>{
  for(const [action,file,size] of [['back','back_warm.png',23],['more','dots_reader_gold.png',26]]) {
    const button=byClick(readTree,action), image=button.children.find(n=>n.tag==='image');
    assert.ok(image); assert.equal(image.attrs.src,'/common/icons/'+file);
    const s=style(image,readCss); assert.equal(s.width,size+'px'); assert.equal(s.height,size+'px');
  }
  assert.equal(style(byClass(readTree,'date'),readCss)['font-size'],'18px');
  assert.equal(style(byClass(readTree,'time'),readCss)['font-size'],'12px');
  assert.equal(style(byClass(readTree,'date'),readCss).height,'20px');
  assert.equal(style(byClass(readTree,'time'),readCss).height,'15px');
  assert.equal(style(byClass(readTree,'time'),readCss)['margin-top'],'1px');
});
test('reader progress is only 27 percent of the window: 12px count, 15px row, 5px gap, 2px track',()=>{
  for(const info of windows) {
    const h=harness('read',info,{id:'same-id'});
    try {
      h.p.onInit(); near(h.p.trackW,info.windowWidth*.27,.51); near(h.p.trackX,(info.windowWidth-h.p.trackW)/2);
      const cs=style(byClass(readTree,'counter'),readCss,h.p), ts=style(byClass(readTree,'track'),readCss,h.p);
      assert.equal(cs['font-size'],'12px'); assert.equal(cs.height,'15px');
      assert.equal(ts.height,'2px'); near(parseFloat(ts.top)-parseFloat(cs.top)-parseFloat(cs.height),5);
      assert.equal(ts['background-color'],'#353b35');
      assert.equal(style(byClass(readTree,'progress'),readCss,h.p)['background-color'],'#e6c78c');
      const expected=h.reader.page(body,0,h.p.g,{});
      assert.deepEqual(JSON.parse(JSON.stringify(h.p.lines)),JSON.parse(JSON.stringify(expected.lines)),'title and body fonts must come from the original engine');
    } finally {h.close();}
  }
});
test('new HML bindings are declared page data; no rich-only font/line CSS or unsupported list attributes',()=>{
  for(const name of ['read','edit']) {
    const h=harness(name), source=name==='read'?readHml:editHml, css=name==='read'?readCss:editCss;
    try {
      assert.doesNotMatch(css,/font-weight\s*:|line-height\s*:|font-family\s*:\s*(?!HYQiHei-65S)/i);
      assert.doesNotMatch(source,/\bscrollpage=|\bdisabled=|class="\{\{/);
      const fields=new Set(Object.keys(h.p.data)), locals=new Set(['i','line','c','in','true','false']);
      for(const expression of source.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
        const stripped=expression[1].replace(/'[^']*'|"[^"]*"/g,'').replace(/\$t\s*\(/g,'(');
        for(const word of stripped.matchAll(/(?<![\w.])\b([A-Za-z][A-Za-z0-9_]*)\b/g)) {
          assert.ok(fields.has(word[1])||locals.has(word[1]),name+' HML field '+word[1]+' must be declared in data');
        }
      }
      const line=byClass(name==='read'?readTree:editTree,name==='read'?'reading-line':'line');
      assert.equal(style(line,css,{line:{x:0,y:0,width:10,height:20,font:22}}).color,'#f1f0e8');
    } finally {h.close();}
  }
});
