import store from './store-page';
import shell from './shell';
import layout from './layout';

// Safe forwarding only; the application owns the single logger instance.
function trace(p,stage,err) {try{if(shell.trace){if(arguments.length>2)shell.trace(p,stage,err);else shell.trace(p,stage);}}catch(ignored){}}
function two(n) { return n < 10 ? '0' + n : '' + n; }
function dateShape(s,n) { if(s.length!==n||s.charAt(4)!=='-'||(n===10&&s.charAt(7)!=='-'))return false;for(var i=0,c;i<n;i++){if(i===4||(n===10&&i===7))continue;c=s.charCodeAt(i);if(c<48||c>57)return false;}return true; }
function validMonth(s) { if (typeof s !== 'string' || !dateShape(s,7) || +s.slice(5) < 1 || +s.slice(5) > 12 || +s.slice(0,4) < 1) throw new Error('Invalid month'); return s; }
function validDay(s) { if (typeof s !== 'string' || !dateShape(s,10)) throw new Error('Invalid day'); validMonth(s.slice(0,7)); var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8),max=m===2?((y%4===0&&y%100!==0)||y%400===0?29:28):([4,6,9,11].indexOf(m)>=0?30:31); if(d<1||d>max)throw new Error('Invalid day'); return s; }
function shiftMonth(s,delta) { validMonth(s); if(delta!==1&&delta!==-1)throw new Error('Invalid month delta'); var y=+s.slice(0,4),m=+s.slice(5)+delta;if(m===13){m=1;y++;}if(m===0){m=12;y--;}return validMonth(('0000'+y).slice(-4)+'-'+two(m)); }
function today() { var d=new Date();return d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate()); }
function geometry(p,info,kind) {
  var g=layout.home(info),k;for(k in g)p[k]=g[k];
  p.titleFont=Math.max(20,(g.round?20:22)*g.w/412);p.metaFont=Math.max(13,14*g.w/412);p.headFont=Math.max(20,26*g.w/412);p.navFont=Math.max(16,18*g.w/412);p.sectionFont=Math.max(15,16*g.w/412);
  if(kind==='history'){p.listY=g.newY+g.hit+9;p.listH=g.dockY-p.listY-8;p.slots=Math.max(1,Math.floor(p.listH/Math.max(60,65*g.w/412)));p.rowH=p.listH/p.slots;}
  else if(kind==='day'||kind==='trash'){p.listY=g.hy+g.hit+8;p.listH=g.dockY-p.listY-8;p.slots=Math.max(1,Math.floor(p.listH/Math.max(58,60*g.w/412)));p.rowH=p.listH/p.slots;}
  p.titleH=Math.max(26,p.titleFont*1.26);p.metaH=Math.max(18,p.metaFont*1.25);p.rowCopyH=p.titleH+p.metaH+3;p.rowPad=Math.max(0,(p.rowH-p.rowCopyH)/2);p.titleW=p.contentW-6;p.dayCopyW=p.contentW-66;p.listBottom=p.listY+p.listH;p.headCenterW=p.hw-2*p.hit;
}
function metaRows(items,limit) {
  if(!Array.isArray(items)||items.length>limit)throw new Error('Invalid index page');var out=[],seen={},m,i;
  for(i=0;i<items.length;i++){m=items[i];if(!m||typeof m.id!=='string'||!m.id||seen[m.id]||m.body!==undefined||typeof m.title!=='string'||typeof m.preview!=='string')throw new Error('Invalid index metadata');validDay(m.date);seen[m.id]=true;out.push({id:m.id,date:m.date,time:m.time,title:m.title,preview:m.preview,pinned:m.pinned===true,deleted:m.deleted===true,revision:m.revision,bytes:m.bytes,meta:m.date.slice(5).replace('-',' / ')+' \u00b7 '+m.time+'  '+m.preview,pinColor:m.pinned?'#e6c78c':'#f1f0e8'});}
  return out;
}
function error(p,e) {try{trace(p,'L/list.error',e);p.loading=false;p.busy=false;p.message='\u6ca1\u8bfb\u5230\uff0c\u70b9\u6309\u91cd\u8bd5';p.errorDetail=String(e&&e.message||e);}catch(err){trace(p,'L/list.error.report',err);throw err;}}
function paint(p,rows,more,offset) {trace(p,'L/paint.enter');p.rows=rows;p.hasMore=more;p.hasPrev=offset>0;p.offset=offset;p.loading=false;p.message='';p.empty=rows.length===0;p.pageText=(Math.floor(offset/p.slots)+1)+(more?' +':'');shell.focus(p);trace(p,'L/paint.exit');}
function fetch(p,offset) {
  var gen=++p.listGen,limit=p.slots;p.loading=true;p.message='';
  trace(p,'L/list.enter');
  try{store.list({offset:offset,limit:limit,filter:p.filter,day:p.day||'',month:p.month||''},function(e,r){try{if(!p.alive||gen!==p.listGen)return;}catch(err){trace(p,'L/list.guard.error',err);throw err;}trace(p,'L/list.callback');if(e){error(p,e);return;}try{if(!r||typeof r.hasMore!=='boolean')throw new Error('Invalid list result');var rows=metaRows(r.items,limit);if(r.hasMore&&rows.length!==limit)throw new Error('Incomplete index page');paint(p,rows,r.hasMore,offset);}catch(x){error(p,x);}});}
  catch(e){trace(p,'L/list.throw',e);throw e;}
  trace(p,'L/list.return');
}
// Month scans only small metadata pages. At most 31 day summaries are retained,
// never all record metadata and never a single body.
function monthFetch(p) {
  var gen=++p.listGen,summaries=[],byDay={},offset=0;p.loading=true;p.message='';
  function scan(){trace(p,'L/month.enter');try{store.list({offset:offset,limit:12,filter:'month',month:p.month},function(e,r){try{if(!p.alive||gen!==p.listGen)return;}catch(err){trace(p,'L/month.guard.error',err);throw err;}trace(p,'L/month.callback');if(e){error(p,e);return;}try{if(!r||typeof r.hasMore!=='boolean')throw new Error('Invalid month result');var rows=metaRows(r.items,12),i,m,a;for(i=0;i<rows.length;i++){m=rows[i];if(m.date.slice(0,7)!==p.month)throw new Error('Month filter mismatch');a=byDay[m.date];if(!a){a={id:m.date,date:m.date,num:m.date.slice(8),title:m.date===p.today?'\u4eca\u5929':m.date.slice(5,7)+' \u6708 '+m.date.slice(8)+' \u65e5',count:0,preview:m.title};byDay[m.date]=a;summaries.push(a);}a.count++;}if(r.hasMore){if(rows.length!==12)throw new Error('Incomplete month index');offset+=rows.length;scan();return;}summaries.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;});for(i=0;i<summaries.length;i++)summaries[i].meta=summaries[i].count+' \u6761 \u00b7 '+summaries[i].preview;p.days=summaries;monthPaint(p,0);}catch(x){error(p,x);}});}catch(err){trace(p,'L/month.throw',err);throw err;}trace(p,'L/month.return');}
  scan();
}
function monthPaint(p,offset){paint(p,p.days.slice(offset,offset+p.slots),offset+p.slots<p.days.length,offset);}
function refresh(p) {if(!p.ready)return;if(!p.allowed){var gen=p.listGen;p.loading=true;shell.ensure(p,function(e){if(!p.alive||gen!==p.listGen)return;if(e){error(p,e);return;}p.allowed=true;refresh(p);});return;}if(p.kind==='history')monthFetch(p);else fetch(p,p.offset);}
function init(p,kind) {
  trace(p,'L/list.init.first');
  p.kind=kind;p.alive=true;p.allowed=false;p.listGen=(p.listGen||0)+1;p.rows=[];p.days=[];p.offset=0;p.hasMore=false;p.hasPrev=false;p.empty=false;p.busy=false;p.message='';var q=shell.params(p);p.today=today();p.day=q.day||'';p.month=q.month||p.today.slice(0,7);p.filter=kind==='trash'?'trash':kind==='day'?'day':kind==='history'?'month':'all';
  try{if(kind==='day')validDay(p.day);validMonth(p.month);}catch(e){trace(p,'L/list.params.error',e);p.ready=false;p.message='\u65e5\u671f\u53c2\u6570\u65e0\u6548';return;}
  p.headerTitle=kind==='history'?'\u6309\u65e5\u56de\u770b':kind==='day'?p.day.slice(5,7)+' \u6708 '+p.day.slice(8)+' \u65e5':kind==='trash'?'\u56de\u6536\u7ad9':'\u7559\u767d';p.sectionTitle='\u6700\u8fd1\u8bb0\u5f55';p.dateLabel=p.today.slice(5).replace('-',' / ');p.emptyText=kind==='history'?'\u8fd9\u6708\u8fd8\u6ca1\u6709\u8bb0\u5f55':kind==='trash'?'\u6ca1\u6709\u5220\u6389\u7684\u8bb0\u5f55':kind==='day'?'\u8fd9\u5929\u8fd8\u6ca1\u6709\u8bb0\u5f55':'\u4eca\u5929\u60f3\u7559\u4e0b\u4ec0\u4e48\uff1f';p.monthLabel=p.month.replace('-',' \u5e74 ')+' \u6708';
  trace(p,'L/list.init.enter');
  try{shell.init(p,function(info){trace(p,'L/geometry.enter');geometry(p,info,kind);trace(p,'L/geometry.exit');var gen=p.listGen;p.loading=true;shell.ensure(p,function(e){if(!p.alive||gen!==p.listGen)return;if(e){error(p,e);return;}p.allowed=true;trace(p,'L/list.allowed');refresh(p);});});}catch(e){trace(p,'L/list.shellinit.throw',e);throw e;}
  trace(p,'L/list.init.return');
}
function next(p){if(p.loading||!p.hasMore)return;var at=p.offset+p.slots;if(p.kind==='history'){try{monthPaint(p,at);}catch(err){trace(p,'L/monthPaint.error',err);throw err;}}else fetch(p,at);}
function prev(p){if(p.loading||!p.hasPrev)return;var at=Math.max(0,p.offset-p.slots);if(p.kind==='history'){try{monthPaint(p,at);}catch(err){trace(p,'L/monthPaint.error',err);throw err;}}else fetch(p,at);}
function toggle(p){p.filter=p.filter==='pinned'?'all':'pinned';p.offset=0;p.rows=[];p.empty=false;p.sectionTitle=p.filter==='pinned'?'\u7f6e\u9876\u8bb0\u5f55':'\u6700\u8fd1\u8bb0\u5f55';p.emptyText=p.filter==='pinned'?'\u8fd8\u6ca1\u6709\u7f6e\u9876\u7684\u8bb0\u5f55':'\u4eca\u5929\u60f3\u7559\u4e0b\u4ec0\u4e48\uff1f';fetch(p,0);}
function open(p,row){if(p.loading||p.busy||!row||!row.id)return;if(p.kind==='history'){shell.nav(p,'day',{day:row.date,month:p.month});return;}if(p.kind!=='trash'){shell.nav(p,'read',{id:row.id});return;}p.busy=true;var gen=p.listGen;store.flag(row.id,{deleted:false},function(e){try{if(!p.alive||gen!==p.listGen)return;}catch(err){trace(p,'L/open.guard.error',err);throw err;}p.busy=false;if(e){error(p,e);return;}shell.nav(p,'read',{id:row.id,notice:'restored'});});}
function month(p,delta){if(p.loading)return;p.month=shiftMonth(p.month,delta);p.monthLabel=p.month.replace('-',' \u5e74 ')+' \u6708';p.offset=0;p.rows=[];p.empty=false;monthFetch(p);}
function destroy(p){p.alive=false;p.listGen=(p.listGen||0)+1;p.rows=[];p.days=[];p.loading=false;shell.clear(p);}
function swipe(p,e){var d=e&&e.direction;if(d==='up')next(p);else if(d==='down')prev(p);}
export default {init:init,geometry:geometry,refresh:refresh,next:next,prev:prev,toggle:toggle,open:open,month:month,destroy:destroy,swipe:swipe,validDay:validDay,validMonth:validMonth,shiftMonth:shiftMonth};
