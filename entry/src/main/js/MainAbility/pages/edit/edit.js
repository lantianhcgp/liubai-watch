import shell from '../../common/shell';
import layout from '../../common/layout';
import reader from '../../common/reader';
import store from '../../common/store-page';
import keyboard from '../../common/keyboard';
import session from '../../common/session';
import utf8 from '../../common/utf8';
function revision(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return s.length+':'+h;}
function trace(p,s){try{if(shell.trace)shell.trace(p,s);}catch(ignored){}}
function remember(p){var s=p.capture();session.set(s);p.editSession=s;if(p.editSave&&p.editSave.pending)p.editSave.session=s;}
function clearDraft(p){if(p.draftTimer!==null&&p.draftTimer!==undefined)clearTimeout(p.draftTimer);p.draftTimer=null;}
function draftValue(p){var s=p.capture();s.body=s.text;delete s.candidates;delete s.image;delete s.sheetOffset;delete s.sheetWidth;return s;}
function draftResult(p,e){if(e){p.draftError='\u8349\u7a3f\u672a\u5b58\uff1a'+String(e);p.message=p.draftError;}else{if(p.message===p.draftError)p.message='';p.draftError='';}}
function release(p,op){op.pending=false;if(p.editSave===op)p.saving=false;}
function currentEdit(p,op,gen){return p.alive&&p.editSave===op&&p.initGen===gen;}
function keepNew(p){if(p.kb){remember(p);p.queueDraft();}}
function afterDraft(p,op,run){if(p.draftBusy)op.afterDraft=run;else run();}
function writable(p){return p.alive&&p.kb&&!p.saving&&!p.loading;}
function beginWrite(p){var op={pending:true,gen:p.initGen,session:p.editSession,kept:p.editSession};p.editSave=op;p.saving=true;clearDraft(p);return op;}
function bodyChanged(p,op){return p.text!==op.body||p.pinyin;}
// mode: 0 = saved-record cleanup, 1 = keep draft, 2 = discard draft.
// One terminal owner stays locked through the preceding autosave and cleanup.
function endDraft(p,op,mode){
 afterDraft(p,op,function(){
  if(!currentEdit(p,op,op.gen)){release(p,op);return;}
  if(!mode&&bodyChanged(p,op)){release(p,op);keepNew(p);return;}
  if(mode===1)op.kept=p.editSession;
  function done(e){
   if(!op.pending)return;release(p,op);if(!currentEdit(p,op,op.gen))return;
   if(!mode&&bodyChanged(p,op)){keepNew(p);return;}
   if(e){if(mode===1)draftResult(p,e);else p.message=(mode?'':'\u8349\u7a3f\u6e05\u7406\u672a\u5b8c\u6210\uff1a')+String(e);return;}
   if(mode&&p.editSession!==op.kept){keepNew(p);return;}
   p.draftDirty=false;clearDraft(p);session.clear();
   if(!mode){p.message='';trace(p,'V/save.exit');}
   var id=mode===1?'':p.id;shell.nav(p,id?'read':'index',id?{id:id}:{});
  }
  try{if(mode===1)store.draftPut(draftValue(p),done);else store.draftClear(done);}catch(e){done(e);}
 });
}
function stopKeyboard(p){if(p.kb)p.kb.dispose();p.kb=null;}
function cancelReady(p){if(p.readyCancel){p.readyCancel();p.readyCancel=null;}}
function clearPage(p){p.alive=false;p.initGen=(p.initGen||0)+1;cancelReady(p);clearDraft(p);shell.clear(p);stopKeyboard(p);}
function failed(p,e){if(!p.alive)return;p.ready=false;p.loading=false;clearDraft(p);if(p.focusTimer!==null&&p.focusTimer!==undefined)clearTimeout(p.focusTimer);p.focusTimer=null;stopKeyboard(p);p.message='\u8bfb\u53d6\u672a\u5b8c\u6210\uff0c\u70b9\u6309\u91cd\u8bd5';trace(p,'S/edit.failed');}
function geometry(p,info){var g=layout.editor(info,true),k;p.g=g;for(k in g)p[k]=g[k];var status=layout.status(info);for(k in status)p[k]=status[k];p.shellReady=true;}
// Shared event adapter preserves the keyboard receiver, geometry and trace order.
function keyAction(method,stage,accepted){return function(e){if(stage)trace(this,stage);if(this.kb){var used=this.kb[method](e,this.g);if(used&&accepted)trace(this,accepted);}};}
export default {
 data:{ready:false,shellReady:false,loading:false,statusX:0,statusY:0,statusW:0,statusH:0,statusNavX:0,statusNavY:0,statusNavW:0,statusHit:44,message:'',w:0,h:0,hx:0,hy:0,hw:0,hit:46,open:true,lines:[],pinyin:'',candidates:[],hasPinyin:false,keyX:0,keyW:0,keysY:0,footX:0,footW:0,footY:0,sheetWidth:0,sheetOffset:0,image:'',typeImage:'',spaceW:44,caretX:0,caretY:0,caretH:22,caretShow:false,counter:'',viewCounter:'',title:'',saving:false},
 onInit:function(resume){
  var p=this,gen=(p.initGen||0)+1;p.initGen=gen;p.alive=true;p.ready=false;p.shellReady=false;p.loading=true;p.saving=!!(p.editSave&&p.editSave.pending);
  cancelReady(p);clearDraft(p);stopKeyboard(p);
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
     var readDone=false;
     function loaded(e,n){
      if(readDone||!current())return;readDone=true;if(e||!n){failed(p,e);return;}
      try{if(p.params.draft){p.id=n.id||'';boot(n);}
      else{p.created=n.created;boot({id:p.id,text:n.body,cursor:Math.min(p.params.anchor||0,n.body.length),type:0,pinyin:'',open:false,original:revision(n.body),revision:n.revision,created:n.created});}}
      catch(x){failed(p,x);}
     }
     if(p.params.draft)store.draftGet(loaded);else if(p.id)store.load(p.id,loaded);
     else boot({id:'',text:'',cursor:0,type:0,pinyin:'',open:true,original:revision('')});
    }catch(e){failed(p,e);}
   });if(!settled)p.readyCancel=typeof cancel==='function'?cancel:null;}catch(e){failed(p,e);}
  });}catch(e){failed(p,e);}
 },
 boot:function(s){var p=this,gen=p.initGen;if(p.kb)p.kb.dispose();p.base=s.original||revision(s.text||s.body||'');p.created=s.created;p.open=s.open!==false;p.id=s.id||'';p.anchor=s.viewAnchor||s.cursor||0;p.kb=keyboard.create({text:s.text||s.body||'',cursor:s.cursor||0,type:s.type||0,pinyin:s.pinyin||'',deferLookup:true,onChange:function(n){if(p.alive&&p.initGen===gen)p.changed(n);},onError:function(e){if(p.alive&&p.initGen===gen)p.message=String(e);}});p.changed(p.kb.snapshot());p.loading=false;p.ready=true;p.message='';trace(p,'S/edit.done');var action=p.routeAction===undefined?p.params.action||'':p.routeAction;p.routeAction='';if(p.draftDirty)p.queueDraft();p.applyAction(action);},
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
  if(edit){if(p.kb)remember(p);p.queueDraft();}
 },
 refresh:function(follow){var p=this;if(!p.info)return;p.g=layout.editor(p.info,p.open);var g=p.g;var keys=['hx','hy','hw','hit','keyX','keyW','keysY','footX','footW','footY'];for(var ki=0;ki<keys.length;ki++)p[keys[ki]]=g[keys[ki]];p.spaceW=g.footW-3*44-3*5;var opts={editor:true,cursor:p.cursor};if(follow){var loc=reader.locate(p.text,p.cursor,g,opts);p.pg=loc.page;p.anchor=p.pg.start;}else p.pg=reader.page(p.text,p.anchor,g,opts);p.lines=p.pg.lines;p.viewCounter='\u7b2c '+(reader.locate(p.text,p.anchor,g,opts).index+1)+' / '+reader.count(p.text,g,opts)+' \u5c4f \u00b7 \u70b9\u6b63\u6587\u6539\u4f4d\u7f6e';p.caretShow=false;for(var i=0;i<p.lines.length;i++){var l=p.lines[i];if(p.cursor>=l.start&&p.cursor<=l.end){p.caretX=l.x+reader.measure(p.text.substring(l.start,p.cursor),l.font);p.caretY=l.y;p.caretH=l.height-3;p.caretShow=true;break;}}p.counter=utf8.bytes(p.text)+' / 3072';shell.focus(p);},
 queueDraft:function(){
  var p=this,gen=p.initGen;p.draftDirty=true;clearDraft(p);
  if(p.saving||p.draftBusy||!p.kb||!p.alive)return;
  function flush(){
   if(p.initGen===gen)p.draftTimer=null;
   if(!p.alive||p.initGen!==gen||p.saving||p.draftBusy||!p.ready)return;
   var op={};p.draftBusy=op;p.draftDirty=false;trace(p,'Y/draft.enter');
   function done(e){
    if(p.draftBusy!==op)return;p.draftBusy=null;trace(p,e?'Y/draft.fail':'Y/draft.ok');
    var end=p.editSave;
    if(end&&end.pending&&end.afterDraft){var run=end.afterDraft;end.afterDraft=null;run();return;}
    if(!p.alive||p.saving||!p.kb||!p.ready)return;
    draftResult(p,e);if(!e&&p.draftDirty)p.queueDraft();
   }
   try{store.draftPut(draftValue(p),done);}catch(e){done(e);}
  }
  try{p.draftTimer=setTimeout(flush,700);}catch(e){p.draftTimer=null;draftResult(p,e);return;}
  if(p.draftTimer===null||p.draftTimer===undefined){p.draftTimer=null;draftResult(p,new Error('Draft timer unavailable'));}
 },
 toggle:function(){if(!this.kb)return;this.open=!this.open;this.refresh(true);remember(this);this.queueDraft();},
 turn:function(d){if(!this.alive||!this.ready||!this.kb||!this.pg)return;if(d>0&&this.pg.end<this.text.length)this.anchor=this.pg.end;else if(d<0&&this.anchor>0){var s=0,prev=0,q;while(s<this.anchor){q=reader.page(this.text,s,this.g,{editor:true,cursor:this.cursor});if(q.end>=this.anchor)break;prev=s;s=q.end;}this.anchor=s;}this.refresh(false);remember(this);},
 prev:function(){this.turn(-1);},next:function(){this.turn(1);},
 bodySwipe:function(e){if(e&&e.direction==='up')this.turn(1);else if(e&&e.direction==='down')this.turn(-1);},
 onScroll:function(e){if(e&&e.direction)this.turn(e.direction==='bottom'?1:-1);},
 onRotate:function(e){var n=e&&(e.rotate||e.rotation||e.delta||e);if(typeof n==='number'&&n)this.turn(n>0?1:-1);},
 pickLine:function(i,e){if(typeof i==='object'){e=i;var yy=typeof e.globalY==='number'?e.globalY:e.y;i=-1;for(var li=0;li<this.lines.length;li++){var ll=this.lines[li];if(yy>=ll.y&&yy<ll.y+ll.height){i=li;break;}}}if(!this.kb||!this.lines[i])return;var l=this.lines[i],x=e&&(typeof e.globalX==='number'?e.globalX:typeof e.x==='number'?e.x:null);if(typeof x!=='number'||!isFinite(x)){this.message='\u70b9\u6309\u5750\u6807\u4e0d\u53ef\u7528';return;}this.kb.setCursor(l.start+reader.hit(l.text,Math.max(0,x-l.x),l.font));this.open=true;this.refresh(true);remember(this);},
 clickKey:keyAction('click','W/key.click','W/key.accept'),
 startKey:keyAction('touchStart','W/key.drag.begin'),moveKey:keyAction('touchMove'),endKey:keyAction('touchEnd','W/key.drag.end'),cancelKey:keyAction('touchCancel','W/key.cancel'),longKey:keyAction('longPress','W/key.long'),
 mode:keyAction('typeNext'),space:keyAction('space'),del:keyAction('backspace'),enter:keyAction('newline'),choose:keyAction('choose'),
 tools:function(){if(!this.kb)return;remember(this);shell.nav(this,'menu',{mode:'tool',id:this.id});},
 applyAction:function(a){if(!this.kb||!a)return;if(a==='left')this.kb.move(-1);else if(a==='right')this.kb.move(1);else if(a==='home')this.kb.home();else if(a==='end')this.kb.end();else if(a==='type')this.kb.typeNext();else if(a==='copy')session.clipboardPut(this.text);else if(a==='paste'||a.indexOf('paste:')===0)this.kb.insert(session.clipboardGet(a==='paste'?0:parseInt(a.slice(6),10)));else if(a==='save')this.save();else if(a==='draft')this.leaveDraft();else if(a==='discard')this.discard();},
 save:function(){
  var p=this;trace(p,'V/save.click');if(!writable(p))return;if(!utf8.hasText(p.text)){p.message='\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a';trace(p,'V/save.empty');return;}
  var op=beginWrite(p),settled=false;op.body=p.text;trace(p,'V/save.enter');
  function saved(e,m){
   if(settled)return;settled=true;trace(p,e?'V/save.fail':'V/save.ok');
   if(!e){op.meta=m;var kept=session.get();if(kept===op.session){kept.id=m.id;kept.original=revision(op.body);if(m.created!==undefined)kept.created=m.created;}}
   if(!p.alive||p.editSave!==op){release(p,op);return;}
   if(e){release(p,op);p.message='\u6ca1\u5b58\u4e0a\uff0c\u4e0d\u4e22\u6587\u5b57\uff1a'+String(e);return;}
   p.id=m.id;p.base=revision(op.body);if(m.created!==undefined)p.created=m.created;
   if(p.initGen!==op.gen||bodyChanged(p,op)){release(p,op);if(p.kb){remember(p);if(bodyChanged(p,op))p.queueDraft();}return;}
   endDraft(p,op,0);
  }
  try{store.save({id:p.id||undefined,body:p.text,created:p.created},saved);}catch(e){saved(e);}
 },
 cancel:function(){if(this.alive===false)return;if(!this.kb){this.waitingBack();return;}if(this.saving)return;if(revision(this.text)!==this.base||this.pinyin){remember(this);shell.nav(this,'menu',{mode:'exit',id:this.id});}else this.discard();},
 leaveDraft:function(){if(writable(this))endDraft(this,beginWrite(this),1);},
 discard:function(){if(writable(this))endDraft(this,beginWrite(this),2);},
 waitingBack:function(){if(this.alive===false)return;this.onDestroy();shell.nav(this,this.id?'read':'index',this.id?{id:this.id}:{});},
 retry:function(){if(this.alive===false||this.loading&&this.shellReady)return;if(this.saving)return;try{if(shell.retryStore)shell.retryStore(this);}catch(e){failed(this,e);return;}this.onInit(true);},
 onShow:function(){if(!this.alive){this.onInit(true);return;}if(this.g&&this.ready)shell.focus(this);},onHide:function(){clearPage(this);},onDestroy:function(){var p=this;clearPage(p);p.ready=false;p.loading=false;p.editSave=null;p.draftBusy=null;p.draftDirty=false;p.text='';p.lines=[];p.candidates=[];},onBackPress:function(){this.cancel();return true;}
};
