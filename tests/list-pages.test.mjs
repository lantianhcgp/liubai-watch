import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Read-only baseline differential run preserves RED evidence without touching the working tree.
const base = process.env.LB_SOURCE_BASE
  ? new URL('file://' + process.env.LB_SOURCE_BASE.replace(/\/$/,'') + '/')
  : new URL('../entry/src/main/js/MainAbility/', import.meta.url);
const approved = fs.readFileSync(new URL('../docs/approved-v3/approved.html',import.meta.url), 'utf8');
const windows = [
  ['fit3', {windowWidth:412, windowHeight:484, screenShape:'rect'}],
  ['round454', {windowWidth:454, windowHeight:454, screenShape:'circle'}],
  ['round390', {windowWidth:390, windowHeight:390, screenShape:'circle'}],
  ['rect336', {windowWidth:336, windowHeight:480, screenShape:'rect'}]
];
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function close(actual, expected, label) {
  assert.equal(typeof actual, 'number', label + ' must be numeric');
  assert.ok(Number.isFinite(actual), label + ' must be finite');
  assert.ok(Math.abs(actual - expected) < 1e-8, label + ': ' + actual + ' vs V3 ' + expected);
}
function originalFunction(name, next) {
  const at = approved.indexOf('function ' + name + '(');
  const end = approved.indexOf('function ' + next + '(', at);
  assert.ok(at >= 0 && end > at);
  return approved.slice(at, end);
}
const original = vm.runInNewContext(`
${approved.slice(approved.indexOf('const devices='), approved.indexOf('\n', approved.indexOf('const devices=')))}
const ui={device:'fit3',page:'home'};
let css={}; const node={style:{setProperty(k,v){css[k]=parseFloat(v)}},className:''};
const $=()=>node; function fitFrame(){}
${originalFunction('layoutV2','fitFrame')}
${originalFunction('shapeBand','readerGeometry')}
({home(key){ui.device=key;css={};layoutV2();return css}})
`);

function fixtures(count=7) {
  return Array.from({length:count}, (_, i) => ({
    id:'test-note-' + i, title:'记录首行 ' + i, preview:'第二段预览 ' + i,
    date:i < 5 ? '2031-01-02' : '2030-12-31', time:'10:0' + i,
    createdAt:100-i, version:i+1, pinned:i===1, deleted:i===6, bytes:48
  }));
}
function fixtureStore(options={}) {
  const records = fixtures(options.count);
  const calls = {init:0, cancel:0, list:[], days:[], read:[], flag:[], draft:0};
  const pending = {init:[], list:[], days:[], read:[], flag:[], draft:[]};
  const store = {
    init(cb) {
      calls.init++;
      if (options.deferInit) pending.init.push(cb); else cb(options.initError || null);
      return () => {calls.cancel++;};
    },
    initState() { return {pending:options.deferInit===true, phase:options.initPhase || 'MK_DIR_CALL', waiters:options.deferInit?1:0}; },
    list(filter, offset, limit, cb) {
      calls.list.push({filter:plain(filter), offset, limit});
      const answer = () => {
        let rows = records.filter(r => r.deleted === filter.deleted);
        if (filter.pinned === true) rows = rows.filter(r => r.pinned);
        if (filter.day) rows = rows.filter(r => r.date === filter.day);
        cb(options.listError || null, {rows:rows.slice(offset,offset+limit), more:offset+limit<rows.length, total:rows.length});
      };
      if (options.deferList) pending.list.push(answer); else answer();
    },
    days(month, cb) {
      calls.days.push(month);
      const answer = () => cb(options.daysError || null, {rows:options.dayRows || [
        {day:month+'-02', count:2, title:'当天首行'},
        {day:month+'-01', count:1, title:'前一天首行'},
        {day:month+'-03', count:1, title:'第三条首行'},
        {day:month+'-04', count:1, title:'第四条首行'}
      ], total:(options.dayRows || [1,2,3,4]).length});
      if (options.deferDays) pending.days.push(answer); else answer();
    },
    read(id, cb) {
      calls.read.push(id);
      const answer = () => {
        const r = records.find(r => r.id === id);
        cb(options.readError || null, r ? {...r,text:'原始保存正文\n\n绝不使用预览代替正文'} : null);
      };
      if (options.deferRead) pending.read.push(answer); else answer();
    },
    setFlag(id, field, value, cb) {
      calls.flag.push({id,field,value});
      const answer = () => {
        const r = records.find(r => r.id === id);
        if (!options.flagError && r) { r[field]=value; r.version++; }
        cb(options.flagError || null, r);
      };
      if (options.deferFlag) pending.flag.push(answer); else answer();
    },
    loadDraft(cb) {
      calls.draft++;
      const answer = () => cb(options.draftError || null, options.draft || null);
      if (options.deferDraft) pending.draft.push(answer); else answer();
    }
  };
  return {store,calls,pending,records,options};
}
function harness(options={}) {
  const seam = fixtureStore(options);
  const routerCalls=[], logs=[], timers=new Map(), cache=new Map();
  let nextTimer=1, app=null;
  function Clock(...args) { return args.length ? new Date(...args) : new Date(2031,0,2,10,0,0); }
  Clock.now = () => new Date(2031,0,2,10,0,0).getTime();
  const deviceCalls=[];
  const systemFile={identity:'test file API seam'};
  const systemDevice={getInfo(request) {
    deviceCalls.push(request);
    if (!options.deferDevice) {
      if (options.deviceError) request.fail('offline',300);
      else request.success(options.info || windows[0][1]);
    }
  }};
  const systemRouter={replace(value) {routerCalls.push({uri:value.uri,args:plain(app.getState().params)});}};
  function load(relative) {
    const key = new URL(relative,base).pathname;
    if (cache.has(key)) return cache.get(key);
    const file = new URL(relative,base);
    assert.ok(fs.existsSync(file), relative + ' implementation missing');
    let src = fs.readFileSync(file,'utf8');
    const deps={};
    src=src.replace(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm, (_whole,alias,dep) => {
      if (dep==='@system.device') deps[alias]=systemDevice;
      else if (dep==='@system.file') deps[alias]=systemFile;
      else if (dep==='@system.router') deps[alias]=systemRouter;
      else if (dep==='@system.storage') deps[alias]={get(o){if(options.storageThrow)throw new Error('deliberate optional font API exception');if(o.success)o.success(o.default)},set(o){if(o.success)o.success()}};
      else if (dep.endsWith('/store.js') || dep==='./store.js') deps[alias]=function(fileApi) {
        assert.equal(fileApi,systemFile,'only index creates the store from the real file API import');
        seam.calls.factories=(seam.calls.factories || 0)+1;
        return seam.store;
      };
      else deps[alias]=load(new URL(dep,file).pathname.slice(base.pathname.length));
      return 'var ' + alias + ' = __deps.' + alias + ';';
    });
    src=src.replace('export default','globalThis.result =');
    const globals={__deps:deps, Date:Clock, console:{info(...a){logs.push(a.join(' '));},error(...a){logs.push(a.join(' '));}},
      setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
    if (app) globals.$app={$def:app};
    const ctx=vm.createContext(globals);
    vm.runInContext(src,ctx,{filename:file.pathname});
    cache.set(key,ctx.result);
    return ctx.result;
  }
  app=load('app.js');app.onCreate();
  if (options.existingStore) app.getState().store=seam.store;
  function page(name) {
    const view=load('pages/'+name+'/'+name+'.js');
    Object.assign(view,plain(view.data));
    const rotations=[];
    view.$refs={crown:{rotation(value){rotations.push(plain(value));}}};
    view.rotations=rotations;
    return view;
  }
  function flushTimers() { const tasks=[...timers.values()];timers.clear();tasks.forEach(fn=>fn()); }
  function params(uri,args={}) {app.getState().params={uri,...args};}
  return {...seam,load,page,params,app,routerCalls,logs,timers,flushTimers,deviceCalls};
}

test('list layout preserves V3 anchors, full row glyph boxes, and identical four-page docks on measured windows', () => {
  const env=harness();
  const list=env.load('common/list-view.js');
  const geometry=env.load('common/geometry.js');
  for (const [key,info] of windows) {
    const css=original.home(key), g=geometry.home(info);
    for (const mode of ['index','history','day','trash']) {
      const page=list.data(mode);page.info=info;
      list.layout(page,mode);
      for (const field of ['hy','hx','hw','hit','newY','newH','sectionY','contentX','contentW','dockX','dockY','dockW']) {
        close(page[field],g[field],key+'.'+mode+'.'+field);
      }
      const expectedY=mode==='index' ? css['--list-y'] : mode==='history' ? css['--history-y'] : css['--read-y'];
      const expectedH=mode==='index' ? css['--list-h'] : mode==='history' ? css['--history-h'] : css['--read-h'];
      close(page.listY,expectedY,key+'.'+mode+'.listY');
      close(page.listH,expectedH,key+'.'+mode+'.listH');
      assert.ok(page.slots >= 2 && page.slots <= 8,key+'.'+mode+' bounded row slots');
      if (mode === 'index') assert.equal(page.slots,g.slots,key+' original home slots');
      if (mode === 'history') close(page.rowH,65*info.windowWidth/412,key+' history row height');
      if (mode === 'day' || mode === 'trash') {
        assert.equal(page.slots,Math.min(8,Math.floor(page.listH/page.rowH)),key+' full reader viewport');
        if (key === 'fit3') assert.ok(page.slots > 3,key+' day/trash must not inherit home three-row cap');
      }
      assert.ok(page.slots*page.rowH<=page.listH+1e-8,key+'.'+mode+' no half final row');
      assert.ok(page.rowH>=page.titleH+page.metaH+page.lineGap+1,key+'.'+mode+' no cropped glyph line');
      assert.ok(page.rowFont>=20,key+'.'+mode+' readable title, not shrunken to fake success');
      assert.ok(page.metaFont>=13,key+'.'+mode+' readable metadata');
      assert.equal(page.dockFont,Math.max(16,18*info.windowWidth/412));
      close(page.brandW,58*info.windowWidth/412,key+' native brand width');
      close(page.brandH,37*info.windowWidth/412,key+' native brand height');
      close(page.writeW,69*info.windowWidth/412,key+' native write-note width');
      close(page.writeH,34*info.windowWidth/412,key+' native write-note height');
      if (mode==='index') close(page.slots*page.rowH,page.listH,key+'.index complete page fills original viewport');
      if (key==='fit3') assert.ok(page.dockY+page.hit<=410);
    }
  }
});

test('list layout refuses zero or unknown device geometry instead of creating a pretend screen', () => {
  const list=harness().load('common/list-view.js');
  for (const info of [{}, {windowWidth:0,windowHeight:484,screenShape:'rect'}, {windowWidth:412,windowHeight:484}]) {
    const page=list.data('index');page.info=info;
    assert.throws(()=>list.layout(page,'index'),/device|screen|window|dimension/i);
    assert.equal(page.ready,false);
    assert.equal(page.w,0);
  }
});

test('index creates one real file-backed shared store and activates only once until hidden', () => {
  const env=harness(), page=env.page('index');
  page.onInit();page.onShow();
  assert.equal(env.deviceCalls.length,1);
  assert.equal(env.calls.factories,1);
  assert.equal(env.calls.init,1);
  assert.equal(env.app.getState().store,env.store);
  assert.equal(page.ready,true);
  assert.equal(page.rows.length,3);
  assert.equal(page.total,6);
  assert.equal(page.offset,0);
  assert.deepEqual(plain(env.calls.list[0]),{filter:{deleted:false},offset:0,limit:3});
  assert.equal(env.calls.read.length,0,'reader, not list previews, loads the body');
  assert.equal(page.today,'2031-01-02');
  assert.equal(page.dateText,'01 / 02','approved home date keeps two digits');
  env.flushTimers();
  assert.ok(page.rotations.some(r=>r.focus===true));
  page.onHide();
  assert.equal(page.active,false);
  assert.equal(env.timers.size,0);
  assert.equal(page.rotations.at(-1).focus,false);
  page.onShow();
  assert.equal(env.deviceCalls.length,2);
  assert.equal(env.calls.factories,1,'never creates a second repository');
  page.onDestroy();
  assert.equal(page.rows.length,0);
});

test('index paginates real rows, respects both edges, and pin toggle never means unpinned-only', () => {
  const env=harness(), page=env.page('index');page.onInit();
  page.turn(1);
  assert.equal(page.offset,3);
  assert.equal(page.more,false);
  assert.equal(page.rows.length,3);
  const n=env.calls.list.length;
  page.turn(1);
  assert.equal(env.calls.list.length,n,'no request past the last page');
  page.turn(-1);page.turn(-1);
  assert.equal(page.offset,0);
  page.togglePinned();
  assert.equal(page.pinnedOnly,true);
  assert.equal(page.total,1);
  assert.ok(page.rows.every(row=>row.pinned));
  assert.deepEqual(plain(env.calls.list.at(-1).filter),{deleted:false,pinned:true});
  page.togglePinned();
  assert.equal(page.pinnedOnly,false);
  assert.deepEqual(plain(env.calls.list.at(-1).filter),{deleted:false});
  assert.equal(page.total,6);
});

test('lists expose real swipe and crown pagination with boundary reset and post-update focus', () => {
  const env=harness(), page=env.page('index');page.onInit();
  page.onSwipe({direction:'left'});
  assert.equal(page.offset,0);
  page.onSwipe({direction:'up'});
  assert.equal(page.offset,3);
  page.onSwipe({direction:'down'});
  assert.equal(page.offset,0);
  page.crownChange({value:45});
  assert.equal(page.offset,3);
  page.crownChange({value:0});
  assert.equal(page.crownValue,50);
  const n=env.calls.list.length;
  page.crownChange({value:50});
  assert.equal(env.calls.list.length,n,'programmatic crown center is not an extra backward turn');
  env.flushTimers();
  assert.equal(page.rotations.at(-1).focus,true);
});

test('history approved day number stays two digits',()=>{const env=harness(),page=env.page('index');page.onInit();page.onHide();env.app.getState().params={month:'2031-01'};const history=env.page('history');history.onInit();assert.equal(history.rows[0].number,'04');});
test('row titles use only the first saved line and metadata is date/time plus preview, never full body', () => {
  const env=harness();
  env.records[0].title='标题第一行\n第二行不进入标题';
  env.records[0].preview='预览第一行\n更多预览';
  const page=env.page('index');page.onInit();
  assert.equal(page.rows[0].title,'标题第一行');
  assert.match(page.rows[0].meta,/01\s*\/\s*02/);
  assert.match(page.rows[0].meta,/10:00/);
  assert.match(page.rows[0].meta,/预览第一行/);
  assert.ok(!page.rows[0].meta.includes('\n'));
  assert.ok(!Object.hasOwn(page.rows[0],'text'));
  page.openRow(page.rows[0]);page.openRow(page.rows[0]);
  assert.equal(env.routerCalls.length,1);
  assert.equal(env.routerCalls[0].uri,'pages/read/read');
  assert.equal(env.routerCalls[0].args.id,'test-note-0');
  assert.equal(env.routerCalls[0].args.source,'index');
});

test('new entry loads the real draft before navigation; no draft opens a fresh keyboard immediately', () => {
  const env=harness(), page=env.page('index');page.onInit();
  env.app.getState().editor={text:'旧编辑器对象不能污染新建'};
  page.newNote();page.newNote();
  assert.equal(env.calls.draft,1);
  assert.equal(env.routerCalls.length,1);
  assert.equal(env.routerCalls[0].uri,'pages/edit/edit');
  assert.deepEqual(env.routerCalls[0].args,{uri:'pages/edit/edit',id:null,open:true});
  assert.equal(env.app.getState().editor,null);
});

test('new entry restores the exact saved draft state instead of reconstructing from a preview', () => {
  const draft={id:'draft-id',text:'完整草稿\n\n仍有空行',cursor:4,open:false,layout:'abc',dirty:true};
  const env=harness({draft}), page=env.page('index');page.onInit();page.newNote();
  assert.equal(env.app.getState().editor,draft);
  assert.equal(env.routerCalls[0].args.restore,true);
  assert.equal(env.routerCalls[0].uri,'pages/edit/edit');
});

test('draft and storage failures never fabricate a new note or a successful list', () => {
  const init=harness({initError:'E_IO'}), first=init.page('index');first.onInit();
  assert.equal(init.calls.list.length,0);
  assert.equal(init.routerCalls.length,1);
  assert.equal(init.routerCalls[0].uri,'pages/menu/menu');
  assert.equal(init.routerCalls[0].args.mode,'error');
  assert.equal(init.routerCalls[0].args.kind,'read');
  assert.equal(init.routerCalls[0].args.error,'E_IO','first read failure must not discard its exact diagnostic code');
  const env=harness({draftError:'E_DRAFT'}), page=env.page('index');page.onInit();page.newNote();
  assert.equal(env.routerCalls.length,0);
  assert.equal(page.busy,false);
  assert.equal(page.error,true);
  assert.ok(page.message.length>0);
});

test('all delayed index device/init/list/draft callbacks are inert after hide or destroy', () => {
  for (const kind of ['Device','Init','List','Draft']) {
    const env=harness({['defer'+kind]:true}), page=env.page('index');page.onInit();
    if (kind==='Draft') page.newNote();
    page.onDestroy();
    const count=env.calls.list.length;
    if (kind==='Device') env.deviceCalls[0].success(windows[0][1]);
    else env.pending[kind.toLowerCase()].forEach(fn=>fn());
    assert.equal(page.rows.length,0,kind+' stale rows');
    assert.equal(env.routerCalls.length,0,kind+' stale navigation');
    assert.equal(env.calls.list.length,count,kind+' stale follow-up');
    assert.equal(env.timers.size,0,kind+' stale crown focus');
    if (kind==='Draft') assert.equal(env.app.getState().editor,null);
  }
});

test('initialization lifetime handles are declared fields on each real list page', () => {
  for(const mode of ['index','history','day','trash']){
    const data=harness().load('common/list-view.js').data(mode);
    assert.equal(Object.prototype.hasOwnProperty.call(data,'initTimer'),true,'native lifetime timer must be declared');
    assert.equal(Object.prototype.hasOwnProperty.call(data,'initCancel'),true,'native observer handle must be declared');
    assert.equal(data.initTimer,null);assert.equal(data.initCancel,null);
  }
});

test('initialization deadline shows the exact stage and ignores late success without another init or list', () => {
  const env=harness({deferInit:true,initPhase:'AC_TXN_CALL'}),page=env.page('index');page.onInit();
  assert.equal(env.timers.size,1,'held initialization must have one observation deadline');
  env.flushTimers();
  assert.equal(env.routerCalls.length,1,'deadline must reach the existing recovery page');
  assert.equal(env.routerCalls[0].uri,'pages/menu/menu');
  assert.equal(env.routerCalls[0].args.error,'INIT_WAIT_AC_TXN_CALL');
  assert.equal(env.routerCalls[0].args.kind,'read');
  assert.equal(env.calls.cancel,1,'deadline cancels only this page observer');
  assert.equal(env.calls.init,1,'deadline must not start another native initialization');
  assert.equal(env.calls.list.length,0);
  env.pending.init[0](null);env.pending.init[0]('IO_300');
  assert.equal(env.calls.list.length,0,'late completion must not update the expired page');
  assert.equal(env.routerCalls.length,1);
  assert.equal(env.timers.size,0);
});

test('initialization deadline is cancelled by success with no false error on the later focus timer', () => {
  const env=harness({deferInit:true}),page=env.page('index');page.onInit();
  assert.equal(env.timers.size,1);
  env.pending.init.shift()(null);
  assert.equal(page.ready,true);
  assert.equal(page.initTimer,null);
  assert.equal(page.initCancel,null);
  assert.equal(env.timers.size,1,'only the existing crown focus timer may remain');
  env.flushTimers();
  assert.equal(env.routerCalls.length,0);
  assert.equal(env.calls.list.length,1);
  assert.equal(env.timers.size,0);
});

test('initialization observer and deadline are released once on hide and destroy before a new activation', () => {
  const env=harness({deferInit:true}),page=env.page('index');page.onInit();
  const old=env.pending.init[0];page.onHide();page.onDestroy();
  assert.equal(env.timers.size,0,'hidden pages must not keep initialization timers');
  assert.equal(env.calls.cancel,1,'hide plus destroy must not cancel twice');
  assert.equal(page.initCancel,null);
  page.onShow();assert.equal(env.calls.init,2);
  assert.equal(env.timers.size,1);
  old(null);assert.equal(env.calls.list.length,0);
  env.pending.init[1](null);assert.equal(page.ready,true);
  assert.equal(env.calls.list.length,1);
});

test('initialization deadline encodes only whitelisted phase tokens and never arbitrary private text', () => {
  const privateText='synthetic test only private note';
  const env=harness({deferInit:true,initPhase:privateText}),page=env.page('index');page.onInit();env.flushTimers();
  assert.equal(env.routerCalls.length,1);
  assert.equal(env.routerCalls[0].args.error,'INIT_WAIT_UNKNOWN');
  assert.equal(JSON.stringify(env.routerCalls).includes(privateText),false);
  assert.equal(JSON.stringify(env.logs).includes(privateText),false);
});

test('history starts with the real clock month, sorts days descending and uses calendar year rollover', () => {
  const env=harness({existingStore:true}), page=env.page('history');page.onInit();page.onShow();
  assert.equal(env.deviceCalls.length,1);
  assert.equal(env.calls.init,0);
  assert.equal(env.calls.factories,undefined);
  assert.deepEqual(env.calls.days,['2031-01']);
  assert.equal(page.month,'2031-01');
  assert.deepEqual(plain(page.rows.map(r=>r.day)),['2031-01-04','2031-01-03','2031-01-02'].slice(0,page.slots));
  page.prevMonth();
  assert.equal(page.month,'2030-12');
  assert.equal(env.calls.days.at(-1),'2030-12');
  page.nextMonth();page.nextMonth();
  assert.equal(page.month,'2031-02');
  assert.equal(env.calls.days.at(-1),'2031-02');
  assert.match(page.monthText,/2031/);
  assert.equal(env.calls.list.length,0,'history uses the day index, not note-body scans');
});

test('history paging is bounded to visible rows and reuses only one month day-index response', () => {
  const dayRows=Array.from({length:31},(_,i)=>({day:'2031-01-'+String(i+1).padStart(2,'0'),count:1,title:'首行 '+i}));
  const env=harness({existingStore:true,dayRows}), page=env.page('history');page.onInit();
  assert.equal(page.rows.length,page.slots);
  assert.equal(page.rows[0].day,'2031-01-31');
  page.turn(1);
  assert.equal(page.offset,page.slots);
  assert.equal(page.rows[0].day,'2031-01-'+String(31-page.slots).padStart(2,'0'));
  while(page.more) page.turn(1);
  const last=page.offset;
  page.turn(1);
  assert.equal(page.offset,last);
  assert.equal(env.calls.days.length,1);
  assert.ok(page.rows.length<=page.slots);
  page.onDestroy();
  assert.equal(page.rows.length,0);
});

test('month request generation rejects old month responses, even on the same active page', () => {
  const env=harness({existingStore:true,deferDays:true}), page=env.page('history');page.onInit();
  env.pending.days.shift()();
  page.prevMonth();page.nextMonth();
  assert.equal(page.month,'2031-01');
  const old=env.pending.days.shift(), latest=env.pending.days.shift();
  latest();
  const snapshot=plain(page.rows);
  old();
  assert.deepEqual(plain(page.rows),snapshot);
  assert.ok(page.rows.every(r=>r.day.startsWith(page.month)));
  page.prevMonth();page.onHide();env.pending.days.shift()();
  assert.equal(page.active,false);
  assert.equal(env.timers.size,0);
});

test('history click passes the exact day/month, and day back preserves the originating month', () => {
  const env=harness({existingStore:true});env.params('pages/history/history',{month:'2030-12'});
  const history=env.page('history');history.onInit();history.openDay(history.rows[0]);history.openDay(history.rows[0]);
  assert.equal(env.routerCalls.length,1);
  assert.deepEqual(env.routerCalls[0].args,{uri:'pages/day/day',day:'2030-12-04',month:'2030-12'});
  history.onHide();
  const day=env.page('day');day.onInit();day.back();
  assert.equal(env.routerCalls.at(-1).uri,'pages/history/history');
  assert.equal(env.routerCalls.at(-1).args.month,'2030-12');
});

test('day consumes the full original reader viewport and opens records with complete return context', () => {
  const env=harness({existingStore:true});env.params('pages/day/day',{day:'2031-01-02',month:'2031-01'});
  const page=env.page('day');page.onInit();
  assert.ok(page.slots>3);
  assert.equal(page.rows.length,page.slots);
  assert.deepEqual(plain(env.calls.list[0]),{filter:{deleted:false,day:'2031-01-02'},offset:0,limit:page.slots});
  assert.match(page.heading,/01.*02/);
  page.turn(1);
  assert.equal(page.rows.length,1);
  assert.equal(page.offset,page.slots);
  page.openRow(page.rows[0]);
  assert.deepEqual(env.routerCalls[0].args,{uri:'pages/read/read',id:'test-note-4',source:'day',day:'2031-01-02',month:'2031-01'});
});

test('trash displays the approved restore guidance, not record preview or pinned chrome',()=>{
  const env=harness({existingStore:true});env.records[6].pinned=true;
  const page=env.page('trash');page.onInit();
  assert.equal(page.rows[0].meta,'点按恢复 · 不会自动清除');
  assert.equal(page.rows[0].pinned,false);
  assert.equal(page.rows[0].title,env.records[6].title);
  assert.equal(env.calls.read.length,0);
});

test('trash restores the actual record before opening the reader, with one operation for rapid taps', () => {
  const env=harness({existingStore:true,deferFlag:true}), page=env.page('trash');page.onInit();
  assert.deepEqual(plain(env.calls.list[0].filter),{deleted:true});
  assert.equal(page.rows[0].id,'test-note-6');
  page.openRow(page.rows[0]);page.openRow(page.rows[0]);
  assert.equal(env.routerCalls.length,0);
  assert.deepEqual(env.calls.flag,[{id:'test-note-6',field:'deleted',value:false}]);
  env.pending.flag.shift()();
  assert.equal(env.records[6].deleted,false);
  assert.equal(env.routerCalls.length,1);
  assert.deepEqual(env.routerCalls[0].args,{uri:'pages/read/read',id:'test-note-6',source:'index'});
});

test('trash failure remains retryable and a late restore callback cannot navigate a hidden page', () => {
  const env=harness({existingStore:true,flagError:'E_IO'}), page=env.page('trash');page.onInit();page.openRow(page.rows[0]);
  assert.equal(env.records[6].deleted,true);
  assert.equal(env.routerCalls.length,0);
  assert.equal(page.busy,false);
  assert.equal(page.error,true);
  env.options.flagError=null;page.openRow(page.rows[0]);
  assert.equal(env.records[6].deleted,false);
  assert.equal(env.routerCalls.length,1);
  const delayed=harness({existingStore:true,deferFlag:true}), hidden=delayed.page('trash');hidden.onInit();hidden.openRow(hidden.rows[0]);hidden.onHide();delayed.pending.flag.shift()();
  assert.equal(delayed.routerCalls.length,0);
  assert.equal(delayed.timers.size,0);
});

test('all four lists show honest empty copy without manufactured dates, counts or note bodies', () => {
  const expected={index:'今天想留下什么？',history:'这月还没有记录',day:'这一天还没有记录',trash:'没有删掉的记录'};
  for(const mode of Object.keys(expected)) {
    const env=harness({count:0,dayRows:[],existingStore:mode!=='index'});
    env.params('pages/'+mode+'/'+mode,{day:'2031-01-02',month:'2031-01'});
    const page=env.page(mode);page.onInit();
    assert.equal(page.ready,true,mode);
    assert.equal(page.empty,true,mode);
    assert.equal(page.total,0,mode);
    assert.equal(page.rows.length,0,mode);
    assert.equal(page.emptyTitle,expected[mode],mode);
    assert.equal(env.calls.read.length,0,mode);
  }
});

test('list/day-index/device errors are visible and retry calls the real APIs again', () => {
  for(const mode of ['index','history','day','trash']) {
    const options={existingStore:mode!=='index',listError:'E_LIST',daysError:'E_DAYS'};
    const env=harness(options);env.params('pages/'+mode+'/'+mode,{day:'2031-01-02',month:'2031-01'});
    const page=env.page(mode);page.onInit();
    assert.equal(page.ready,false,mode);
    assert.equal(page.error,true,mode);
    assert.ok(page.message.length>0,mode);
    assert.equal(page.rows.length,0,mode);
    env.options.listError=null;env.options.daysError=null;page.retry();
    assert.equal(page.ready,true,mode+' retry');
    assert.equal(env.deviceCalls.length,2,mode+' retries measured device query');
  }
  const env=harness({deviceError:true}), page=env.page('index');page.onInit();
  assert.equal(page.ready,false);
  assert.equal(page.w,0);
  assert.equal(env.calls.init,0);
  assert.equal(env.calls.list.length,0);
  assert.ok(page.message.length>0);
});

test('non-home pages never invent a store or normalize an invalid source day/month', () => {
  for(const mode of ['history','day','trash']) {
    const env=harness();env.params('pages/'+mode+'/'+mode,{day:'2031-01-02',month:'2031-01'});
    const page=env.page(mode);page.onInit();
    assert.equal(page.ready,false,mode);
    assert.equal(env.calls.factories,undefined,mode);
    assert.equal(env.calls.init,0,mode);
    assert.equal(env.calls.list.length+env.calls.days.length,0,mode);
  }
  for(const [mode,args] of [['day',{day:'2031-02-30',month:'2031-02'}],['history',{month:'2031-1'}]]) {
    const env=harness({existingStore:true});env.params('pages/'+mode+'/'+mode,args);
    const page=env.page(mode);page.onInit();
    assert.equal(page.ready,false);
    assert.equal(env.calls.list.length+env.calls.days.length,0);
  }
});

test('query tokens prevent previous pin/page answers from overwriting the currently requested filter', () => {
  const env=harness({deferList:true}), page=env.page('index');page.onInit();env.pending.list.shift()();
  page.turn(1);page.togglePinned();
  const old=env.pending.list.shift(), latest=env.pending.list.shift();latest();
  const snapshot=plain(page.rows);old();
  assert.equal(page.pinnedOnly,true);
  assert.equal(page.offset,0);
  assert.deepEqual(plain(page.rows),snapshot);
  assert.ok(page.rows.every(r=>r.pinned));
});

test('every successful route emits the requested real list marker', () => {
  for(const mode of ['index','history','day','trash']) {
    const env=harness({existingStore:mode!=='index'});env.params('pages/'+mode+'/'+mode,{day:'2031-01-02',month:'2031-01'});
    const page=env.page(mode);page.onInit();
    const extra=mode==='history'?'month=2031-01 ':mode==='day'?'day=2031-01-02 ':'';
    const suffix=mode==='history'?'':' offset=0';
    assert.ok(env.logs.includes('LB2 LIST '+mode+' '+extra+'rows='+page.rows.length+suffix),mode+' real marker');
  }
});

test('all four complete native list pages wire gestures, image sizes, safe text and declared px geometry', () => {
  const env=harness();
  for(const mode of ['index','history','day','trash']) {
    const page=env.page(mode);
    const source=fs.readFileSync(new URL('pages/'+mode+'/'+mode+'.js',base),'utf8');
    const hml=fs.readFileSync(new URL('pages/'+mode+'/'+mode+'.hml',base),'utf8');
    const css=fs.readFileSync(new URL('pages/'+mode+'/'+mode+'.css',base),'utf8');
    for(const hook of ['onInit','onShow','onHide','onDestroy']) assert.ok(source.includes(hook),mode+' '+hook);
    assert.ok(hml.includes('@swipe="onSwipe"'),mode+' swipe');
    assert.ok(hml.includes('ref="crown"'),mode+' crown');
    assert.ok(hml.includes('@change="crownChange"'),mode+' crown handler');
    assert.ok(!/<button|<input|\$vm|async\s|await\s|\.\.\./.test(source+hml),mode+' lite subset');
    assert.ok(!/\bfont-family\s*:/i.test(css),mode+' native platform font fallback');
    assert.ok(css.includes('#060808'),mode+' original background');
    assert.ok(css.includes('text-overflow:ellipsis'),mode+' first-line truncation');
    assert.ok(!/height\s*:\s*auto/.test(css+hml),mode+' no collapsing columns');
    for(const match of hml.matchAll(/style="([^"]*)"/g)) {
      for(const field of match[1].matchAll(/\{\{\s*([A-Za-z_]\w*)\s*\}\}/g)) {
        assert.ok(Object.hasOwn(page.data,field[1]),mode+' declared '+field[1]);
      }
      for(const value of match[1].matchAll(/(?:left|top|width|height|font-size|margin-left|border-radius):\s*\{\{[^}]+\}\}([^;]*)/g)) {
        assert.equal(value[1],'',mode+' SDK binding must remain a number; decimal px strings are rejected natively');
      }
    }
    if(mode!=='index') assert.ok(!source.includes('@system.file')&&!source.includes('/store.js'),mode+' no bundled store');
    if(mode==='index') {
      assert.ok(source.includes('@system.file'));
      assert.ok(hml.includes('/common/ui/app-name.png'));
      assert.ok(hml.includes('/common/ui/write-note.png'));
      assert.ok(hml.includes('width:{{brandW}};height:{{brandH}}'));
      assert.ok(hml.includes('width:{{writeW}};height:{{writeH}}'));
    }
  }
});

test('startup retains visible loading after asynchronous device success while native init is pending', () => {
  const env=harness({deferDevice:true,deferInit:true}), page=env.page('index');
  page.onInit();
  env.deviceCalls[0].success(windows[0][1]);
  assert.equal(page.ready,false);
  assert.ok(page.message.length>0,'native wait must not erase the only visible text');
  assert.equal(env.calls.init,1);
});

test('optional persisted font API exception cannot abort asynchronous startup', () => {
  const env=harness({deferDevice:true,storageThrow:true}), page=env.page('index');
  page.onInit();
  assert.doesNotThrow(()=>env.deviceCalls[0].success(windows[0][1]));
  assert.equal(env.calls.init,1,'optional setting failure must still initialize real records');
  assert.equal(page.ready,true);
});

test('post-device page preparation exception is visible instead of escaping SDK callback', () => {
  const env=harness({deferDevice:true}), page=env.page('index');
  const life=env.load('common/life.js');
  life.start(page,()=>{throw new Error('deliberate page preparation failure')});
  assert.doesNotThrow(()=>env.deviceCalls[0].success(windows[0][1]));
  assert.equal(page.ready,false);
  assert.match(page.message,/BOOT_PREPARE/);
  assert.ok(!page.message.includes('deliberate'),'raw exceptions must not be shown');
  assert.equal(env.timers.size,0);
});

test('initial list callback stall has a visible deadline after init has succeeded', () => {
  const env=harness({deferDevice:true,deferList:true}), page=env.page('index');
  page.onInit();env.deviceCalls[0].success(windows[0][1]);
  assert.equal(env.calls.init,1);
  assert.equal(env.calls.list.length,1);
  assert.equal(page.ready,false);
  assert.ok(page.message.length>0,'list wait must retain visible loading');
  assert.ok(env.timers.size>0,'init deadline cannot end before first list is protected');
  env.flushTimers();
  assert.equal(page.error,true,'stalled list must enter a visible retryable error');
  assert.equal(page.ready,false);
  assert.ok(page.message.length>0);
  assert.match(page.message,/LIST_WAIT/);
  assert.equal(page.queryTimer,null);
  env.pending.list.shift()();
  assert.equal(page.ready,false,'late answer must not erase a latched timeout');
});

test('list observation timers are removed on hide and delayed callback cannot publish success', () => {
  const env=harness({deferList:true}), page=env.page('index');
  page.onInit();assert.ok(env.timers.size>0);
  page.onHide();assert.equal(env.timers.size,0);
  env.pending.list.shift()();assert.equal(page.ready,false);
});

test('query timer is declared for all native list pages and successful callbacks clear it',()=>{
  for(const mode of ['index','history','day','trash']){
    const env=harness({existingStore:mode!=='index'}),page=env.page(mode);
    assert.equal(Object.prototype.hasOwnProperty.call(page.data,'queryTimer'),true);
    page.onInit();assert.equal(page.queryTimer,null);assert.equal(page.message,'');
    page.onHide();assert.equal(env.timers.size,0);
  }
});

test('asynchronous malformed row processing reports LIST_RENDER and does not escape SDK callback',()=>{
  const env=harness({deferDevice:true,deferList:true}),page=env.page('index');
  env.records[0].date=null;page.onInit();env.deviceCalls[0].success(windows[0][1]);
  assert.doesNotThrow(()=>env.pending.list.shift()());
  assert.equal(page.ready,false);assert.equal(page.error,true);assert.match(page.message,/LIST_RENDER/);
  assert.equal(page.queryTimer,null);assert.equal(env.timers.size,0);
});

test('history day-index stall is bounded and rejects its late callback',()=>{
  const env=harness({existingStore:true,deferDays:true}),page=env.page('history');page.onInit();
  assert.ok(page.message);assert.ok(env.timers.size>0);env.flushTimers();
  assert.equal(page.error,true);assert.match(page.message,/LIST_WAIT/);assert.equal(page.queryTimer,null);
  env.pending.days.shift()();assert.equal(page.ready,false);assert.equal(page.rows.length,0);
});

test('changing requested filter cancels old query deadline without cancelling new one',()=>{
  const env=harness({deferList:true}),page=env.page('index');page.onInit();
  const first=page.queryTimer;page.togglePinned();const last=page.queryTimer;
  assert.notEqual(last,first);assert.equal(env.timers.has(first),false);assert.equal(env.timers.has(last),true);
  env.pending.list.shift()();assert.equal(env.timers.has(last),true,'obsolete callback must not clear current observer');
  env.pending.list.shift()();assert.equal(page.ready,true);assert.equal(page.queryTimer,null);
  env.flushTimers();assert.equal(page.error,false);assert.equal(page.rows.length,1);
});

test('late filter result cannot erase a newer failed draft operation or re-enable its page',()=>{
  const env=harness({existingStore:true,count:1}),page=env.page('index');
  page.onInit();assert.equal(page.ready,true);
  let filterAnswer;
  page.store.list=(_f,_o,_n,cb)=>{filterAnswer=cb;};
  page.togglePinned();assert.ok(page.queryTimer!==null);
  page.store.loadDraft=cb=>cb('DRAFT_CORRUPT');page.newNote();
  assert.equal(page.ready,false);assert.equal(page.error,true);const message=page.message;
  filterAnswer(null,{rows:fixtures(1),total:1,more:false});
  assert.equal(page.ready,false,'obsolete list result must not turn failed draft into ready state');
  assert.equal(page.message,message);assert.equal(page.error,true);assert.equal(page.queryTimer,null);
  env.flushTimers();assert.equal(page.message,message);assert.equal(page.ready,false);assert.equal(env.routerCalls.length,0);
});
