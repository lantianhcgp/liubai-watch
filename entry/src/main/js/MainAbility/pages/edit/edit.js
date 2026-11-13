import shell from '../../common/shell';
import layout from '../../common/layout';
import reader from '../../common/reader';
import store from '../../common/store-page';
import keyboard from '../../common/keyboard';
import session from '../../common/session';
import utf8 from '../../common/utf8';
function revision(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return s.length+':'+h;}
function trace(p,s,e){try{if(shell.trace){if(arguments.length>2)shell.trace(p,s,e);else shell.trace(p,s);}}catch(ignored){}}
function remember(p,s){session.set(s);p.editSession=s;if(p.editSave&&p.editSave.pending)p.editSave.session=s;}
function clearDraft(p){if(p.draftTimer!==null&&p.draftTimer!==undefined)clearTimeout(p.draftTimer);p.draftTimer=null;}
function failed(p,e){if(!p.alive)return;p.ready=false;p.loading=false;clearDraft(p);if(p.focusTimer!==null&&p.focusTimer!==undefined)clearTimeout(p.focusTimer);p.focusTimer=null;if(p.kb){p.kb.dispose();p.kb=null;}p.message='\u8bfb\u53d6\u672a\u5b8c\u6210\uff0c\u70b9\u6309\u91cd\u8bd5';trace(p,'S/edit.failed');}
function geometry(p,info){var g=layout.editor(info,true),k;p.g=g;for(k in g)p[k]=g[k];var status=layout.status(info);for(k in status)p[k]=status[k];p.shellReady=true;}
export default {
 data:{ready:false,shellReady:false,loading:false,statusX:0,statusY:0,statusW:0,statusH:0,statusNavX:0,statusNavY:0,statusNavW:0,statusHit:44,message:'',w:0,h:0,hx:0,hy:0,hw:0,hit:46,open:true,lines:[],pinyin:'',candidates:[],hasPinyin:false,keyX:0,keyW:0,keysY:0,footX:0,footW:0,footY:0,sheetWidth:0,sheetOffset:0,image:'',typeImage:'',spaceW:44,caretX:0,caretY:0,caretH:22,caretShow:false,counter:'',viewCounter:'',title:'',saving:false},
 onInit:function(resume){
  var p=this,gen=(p.initGen||0)+1;p.initGen=gen;p.alive=true;p.ready=false;p.shellReady=false;p.loading=true;p.saving=!!(p.editSave&&p.editSave.pending);
  if(p.readyCancel){p.readyCancel();p.readyCancel=null;}clearDraft(p);if(p.kb)p.kb.dispose();p.kb=null;
  if(resume!==true||!p.params){p.params=shell.params(p);p.routeAction=p.params.action||'';p.id=p.params.id||'';}
  else if(p.editSave&&p.editSave.meta)p.id=p.editSave.meta.id;
  p.pg=null;p.needsLayout=true;p.title=p.id?'\u7f16\u8f91\u8bb0\u5f55':'\u5199\u4e00\u6761';trace(p,'S/edit.enter');
  function current(){return p.alive&&gen===p.initGen;}
  function boot(s){if(!current())return;try{p.boot(s);}catch(e){failed(p,e);}}
  try{shell.init(p,function(info){
   if(!current())return;
   try{geometry(p,info);p.ready=false;p.message='\u6b63\u5728\u51c6\u5907\u5b58\u50a8';trace(p,'S/edit.wait');}catch(e){failed(p,e);return;}
   var settled=false;
   try{var cancel=shell.ensure(p,function(initErr){
    if(settled||!current())return;settled=true;p.readyCancel=null;
    if(initErr){failed(p,initErr);return;}
    try{
     if(p.routeAction==='new')session.clear();var existing=session.get();
     if(existing&&(existing.id===p.id||!p.id&&!p.params.draft)){boot(existing);return;}
     if(p.params.draft){var draftDone=false;store.draftGet(function(e,d){if(draftDone||!current())return;draftDone=true;if(e||!d){failed(p,e);return;}p.id=d.id||'';boot(d);});}
     else if(p.id){var loadDone=false;store.load(p.id,function(e,n){if(loadDone||!current())return;loadDone=true;if(e){failed(p,e);return;}try{p.created=n.created;boot({id:p.id,text:n.body,cursor:Math.min(p.params.anchor||0,n.body.length),type:0,pinyin:'',open:false,original:revision(n.body),revision:n.revision,created:n.created});}catch(x){failed(p,x);}});}
     else boot({id:'',text:'',cursor:0,type:0,pinyin:'',open:true,original:revision('')});
    }catch(e){failed(p,e);}
   });if(!settled)p.readyCancel=typeof cancel==='function'?cancel:null;}catch(e){failed(p,e);}
  });}catch(e){failed(p,e);}
 },
 boot:function(s){var p=this,gen=p.initGen;if(p.kb)p.kb.dispose();p.base=s.original||revision(s.text||s.body||'');p.created=s.created;p.open=s.open!==false;p.id=s.id||'';p.anchor=s.viewAnchor||s.cursor||0;p.kb=keyboard.create({text:s.text||s.body||'',cursor:s.cursor||0,type:s.type||0,pinyin:s.pinyin||'',deferLookup:true,onChange:function(n){if(p.alive&&p.initGen===gen)p.changed(n);},onError:function(e){if(p.alive&&p.initGen===gen)p.message=String(e);}});p.changed(p.kb.snapshot());p.loading=false;p.ready=true;p.message='';trace(p,'S/edit.done');var action=p.routeAction===undefined?p.params.action||'':p.routeAction;p.routeAction='';p.applyAction(action);},
 capture:function(){var s=this.kb.snapshot();s.id=this.id;s.open=this.open;s.original=this.base;s.created=this.created;s.viewAnchor=this.anchor;return s;},
 changed:function(n){
  var p=this,body=p.text!==n.text||p.cursor!==n.cursor;
  var edit=body||p.type!==n.type||p.pinyin!==n.pinyin;
  var same=p.candidates.length===n.candidates.length;
  for(var i=0;same&&i<n.candidates.length;i++)same=p.candidates[i].text===n.candidates[i].text&&p.candidates[i].matchLength===n.candidates[i].matchLength;
  p.text=n.text;p.cursor=n.cursor;p.type=n.type;p.pinyin=n.pinyin;
  if(!same)p.candidates=n.candidates;
  p.hasPinyin=!!n.pinyin;p.image=n.image;p.sheetWidth=n.sheetWidth;p.sheetOffset=n.sheetOffset;p.typeImage='/common/keyboard/common/key'+n.type+'.png';
  // Drag/lookup notifications leave note text unchanged. Rebuilding native
  // text/list nodes and rescheduling file writes on every move stalls FIT3.
  if(body||p.needsLayout){p.refresh(true);p.needsLayout=false;}
  if(edit){if(p.kb)remember(p,p.capture());p.queueDraft();}
 },
 refresh:function(follow){var p=this;if(!p.info)return;p.g=layout.editor(p.info,p.open);var g=p.g;p.hx=g.hx;p.hy=g.hy;p.hw=g.hw;p.hit=g.hit;p.keyX=g.keyX;p.keyW=g.keyW;p.keysY=g.keysY;p.footX=g.footX;p.footW=g.footW;p.footY=g.footY;p.spaceW=g.footW-3*44-3*5;if(follow){var loc=reader.locate(p.text,p.cursor,g,{editor:true,cursor:p.cursor});p.pg=loc.page;p.anchor=p.pg.start;}else p.pg=reader.page(p.text,p.anchor,g,{editor:true,cursor:p.cursor});p.lines=p.pg.lines;p.viewCounter='\u7b2c '+(reader.locate(p.text,p.anchor,g,{editor:true,cursor:p.cursor}).index+1)+' / '+reader.count(p.text,g,{editor:true,cursor:p.cursor})+' \u5c4f \u00b7 \u70b9\u6b63\u6587\u6539\u4f4d\u7f6e';p.caretShow=false;for(var i=0;i<p.lines.length;i++){var l=p.lines[i];if(p.cursor>=l.start&&p.cursor<=l.end){p.caretX=l.x+reader.measure(p.text.substring(l.start,p.cursor),l.font);p.caretY=l.y;p.caretH=l.height-3;p.caretShow=true;break;}}p.counter=utf8.bytes(p.text)+' / 3072';shell.focus(p);},
 queueDraft:function(){var p=this,gen=p.initGen;clearDraft(p);if(p.saving||!p.kb||!p.alive)return;p.draftTimer=setTimeout(function(){if(p.initGen===gen)p.draftTimer=null;if(!p.alive||p.initGen!==gen||p.saving||!p.ready)return;var s=p.capture();s.body=s.text;delete s.candidates;delete s.image;delete s.sheetOffset;delete s.sheetWidth;store.draftPut(s,function(e){if(e&&p.alive&&p.initGen===gen)p.message='\u8349\u7a3f\u672a\u5b58\uff1a'+String(e);});},700);},
 toggle:function(){if(!this.kb)return;this.open=!this.open;this.refresh(true);remember(this,this.capture());this.queueDraft();},
 turn:function(d){if(!this.alive||!this.ready||!this.kb||!this.pg)return;if(d>0&&this.pg.end<this.text.length)this.anchor=this.pg.end;else if(d<0&&this.anchor>0){var s=0,prev=0,q;while(s<this.anchor){q=reader.page(this.text,s,this.g,{editor:true,cursor:this.cursor});if(q.end>=this.anchor)break;prev=s;s=q.end;}this.anchor=s;}this.refresh(false);remember(this,this.capture());},
 prev:function(){this.turn(-1);},next:function(){this.turn(1);},
 bodySwipe:function(e){if(e&&e.direction==='up')this.turn(1);else if(e&&e.direction==='down')this.turn(-1);},
 onScroll:function(e){if(e&&e.direction)this.turn(e.direction==='bottom'?1:-1);},
 onRotate:function(e){var n=e&&(e.rotate||e.rotation||e.delta||e);if(typeof n==='number'&&n)this.turn(n>0?1:-1);},
 pickLine:function(i,e){if(typeof i==='object'){e=i;var yy=typeof e.globalY==='number'?e.globalY:e.y;i=-1;for(var li=0;li<this.lines.length;li++){var ll=this.lines[li];if(yy>=ll.y&&yy<ll.y+ll.height){i=li;break;}}}if(!this.kb||!this.lines[i])return;var l=this.lines[i],x=e&&(typeof e.globalX==='number'?e.globalX:typeof e.x==='number'?e.x:null);if(typeof x!=='number'||!isFinite(x)){this.message='\u70b9\u6309\u5750\u6807\u4e0d\u53ef\u7528';return;}this.kb.setCursor(l.start+reader.hit(l.text,Math.max(0,x-l.x),l.font));this.open=true;this.refresh(true);remember(this,this.capture());},
 clickKey:function(e){trace(this,'W/key.click');if(this.kb&&this.kb.click(e,this.g))trace(this,'W/key.accept');},
 startKey:function(e){trace(this,'W/key.drag.begin');if(this.kb)this.kb.touchStart(e,this.g);},moveKey:function(e){if(this.kb)this.kb.touchMove(e,this.g);},endKey:function(e){trace(this,'W/key.drag.end');if(this.kb)this.kb.touchEnd(e,this.g);},cancelKey:function(){trace(this,'W/key.cancel');if(this.kb)this.kb.touchCancel();},longKey:function(e){trace(this,'W/key.long');if(this.kb)this.kb.longPress(e,this.g);},
 mode:function(){if(this.kb)this.kb.typeNext();},space:function(){if(this.kb)this.kb.space();},del:function(){if(this.kb)this.kb.backspace();},enter:function(){if(this.kb)this.kb.newline();},choose:function(i){if(this.kb)this.kb.choose(i);},
 tools:function(){if(!this.kb)return;remember(this,this.capture());shell.nav(this,'menu',{mode:'tool',id:this.id});},
 applyAction:function(a){if(!this.kb||!a)return;if(a==='left')this.kb.move(-1);else if(a==='right')this.kb.move(1);else if(a==='home')this.kb.home();else if(a==='end')this.kb.end();else if(a==='type')this.kb.typeNext();else if(a==='copy')session.clipboardPut(this.text);else if(a==='paste'||a.indexOf('paste:')===0)this.kb.insert(session.clipboardGet(a==='paste'?0:parseInt(a.slice(6),10)));else if(a==='save')this.save();else if(a==='draft')this.leaveDraft();else if(a==='discard')this.discard();},
 save:function(){
  var p=this;trace(p,'V/save.click');if(!p.alive||!p.kb||p.saving||p.loading)return;if(!utf8.hasText(p.text)){p.message='\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a';trace(p,'V/save.empty');return;}
  var gen=p.initGen,op={pending:true,session:p.editSession,body:p.text};p.editSave=op;p.saving=true;clearDraft(p);trace(p,'V/save.enter');
  store.save({id:p.id||undefined,body:p.text,created:p.created},function(e,m){
   if(!op.pending)return;op.pending=false;trace(p,e?'V/save.fail':'V/save.ok');
   if(!e){op.meta=m;var saved=session.get();if(saved===op.session){saved.id=m.id;saved.original=revision(op.body);if(m.created!==undefined)saved.created=m.created;}}
   if(!p.alive||p.editSave!==op)return;p.saving=false;
   if(e){p.message='\u6ca1\u5b58\u4e0a\uff0c\u4e0d\u4e22\u6587\u5b57\uff1a'+String(e);return;}
   p.id=m.id;p.base=revision(op.body);if(m.created!==undefined)p.created=m.created;
   if(p.initGen!==gen){if(p.kb){remember(p,p.capture());if(p.text!==op.body||p.pinyin)p.queueDraft();}return;}
   if(p.text!==op.body||p.pinyin){if(p.kb)remember(p,p.capture());p.queueDraft();return;}
   store.draftClear(function(de){if(!p.alive||p.initGen!==gen||p.editSave!==op)return;if(p.text!==op.body||p.pinyin){if(p.kb)remember(p,p.capture());p.queueDraft();return;}session.clear();if(de)console.log('LIUBAI stale draft '+String(de));trace(p,'V/save.exit');shell.nav(p,'read',{id:m.id});});
  });
 },
 cancel:function(){if(this.alive===false)return;if(!this.kb){this.waitingBack();return;}if(this.saving)return;if(revision(this.text)!==this.base||this.pinyin){remember(this,this.capture());shell.nav(this,'menu',{mode:'exit',id:this.id});}else this.discard();},
 leaveDraft:function(){var p=this,gen=p.initGen;if(!p.alive||!p.kb||p.saving||p.loading)return;p.saving=true;clearDraft(p);var s=p.capture();s.body=s.text;delete s.candidates;delete s.image;store.draftPut(s,function(e){if(!p.alive||p.initGen!==gen)return;p.saving=false;if(e){p.message='\u8349\u7a3f\u6ca1\u5b58\u4e0a\uff1a'+String(e);return;}session.clear();shell.nav(p,'index',{});});},
 discard:function(){var p=this,gen=p.initGen;if(!p.alive||!p.kb||p.loading)return;clearDraft(p);store.draftClear(function(e){if(!p.alive||p.initGen!==gen)return;if(e){p.message=String(e);return;}session.clear();shell.nav(p,p.id?'read':'index',p.id?{id:p.id}:{});});},
 waitingBack:function(){if(this.alive===false)return;this.onDestroy();shell.nav(this,this.id?'read':'index',this.id?{id:this.id}:{});},
 retry:function(){if(this.alive===false||this.loading&&this.shellReady)return;if(this.saving)return;try{if(shell.retryStore)shell.retryStore(this);}catch(e){failed(this,e);return;}this.onInit(true);},
 onShow:function(){if(!this.alive){this.onInit(true);return;}if(this.g&&this.ready)shell.focus(this);},onHide:function(){var p=this;p.alive=false;p.initGen=(p.initGen||0)+1;if(p.readyCancel){p.readyCancel();p.readyCancel=null;}clearDraft(p);shell.clear(p);if(p.kb)p.kb.dispose();p.kb=null;},onDestroy:function(){var p=this;p.alive=false;p.initGen=(p.initGen||0)+1;p.ready=false;p.loading=false;p.editSave=null;if(p.readyCancel){p.readyCancel();p.readyCancel=null;}clearDraft(p);shell.clear(p);if(p.kb)p.kb.dispose();p.kb=null;p.text='';p.lines=[];p.candidates=[];},onBackPress:function(){this.cancel();return true;}
};
