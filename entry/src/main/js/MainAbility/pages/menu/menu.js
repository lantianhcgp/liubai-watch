import shell from '../../common/shell';
import layout from '../../common/layout';
import store from '../../common/store-page';
import session from '../../common/session';
// Frozen approved V3: public action rows and rendered controls are separate.
function row(a,t,icon){return {action:a,title:t,icon:icon||'right',subtitle:''};}
function control(a,t,icon,emphasis){return {action:a,label:t,icon:icon||'',emphasis:!!emphasis};}
export default {
 data:{mode:'app',ready:false,loading:true,message:'',w:0,h:0,hx:0,hy:0,hw:0,hit:46,title:'',titleFont:24,titleH:32,rows:[],visibleRows:[],displayRows:[],fonts:[],font:'normal',bodyX:0,bodyW:0,bodyY:0,rowH:50,slots:3,offset:0,listY:0,listH:0,contentX:0,contentW:0,fontW:0,fontLabel:'\u5b57\u53f7 \u00b7 \u4e0d\u6539\u53d8\u6b63\u6587\u5185\u5bb9',hint:'',hintH:0,hintFont:13,quiet:false,dock:[],dockX:0,dockY:0,dockW:0,dockCellW:0,dockFont:18,toolControls:[],toolW:0,typeImage:'',empty:false,emptyIcon:'book',emptyTitle:'',emptyPrompt:'',emptyX:0,emptyW:0,emptyY:0,emptyH:0,emptyIconSize:43,emptyIconGap:18,emptyTitleFont:25,emptyTitleH:34,emptyTitleGap:13,emptyPromptFont:18,emptyPromptH:58,rowFont:24,rowIcon:23,rowGap:16,rowTextH:36,noticeY:0},
 onInit:function(){
  var p=this;this.alive=true;this.gen=(this.gen||0)+1;var gen=this.gen;
  this.params=shell.params(this);this.mode=this.params.mode||'app';
  this.ready=false;this.allowed=false;this.busy=false;this.message='';this.loading=true;
  this.rows=[];this.displayRows=[];this.visibleRows=[];this.fonts=[];this.dock=[];this.offset=0;this.hint='';this.quiet=false;this.empty=false;
  if(['app','read','record','tool','confirm','exit','clipboard','error'].indexOf(this.mode)<0){this.message='Invalid menu mode';return;}
  this.id=this.params.id||'';this.font=this.params.font||'normal';
  if(['compact','normal','large'].indexOf(this.font)<0)this.font='normal';
  this.title=this.mode==='read'?'\u66f4\u591a\u64cd\u4f5c':this.mode==='record'?'\u8fd9\u6761\u8bb0\u5f55':this.mode==='tool'?'\u952e\u76d8\u5de5\u5177':this.mode==='confirm'?'\u79fb\u5165\u56de\u6536\u7ad9':this.mode==='exit'?'\u9000\u51fa\u7f16\u8f91':this.mode==='clipboard'?'\u526a\u5207\u677f':this.mode==='error'?'\u4fdd\u5b58\u5931\u8d25':'\u7b14\u8bb0\u672c';
  shell.init(this,function(info){
   if(!p.alive||p.gen!==gen)return;p.measure(info);
   shell.ensure(p,function(e){if(!p.alive||p.gen!==gen)return;p.loading=false;if(e){p.message=String(e);return;}p.allowed=true;p.makeRows();});
  });
 },
 measure:function(info){
  // V3's --u is a design scale, NOT a resolution fallback or device lookup.
  var g=layout.home(info),u=g.w/412,b=layout.shapeBand(g.w,g.h,g.round,g.newY,g.dockY-7,g.round?Math.max(10,g.w*.026):Math.max(20,g.w*.06));
  this.info=info;this.w=g.w;this.h=g.h;this.hx=g.hx;this.hy=g.hy;this.hw=g.hw;this.hit=g.hit;
  this.titleFont=Math.min(24*u,(g.hw-g.hit-8)/Math.max(1,this.title.length));this.titleH=Math.max(28,this.titleFont*1.4);
  this.listY=g.hy+g.hit+8;this.bodyY=this.listY;this.listH=g.dockY-this.listY-8;
  this.contentX=b.x;this.contentW=b.width;this.bodyX=b.x;this.bodyW=b.width;
  this.rowH=this.mode==='read'||this.mode==='tool'?50:Math.max(50,74*u);
  this.rowFont=this.mode==='read'?20:this.mode==='tool'?18:this.mode==='clipboard'?22*u:24*u;
  this.rowIcon=23*u;this.rowGap=16*u;this.rowTextH=Math.max(28,this.rowFont*1.4);
  this.fontW=(b.width-4)/3;this.toolW=b.width/4;this.slots=Math.max(1,Math.floor(this.listH/this.rowH));
  this.hintFont=this.mode==='tool'?12:this.mode==='app'?19*u:13;
  this.hintH=this.mode==='tool'?60:this.mode==='app'?82*u:53;
  this.dockX=g.dockX;this.dockY=g.dockY;this.dockW=g.dockW;this.dockFont=Math.max(16,18*u);this.dockCellW=g.dockW/Math.max(1,this.dock.length);
  this.noticeY=g.dockY-24;
  this.emptyY=Math.max(this.listY+28,g.h*.285);this.emptyIconSize=43*u;this.emptyIconGap=18*u;
  this.emptyTitleFont=25*u;this.emptyTitleH=35*u;this.emptyTitleGap=13*u;this.emptyPromptFont=18*u;this.emptyPromptH=58*u;
  this.emptyH=this.emptyIconSize+this.emptyIconGap+this.emptyTitleH+this.emptyTitleGap+this.emptyPromptH;
  var eb=layout.shapeBand(g.w,g.h,g.round,this.emptyY,Math.min(g.dockY-8,this.emptyY+this.emptyH),g.round?Math.max(10,g.w*.026):Math.max(20,g.w*.06));
  this.emptyX=Math.max(b.x,eb.x);this.emptyW=Math.min(b.width,eb.width);
 },
 makeRows:function(){
  var p=this,gen=this.gen;this.rows=[];this.displayRows=[];this.fonts=[];this.dock=[];this.toolControls=[];this.empty=false;this.hint='';this.quiet=false;
  if(this.mode==='read'){
   this.fonts=[{key:'compact',label:'\u7d27\u51d1'},{key:'normal',label:'\u6807\u51c6'},{key:'large',label:'\u5927\u5b57'}];
   this.rows=[row('reader-start','\u4ece\u5934\u9605\u8bfb','restore'),row('edit','\u7f16\u8f91\u8bb0\u5f55','edit'),row('record','\u8bb0\u5f55\u64cd\u4f5c','dots')];
   this.hint='\u6309\u6b63\u6587\u4f4d\u7f6e\u8bb0\u4f4f\u8fdb\u5ea6\n\u6362\u5b57\u53f7\u6216\u5c4f\u5e55\u540e\u4ecd\u4ece\u9644\u8fd1\u7ee7\u7eed';
   this.dock=[control('back','\u8fd4\u56de\u9605\u8bfb','back')];
  }else if(this.mode==='record'){
   this.rows=[row('pin',this.params.pinned?'\u53d6\u6d88\u7f6e\u9876':'\u7f6e\u9876\u8bb0\u5f55','pin'),row('copy','\u590d\u5236\u5230\u5e94\u7528\u5185','copy'),row('delete-confirm','\u79fb\u5230\u56de\u6536\u7ad9','trash')];
   this.dock=[control('back','\u8fd4\u56de\u9605\u8bfb','back')];
  }else if(this.mode==='tool'){
   // Keep these callback action tokens/order for existing callers; only V3's two text rows render.
   this.rows=[row('left','\u524d\u79fb'),row('right','\u540e\u79fb'),row('home','\u79fb\u5230\u6b63\u6587\u5f00\u5934','back'),row('end','\u79fb\u5230\u6b63\u6587\u7ed3\u5c3e','right'),row('type','\u7c7b\u578b'),row('copy','\u590d\u5236\u5168\u6587'),row('paste','\u526a\u5207\u677f')];
   this.toolRows=[this.rows[2],this.rows[3]];
   var s=session.get(),type=s&&s.id===this.id&&s.type>=0&&s.type<4?s.type:0;
   this.typeImage='/common/keyboard/common/key'+type+'.png';
   this.toolControls=[control('left','\u524d\u79fb','/common/keyboard/common/tool_prev.png'),control('type','\u7c7b\u578b'),control('paste','\u526a\u5207\u677f','/common/keyboard/common/tool_clipboard.png'),control('right','\u540e\u79fb','/common/keyboard/common/tool_next.png')];
   this.hint='\u5de5\u5177\u53ea\u8c03\u6574\u8f93\u5165\u4f4d\u7f6e\uff0c\u4e0d\u6539\u52a8\u5df2\u4fdd\u5b58\u7684\u539f\u6587\u3002';
   this.dock=[control('back','\u8fd4\u56de\u7f16\u8f91','back')];
  }else if(this.mode==='clipboard'){
   var cs=session.clipboardList();
   for(var i=0;i<cs.length&&i<8;i++)this.rows.push(row('paste:'+cs[i].index,session.clipboardGet(cs[i].index),''));
   if(!this.rows.length){this.empty=true;this.emptyIcon='copy';this.emptyTitle='\u8fd9\u91cc\u8fd8\u6ca1\u6709\u5185\u5bb9';this.emptyPrompt='\u5148\u4ece\u8bb0\u5f55\u83dc\u5355\u590d\u5236\u3002\n\u5b83\u4e0d\u662f\u624b\u673a\u7cfb\u7edf\u526a\u5207\u677f\u3002';}
   this.dock=[control('back','\u8fd4\u56de\u952e\u76d8','back')];
  }else if(this.mode==='confirm'){
   this.rows=[row('cancel','\u53d6\u6d88'),row('delete','\u79fb\u5230\u56de\u6536\u7ad9','trash')];
   this.empty=true;this.emptyIcon='trash';this.emptyTitle='\u8fd9\u6761\u8bb0\u5f55\u5148\u6536\u8d77\u6765\uff1f';this.emptyPrompt='\u53ef\u4ee5\u5728\u56de\u6536\u7ad9\u6062\u590d\u3002\n\u4e0d\u4f1a\u7acb\u5373\u6c38\u4e45\u5220\u9664\u3002';
   this.dock=[control('back','\u4fdd\u7559'),control('delete','\u79fb\u5165','',true)];
  }else if(this.mode==='error'){
   this.rows=[row('continue','\u7ee7\u7eed\u7f16\u8f91'),row('save','\u91cd\u8bd5\u4fdd\u5b58')];
   this.empty=true;this.emptyIcon='alert';this.emptyTitle='\u6ca1\u5b58\u4e0a\uff0c\u4e0d\u4e22\u6587\u5b57';this.emptyPrompt='\u8bbe\u5907\u672c\u5730\u5b58\u50a8\u672a\u6210\u529f\u3002\n\u5f53\u524d\u6587\u5b57\u4ecd\u7559\u5728\u7f16\u8f91\u533a\u3002';
   this.dock=[control('continue','\u7ee7\u7eed\u7f16\u8f91'),control('save','\u91cd\u8bd5\u4fdd\u5b58','',true)];
  }else if(this.mode==='exit'){
   this.rows=[row('continue','\u7ee7\u7eed\u7f16\u8f91'),row('draft','\u4fdd\u5b58\u8349\u7a3f'),row('discard','\u653e\u5f03\u672c\u6b21\u4fee\u6539'),row('save','\u5b8c\u6210\u5e76\u4fdd\u5b58')];
   this.empty=true;this.emptyIcon='book';this.emptyTitle='\u6587\u5b57\u5148\u7559\u6210\u8349\u7a3f';this.emptyPrompt='\u9000\u51fa\u4e0d\u7b49\u4e8e\u5220\u9664\u8bb0\u5f55\u3002\n\u539f\u6765\u7684\u6b63\u6587\u4e0d\u4f1a\u88ab\u8986\u76d6\u3002';
   this.dock=[control('discard','\u653e\u5f03\u672c\u6b21'),control('draft','\u7559\u8349\u7a3f','',true)];
  }else{
   this.rows=[row('trash','\u56de\u6536\u7ad9','trash')];this.quiet=true;
   this.hint='\u79bb\u7ebf\u8bb0\u5f55 \u00b7 \u5185\u5bb9\u53ea\u5728\u672c\u5730\n\u65e0\u9700\u8d26\u53f7\u6216\u7f51\u7edc';
   this.dock=[control('back','\u8fd4\u56de\u968f\u8bb0','back')];
   store.draftGet(function(e,d){if(!p.alive||p.gen!==gen)return;if(e){p.message=String(e);return;}if(d&&(d.text||d.body||d.pinyin)){p.rows=[row('trash','\u56de\u6536\u7ad9','trash'),row('draft','\u7ee7\u7eed\u8349\u7a3f','edit')];p.paint();}});
  }
  this.paint();
 },
 paint:function(){
  var display=this.mode==='tool'?(this.toolRows||[]):this.empty?[]:this.rows;
  this.dockCellW=this.dockW/Math.max(1,this.dock.length);
  if(this.mode==='clipboard'){
   // Native list scrolls whole clipboard values; never put record text in router params.
   var cols=Math.max(1,Math.floor(this.contentW/this.rowFont)),u=this.w/412;
   for(var i=0;i<display.length;i++){
    var parts=display[i].title.split('\n'),lines=0;
    for(var j=0;j<parts.length;j++)lines+=Math.max(1,Math.ceil(parts[j].length/cols));
    display[i].height=Math.max(70*u,lines*this.rowFont*1.4+20*u);
    display[i].textH=display[i].height-20*u;
   }
  }else for(var k=0;k<display.length;k++){display[k].height=this.rowH;display[k].textH=this.rowTextH;}
  this.displayRows=display;this.visibleRows=display;
  shell.focus(this);console.log('LBQA MENU '+this.mode+' rows='+display.length+' id='+(this.id||'')+' y='+this.listY+' rowH='+this.rowH);
 },
 activate:function(a){
  if(!this.allowed||this.busy)return;
  if(a==='back'){this.back();return;}
  if(a==='paste'&&this.mode==='tool'){
   var s=session.get();if(!s||s.id!==this.id){this.message='\u7f16\u8f91\u72b6\u6001\u4e0d\u53ef\u7528';return;}
   shell.nav(this,'menu',{mode:'clipboard',id:this.id});return;
  }
  this.choose(a);
 },
 // Native lists own scrolling. Retained method names are harmless legacy seams.
 next:function(){shell.focus(this);},prev:function(){shell.focus(this);},onScrollEnd:function(){},onSwipe:function(){},
 choose:function(a){
  if(!this.allowed||this.busy)return;var p=this,gen=this.gen,q=this.params;
  function live(){return p.alive&&p.gen===gen;}
  function failed(e){p.busy=false;if(e)p.message=String(e);return !!e;}
  if(this.mode==='tool'||this.mode==='exit'||this.mode==='clipboard'||this.mode==='error'){
   var s=session.get();if(!s||s.id!==this.id){this.message='\u7f16\u8f91\u72b6\u6001\u4e0d\u53ef\u7528';return;}
   if(a.indexOf('paste:')===0){var ix=a.slice(6);if(!(ix.length===1&&ix.charCodeAt(0)>=48&&ix.charCodeAt(0)<=55)||!session.clipboardGet(parseInt(ix,10))){this.message='\u526a\u5207\u677f\u5185\u5bb9\u4e0d\u53ef\u7528';return;}}
   shell.nav(this,'edit',{id:this.id,action:a==='continue'?'':a});return;
  }
  if(a==='reader-start')shell.nav(this,'read',{id:this.id,font:this.font,anchor:0,fromStart:true});
  else if(a==='edit')shell.nav(this,'edit',{id:this.id,anchor:q.anchor||0});
  else if(a==='record'||a==='delete-confirm'||a==='cancel')shell.nav(this,'menu',{mode:a==='delete-confirm'?'confirm':'record',id:this.id,anchor:q.anchor||0,font:this.font,revision:q.revision,pinned:q.pinned});
  else if(a==='delete'){
   this.busy=true;store.flag(this.id,{deleted:true},function(e){if(!live()||failed(e))return;shell.nav(p,'index',{});});
  }else if(a==='pin'){
   this.busy=true;store.flag(this.id,{pinned:!q.pinned},function(e){if(!live()||failed(e))return;shell.nav(p,'read',{id:p.id,anchor:q.anchor||0,font:p.font});});
  }else if(a==='copy'){
   this.busy=true;store.load(this.id,function(e,n){if(!live()||failed(e))return;if(!session.clipboardPut(n.body)){p.message='\u590d\u5236\u8d85\u51fa\u5e94\u7528\u5185\u4e0a\u9650';return;}p.message='\u5df2\u590d\u5236\u5230\u5e94\u7528\u5185';shell.nav(p,'read',{id:p.id,anchor:q.anchor||0,font:p.font});});
  }else if(a==='trash')shell.nav(this,'trash',{});
  else if(a==='draft'){
   this.busy=true;store.draftGet(function(e,d){if(!live()||failed(e))return;if(!d){p.message='\u6ca1\u6709\u8349\u7a3f';return;}shell.nav(p,'edit',{id:d.id||'',draft:true});});
  }
 },
 setFont:function(k){
  if(!this.allowed||this.busy||['compact','normal','large'].indexOf(k)<0)return;var p=this,gen=this.gen;this.busy=true;
  store.settingPut('read-'+this.id,{font:k,anchor:this.params.anchor||0,revision:this.params.revision},function(e){if(!p.alive||p.gen!==gen)return;p.busy=false;if(e){p.message=String(e);return;}p.font=k;console.log('LBQA FONT '+k+' id='+p.id+' anchor='+(p.params.anchor||0));});
 },
 back:function(){if(!this.allowed||this.busy)return;if(this.mode==='read')shell.nav(this,'read',{id:this.id,anchor:this.params.anchor||0,font:this.font});else if(this.mode==='record'||this.mode==='confirm')shell.nav(this,'read',{id:this.id,anchor:this.params.anchor||0,font:this.font});else if(this.mode==='tool'||this.mode==='exit'||this.mode==='clipboard'||this.mode==='error')shell.nav(this,'edit',{id:this.id});else shell.nav(this,'index',{});},
 retry:function(){this.onInit();},
 onShow:function(){var p=this,gen=this.gen;if(!this.allowed){shell.focus(this);return;}shell.init(this,function(info){if(!p.alive||p.gen!==gen)return;p.measure(info);p.paint();});},
 onHide:function(){shell.clear(this);},
 onDestroy:function(){this.alive=false;this.gen++;this.rows=[];this.visibleRows=[];this.displayRows=[];this.fonts=[];this.toolControls=[];this.dock=[];shell.clear(this);},
 onBackPress:function(){this.back();return true;}
};
